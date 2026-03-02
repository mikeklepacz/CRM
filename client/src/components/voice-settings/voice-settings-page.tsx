import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SystemHealthBanner } from "@/components/SystemHealthBanner";
import { Accordion } from "@/components/ui/accordion";
import { agentSchema, configSchema } from "./voice-settings-schemas";
import type { Agent, VoiceSettingsProps } from "./voice-settings-types";
import { getVoiceSettingsApiBase } from "./voice-settings-utils";
import { useVoiceSettingsQueries } from "./use-voice-settings-queries";
import { useVoiceSettingsMutations } from "./use-voice-settings-mutations";
import { useVolumeDebounce } from "./use-volume-debounce";
import { VoiceAgentsSection } from "./voice-agents-section";
import { WebhookConfigSection } from "./webhook-config-section";
import { ApiKeySection } from "./api-key-section";
import { DataCollectionSection } from "./data-collection-section";
import { BackgroundAudioSection } from "./background-audio-section";

export function VoiceSettingsPage({ tenantId }: VoiceSettingsProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const { isSuperAdminMode, apiBase } = getVoiceSettingsApiBase(tenantId);

  const {
    configData,
    agents,
    webhookStatus,
    projects,
    phoneNumbers,
    backgroundAudioSettings,
    hasApiKey,
  } = useVoiceSettingsQueries({ apiBase, isSuperAdminMode, tenantId });

  const configForm = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      apiKey: "",
      twilioNumber: "",
    },
  });

  const agentForm = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      agentId: "",
      description: "",
      projectId: "__none__",
      phoneNumberId: "__none__",
    },
  });

  useEffect(() => {
    if (configData) {
      configForm.reset({
        apiKey: configData.apiKey || "",
        twilioNumber: configData.twilioNumber || "",
      });
    }
  }, [configData, configForm]);

  const {
    updateConfigMutation,
    createAgentMutation,
    deleteAgentMutation,
    updateAgentMutation,
    setDefaultMutation,
    syncPhoneNumbersMutation,
    syncAgentSettingsMutation,
    registerWebhookMutation,
    updateVolumeMutation,
  } = useVoiceSettingsMutations({
    apiBase,
    toast,
    agentForm,
    setIsAddAgentOpen,
    setEditingAgent,
  });

  const { localVolumeDb, setLocalVolumeDb, handleVolumeCommit } = useVolumeDebounce({
    backgroundAudioSettings,
    onCommit: (value) => updateVolumeMutation.mutate(value),
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const ALLOWED_AUDIO_TYPES = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/ogg",
      "audio/flac",
      "audio/webm",
    ];

    const ALLOWED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      toast({
        title: "Invalid File Format",
        description: "Please upload an audio file (MP3, WAV, M4A, AAC, OGG, FLAC, or WebM)",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingAudio(true);
    try {
      await apiRequest("POST", "/api/voice-proxy/background-audio/upload", formData);
      queryClient.invalidateQueries({ queryKey: ["/api/voice-proxy/background-audio"] });
      toast({
        title: "Success",
        description: "Background audio uploaded and converted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio file",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <SystemHealthBanner />
      <Accordion type="multiple" defaultValue={["voice-agents"]} className="space-y-4">
        <VoiceAgentsSection
          isAddAgentOpen={isAddAgentOpen}
          setIsAddAgentOpen={setIsAddAgentOpen}
          editingAgent={editingAgent}
          setEditingAgent={setEditingAgent}
          agentForm={agentForm}
          createAgentMutation={createAgentMutation}
          updateAgentMutation={updateAgentMutation}
          deleteAgentMutation={deleteAgentMutation}
          setDefaultMutation={setDefaultMutation}
          syncPhoneNumbersMutation={syncPhoneNumbersMutation}
          syncAgentSettingsMutation={syncAgentSettingsMutation}
          isSuperAdminMode={isSuperAdminMode}
          projects={projects}
          phoneNumbers={phoneNumbers}
          agents={agents}
        />

        <WebhookConfigSection
          webhookStatus={webhookStatus}
          hasApiKey={hasApiKey}
          registerWebhookMutation={registerWebhookMutation}
          toast={toast}
        />

        <ApiKeySection
          hasApiKey={hasApiKey}
          showApiKey={showApiKey}
          setShowApiKey={setShowApiKey}
          configForm={configForm}
          updateConfigMutation={updateConfigMutation}
        />

        <DataCollectionSection toast={toast} />

        <BackgroundAudioSection
          backgroundAudioSettings={backgroundAudioSettings}
          uploadingAudio={uploadingAudio}
          onFileUpload={handleFileUpload}
          localVolumeDb={localVolumeDb}
          setLocalVolumeDb={setLocalVolumeDb}
          handleVolumeCommit={handleVolumeCommit}
          toast={toast}
        />
      </Accordion>
    </div>
  );
}
