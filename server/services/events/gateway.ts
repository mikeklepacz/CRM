import { Response } from 'express';

/**
 * CRITICAL: Real-time event gateway using Server-Sent Events (SSE)
 * 
 * This system pushes real-time updates to connected clients instead of relying on polling.
 * Eliminates constant backend queries for changes - events are pushed immediately after operations complete.
 * 
 * Architecture decisions that must be understood before modifications:
 * - 30-second heartbeat: Required for proxy compatibility (prevents connection timeout on idle connections)
 * - SSE format: Each message follows "data: {JSON}\n\n" format with two newlines - don't change format
 * - Browser auto-reconnect: EventSource natively handles reconnection - DO NOT implement custom reconnection on server
 * - Single connection per user: One SSE connection per browser tab via clientId = userId-timestamp
 * 
 * Supported events:
 * - clients:updated: After Google Sheets sync completes
 * - matrix:slotsChanged: After new email slots are generated
 * - matrix:assigned: After a recipient is assigned to a slot
 * - calls:queueChanged: After call queue is processed
 * - gmail:newMessage: When Gmail push notification received
 * - calendar:eventChanged: After calendar events are synced
 * 
 * Frontend integration (client/src/lib/eventStream.tsx):
 * - Listens on /api/events endpoint
 * - Invalidates React Query caches matching EVENT_TO_QUERY_KEYS mapping
 * - Keeps 2-minute fallback polling as safety net
 * 
 * SAFEGUARDS:
 * - DO NOT change heartbeat from 30s - it's tuned for proxy compatibility
 * - DO NOT remove heartbeat - causes connection drops on inactive connections
 * - DO NOT change SSE message format - breaks browser EventSource parsing
 * - DO NOT add custom reconnection server-side - browser handles it natively
 */

export type EventType = 
  | 'clients:updated'
  | 'matrix:slotsChanged'
  | 'matrix:assigned'
  | 'calls:queueChanged'
  | 'gmail:newMessage'
  | 'calendar:eventChanged';

export interface AppEvent {
  type: EventType;
  payload?: any;
  timestamp: number;
}

interface SSEClient {
  res: Response;
  userId: string;
  tenantId?: string;
  connectedAt: number;
  heartbeatInterval: NodeJS.Timeout;
}

// 30-second heartbeat prevents proxy timeout on idle connections
// DO NOT CHANGE: Proxies typically have 60-90s idle timeout; 30s keeps well within that
const HEARTBEAT_INTERVAL_MS = 30000;

class EventGateway {
  private clients: Map<string, SSEClient> = new Map();
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
  }

  addClient(clientId: string, res: Response, userId: string, tenantId?: string) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', userId, timestamp: Date.now() })}\n\n`);

    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch {
        this.removeClient(clientId);
      }
    }, HEARTBEAT_INTERVAL_MS);

    this.clients.set(clientId, {
      res,
      userId,
      tenantId,
      connectedAt: Date.now(),
      heartbeatInterval,
    });


    res.on('close', () => {
      this.removeClient(clientId);
    });
  }

  private removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      clearInterval(client.heartbeatInterval);
      this.clients.delete(clientId);
    }
  }

  broadcast(event: AppEvent, options?: { userId?: string; tenantId?: string }) {
    const message = `data: ${JSON.stringify(event)}\n\n`;
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (options?.userId && client.userId !== options.userId) {
        return;
      }

      if (options?.tenantId && client.tenantId !== options.tenantId) {
        return;
      }

      try {
        client.res.write(message);
        sentCount++;
      } catch (error) {
        this.clients.delete(clientId);
      }
    });

    if (sentCount > 0) {
    }
  }

  emit(type: EventType, payload?: any, options?: { userId?: string; tenantId?: string }) {
    this.broadcast({
      type,
      payload,
      timestamp: Date.now(),
    }, options);
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      clientsByUser: Array.from(this.clients.values()).reduce((acc, c) => {
        acc[c.userId] = (acc[c.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const eventGateway = new EventGateway();
