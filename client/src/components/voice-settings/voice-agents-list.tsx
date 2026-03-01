import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Star, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { agentSchema } from "./voice-settings-schemas";
import type { Agent } from "./voice-settings-types";

export function VoiceAgentsList({
  agents,
  isSuperAdminMode,
  setEditingAgent,
  agentForm,
  setDefaultMutation,
  deleteAgentMutation,
}: {
  agents: Agent[];
  isSuperAdminMode: boolean;
  setEditingAgent: (agent: Agent | null) => void;
  agentForm: UseFormReturn<z.infer<typeof agentSchema>>;
  setDefaultMutation: any;
  deleteAgentMutation: any;
}) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No agents configured yet. Add your first agent to get started.</p>
      </div>
    );
  }

  return (
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
            <p className="text-sm text-muted-foreground mb-1">
              Agent ID: {agent.agent_id}
              {agent.projectName && (
                <Badge variant="outline" className="ml-2">
                  {agent.projectName}
                </Badge>
              )}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Phone: {agent.phone_number || <span className="text-destructive">Not assigned</span>}
              {agent.phone_label && <span className="ml-1">({agent.phone_label})</span>}
            </p>
            {agent.description && (
              <p className="text-sm text-muted-foreground">{agent.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {isSuperAdminMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAgent(agent);
                  agentForm.reset({
                    name: agent.name,
                    agentId: agent.agent_id,
                    description: agent.description || "",
                    projectId: agent.projectId || "__none__",
                    phoneNumberId: agent.phone_number_id || "__none__",
                  });
                }}
                data-testid={`button-edit-agent-${agent.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
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
  );
}
