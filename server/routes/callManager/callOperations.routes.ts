import type { Express } from "express";
import axios from "axios";
import { eq } from "drizzle-orm";
import { callCampaignTargets, callSessions } from "@shared/schema";
import { db } from "../../db";
import { analyzeTranscript } from "../../services/aiTranscriptAnalysis";
import { storage } from "../../storage";

export function registerCallManagerOperationsRoutes(
  app: Express,
  deps: {
    isAuthenticatedCustom: any;
    checkAdminAccess: (user: any, tenantId: string | undefined) => Promise<boolean>;
  }
): void {
  app.delete("/api/elevenlabs/calls/:id", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const { id } = req.params;
      const forceDelete = req.query.force === "true";
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const session = await db.select().from(callSessions).where(eq(callSessions.id, id)).limit(1);
      if (session.length === 0) {
        return res.status(404).json({ error: "Call session not found" });
      }

      const conversationId = session[0].conversationId;
      let elevenLabsDeleted = false;
      let elevenLabsError: string | null = null;

      if (conversationId) {
        const elevenLabsConfig = await storage.getElevenLabsConfig(req.user.tenantId);
        if (!elevenLabsConfig?.apiKey) {
          if (!forceDelete) {
            return res.status(503).json({
              error:
                "ElevenLabs API key not configured. Cannot delete remote conversation. Use force=true to delete locally anyway.",
            });
          }
          elevenLabsError = "API key not configured";
        } else {
          try {
            await axios.delete(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
              headers: { "xi-api-key": elevenLabsConfig.apiKey },
            });
            console.log(`[DeleteCall] Deleted conversation ${conversationId} from ElevenLabs`);
            elevenLabsDeleted = true;
          } catch (err: any) {
            if (err.response?.status === 404) {
              console.log(`[DeleteCall] Conversation ${conversationId} not found in ElevenLabs (already deleted)`);
              elevenLabsDeleted = true;
            } else {
              elevenLabsError = err.response?.data?.error || err.message || "Unknown ElevenLabs error";
              console.error("[DeleteCall] Failed to delete from ElevenLabs:", err.response?.data || err.message);
              if (!forceDelete) {
                return res.status(500).json({
                  error:
                    "Failed to delete call from ElevenLabs. Local deletion aborted to prevent orphaned conversations. Use force=true to delete locally anyway.",
                  details: err.response?.data || err.message,
                });
              }
            }
          }
        }
      }

      await db.delete(callCampaignTargets).where(eq(callCampaignTargets.callSessionId, id));
      console.log(`[DeleteCall] Deleted call_campaign_targets for call session ${id}`);

      await db.delete(callSessions).where(eq(callSessions.id, id));
      console.log(`[DeleteCall] Deleted call session ${id} from database`);

      let message = "";
      if (elevenLabsDeleted) {
        message = "Call deleted successfully from both ElevenLabs and local database";
      } else if (elevenLabsError && forceDelete) {
        message = `Call deleted from local database (force mode). ElevenLabs deletion failed: ${elevenLabsError}`;
      } else {
        message = "Call deleted successfully from local database (no remote conversation)";
      }

      res.json({
        success: true,
        message,
        deletedFromElevenLabs: elevenLabsDeleted,
        forcedDeletion: forceDelete && !!elevenLabsError,
        elevenLabsError: elevenLabsError || undefined,
      });
    } catch (error: any) {
      console.error("[DeleteCall] Error:", error);
      res.status(500).json({ error: error.message || "Failed to delete call" });
    }
  });

  app.get("/api/elevenlabs/call-transcript/:conversationId", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await deps.checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const { conversationId } = req.params;
      const transcripts = await storage.getCallTranscripts(conversationId);
      res.json({ transcripts });
    } catch (error: any) {
      console.error("Error fetching call transcript:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  app.post("/api/calls/:id/analyze", deps.isAuthenticatedCustom, async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "Tenant ID not found" });
      }

      const callSessionId = req.params.id;
      const result = await analyzeTranscript(callSessionId, tenantId);

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Analysis failed" });
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[API] Call analysis error:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  });
}
