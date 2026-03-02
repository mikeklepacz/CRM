import { Button } from "@/components/ui/button";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Database, Loader2, Phone, RefreshCw } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { agentSchema } from "./voice-settings-schemas";
import type { Agent, PhoneNumber, Project } from "./voice-settings-types";
import { AddAgentDialog } from "./add-agent-dialog";
import { EditAgentDialog } from "./edit-agent-dialog";
import { VoiceAgentsList } from "./voice-agents-list";

export function VoiceAgentsSection({
  isAddAgentOpen,
  setIsAddAgentOpen,
  editingAgent,
  setEditingAgent,
  agentForm,
  createAgentMutation,
  updateAgentMutation,
  deleteAgentMutation,
  setDefaultMutation,
  syncPhoneNumbersMutation,
  syncAgentSettingsMutation,
  isSuperAdminMode,
  projects,
  phoneNumbers,
  agents,
}: {
  isAddAgentOpen: boolean;
  setIsAddAgentOpen: (open: boolean) => void;
  editingAgent: Agent | null;
  setEditingAgent: (agent: Agent | null) => void;
  agentForm: UseFormReturn<z.infer<typeof agentSchema>>;
  createAgentMutation: any;
  updateAgentMutation: any;
  deleteAgentMutation: any;
  setDefaultMutation: any;
  syncPhoneNumbersMutation: any;
  syncAgentSettingsMutation: any;
  isSuperAdminMode: boolean;
  projects: Project[];
  phoneNumbers: PhoneNumber[];
  agents: Agent[];
}) {
  return (
    <AccordionItem value="voice-agents" className="border rounded-lg">
      <AccordionTrigger
        className="px-6 hover:no-underline"
        data-testid="accordion-voice-agents"
      >
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
            <AddAgentDialog
              isOpen={isAddAgentOpen}
              onOpenChange={setIsAddAgentOpen}
              agentForm={agentForm}
              createAgentMutation={createAgentMutation}
              isSuperAdminMode={isSuperAdminMode}
              projects={projects}
              phoneNumbers={phoneNumbers}
            />

            <Button
              variant="outline"
              onClick={() => syncPhoneNumbersMutation.mutate()}
              disabled={syncPhoneNumbersMutation.isPending}
              data-testid="button-sync-phone-numbers"
            >
              {syncPhoneNumbersMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Phone Numbers
            </Button>

            <Button
              variant="outline"
              onClick={() => syncAgentSettingsMutation.mutate()}
              disabled={syncAgentSettingsMutation.isPending}
              data-testid="button-sync-agent-settings"
            >
              {syncAgentSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Sync Agent Settings
            </Button>

            <EditAgentDialog
              editingAgent={editingAgent}
              onOpenChange={(open) => !open && setEditingAgent(null)}
              agentForm={agentForm}
              updateAgentMutation={updateAgentMutation}
              isSuperAdminMode={isSuperAdminMode}
              projects={projects}
              phoneNumbers={phoneNumbers}
            />
          </div>

          <VoiceAgentsList
            agents={agents}
            isSuperAdminMode={isSuperAdminMode}
            setEditingAgent={setEditingAgent}
            agentForm={agentForm}
            setDefaultMutation={setDefaultMutation}
            deleteAgentMutation={deleteAgentMutation}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
