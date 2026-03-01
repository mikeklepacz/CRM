import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TICKET_CATEGORIES } from "./types";

interface TicketCreateViewProps {
  category: string;
  createPending: boolean;
  message: string;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  setCategory: (value: string) => void;
  setMessage: (value: string) => void;
  setSubject: (value: string) => void;
  subject: string;
}

export function TicketCreateView({
  category,
  createPending,
  message,
  onCancel,
  onSubmit,
  setCategory,
  setMessage,
  setSubject,
  subject,
}: TicketCreateViewProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue..."
          data-testid="input-subject"
        />
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category" data-testid="select-category">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {TICKET_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Provide details about your feedback, bug report, or question..."
          rows={6}
          data-testid="input-message"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" disabled={createPending} data-testid="button-submit">
          {createPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Ticket
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
