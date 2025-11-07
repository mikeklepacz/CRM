import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Phone, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Star, RefreshCw, Link as LinkIcon, Database, Copy, Upload, Volume2 } from "lucide-react";
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
  const [uploadingAudio, setUploadingAudio] = useState(false);

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

  // Fetch background audio settings
  const { data: backgroundAudioSettings } = useQuery<{
    fileName: string | null;
    volumeDb: number;
    uploadedAt: string | null;
    websocketUrl: string;
    activeSessions: number;
  }>({
    queryKey: ['/api/voice-proxy/background-audio'],
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

  const updateVolumeMutation = useMutation({
    mutationFn: async (volumeDb: number) => {
      return await apiRequest("PUT", "/api/voice-proxy/background-audio/volume", { volumeDb });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/voice-proxy/background-audio'] });
      toast({
        title: "Success",
        description: "Background audio volume updated",
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingAudio(true);
    try {
      await apiRequest("POST", "/api/voice-proxy/background-audio/upload", formData);
      queryClient.invalidateQueries({ queryKey: ['/api/voice-proxy/background-audio'] });
      toast({
        title: "Success",
        description: "Background audio uploaded and converted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload audio file",
        variant: "destructive",
      });
    } finally {
      setUploadingAudio(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["voice-agents"]} className="space-y-4">
        {/* 1. Voice Agents */}
        <AccordionItem value="voice-agents" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-voice-agents">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <span className="font-semibold">Voice Agents</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your ElevenLabs conversational AI agents
              </p>
              
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
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2. Webhook Configuration */}
        <AccordionItem value="webhook-config" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-webhook-config">
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

        {/* 3. ElevenLabs API Key */}
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
                  <AlertDescription>
                    API key is configured and ready to use
                  </AlertDescription>
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
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Data Collection Placeholders */}
        <AccordionItem value="data-collection" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-data-collection">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <span className="font-semibold">Data Collection Placeholders</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Configure these placeholders in your ElevenLabs Agent Dashboard → Analysis → Data Collection to extract structured data from calls
              </p>

              <Alert>
                <AlertDescription className="text-sm">
                  Copy each placeholder field below and paste it into your ElevenLabs agent's Data Collection settings. The system will automatically extract and save this data from call conversations.
                </AlertDescription>
              </Alert>

              {/* Interest & Outcome Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Interest & Outcome (4 fields)</h4>
                <div className="space-y-2">
                  {[
                    {
                      name: "interest_level",
                      description: "Extract the prospect's interest level. Return one of: high, medium, low, none. High = ready to buy/send samples, Medium = wants more info, Low = not right time, None = not interested."
                    },
                    {
                      name: "objections",
                      description: "Extract any objections or concerns raised by the prospect. Include pricing concerns, timing issues, current supplier satisfaction, product doubts, or any hesitation. Return as comma-separated list or 'none'."
                    },
                    {
                      name: "follow_up_needed",
                      description: "Determine if follow-up is needed. Return 'yes' if prospect requested callback, more info, or showed interest. Return 'no' if they declined or asked not to call back."
                    },
                    {
                      name: "follow_up_date",
                      description: "Extract any specific date/time mentioned for follow-up. Return in format YYYY-MM-DD or 'not specified'."
                    }
                  ].map((field) => (
                    <PlaceholderField key={field.name} {...field} toast={toast} />
                  ))}
                </div>
              </div>

              {/* Point of Contact Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Point of Contact (4 fields)</h4>
                <div className="space-y-2">
                  {[
                    {
                      name: "poc_name",
                      description: "Extract the full name of the person you spoke with or the main contact person mentioned. Return full name or 'not provided'."
                    },
                    {
                      name: "poc_email",
                      description: "Extract email address of the contact person. Must be valid email format (user@domain.com) or 'not provided'."
                    },
                    {
                      name: "poc_phone",
                      description: "Extract direct phone number of the contact person. Include country code if mentioned. Return formatted number or 'not provided'."
                    },
                    {
                      name: "poc_title",
                      description: "Extract job title or role of the contact person (e.g., Owner, Manager, Buyer, Purchasing Director). Return title or 'not provided'."
                    }
                  ].map((field) => (
                    <PlaceholderField key={field.name} {...field} toast={toast} />
                  ))}
                </div>
              </div>

              {/* Shipping Information Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Shipping Information (4 fields)</h4>
                <div className="space-y-2">
                  {[
                    {
                      name: "shipping_name",
                      description: "Extract the name for shipping/sample delivery if different from main contact. Return name or 'same as contact'."
                    },
                    {
                      name: "shipping_address",
                      description: "Extract complete shipping address if prospect agreed to receive samples. Include street, suite/unit number. Return full address or 'not provided'."
                    },
                    {
                      name: "shipping_city",
                      description: "Extract city for shipping address. Return city name or 'not provided'."
                    },
                    {
                      name: "shipping_state",
                      description: "Extract state/province for shipping address. Return 2-letter code (e.g., CA, NY) or full name, or 'not provided'."
                    }
                  ].map((field) => (
                    <PlaceholderField key={field.name} {...field} toast={toast} />
                  ))}
                </div>
              </div>

              {/* Business Intelligence Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Business Intelligence (7 fields)</h4>
                <div className="space-y-2">
                  {[
                    {
                      name: "current_supplier",
                      description: "Extract name of their current hemp wick or similar product supplier if mentioned. Return supplier name or 'none mentioned'."
                    },
                    {
                      name: "monthly_volume",
                      description: "Extract approximate monthly purchase volume or quantity if discussed. Include units (cases, pieces, etc.) or 'not discussed'."
                    },
                    {
                      name: "decision_maker",
                      description: "Determine if the person you spoke with is the final decision maker. Return 'yes', 'no', or 'unclear'. If no, note who makes decisions."
                    },
                    {
                      name: "business_type",
                      description: "Extract or infer business type from conversation (e.g., dispensary, smoke shop, distributor, retailer, online store). Return type or 'not identified'."
                    },
                    {
                      name: "pain_points",
                      description: "Extract any specific problems or needs mentioned related to their current hemp wick products (quality issues, pricing, availability, etc.). Return comma-separated list or 'none mentioned'."
                    },
                    {
                      name: "next_action",
                      description: "Extract specific next action agreed upon (send samples, email info, schedule demo, call back on date, etc.). Return action or 'none agreed'."
                    },
                    {
                      name: "notes",
                      description: "Extract any other relevant information, special requests, or important details mentioned during the call that don't fit other categories. Return concise summary or 'none'."
                    }
                  ].map((field) => (
                    <PlaceholderField key={field.name} {...field} toast={toast} />
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Background Audio Settings (NEW) */}
        <AccordionItem value="background-audio" className="border rounded-lg">
          <AccordionTrigger className="px-6 hover:no-underline" data-testid="accordion-background-audio">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              <span className="font-semibold">Background Audio Settings</span>
              {(backgroundAudioSettings?.activeSessions ?? 0) > 0 && (
                <Badge variant="default" className="ml-2">
                  {backgroundAudioSettings?.activeSessions ?? 0} active
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload and configure a background audio loop that plays continuously during all voice calls at a low volume
              </p>

              {/* Current File Info */}
              {backgroundAudioSettings?.fileName && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Current file: {backgroundAudioSettings.fileName}</p>
                      {backgroundAudioSettings.uploadedAt && (
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(backgroundAudioSettings.uploadedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!backgroundAudioSettings?.fileName && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No background audio file uploaded yet. Upload a file below to enable background audio mixing.
                  </AlertDescription>
                </Alert>
              )}

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="audio-upload">Upload Audio File</Label>
                <div className="flex gap-2">
                  <Input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    disabled={uploadingAudio}
                    data-testid="input-audio-upload"
                  />
                  <Button
                    variant="outline"
                    disabled={uploadingAudio}
                    onClick={() => document.getElementById('audio-upload')?.click()}
                    data-testid="button-upload-audio"
                  >
                    {uploadingAudio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload any audio format. It will be automatically converted to 16-bit PCM 16kHz mono for optimal mixing.
                </p>
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Background Volume</Label>
                  <span className="text-sm text-muted-foreground">
                    {backgroundAudioSettings?.volumeDb ?? -25} dB
                  </span>
                </div>
                <Slider
                  min={-40}
                  max={-10}
                  step={1}
                  value={[backgroundAudioSettings?.volumeDb ?? -25]}
                  onValueChange={(value) => updateVolumeMutation.mutate(value[0])}
                  disabled={!backgroundAudioSettings?.fileName}
                  data-testid="slider-background-volume"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Adjust the background audio volume relative to voice speech. Lower values (e.g., -30dB) are more subtle.
                </p>
              </div>

              {/* WebSocket Endpoint Info */}
              {backgroundAudioSettings?.websocketUrl && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>WebSocket Proxy Endpoint</Label>
                  <div className="flex gap-2">
                    <Input
                      value={backgroundAudioSettings.websocketUrl}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-websocket-url"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(backgroundAudioSettings.websocketUrl);
                        toast({
                          title: "Copied",
                          description: "WebSocket URL copied to clipboard",
                        });
                      }}
                      data-testid="button-copy-websocket-url"
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this URL in your Twilio TwiML &lt;Stream&gt; to route calls through the background audio mixer
                  </p>
                </div>
              )}

              {/* Active Sessions */}
              {backgroundAudioSettings?.activeSessions !== undefined && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Call Sessions</span>
                    <Badge variant={backgroundAudioSettings.activeSessions > 0 ? "default" : "outline"}>
                      {backgroundAudioSettings.activeSessions}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of live calls currently being routed through the proxy with background audio
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Reusable component for displaying a single placeholder field
function PlaceholderField({ name, description, toast }: { name: string; description: string; toast: any }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(description);
    toast({
      title: "Copied",
      description: `Placeholder "${name}" copied to clipboard`,
    });
  };

  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 hover-elevate">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-background px-2 py-1 rounded">{name}</code>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        data-testid={`button-copy-${name}`}
        className="shrink-0"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
