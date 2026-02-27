import { storage } from "../../storage";

export async function handleElevenLabsSystemHealth(req: any, res: any, deps: any): Promise<any> {
  try {
    const tenantId = req.user.tenantId;
    const issues: { severity: "critical" | "warning" | "info"; component: string; message: string }[] = [];

    const elevenLabsConfig = await storage.getElevenLabsConfig(tenantId);
    if (!elevenLabsConfig?.apiKey) {
      issues.push({
        severity: "critical",
        component: "elevenlabs",
        message: "ElevenLabs API key is not configured. Voice calls cannot be made.",
      });
    }

    if (!elevenLabsConfig?.webhookSecret) {
      issues.push({
        severity: "critical",
        component: "webhook",
        message:
          "ElevenLabs webhook is not registered. Call transcripts and analytics will not be captured. Try saving your ElevenLabs API key again to auto-register the webhook.",
      });
    }

    const agents = await storage.getElevenLabsAgents(tenantId);
    if (!agents || agents.length === 0) {
      issues.push({
        severity: "critical",
        component: "agents",
        message: "No voice agents configured. Create at least one agent to make calls.",
      });
    }

    const proxyHealth = await deps.checkFlyVoiceProxyHealth();
    if (!proxyHealth.healthy) {
      issues.push({
        severity: "critical",
        component: "fly_proxy",
        message: "Voice proxy is unreachable. Calls will fail. Check Fly.io deployment status.",
      });
    }

    const phoneNumbers = await storage.getElevenLabsPhoneNumbers(tenantId);
    if (!phoneNumbers || phoneNumbers.length === 0) {
      issues.push({
        severity: "critical",
        component: "twilio",
        message: "No Twilio phone numbers configured. Outbound calls cannot be made.",
      });
    }

    const criticalCount = issues.filter((i) => i.severity === "critical").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (criticalCount > 0) overallStatus = "unhealthy";
    else if (warningCount > 0) overallStatus = "degraded";

    res.json({
      status: overallStatus,
      canMakeCalls: criticalCount === 0,
      issues,
      timestamp: new Date().toISOString(),
      checks: {
        elevenlabs_api: !!elevenLabsConfig?.apiKey,
        webhook_registered: !!elevenLabsConfig?.webhookSecret,
        agents_configured: agents && agents.length > 0,
        phone_numbers_configured: phoneNumbers && phoneNumbers.length > 0,
        fly_proxy_healthy: proxyHealth.healthy,
      },
    });
  } catch (error: any) {
    console.error("Error checking system health:", error);
    res.status(500).json({
      status: "unhealthy",
      canMakeCalls: false,
      message: error.message || "Failed to check system health",
      issues: [{ severity: "critical", component: "system", message: "Health check failed" }],
    });
  }
}
