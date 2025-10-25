import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

export type WebhookState = 'active' | 'expired' | 'missing' | 'disconnected';

export interface WebhookStatus {
  state: WebhookState;
  expiresAt: number | null;
  remainingMs: number | null;
  reRegisterRecommended: boolean;
}

const POLLING_INTERVAL = 90000; // 90 seconds
const STALE_TIME = 60000; // 60 seconds

export function useWebhookStatus() {
  const { toast } = useToast();
  const previousStateRef = useRef<WebhookState | null>(null);

  const query = useQuery<WebhookStatus>({
    queryKey: ['/api/calendar/webhook-status'],
    refetchInterval: POLLING_INTERVAL,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
  });

  const reRegisterMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/calendar/webhook-register', {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/webhook-status'] });
      toast({
        title: "Webhook registered",
        description: data.message || "Calendar sync is now active",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "Failed to register webhook",
      });
    },
  });

  // Detect state changes
  useEffect(() => {
    if (query.data?.state) {
      const currentState = query.data.state;
      const previousState = previousStateRef.current;

      // Update previous state
      previousStateRef.current = currentState;

      // Check for state degradation (active -> expired/missing)
      if (previousState === 'active' && 
          (currentState === 'expired' || currentState === 'missing')) {
        // Trigger will be handled by component
        console.log('[Webhook Status] State degraded:', previousState, '->', currentState);
      }
    }
  }, [query.data?.state]);

  return {
    status: query.data,
    isLoading: query.isLoading,
    error: query.error,
    reRegister: reRegisterMutation.mutate,
    isReRegistering: reRegisterMutation.isPending,
  };
}

// Helper to format remaining time
export function formatRemainingTime(remainingMs: number | null): string {
  if (!remainingMs || remainingMs <= 0) return 'Expired';
  
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days.toFixed(1)} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}
