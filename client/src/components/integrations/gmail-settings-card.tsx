import { Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface GmailSettingsCardProps {
  signature: string;
  emailPreference: "gmail_draft" | "mailto";
  isPending: boolean;
  onSignatureChange: (value: string) => void;
  onEmailPreferenceChange: (value: "gmail_draft" | "mailto") => void;
  onSave: () => void;
}

export function GmailSettingsCard({
  signature,
  emailPreference,
  isPending,
  onSignatureChange,
  onEmailPreferenceChange,
  onSave,
}: GmailSettingsCardProps) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Gmail Settings</CardTitle>
            <CardDescription>Customize your email signature for AI-generated emails</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-preference" data-testid="label-email-preference">
            Email Link Preference
          </Label>
          <RadioGroup id="email-preference" value={emailPreference} onValueChange={(value) => onEmailPreferenceChange(value as "gmail_draft" | "mailto")} className="flex flex-col space-y-2" data-testid="radio-email-preference">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gmail_draft" id="gmail-draft" data-testid="radio-gmail-draft" />
              <Label htmlFor="gmail-draft" className="font-normal cursor-pointer">
                Create Gmail Draft (opens draft in Gmail)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mailto" id="mailto" data-testid="radio-mailto" />
              <Label htmlFor="mailto" className="font-normal cursor-pointer">
                Default Email Client (mailto: link)
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">Choose how email links work in the Client Dashboard and AI Assistant</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signature" data-testid="label-signature">
            Email Signature
          </Label>
          <Textarea
            id="signature"
            placeholder="-- &#10;Best Regards,&#10;Michael Klepacz&#10;Let's Meet! Ask me about a zoom call!&#10;Founder - Natural Materials Unlimited&#10;+48 662 331 212 (Whatsapp)&#10;+1 (517) 312-3530 (USA)"
            value={signature}
            onChange={(e) => onSignatureChange(e.target.value)}
            rows={8}
            className="font-mono text-sm resize-y"
            data-testid="textarea-signature"
          />
          <p className="text-xs text-muted-foreground">This signature will be used in all AI-generated emails. Use plain text or simple formatting.</p>
        </div>

        <Button onClick={onSave} disabled={isPending} className="w-full" data-testid="button-save-gmail-settings">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Gmail Settings"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
