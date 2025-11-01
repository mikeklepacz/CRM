import { useState } from "react";
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
import { Phone, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Star } from "lucide-react";
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
  agentId: string;
  description?: string;
  isDefault: boolean;
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

  // Config form (API key + Twilio number)
  const configForm = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      apiKey: configData?.apiKey || "",
      twilioNumber: configData?.twilioNumber || "",
    },
  });

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
                      {agent.isDefault && (
                        <Badge variant="default" data-testid="badge-default-agent">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Agent ID: {agent.agentId}
                    </p>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!agent.isDefault && (
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
    </div>
  );
}
