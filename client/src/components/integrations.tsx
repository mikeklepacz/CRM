import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  status: "connected" | "disconnected";
  connectorId?: string;
}

export function Integrations() {
  const { toast } = useToast();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const { data: integrationStatus, isLoading } = useQuery<{ googleConnected: boolean }>({
    queryKey: ['/api/integrations/status'],
  });

  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/integrations/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data: any) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.message) {
        toast({
          title: "Coming Soon",
          description: data.message,
        });
      }
      setConnectingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Google",
        variant: "destructive",
      });
      setConnectingId(null);
    },
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/integrations/google/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/status'] });
      toast({
        title: "Disconnected",
        description: "Google integration has been disconnected",
      });
      setConnectingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect Google integration",
        variant: "destructive",
      });
      setConnectingId(null);
    },
  });

  const integrations: Integration[] = [
    {
      id: "google",
      name: "Google (Calendar & Gmail)",
      description: "Connect your Google account to sync Calendar events and send Gmail messages",
      icon: Calendar,
      status: integrationStatus?.googleConnected ? "connected" : "disconnected",
      connectorId: "connector:ccfg_google-calendar_DDDBAC03DE404369B74F32E78D"
    },
  ];

  const handleConnect = async (integration: Integration) => {
    setConnectingId(integration.id);
    connectGoogleMutation.mutate();
  };

  const handleDisconnect = async (integration: Integration) => {
    setConnectingId(integration.id);
    disconnectGoogleMutation.mutate();
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
        
        <div className="grid grid-cols-1 gap-4">
          {[1].map((i) => (
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
            <Card key={integration.id} data-testid={`card-integration-${integration.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-md">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={isConnected ? "default" : "secondary"}
                    data-testid={`badge-status-${integration.id}`}
                  >
                    {isConnected ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {isConnected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {isConnected ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleDisconnect(integration)}
                    disabled={isProcessing}
                    data-testid={`button-disconnect-${integration.id}`}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(integration)}
                    disabled={isProcessing}
                    data-testid={`button-connect-${integration.id}`}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Connect {integration.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">About Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Connecting your Google account gives you access to both Google Calendar and Gmail features:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Google Calendar:</strong> Automatically sync your CRM reminders so you never miss a follow-up</li>
            <li><strong>Gmail:</strong> Send professional email reminders and follow-ups directly from your CRM</li>
          </ul>
          <p className="text-xs mt-4 pt-2 border-t">
            <strong>Note:</strong> Both services use a single Google account connection for convenience and security.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
