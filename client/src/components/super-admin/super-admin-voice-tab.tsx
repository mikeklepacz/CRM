import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, Mic } from "lucide-react";
import { VoiceSettings } from "@/components/voice-settings";

export function SuperAdminVoiceTab(props: any) {
  const p = props;

  return (
    <TabsContent value="voice">
      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
          <CardDescription>ElevenLabs voice agent configuration - Per tenant settings</CardDescription>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Select value={p.configTenantId} onValueChange={p.setConfigTenantId}>
              <SelectTrigger className="w-[300px]" data-testid="select-voice-tenant">
                <SelectValue placeholder="Select tenant to configure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants (Overview)</SelectItem>
                {p.tenantsData?.tenants?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {p.configTenantId !== "all" && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-muted/50 border">
                <div className="flex flex-col">
                  <Label htmlFor="direct-elevenlabs-toggle" className="text-sm font-medium">Direct ElevenLabs Mode</Label>
                  <span className="text-xs text-muted-foreground">
                    {p.useDirectElevenLabs ? "Bypassing Fly.io proxy" : "Using Fly.io proxy"}
                  </span>
                </div>
                <Switch
                  id="direct-elevenlabs-toggle"
                  data-testid="switch-direct-elevenlabs"
                  checked={p.useDirectElevenLabs}
                  disabled={p.directElevenLabsLoading || p.updateDirectElevenLabsMutation.isPending}
                  onCheckedChange={(checked) => p.updateDirectElevenLabsMutation.mutate(checked)}
                />
                {p.updateDirectElevenLabsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {p.configTenantId === "all" ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mic className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Voice Configuration</p>
              <p className="text-sm">Select a tenant to manage their voice settings</p>
            </div>
          ) : (
            <VoiceSettings tenantId={p.configTenantId} />
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
