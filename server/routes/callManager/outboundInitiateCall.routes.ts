import type { Express } from "express";
import type { OutboundCallingDeps } from "./outboundCalling.types";
import { handleOutboundInitiateCall } from "./outboundInitiateCall.handler";

export function registerOutboundInitiateCallRoute(app: Express, deps: OutboundCallingDeps): void {
  app.post("/api/elevenlabs/initiate-call", deps.isAuthenticatedCustom, async (req: any, res) => {
    await handleOutboundInitiateCall(req, res);
  });
}
