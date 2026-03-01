import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Link as LinkIcon, Loader2, RefreshCw } from "lucide-react";
import type { WebhookStatus } from "./voice-settings-types";

export function WebhookConfigSection({
  webhookStatus,
  hasApiKey,
  registerWebhookMutation,
  toast,
}: {
  webhookStatus?: WebhookStatus;
  hasApiKey: boolean;
  registerWebhookMutation: any;
  toast: any;
}) {
  return (
    <AccordionItem value="webhook-config" className="border rounded-lg">
      <AccordionTrigger
        className="px-6 hover:no-underline"
        data-testid="accordion-webhook-config"
      >
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          <span className="font-semibold">Webhook Configuration</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage your ElevenLabs webhook for call status updates
          </p>

          {webhookStatus?.hasSecret && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Webhook is configured and ready to receive call updates
              </AlertDescription>
            </Alert>
          )}

          {!webhookStatus?.hasSecret && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Webhook not yet registered. Click the button below to register.
              </AlertDescription>
            </Alert>
          )}

          {webhookStatus?.webhookUrl && (
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookStatus.webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-webhook-url"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookStatus.webhookUrl || "");
                    toast({
                      title: "Copied",
                      description: "Webhook URL copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-webhook-url"
                >
                  Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                This URL will be registered with ElevenLabs to receive call status
                updates
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => registerWebhookMutation.mutate()}
              disabled={registerWebhookMutation.isPending || !hasApiKey}
              data-testid="button-register-webhook"
            >
              {registerWebhookMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <RefreshCw className="h-4 w-4 mr-2" />
              {webhookStatus?.hasSecret ? "Re-register Webhook" : "Register Webhook"}
            </Button>
          </div>

          {!hasApiKey && (
            <p className="text-sm text-muted-foreground">
              Please configure your API key to enable webhook registration
            </p>
          )}

          <div className="pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium">Webhook Events</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Conversation Initiation - When a call starts</li>
              <li>• Conversation Update - During the call</li>
              <li>• Conversation End - When a call completes</li>
            </ul>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
