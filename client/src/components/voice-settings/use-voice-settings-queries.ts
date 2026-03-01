import { useQuery } from "@tanstack/react-query";
import type {
  Agent,
  BackgroundAudioSettings,
  ConfigData,
  PhoneNumber,
  Project,
  WebhookStatus,
} from "./voice-settings-types";

export function useVoiceSettingsQueries({
  apiBase,
  isSuperAdminMode,
  tenantId,
}: {
  apiBase: string;
  isSuperAdminMode: boolean;
  tenantId?: string;
}) {
  const { data: configData } = useQuery<ConfigData>({
    queryKey: [apiBase, "config"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/config`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: [apiBase, "agents"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/agents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
  });

  const { data: webhookStatus } = useQuery<WebhookStatus>({
    queryKey: [apiBase, "webhook-status"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/webhook-status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch webhook status");
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: [apiBase, "projects"],
    queryFn: async () => {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/projects`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      return Array.isArray(data) ? data : data.projects ?? [];
    },
    enabled: isSuperAdminMode,
  });

  const { data: phoneNumbers = [] } = useQuery<PhoneNumber[]>({
    queryKey: [apiBase, "phone-numbers"],
    queryFn: async () => {
      const res = await fetch(`${apiBase}/phone-numbers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch phone numbers");
      return res.json();
    },
  });

  const { data: backgroundAudioSettings } = useQuery<BackgroundAudioSettings>({
    queryKey: ["/api/voice-proxy/background-audio"],
  });

  return {
    configData,
    agents,
    webhookStatus,
    projects,
    phoneNumbers,
    backgroundAudioSettings,
    hasApiKey: !!configData?.apiKey,
  };
}
