import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Note } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ClientNotesDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientNotesDialog({ clientId, open, onOpenChange }: ClientNotesDialogProps) {
  const [content, setContent] = useState("");
  const [isFollowUp, setIsFollowUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery<Note[]>({
    queryKey: ["/api/clients", clientId, "notes"],
    enabled: open,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/clients/${clientId}/notes`, {
        content,
        isFollowUp,
      });
    },
    onSuccess: () => {
      toast({
        title: "Note added",
        description: "Your note has been saved",
      });
      setContent("");
      setIsFollowUp(false);
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "notes"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to add note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Empty note",
        description: "Please enter some content",
        variant: "destructive",
      });
      return;
    }
    addNoteMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Client Notes & Follow-ups</DialogTitle>
          <DialogDescription>
            Add notes and track follow-up activities for this client
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes && notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{note.content}</p>
                    {note.isFollowUp && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Follow-up
                      </span>
                    )}
                  </div>
                  {note.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No notes yet
            </div>
          )}
        </div>

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="note-content">Add Note</Label>
            <Textarea
              id="note-content"
              placeholder="Enter your note or follow-up details..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              data-testid="textarea-note-content"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-followup"
              checked={isFollowUp}
              onCheckedChange={(checked) => setIsFollowUp(checked === true)}
              data-testid="checkbox-is-followup"
            />
            <Label htmlFor="is-followup" className="text-sm font-normal cursor-pointer">
              Mark as follow-up completed
            </Label>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={addNoteMutation.isPending || !content.trim()}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Note'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
