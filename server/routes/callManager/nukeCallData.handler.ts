import { storage } from "../../storage";

export async function handleNukeCallData(req: any, res: any): Promise<any> {
  try {
    console.log("[NUKE CALL DATA] Clearing all call test data...");

    const tenantId = req.user.tenantId;
    const config = await storage.getElevenLabsConfig(tenantId);

    let elevenLabsDeletedCount = 0;
    const elevenLabsErrors: string[] = [];

    if (config?.apiKey) {
      const callHistory = await storage.getAllCallHistory(tenantId);
      const conversationIds = [...new Set(callHistory.map((c: any) => c.conversationId).filter(Boolean))];

      console.log(`[NUKE CALL DATA] Found ${conversationIds.length} conversations to delete from ElevenLabs`);

      for (const conversationId of conversationIds) {
        try {
          const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
            method: "DELETE",
            headers: { "xi-api-key": config.apiKey },
          });

          if (response.ok || response.status === 404) {
            elevenLabsDeletedCount++;
          } else {
            const errorText = await response.text();
            console.error(`[NUKE CALL DATA] Failed to delete conversation ${conversationId}:`, errorText);
            elevenLabsErrors.push(conversationId);
          }
        } catch (error: any) {
          console.error(`[NUKE CALL DATA] Error deleting conversation ${conversationId}:`, error.message);
          elevenLabsErrors.push(conversationId);
        }
      }
    }

    const result = await storage.nukeAllCallData();
    console.log("[NUKE CALL DATA] Call data cleared successfully:", {
      ...result,
      elevenLabsDeletedCount,
      elevenLabsErrors: elevenLabsErrors.length,
    });

    res.json({
      success: true,
      message: `Deleted ${result.sessionsDeleted} sessions, ${result.historyDeleted} history records, ${result.transcriptsDeleted} transcripts, ${result.eventsDeleted} events, ${result.targetsDeleted} campaign targets. Also removed ${elevenLabsDeletedCount} conversations from ElevenLabs.`,
      ...result,
      elevenLabsDeletedCount,
      elevenLabsErrors: elevenLabsErrors.length > 0 ? elevenLabsErrors : undefined,
    });
  } catch (error: any) {
    console.error("[NUKE CALL DATA] Error clearing call data:", error);
    res.status(500).json({
      error: error.message || "Failed to clear call data",
    });
  }
}
