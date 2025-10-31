import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Phone, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const elevenLabsSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  phoneNumber: z.string().optional(),
});

type ElevenLabsSettings = {
  apiKey: string;
  agentId: string;
  phoneNumber?: string;
};

export function VoiceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch ElevenLabs settings
  const { data: settings, isLoading } = useQuery<ElevenLabsSettings>({
    queryKey: ['/api/elevenlabs/settings'],
  });

  const form = useForm<z.infer<typeof elevenLabsSchema>>({
    resolver: zodResolver(elevenLabsSchema),
    defaultValues: {
      apiKey: settings?.apiKey || "",
      agentId: settings?.agentId || "",
      phoneNumber: settings?.phoneNumber || "",
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        apiKey: settings.apiKey || "",
        agentId: settings.agentId || "",
        phoneNumber: settings.phoneNumber || "",
      });
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof elevenLabsSchema>) => {
      return await apiRequest("PUT", "/api/elevenlabs/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/settings'] });
      toast({
        title: "Success",
        description: "ElevenLabs settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof elevenLabsSchema>) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSettings = settings?.apiKey && settings?.agentId;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            <CardTitle>ElevenLabs Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure your ElevenLabs API credentials and conversational AI agent settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasSettings && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ElevenLabs is configured and ready to use. Update your settings below if needed.
              </AlertDescription>
            </Alert>
          )}
          
          {!hasSettings && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure your ElevenLabs credentials to enable voice calling features.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          type={showApiKey ? "text" : "password"}
                          placeholder="sk_..."
                          data-testid="input-elevenlabs-api-key"
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
                control={form.control}
                name="agentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Your conversational AI agent ID"
                        data-testid="input-elevenlabs-agent-id"
                      />
                    </FormControl>
                    <FormDescription>
                      Find your Agent ID in your ElevenLabs dashboard under Conversational AI
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Twilio Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1234567890"
                        data-testid="input-phone-number"
                      />
                    </FormControl>
                    <FormDescription>
                      Your Twilio phone number for making calls (managed by ElevenLabs)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                data-testid="button-save-voice-settings"
              >
                {updateSettingsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            Current status of your ElevenLabs voice integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">API Key</span>
              <span className="text-sm text-muted-foreground">
                {hasSettings ? "✓ Configured" : "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Agent ID</span>
              <span className="text-sm text-muted-foreground">
                {settings?.agentId || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Phone Number</span>
              <span className="text-sm text-muted-foreground">
                {settings?.phoneNumber || "Not configured"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
