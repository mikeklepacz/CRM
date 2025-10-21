import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  status: "connected" | "disconnected";
  connectedEmail?: string | null;
  connectorId?: string;
}

interface IntegrationStatusResponse {
  googleSheetsConnected: boolean;
  googleCalendarConnected: boolean;
  googleSheetsEmail: string | null;
  googleCalendarEmail: string | null;
}

export function Integrations() {
  const { toast } = useToast();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const { data: integrationStatus, isLoading } = useQuery<IntegrationStatusResponse>({
    queryKey: ['/api/integrations/status'],
  });

  const connectCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/gmail/oauth-url');
      return response;
    },
    onSuccess: (data: any) => {
      if (data.url) {
        // Open OAuth window
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        window.open(
          data.url,
          'Google OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Poll for connection status
        const pollInterval = setInterval(async () => {
          const status = await apiRequest('GET', '/api/integrations/status') as IntegrationStatusResponse;
          if (status.googleCalendarConnected) {
            clearInterval(pollInterval);
            queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
            toast({
              title: "Connected!",
              description: "Gmail and Calendar have been connected successfully",
            });
            setConnectingId(null);
          }
        }, 2000);
        
        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setConnectingId(null);
        }, 120000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Gmail and Calendar",
        variant: "destructive",
      });
      setConnectingId(null);
    },
  });

  const disconnectSheetsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/integrations/google-sheets/disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
      toast({
        title: "Disconnected",
        description: "Google Sheets has been disconnected",
      });
      setConnectingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect Google Sheets",
        variant: "destructive",
      });
      setConnectingId(null);
    },
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/integrations/google-calendar/disconnect');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
      setConnectingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect Google Calendar",
        variant: "destructive",
      });
      setConnectingId(null);
    },
  });

  const integrations: Integration[] = [
    {
      id: "google-sheets",
      name: "Google Sheets",
      description: "Access and manage your store database and commission tracker spreadsheets",
      icon: FileSpreadsheet,
      status: integrationStatus?.googleSheetsConnected ? "connected" : "disconnected",
      connectedEmail: integrationStatus?.googleSheetsEmail,
      connectorId: "connector:ccfg_google-sheets_DDDBAC03DE404369B74F32E78D"
    },
    {
      id: "google-calendar",
      name: "Google Calendar & Gmail",
      description: "Sync reminders to your calendar and send automated email follow-ups",
      icon: Calendar,
      status: integrationStatus?.googleCalendarConnected ? "connected" : "disconnected",
      connectedEmail: integrationStatus?.googleCalendarEmail,
      connectorId: "connector:ccfg_google-calendar_DDDBAC03DE404369B74F32E78D"
    },
  ];

  const handleConnect = async (integration: Integration) => {
    setConnectingId(integration.id);
    if (integration.id === "google-calendar") {
      connectCalendarMutation.mutate();
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    setConnectingId(integration.id);
    if (integration.id === "google-sheets") {
      disconnectSheetsMutation.mutate();
    } else if (integration.id === "google-calendar") {
      disconnectCalendarMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Available Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Connect third-party services to enhance your CRM capabilities
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-4 max-w-2xl">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Available Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect third-party services to enhance your CRM capabilities
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl">
        {integrations.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integration.status === "connected";
          const isProcessing = connectingId === integration.id;

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={isConnected ? "default" : "secondary"}
                    className="flex items-center gap-1"
                    data-testid={`badge-status-${integration.id}`}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        Disconnected
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isConnected && integration.connectedEmail && (
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-1">Connected Account:</p>
                    <p className="text-sm font-medium" data-testid={`text-email-${integration.id}`}>
                      {integration.connectedEmail}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  {isConnected ? (
                    <Button
                      variant="outline"
                      onClick={() => handleDisconnect(integration)}
                      disabled={isProcessing}
                      className="w-full"
                      data-testid={`button-disconnect-${integration.id}`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        "Disconnect"
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConnect(integration)}
                      disabled={isProcessing || integration.id === "google-sheets"}
                      className="w-full"
                      data-testid={`button-connect-${integration.id}`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  )}
                </div>
                {integration.id === "google-sheets" && !isConnected && (
                  <p className="text-xs text-muted-foreground">
                    Note: Google Sheets is connected via Admin Dashboard → Google Sheets tab
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">About These Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Why separate accounts?</p>
            <p>
              You can use different Google accounts for different purposes. For example, use your business account for Google Sheets and your personal account for Calendar/Gmail.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Google Sheets:</strong> Access store database and commission tracker (managed via Admin Dashboard)</li>
              <li><strong>Google Calendar:</strong> Automatically sync CRM reminders to your calendar</li>
              <li><strong>Gmail:</strong> Send automated email reminders and follow-ups to clients</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
