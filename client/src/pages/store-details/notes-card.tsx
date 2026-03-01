import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesCardProps {
  notesData: any[];
  newNote: string;
  isFollowUp: boolean;
  isAddingNote: boolean;
  onNewNoteChange: (value: string) => void;
  onFollowUpChange: (value: boolean) => void;
  onAddNote: () => void;
}

export function NotesCard({ notesData, newNote, isFollowUp, isAddingNote, onNewNoteChange, onFollowUpChange, onAddNote }: NotesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>Add notes and follow-up reminders for this store</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {notesData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet. Add your first note below.</p>
          ) : (
            notesData.map((note: any) => (
              <div key={note.id} className="border rounded-lg p-3 space-y-2" data-testid={`note-${note.id}`}>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                  {note.isFollowUp && <span className="text-red-600 dark:text-red-400 font-medium">Follow-up Required</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3 pt-4 border-t">
          <Label htmlFor="new-note">Add New Note</Label>
          <Textarea id="new-note" value={newNote} onChange={(e) => onNewNoteChange(e.target.value)} placeholder="Enter your note..." rows={3} data-testid="textarea-new-note" />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="follow-up" checked={isFollowUp} onCheckedChange={(checked) => onFollowUpChange(checked as boolean)} data-testid="checkbox-follow-up" />
              <Label htmlFor="follow-up" className="text-sm font-normal cursor-pointer">
                Mark as follow-up
              </Label>
            </div>
            <Button onClick={onAddNote} disabled={isAddingNote || !newNote.trim()} data-testid="button-add-note">
              {isAddingNote ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Note"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
