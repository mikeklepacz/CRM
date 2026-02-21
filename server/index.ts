import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { callDispatcher } from "./call_dispatcher";
import { voiceProxyServer } from "./voice-proxy.js";
import { startJobProcessor } from "./analysis-job-processor";
import { eventGateway } from "./services/events/gateway";
import { renewCalendarWatchOnStartup } from "./calendarSync";
import { startEmailQueueProcessor } from "./services/emailQueue";
import { startSlotMaintenance } from "./services/slotMaintenance";
import { gmailWatchManager } from "./services/gmailWatchManager";
import { startReconciliationWorker } from "./services/elevenLabsReconciliation";

const app = express();

// Serve attached_assets statically (for OBJ files, images, etc.)
app.use('/attached_assets', express.static(path.resolve(import.meta.dirname, '../attached_assets')));

// Capture raw body for webhook signature validation
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for webhook signature validation
    req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const quietApiLogs = process.env.QUIET_API_LOGS === "1";
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (quietApiLogs) {
      return;
    }
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize voice proxy server
  voiceProxyServer.initialize(server);
  console.log('[Startup] VoiceProxy WebSocket server initialized and ready for connections');

  // Initialize event gateway for real-time updates (SSE-based)
  eventGateway.initialize();
  console.log('[Startup] EventGateway SSE server initialized');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT.
  // Default to 3000 for local runs if PORT is not set.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = Number(process.env.PORT ?? 3000);

  server.listen({
    port,
    host: "0.0.0.0",
    ...(process.platform === "linux" ? { reusePort: true } : {}),
  }, () => {
    // Start background job processor for AI analysis
    startJobProcessor();

    // Start E-Hub slot maintenance (generates 3-day buffer at configured hours)
    startSlotMaintenance();

    // Start E-Hub email queue processor (sends emails during sending hours)
    startEmailQueueProcessor();

    console.log(`${new Date().toLocaleTimeString()} [express] serving on port ${port}`);

    if (process.env.DISABLE_CALL_DISPATCHER !== "1") {
      setInterval(() => {
        callDispatcher.processQueuedCalls().catch(err => {
          console.error('[CallDispatcher] Error in background worker:', err);
        });
      }, 30000);

      log('[CallDispatcher] Background worker started (runs every 30s)');
    } else {
      log('[CallDispatcher] Background worker disabled via DISABLE_CALL_DISPATCHER=1');
    }

    // Start ElevenLabs call reconciliation worker (matches orphaned sessions to conversations)
    startReconciliationWorker(10 * 60 * 1000); // Every 10 minutes
    log('[Reconciliation] ElevenLabs reconciliation worker started (runs every 10 min)');

    // Start Gmail Push Notification watch (for E-Hub reply detection)
    setTimeout(async () => {
      try {
        await gmailWatchManager.renewIfNeeded();
        log('[GmailWatch] Gmail push notifications initialized');
      } catch (err: any) {
        console.error('[GmailWatch] Failed to initialize Gmail watch:', err.message);
        console.error('[GmailWatch] Push notifications will not be active. You can manually start via /api/gmail/push/watch');
      }
    }, 5000); // Wait 5 seconds for other services to initialize

    // Daily Gmail watch renewal check (every 6 hours)
    setInterval(async () => {
      try {
        const renewed = await gmailWatchManager.renewIfNeeded();
        if (renewed) {
          log('[GmailWatch] Gmail watch renewed successfully');
        }
      } catch (err: any) {
        console.error('[GmailWatch] Failed to renew Gmail watch:', err.message);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
  });
})();
