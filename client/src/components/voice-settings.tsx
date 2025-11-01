import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Phone, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Star, RefreshCw, Link as LinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  twilioNumber: z.string().optional(),
});

const agentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  description: z.string().optional(),
});

type Agent = {
  id: string;
  name: string;
  agent_id: string;
  phone_number_id?: string | null;
  phone_number?: string | null;
  phone_label?: string | null;
  description?: string;
  is_default: boolean;
};

export function VoiceSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);

  // Fetch config (API key + Twilio number)
  const { data: configData } = useQuery<{ apiKey: string; twilioNumber?: string }>({
    queryKey: ['/api/elevenlabs/config'],
  });

  // Fetch agents
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/elevenlabs/agents'],
  });
  const hasApiKey = !!configData?.apiKey;

  // Fetch webhook status
  const { data: webhookStatus } = useQuery<{ webhookUrl: string | null; hasSecret: boolean; hasApiKey: boolean }>({
    queryKey: ['/api/elevenlabs/webhook-status'],
  });

  // Config form (API key + Twilio number)
  const configForm = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      apiKey: "",
      twilioNumber: "",
    },
  });

  // Update form when config data loads
  useEffect(() => {
    if (configData) {
      configForm.reset({
        apiKey: configData.apiKey || "",
        twilioNumber: configData.twilioNumber || "",
      });
    }
  }, [configData, configForm]);

  // Agent form
  const agentForm = useForm<z.infer<typeof agentSchema>>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      agentId: "",
      description: "",
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: z.infer<typeof configSchema>) => {
      return await apiRequest("PUT", "/api/elevenlabs/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/config'] });
      toast({
        title: "Success",
        description: "Configuration updated successfully",
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

  const createAgentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof agentSchema>) => {
      return await apiRequest("POST", "/api/elevenlabs/agents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/agents'] });
      setIsAddAgentOpen(false);
      agentForm.reset();
      toast({
        title: "Success",
        description: "Agent added successfully",
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

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/elevenlabs/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/agents'] });
      toast({
        title: "Success",
        description: "Agent deleted successfully",
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

  const syncPhoneNumbersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/elevenlabs/sync-phone-numbers");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/agents'] });
      toast({
        title: "Success",
        description: "Phone numbers synced from ElevenLabs successfully",
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

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("PUT", `/api/elevenlabs/agents/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/agents'] });
      toast({
        title: "Success",
        description: "Default agent updated",
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

  const registerWebhookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/elevenlabs/register-webhook");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/elevenlabs/webhook-status'] });
      toast({
        title: "Success",
        description: data.message || "Webhook registered successfully",
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

  return (
    <div className="space-y-6">
      {/* API Key Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            <CardTitle>ElevenLabs API Key</CardTitle>
          </div>
          <CardDescription>
            Your ElevenLabs API key is used for all voice calling features
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasApiKey && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                API key is configured and ready to use
              </AlertDescription>
            </Alert>
          )}
          
          {!hasApiKey && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please configure your API key to enable voice features
              </AlertDescription>
            </Alert>
          )}

          <Form {...configForm}>
            <form onSubmit={configForm.handleSubmit((data) => updateConfigMutation.mutate(data))} className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Agents Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voice Agents</CardTitle>
              <CardDescription>
                Manage your ElevenLabs conversational AI agents
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => syncPhoneNumbersMutation.mutate()}
                disabled={syncPhoneNumbersMutation.isPending || !hasApiKey}
                data-testid="button-sync-phone-numbers"
              >
                {syncPhoneNumbersMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Phone className="h-4 w-4 mr-2" />
                Sync Phone Numbers
              </Button>
              <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-agent">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Agent
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Voice Agent</DialogTitle>
                  <DialogDescription>
                    Add a new ElevenLabs conversational AI agent
                  </DialogDescription>
                </DialogHeader>
                <Form {...agentForm}>
                  <form onSubmit={agentForm.handleSubmit((data) => createAgentMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={agentForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Sales Cold Caller" data-testid="input-agent-name" />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this agent (e.g., "Sales Cold Caller", "Follow-up Agent")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={agentForm.control}
                      name="agentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="abc123..." data-testid="input-agent-id" />
                          </FormControl>
                          <FormDescription>
                            Find this in your ElevenLabs dashboard under Conversational AI
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={agentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Used for initial cold calls to new leads" data-testid="input-agent-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={createAgentMutation.isPending}
                      data-testid="button-save-agent"
                      className="w-full"
                    >
                      {createAgentMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Agent
                    </Button>
                  </form>
                </Form>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No agents configured yet. Add your first agent to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`agent-card-${agent.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{agent.name}</h4>
                      {agent.is_default && (
                        <Badge variant="default" data-testid="badge-default-agent">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Agent ID: {agent.agent_id}
                    </p>
                    {agent.phone_number && (
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">
                          {agent.phone_number}
                          {agent.phone_label && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({agent.phone_label})
                            </span>
                          )}
                        </p>
                        <Badge variant="outline" className="ml-auto">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          Synced
                        </Badge>
                      </div>
                    )}
                    {!agent.phone_number && (
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground italic">
                          No phone number assigned
                        </p>
                      </div>
                    )}
                    {agent.description && (
                      <p className="text-sm text-muted-foreground">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!agent.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(agent.id)}
                        data-testid={`button-set-default-${agent.id}`}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAgentMutation.mutate(agent.id)}
                      disabled={deleteAgentMutation.isPending}
                      data-testid={`button-delete-agent-${agent.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            <CardTitle>Webhook Configuration</CardTitle>
          </div>
          <CardDescription>
            Manage your ElevenLabs webhook for call status updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    navigator.clipboard.writeText(webhookStatus.webhookUrl || '');
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
                This URL will be registered with ElevenLabs to receive call status updates
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
              {webhookStatus?.hasSecret ? 'Re-register Webhook' : 'Register Webhook'}
            </Button>
          </div>

          {!hasApiKey && (
            <p className="text-sm text-muted-foreground">
              Please configure your API key above to enable webhook registration
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
        </CardContent>
      </Card>
    </div>
  );
}
