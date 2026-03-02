import type { Express } from "express";
import type { VoiceProxyAudioDeps } from "./voiceProxyAudio.types";
import { registerVoiceProxyGetBackgroundAudioRoute } from "./voiceProxyGetBackgroundAudio.routes";
import { registerVoiceProxyUpdateVolumeRoute } from "./voiceProxyUpdateVolume.routes";
import { registerVoiceProxyUploadBackgroundAudioRoute } from "./voiceProxyUploadBackgroundAudio.routes";
import { registerVoiceProxyBackgroundAudioFileRoute } from "./voiceProxyBackgroundAudioFile.routes";
import { registerVoiceProxyPublicBackgroundAudioRoute } from "./voiceProxyPublicBackgroundAudio.routes";
import { registerVoiceProxyPublicSettingsRoute } from "./voiceProxyPublicSettings.routes";
import { registerVoiceProxyActiveSessionsRoute } from "./voiceProxyActiveSessions.routes";

export function registerCallManagerVoiceProxyAudioRoutes(
  app: Express,
  deps: VoiceProxyAudioDeps
): void {
  registerVoiceProxyGetBackgroundAudioRoute(app, deps);
  registerVoiceProxyUpdateVolumeRoute(app, deps);
  registerVoiceProxyUploadBackgroundAudioRoute(app, deps);
  registerVoiceProxyBackgroundAudioFileRoute(app, deps);
  registerVoiceProxyPublicBackgroundAudioRoute(app);
  registerVoiceProxyPublicSettingsRoute(app);
  registerVoiceProxyActiveSessionsRoute(app, deps);
}
