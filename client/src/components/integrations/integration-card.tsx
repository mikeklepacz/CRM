import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Integration } from "./types";

interface IntegrationCardProps {
  integration: Integration;
  connectingId: string | null;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
}

export function IntegrationCard({ integration, connectingId, onConnect, onDisconnect }: IntegrationCardProps) {
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
              <CardDescription className="mt-1">{integration.description}</CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1" data-testid={`badge-status-${integration.id}`}>
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
            <Button variant="outline" onClick={() => onDisconnect(integration)} disabled={isProcessing} className="w-full" data-testid={`button-disconnect-${integration.id}`}>
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
            <Button onClick={() => onConnect(integration)} disabled={isProcessing || integration.id === "google-sheets"} className="w-full" data-testid={`button-connect-${integration.id}`}>
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
          <p className="text-xs text-muted-foreground">Note: Google Sheets is connected via Admin Dashboard → Google Sheets tab</p>
        )}
      </CardContent>
    </Card>
  );
}
