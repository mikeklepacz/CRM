import { Response } from 'express';

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

const HEARTBEAT_INTERVAL_MS = 30000;

class EventGateway {
  private clients: Map<string, SSEClient> = new Map();
  private isInitialized = false;

  initialize() {
    if (this.isInitialized) {
      console.log('[EventGateway] Already initialized');
      return;
    }
    this.isInitialized = true;
    console.log('[EventGateway] SSE event gateway initialized');
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

    console.log(`[EventGateway] SSE client connected: ${userId}${tenantId ? ` (tenant: ${tenantId})` : ''} (${this.clients.size} total)`);

    res.on('close', () => {
      this.removeClient(clientId);
    });
  }

  private removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      clearInterval(client.heartbeatInterval);
      this.clients.delete(clientId);
      console.log(`[EventGateway] SSE client disconnected: ${client.userId} (${this.clients.size} remaining)`);
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
        console.error(`[EventGateway] Failed to send to ${client.userId}`);
        this.clients.delete(clientId);
      }
    });

    if (sentCount > 0) {
      console.log(`[EventGateway] Broadcast ${event.type} to ${sentCount} clients`);
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
