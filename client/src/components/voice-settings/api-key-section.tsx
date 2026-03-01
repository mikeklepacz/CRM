import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Loader2, Phone } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { configSchema } from "./voice-settings-schemas";

export function ApiKeySection({
  hasApiKey,
  showApiKey,
  setShowApiKey,
  configForm,
  updateConfigMutation,
}: {
  hasApiKey: boolean;
  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;
  configForm: UseFormReturn<z.infer<typeof configSchema>>;
  updateConfigMutation: any;
}) {
  return (
    <AccordionItem value="api-key" className="border rounded-lg">
      <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-api-key">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <span className="font-semibold">ElevenLabs API Key</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your ElevenLabs API key is used for all voice calling features
          </p>

          {hasApiKey && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>API key is configured and ready to use</AlertDescription>
            </Alert>
          )}

          {!hasApiKey && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure your API key to enable voice features
              </AlertDescription>
            </Alert>
          )}

          <Form {...configForm}>
            <form
              onSubmit={configForm.handleSubmit((data) => updateConfigMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={configForm.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ElevenLabs API Key</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          type={showApiKey ? "text" : "password"}
                          placeholder="sk_..."
                          data-testid="input-api-key"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowApiKey(!showApiKey)}
                          data-testid="button-toggle-api-key"
                        >
                          {showApiKey ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Find your API key at{" "}
                      <a
                        href="https://elevenlabs.io/app/settings/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        elevenlabs.io/app/settings/api-keys
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={configForm.control}
                name="twilioNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twilio Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1234567890"
                        data-testid="input-twilio-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Your Twilio phone number for outbound calls (e.g., +1234567890)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateConfigMutation.isPending}
                data-testid="button-save-config"
              >
                {updateConfigMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Configuration
              </Button>
            </form>
          </Form>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
