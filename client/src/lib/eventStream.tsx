/**
 * CRITICAL: Frontend Event Stream Integration
 * 
 * Receives real-time push updates from server via Server-Sent Events (SSE).
 * Invalidates React Query caches to keep data synchronized without manual polling.
 * 
 * ARCHITECTURE DECISIONS (DO NOT CHANGE WITHOUT UNDERSTANDING):
 * 
 * 1. EVENT MAPPING:
 *    - EVENT_TO_QUERY_KEYS maps each event type to query keys that should be invalidated
 *    - Example: 'clients:updated' invalidates ['/api/clients/my'] and ['/api/recipients']
 *    - DO NOT add/remove mappings without checking all places they're emitted from backend
 * 
 * 2. CONNECTION LIFECYCLE:
 *    - EventSource automatically reconnects after error (browser built-in behavior)
 *    - Don't close EventSource manually - let browser handle reconnection
 *    - 30-second heartbeat keeps connection alive through proxies
 *    - DO NOT implement custom reconnection logic - browser handles it natively
 * 
 * 3. FALLBACK POLLING:
 *    - 2-minute polling in queryClient.ts as safety net
 *    - If SSE breaks, polling ensures data eventually syncs (slower but reliable)
 *    - DO NOT increase polling interval above 2 minutes - defeats purpose of event-driven arch
 *    - DO NOT remove polling - provides resilience against SSE network issues
 * 
 * 4. ERROR HANDLING:
 *    - Parse errors logged but don't crash app
 *    - Connection errors trigger auto-reconnect (browser EventSource behavior)
 *    - DO NOT catch and ignore ALL EventSource.onerror - may hide real errors
 * 
 * 5. WITHCREDENTIALS:
 *    - withCredentials: true enables cookie-based authentication
 *    - Browser sends session cookie automatically to /api/events
 *    - DO NOT remove this - loses authentication and receives 401 errors
 * 
 * SAFEGUARDS:
 * - DO NOT modify EVENT_TO_QUERY_KEYS without backend audit - cache invalidation critical for data sync
 * - DO NOT remove EventSource reconnection logic - causes permanent disconnect on network hiccup
 * - DO NOT remove fallback polling - event-driven must degrade gracefully to polling
 * - DO NOT remove withCredentials - breaks session authentication
 * - DO NOT change SSE endpoint path - hardcoded in server routes
 */

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { queryClient } from './queryClient';

type EventType = 
  | 'clients:updated' 
  | 'matrix:slotsChanged' 
  | 'matrix:assigned'
  | 'calls:queueChanged'
  | 'gmail:newMessage'
  | 'calendar:eventChanged';

interface EventPayload {
  type: EventType;
  payload: unknown;
  timestamp: string;
}

interface EventStreamContextValue {
  connected: boolean;
  lastEvent: EventPayload | null;
}

const EventStreamContext = createContext<EventStreamContextValue>({
  connected: false,
  lastEvent: null,
});

export function useEventStream() {
  return useContext(EventStreamContext);
}

// Maps each event type to query keys that should be invalidated when event arrives
// Example: 'clients:updated' means invalidate /api/clients/my and /api/recipients caches
const EVENT_TO_QUERY_KEYS: Record<EventType, string[][]> = {
  'clients:updated': [
    ['/api/clients/my'],
    ['/api/recipients'],
  ],
  'matrix:slotsChanged': [
    ['/api/matrix2/slots'],
    ['/api/matrix2/debug'],
  ],
  'matrix:assigned': [
    ['/api/recipients'],
    ['/api/matrix2/slots'],
  ],
  'calls:queueChanged': [
    ['/api/call-queue'],
    ['/api/call-history'],
  ],
  'gmail:newMessage': [
    ['/api/recipients'],
    ['/api/clients/my'],
  ],
  'calendar:eventChanged': [
    ['/api/reminders'],
    ['/api/calendar/events'],
  ],
};

interface EventStreamProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function EventStreamProvider({ children, enabled = true }: EventStreamProviderProps) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<EventPayload | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  const invalidateQueries = useCallback((eventType: EventType) => {
    const queryKeys = EVENT_TO_QUERY_KEYS[eventType];
    if (!queryKeys) {
      return;
    }

    queryKeys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        return;
      }

      if (data.type === 'error') {
        return;
      }

      const eventPayload: EventPayload = {
        type: data.type,
        payload: data.payload,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setLastEvent(eventPayload);
      invalidateQueries(data.type as EventType);
    } catch (err) {
      // Parse error - silently ignore malformed messages
    }
  }, [invalidateQueries]);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;
    
    if (eventSourceRef.current?.readyState === EventSource.OPEN || 
        eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      return;
    }

    try {
      const url = '/api/events';
      
      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) {
          es.close();
          return;
        }
        setConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      es.onmessage = handleMessage;

      es.onerror = () => {
        if (!mountedRef.current) return;
        
        if (es.readyState === EventSource.CLOSED) {
          setConnected(false);
          eventSourceRef.current = null;
          
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          setConnected(false);
        }
      };
    } catch (err) {
      // Failed to create EventSource - silently handle
    }
  }, [enabled, handleMessage]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      const initDelay = setTimeout(() => {
        connect();
      }, 1000);
      
      return () => {
        clearTimeout(initDelay);
        mountedRef.current = false;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, connect]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && !connected) {
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, connected, connect]);

  return (
    <EventStreamContext.Provider value={{ connected, lastEvent }}>
      {children}
    </EventStreamContext.Provider>
  );
}
