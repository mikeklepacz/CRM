import type { VoiceSettingsProps } from "@/components/voice-settings/voice-settings-types";
import { VoiceSettingsPage } from "@/components/voice-settings/voice-settings-page";

export function VoiceSettings(props: VoiceSettingsProps = {}) {
  return <VoiceSettingsPage {...props} />;
}
