import { VoiceHubQueueStats } from "@/components/call-manager/voice-hub-queue-stats";
import { VoiceHubBatchControlsCard } from "@/components/call-manager/voice-hub-batch-controls-card";
import { VoiceHubScenariosCard } from "@/components/call-manager/voice-hub-scenarios-card";

export function CallManagerVoiceHubSection(props: any) {
  return (
    <>
      <VoiceHubQueueStats queueStats={props.queueStats} />
      <VoiceHubBatchControlsCard {...props.batchProps} />
      <VoiceHubScenariosCard {...props.scenariosProps} />
    </>
  );
}
