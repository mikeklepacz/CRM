import { useState, useEffect, useRef, useCallback } from "react";
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

export function useTwilioVoip() {
  const { user } = useAuth();
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializingRef = useRef(false);

  const [state, setState] = useState<VoipState>({
    status: "idle",
    isMuted: false,
    duration: 0,
    activePhoneNumber: null,
  });

  const { toast } = useToast();
  const hasTwilioNumber = !!user?.twilioPhoneNumber;

  const initDevice = useCallback(async () => {
    if (deviceRef.current || !hasTwilioNumber || initializingRef.current) return;
    initializingRef.current = true;

    try {
      console.log("[VoIP] Initializing device...");
      const res = await apiRequest("GET", "/api/twilio/voip-token");
      const data = await res.json();
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
        setState((prev) => ({ ...prev, status: "idle" }));
      });

      device.on("tokenWillExpire", async () => {
        try {
          const res = await apiRequest("GET", "/api/twilio/voip-token");
          const data = await res.json();
          device.updateToken(data.token);
        } catch (err) {
          console.error("[VoIP] Token refresh failed:", err);
        }
      });

      await device.register();
      deviceRef.current = device;
      console.log("[VoIP] Device registered successfully");
    } catch (err: any) {
      const errorMsg = err?.message || err?.code || String(err);
      console.error("[VoIP] Failed to initialize device:", errorMsg, err);
      toast({
        title: "VoIP setup failed",
        description: `Browser calling could not initialize: ${errorMsg}`,
        variant: "destructive",
      });
    } finally {
      initializingRef.current = false;
    }
  }, [hasTwilioNumber]);

  useEffect(() => {
    if (hasTwilioNumber) {
      initDevice();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callRef.current) callRef.current.disconnect();
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      initializingRef.current = false;
    };
  }, [hasTwilioNumber, initDevice]);

  const makeCall = useCallback(
    async (phoneNumber: string) => {
      if (!hasTwilioNumber) {
        window.location.href = `tel:${phoneNumber}`;
        return;
      }

      if (!deviceRef.current) {
        await initDevice();
      }

      if (!deviceRef.current) {
        console.error("[VoIP] Device not ready, falling back to tel:");
        toast({
          title: "VoIP unavailable",
          description: "Using phone dialer instead. Check your Twilio configuration.",
          variant: "destructive",
        });
        window.location.href = `tel:${phoneNumber}`;
        return;
      }

      if (callRef.current) {
        callRef.current.disconnect();
      }

      try {
        setState({
          status: "connecting",
          isMuted: false,
          duration: 0,
          activePhoneNumber: phoneNumber,
        });

        const call = await deviceRef.current.connect({
          params: {
            To: phoneNumber,
            CallerId: user!.twilioPhoneNumber!,
          },
        });

        callRef.current = call;

        call.on("ringing", () => {
          setState((prev) => ({ ...prev, status: "ringing" }));
        });

        call.on("accept", () => {
          setState((prev) => ({ ...prev, status: "connected", duration: 0 }));
          timerRef.current = setInterval(() => {
            setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
          }, 1000);
        });

        call.on("disconnect", () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          callRef.current = null;
          setState({
            status: "idle",
            isMuted: false,
            duration: 0,
            activePhoneNumber: null,
          });
        });

        call.on("cancel", () => {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          callRef.current = null;
          setState({
            status: "idle",
            isMuted: false,
            duration: 0,
            activePhoneNumber: null,
          });
        });

        call.on("error", (error) => {
          console.error("[VoIP] Call error:", error);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          callRef.current = null;
          setState({
            status: "idle",
            isMuted: false,
            duration: 0,
            activePhoneNumber: null,
          });
        });
      } catch (err) {
        console.error("[VoIP] Failed to make call:", err);
        setState({
          status: "idle",
          isMuted: false,
          duration: 0,
          activePhoneNumber: null,
        });
      }
    },
    [hasTwilioNumber, user, initDevice]
  );

  const hangup = useCallback(() => {
    if (callRef.current) {
      callRef.current.disconnect();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (callRef.current) {
      const newMuted = !state.isMuted;
      callRef.current.mute(newMuted);
      setState((prev) => ({ ...prev, isMuted: newMuted }));
    }
  }, [state.isMuted]);

  return {
    ...state,
    hasTwilioNumber,
    makeCall,
    hangup,
    toggleMute,
    isCallActive: state.status !== "idle",
  };
}
