import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, FileSpreadsheet } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { IntegrationsAboutCard } from "./integrations/about-card";
import { GmailSettingsCard } from "./integrations/gmail-settings-card";
import { IntegrationCard } from "./integrations/integration-card";
import { IntegrationsLoadingSkeleton } from "./integrations/loading-skeleton";
import type { Integration, IntegrationStatusResponse } from "./integrations/types";

export function Integrations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [emailPreference, setEmailPreference] = useState<"gmail_draft" | "mailto">("mailto");

  const { data: integrationStatus, isLoading } = useQuery<IntegrationStatusResponse>({ queryKey: ["/api/integrations/status"] });

  const { data: userData } = useQuery({ queryKey: ["/api/auth/user"], enabled: !!user });

  useEffect(() => {
    if (userData) {
      const data = userData as any;
      if (data.signature) setSignature(data.signature);
      if (data.emailPreference) setEmailPreference(data.emailPreference);
    }
  }, [userData]);

  const connectCalendarMutation = useMutation({
    mutationFn: async () => await apiRequest("GET", "/api/gmail/oauth-url"),
    onSuccess: (data: any) => {
      if (data.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(data.url, "Google OAuth", `width=${width},height=${height},left=${left},top=${top}`);

        const pollInterval = setInterval(async () => {
          const status = (await apiRequest("GET", "/api/integrations/status")) as IntegrationStatusResponse;
          if (status.googleCalendarConnected) {
            clearInterval(pollInterval);
            queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
            toast({ title: "Connected!", description: "Gmail and Calendar have been connected successfully" });
            setConnectingId(null);
          }
        }, 2000);

        setTimeout(() => {
          clearInterval(pollInterval);
          setConnectingId(null);
        }, 120000);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Connection Failed", description: error.message || "Failed to connect Gmail and Calendar", variant: "destructive" });
      setConnectingId(null);
    },
  });

  const disconnectSheetsMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/integrations/google-sheets/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Disconnected", description: "Google Sheets has been disconnected" });
      setConnectingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Disconnection Failed", description: error.message || "Failed to disconnect Google Sheets", variant: "destructive" });
      setConnectingId(null);
    },
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/integrations/google-calendar/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Disconnected", description: "Google Calendar has been disconnected" });
      setConnectingId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Disconnection Failed", description: error.message || "Failed to disconnect Google Calendar", variant: "destructive" });
      setConnectingId(null);
    },
  });

  const updateGmailSettingsMutation = useMutation({
    mutationFn: async () => await apiRequest("PUT", "/api/user/gmail-settings", { signature: signature || null, gmailLabels: null, emailPreference }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Saved!", description: "Gmail settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Save Failed", description: error.message || "Failed to update Gmail settings", variant: "destructive" });
    },
  });

  const integrations: Integration[] = useMemo(
    () => [
      {
        id: "google-sheets",
        name: "Google Sheets",
        description: "Access and manage your store database and commission tracker spreadsheets",
        icon: FileSpreadsheet,
        status: integrationStatus?.googleSheetsConnected ? "connected" : "disconnected",
        connectedEmail: integrationStatus?.googleSheetsEmail,
        connectorId: "connector:ccfg_google-sheets_DDDBAC03DE404369B74F32E78D",
      },
      {
        id: "google-calendar",
        name: "Google Calendar & Gmail",
        description: "Sync reminders to your calendar and send automated email follow-ups",
        icon: Calendar,
        status: integrationStatus?.googleCalendarConnected ? "connected" : "disconnected",
        connectedEmail: integrationStatus?.googleCalendarEmail,
        connectorId: "connector:ccfg_google-calendar_DDDBAC03DE404369B74F32E78D",
      },
    ],
    [integrationStatus],
  );

  const handleConnect = (integration: Integration) => {
    setConnectingId(integration.id);
    if (integration.id === "google-calendar") {
      connectCalendarMutation.mutate();
    }
  };

  const handleDisconnect = (integration: Integration) => {
    setConnectingId(integration.id);
    if (integration.id === "google-sheets") {
      disconnectSheetsMutation.mutate();
    } else if (integration.id === "google-calendar") {
      disconnectCalendarMutation.mutate();
    }
  };

  if (isLoading) {
    return <IntegrationsLoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Available Integrations</h3>
        <p className="text-sm text-muted-foreground">Connect third-party services to enhance your CRM capabilities</p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} connectingId={connectingId} onConnect={handleConnect} onDisconnect={handleDisconnect} />
        ))}
      </div>

      {integrationStatus?.googleCalendarConnected && (
        <GmailSettingsCard
          signature={signature}
          emailPreference={emailPreference}
          isPending={updateGmailSettingsMutation.isPending}
          onSignatureChange={setSignature}
          onEmailPreferenceChange={setEmailPreference}
          onSave={() => updateGmailSettingsMutation.mutate()}
        />
      )}

      <IntegrationsAboutCard />
    </div>
  );
}
