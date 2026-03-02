import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { agentSchema } from "./voice-settings-schemas";
import type { PhoneNumber, Project } from "./voice-settings-types";

export function AddAgentDialog({
  isOpen,
  onOpenChange,
  agentForm,
  createAgentMutation,
  isSuperAdminMode,
  projects,
  phoneNumbers,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agentForm: UseFormReturn<z.infer<typeof agentSchema>>;
  createAgentMutation: any;
  isSuperAdminMode: boolean;
  projects: Project[];
  phoneNumbers: PhoneNumber[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          <form
            onSubmit={agentForm.handleSubmit((data) =>
              createAgentMutation.mutate({
                ...data,
                projectId: data.projectId === "__none__" ? "" : data.projectId,
                phoneNumberId:
                  data.phoneNumberId === "__none__" ? "" : data.phoneNumberId,
              }),
            )}
            className="space-y-4"
          >
            <FormField
              control={agentForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Sales Cold Caller"
                      data-testid="input-agent-name"
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this agent (e.g., "Sales Cold Caller",
                    "Follow-up Agent")
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
                    <Input
                      {...field}
                      placeholder="abc123..."
                      data-testid="input-agent-id"
                    />
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
                    <Textarea
                      {...field}
                      placeholder="Used for initial cold calls to new leads"
                      data-testid="input-agent-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSuperAdminMode && projects.length > 0 && (
              <FormField
                control={agentForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Project</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-agent-project">
                          <SelectValue placeholder="Select a project (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          No project (tenant-wide)
                        </SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign this agent to a specific project, or leave blank for
                      tenant-wide availability
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={agentForm.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-agent-phone">
                        <SelectValue placeholder="Select a phone number (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Not assigned</SelectItem>
                      {phoneNumbers.map((phone) => (
                        <SelectItem
                          key={phone.phoneNumberId}
                          value={phone.phoneNumberId}
                        >
                          {phone.phoneNumber}
                          {phone.label ? ` (${phone.label})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a phone number for outbound calls
                  </FormDescription>
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
  );
}
