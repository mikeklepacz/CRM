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
      console.log(`[EventStream] Unknown event type: ${eventType}`);
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
        console.log('[EventStream] Connected to SSE gateway');
        return;
      }

      if (data.type === 'error') {
        console.warn('[EventStream] Server error:', data.message);
        return;
      }

      const eventPayload: EventPayload = {
        type: data.type,
        payload: data.payload,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setLastEvent(eventPayload);
      invalidateQueries(data.type as EventType);
      console.log(`[EventStream] Event received: ${data.type}`);
    } catch (err) {
      console.warn('[EventStream] Failed to parse message:', err);
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
      console.log(`[EventStream] Connecting to SSE ${url}...`);
      
      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) {
          es.close();
          return;
        }
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log('[EventStream] SSE connected');
      };

      es.onmessage = handleMessage;

      es.onerror = () => {
        if (!mountedRef.current) return;
        
        if (es.readyState === EventSource.CLOSED) {
          setConnected(false);
          eventSourceRef.current = null;
          
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          console.log(`[EventStream] Connection closed, reconnecting in ${delay / 1000}s (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, delay);
        } else {
          setConnected(false);
          console.log('[EventStream] Connection error, browser will auto-reconnect');
        }
      };
    } catch (err) {
      console.warn('[EventStream] Failed to create EventSource:', err);
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
        console.log('[EventStream] Tab visible, checking connection...');
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
