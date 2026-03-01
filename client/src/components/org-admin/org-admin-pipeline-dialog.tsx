import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function OrgAdminPipelineDialog(props: any) {
  const p = props;

  return (
    <Dialog open={p.isPipelineDialogOpen} onOpenChange={(open) => {
      if (!open) {
        p.setIsPipelineDialogOpen(false);
        p.setEditingPipeline(null);
        p.pipelineForm.reset();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{p.editingPipeline ? "Edit Pipeline" : "Create Pipeline"}</DialogTitle>
          <DialogDescription>
            {p.editingPipeline
              ? "Update the pipeline details below"
              : "Configure your new workflow pipeline"}
          </DialogDescription>
        </DialogHeader>
        <Form {...p.pipelineForm}>
          <form onSubmit={p.pipelineForm.handleSubmit(p.handlePipelineSubmit)} className="space-y-4">
            <FormField
              control={p.pipelineForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Sales Outreach"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!p.editingPipeline) {
                          p.pipelineForm.setValue("slug", p.generateSlug(e.target.value));
                        }
                      }}
                      data-testid="input-pipeline-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.pipelineForm.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="sales-outreach"
                      {...field}
                      data-testid="input-pipeline-slug"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.pipelineForm.control}
              name="pipelineType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-pipeline-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {p.pipelineTypes.map((type: any) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={p.pipelineForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this pipeline is for..."
                      {...field}
                      data-testid="input-pipeline-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-4">AI Configuration</h4>

              <FormField
                control={p.pipelineForm.control}
                name="voiceAgentId"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel>Voice Agent (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-voice-agent">
                          <SelectValue placeholder="Select a voice agent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {p.voiceAgentsData?.agents?.map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} {agent.isDefault && "(Default)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      ElevenLabs voice agent for AI calls in this pipeline
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={p.pipelineForm.control}
                name="aiPromptTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Prompt Template (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the AI prompt template for voice calls in this pipeline..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="input-ai-prompt-template"
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      System prompt for AI voice calls. Use placeholders like {"{{clientName}}"}, {"{{companyName}}"}.
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={p.pipelineForm.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable or disable this pipeline
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-pipeline-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  p.setIsPipelineDialogOpen(false);
                  p.setEditingPipeline(null);
                  p.pipelineForm.reset();
                }}
                data-testid="button-cancel-pipeline-dialog"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={p.createPipelineMutation.isPending || p.updatePipelineMutation.isPending}
                data-testid="button-submit-pipeline"
                data-primary="true"
              >
                {(p.createPipelineMutation.isPending || p.updatePipelineMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {p.editingPipeline ? "Save Changes" : "Create Pipeline"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
