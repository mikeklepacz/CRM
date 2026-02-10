import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { apiRequest } from "@/lib/queryClient";

export type VoipCallStatus = "idle" | "connecting" | "ringing" | "connected" | "disconnected";

interface VoipState {
  status: VoipCallStatus;
  isMuted: boolean;
  duration: number;
  activePhoneNumber: string | null;
}

const DEFAULT_STATE: VoipState = {
  status: "idle",
  isMuted: false,
  duration: 0,
  activePhoneNumber: null,
};

let sharedDevice: Device | null = null;
let sharedCall: Call | null = null;
let sharedTimer: ReturnType<typeof setInterval> | null = null;
let sharedState: VoipState = { ...DEFAULT_STATE };
let initPromise: Promise<Device | null> | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): VoipState {
  return sharedState;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updateState(partial: Partial<VoipState>) {
  sharedState = { ...sharedState, ...partial };
  listeners.forEach((fn) => fn());
}

function resetState() {
  if (sharedTimer) {
    clearInterval(sharedTimer);
    sharedTimer = null;
  }
  sharedCall = null;
  updateState({ ...DEFAULT_STATE });
}

async function initSharedDevice(): Promise<Device | null> {
  if (sharedDevice) return sharedDevice;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("[VoIP] Initializing device...");
      const data = await apiRequest("GET", "/api/twilio/voip-token");
      console.log("[VoIP] Token received, creating Device...");

      const device = new Device(data.token, {
        logLevel: 1,
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      });

      device.on("registered", () => {
        console.log("[VoIP] Device registered event fired");
      });

      device.on("unregistered", () => {
        console.log("[VoIP] Device unregistered");
      });

      device.on("error", (error: any) => {
        console.error("[VoIP] Device error:", error?.message || error?.code, error);
        sharedDevice = null;
        resetState();
      });

      device.on("tokenWillExpire", async () => {
        try {
          const refreshData = await apiRequest("GET", "/api/twilio/voip-token");
          device.updateToken(refreshData.token);
        } catch (err) {
          console.error("[VoIP] Token refresh failed:", err);
        }
      });

      await device.register();
      sharedDevice = device;
      console.log("[VoIP] Device registered successfully");
      return device;
    } catch (err: any) {
      const errorMsg = err?.message || err?.code || String(err);
      console.error("[VoIP] Failed to initialize device:", errorMsg, err);
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function useTwilioVoip() {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasTwilioNumber = !!user?.twilioPhoneNumber;

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (hasTwilioNumber && !sharedDevice && !initPromise) {
      initSharedDevice().then((device) => {
        if (!device) {
          toast({
            title: "VoIP setup failed",
            description: "Browser calling could not initialize. Check your Twilio configuration.",
            variant: "destructive",
          });
        }
      });
    }
  }, [hasTwilioNumber]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      if (!hasTwilioNumber) {
        window.location.href = `tel:${phoneNumber}`;
        return;
      }

      let device = sharedDevice;
      if (!device) {
        device = await initSharedDevice();
      }

      if (!device) {
        console.error("[VoIP] Device not ready, falling back to tel:");
        toast({
          title: "VoIP unavailable",
          description: "Using phone dialer instead. Check your Twilio configuration.",
          variant: "destructive",
        });
        window.location.href = `tel:${phoneNumber}`;
        return;
      }

      if (sharedCall) {
        sharedCall.disconnect();
      }

      try {
        updateState({
          status: "connecting",
          isMuted: false,
          duration: 0,
          activePhoneNumber: phoneNumber,
        });

        const call = await device.connect({
          params: {
            To: phoneNumber,
            CallerId: user!.twilioPhoneNumber!,
          },
        });

        sharedCall = call;

        call.on("ringing", () => {
          updateState({ status: "ringing" });
        });

        call.on("accept", () => {
          updateState({ status: "connected", duration: 0 });
          sharedTimer = setInterval(() => {
            updateState({ duration: (sharedState.duration || 0) + 1 });
          }, 1000);
        });

        call.on("disconnect", () => resetState());
        call.on("cancel", () => resetState());

        call.on("error", (error) => {
          console.error("[VoIP] Call error:", error);
          resetState();
        });
      } catch (err) {
        console.error("[VoIP] Failed to make call:", err);
        resetState();
      }
    },
    [hasTwilioNumber, user]
  );

  const hangup = useCallback(() => {
    if (sharedCall) {
      sharedCall.disconnect();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (sharedCall) {
      const newMuted = !sharedState.isMuted;
      sharedCall.mute(newMuted);
      updateState({ isMuted: newMuted });
    }
  }, []);

  return {
    ...state,
    hasTwilioNumber,
    makeCall,
    hangup,
    toggleMute,
    isCallActive: state.status !== "idle",
  };
}
