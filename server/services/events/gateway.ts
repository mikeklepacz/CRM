import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer, IncomingMessage } from 'http';
import { parse as parseCookie } from 'cookie';

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

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  tenantId?: string;
  connectedAt: number;
}

type SessionValidator = (sessionId: string) => Promise<{ userId: string; tenantId?: string } | null>;

class EventGateway {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, AuthenticatedClient> = new Map();
  private isInitialized = false;
  private sessionValidator: SessionValidator | null = null;

  setSessionValidator(validator: SessionValidator) {
    this.sessionValidator = validator;
  }

  initialize(server: HttpServer, path: string = '/events') {
    if (this.isInitialized) {
      console.log('[EventGateway] Already initialized');
      return;
    }

    this.wss = new WebSocketServer({ 
      server,
      path,
    });

    this.wss.on('connection', async (ws, req) => {
      try {
        const authResult = await this.authenticateConnection(req);
        
        if (!authResult) {
          console.log('[EventGateway] Connection rejected - authentication failed');
          ws.close(4001, 'Authentication required');
          return;
        }

        const { userId, tenantId } = authResult;
        const clientId = `${userId}-${Date.now()}`;
        
        this.clients.set(clientId, {
          ws,
          userId,
          tenantId,
          connectedAt: Date.now(),
        });

        console.log(`[EventGateway] Client connected: ${userId} (${this.clients.size} total)`);

        ws.on('close', () => {
          this.clients.delete(clientId);
          console.log(`[EventGateway] Client disconnected: ${userId} (${this.clients.size} remaining)`);
        });

        ws.on('error', (error) => {
          console.error(`[EventGateway] WebSocket error for ${userId}:`, error.message);
          this.clients.delete(clientId);
        });

        ws.send(JSON.stringify({
          type: 'connected',
          userId,
          timestamp: Date.now(),
        }));
      } catch (error: any) {
        console.error('[EventGateway] Connection error:', error.message);
        ws.close(4002, 'Connection error');
      }
    });

    this.isInitialized = true;
    console.log(`[EventGateway] WebSocket server initialized on ${path}`);
  }

  private async authenticateConnection(req: IncomingMessage): Promise<{ userId: string; tenantId?: string } | null> {
    const cookies = parseCookie(req.headers.cookie || '');
    const sessionId = cookies['connect.sid'];
    
    if (sessionId && this.sessionValidator) {
      const result = await this.sessionValidator(sessionId);
      if (result) {
        return result;
      }
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const tenantId = url.searchParams.get('tenantId') || undefined;
    
    if (userId && process.env.NODE_ENV === 'development') {
      console.log(`[EventGateway] ⚠️ DEV-ONLY: Using query-param auth for ${userId}`);
      return { userId, tenantId };
    }
    
    return null;
  }

  broadcast(event: AppEvent, options?: { userId?: string; tenantId?: string }) {
    if (!this.wss) {
      return;
    }

    const message = JSON.stringify(event);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      if (options?.userId && client.userId !== options.userId) {
        return;
      }

      if (options?.tenantId && client.tenantId !== options.tenantId) {
        return;
      }

      try {
        client.ws.send(message);
        sentCount++;
      } catch (error) {
        console.error(`[EventGateway] Failed to send to ${client.userId}`);
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
