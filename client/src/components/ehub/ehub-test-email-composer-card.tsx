import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

type EhubTestEmailComposerCardProps = {
  body: string;
  isPending: boolean;
  onBodyChange: (value: string) => void;
  onRecipientChange: (value: string) => void;
  onSend: () => void;
  onSubjectChange: (value: string) => void;
  recipientEmail: string;
  subject: string;
};

export function EhubTestEmailComposerCard({
  body,
  isPending,
  onBodyChange,
  onRecipientChange,
  onSend,
  onSubjectChange,
  recipientEmail,
  subject,
}: EhubTestEmailComposerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Test Email Composer</CardTitle>
        <CardDescription>
          Send instant test emails to verify threading and reply detection (bypasses queue)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="test-recipient-email">Recipient Email</Label>
            <Input
              id="test-recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(e) => onRecipientChange(e.target.value)}
              placeholder="recipient@example.com"
              data-testid="input-test-recipient"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="test-subject">Subject</Label>
            <Input
              id="test-subject"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              placeholder="Email subject line"
              data-testid="input-test-subject"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="test-body">Email Body (HTML)</Label>
            <Textarea
              id="test-body"
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="Email body content (HTML supported)"
              rows={6}
              data-testid="input-test-body"
            />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">No rate limit - unlimited testing</p>
          <Button
            onClick={onSend}
            disabled={!recipientEmail || !subject || !body || isPending}
            data-testid="button-send-test"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Send Test Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
