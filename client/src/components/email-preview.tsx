import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface EmailPreviewProps {
  subject: string;
  to: string;
  body: string;
  clientLink?: string | null;
}

export function EmailPreview({ subject, to, body, clientLink }: EmailPreviewProps) {
  const { toast } = useToast();
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // Fetch Gmail connection status
  const { data: integrationStatus } = useQuery<{
    googleCalendarConnected: boolean;
    googleSheetsConnected: boolean;
  }>({
    queryKey: ["/api/integrations/status"],
  });

  // Fetch user data directly to ensure we get the latest email preference
  const { data: userData } = useQuery<{
    emailPreference?: string;
  }>({
    queryKey: ["/api/auth/user"],
  });

  // Get user's email preference (default to mailto)
  const emailPreference = userData?.emailPreference || 'mailto';
  const gmailConnected = integrationStatus?.googleCalendarConnected || false;

  const handleCreateDraft = async () => {
    try {
      // Check for ANY bracket-style placeholders (broadened to catch all variants)
      const anyBracketPattern = /\[[^\]]+\]/;
      
      // Validate "To" field
      if (!to || !to.includes('@')) {
        toast({
          title: "Invalid Email Address",
          description: "Please provide a valid email address.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for ANY bracket-style placeholders in To field
      if (anyBracketPattern.test(to)) {
        toast({
          title: "Invalid Placeholder Format",
          description: "Email contains bracket-style placeholders like [recipient email]. The AI should use {{email}} format instead. Please try regenerating the email.",
          variant: "destructive",
        });
        return;
      }
      
      // Check for unreplaced mustache placeholders in To field
      if (to.includes('{{') || to.includes('}}')) {
        toast({
          title: "Unreplaced Placeholder",
          description: "Email contains {{placeholder}} that wasn't replaced with an actual value. Please check the store has an email address.",
          variant: "destructive",
        });
        return;
      }
      
      // Block bracket-style placeholders in subject or body (blocking, not warning)
      if (anyBracketPattern.test(subject) || anyBracketPattern.test(body)) {
        toast({
          title: "Invalid Placeholder Format",
          description: "Email contains bracket-style placeholders. The AI should use {{storeName}} format instead. Please try regenerating the email.",
          variant: "destructive",
        });
        return;
      }

      setIsCreatingDraft(true);
      const response = await apiRequest("POST", "/api/gmail/create-draft", {
        to,
        subject,
        body,
        clientLink: clientLink || null,
      });
      
      // Auto-enroll in Manual Follow-Ups if clientLink present
      try {
        await apiRequest("POST", "/api/email-drafts", {
          recipientEmail: to,
          subject,
          body,
          clientLink: clientLink || null,
        });
      } catch (error) {
        console.error('Failed to enroll in Manual Follow-Ups:', error);
      }
      
      // Check if labels were applied successfully
      if (response.labelWarning) {
        toast({
          title: "Draft Created with Warning",
          description: response.labelWarning,
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: response.message || "Gmail draft created successfully! Check your Gmail drafts folder.",
        });
      }
    } catch (error: any) {
      console.error("Failed to create Gmail draft:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Gmail draft. Make sure Gmail is connected in Settings.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDraft(false);
    }
  };

  // Generate mailto link
  const mailtoLink = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Auto-enroll in Manual Follow-Ups when mailto clicked
  const handleMailtoClick = async () => {
    try {
      await apiRequest("POST", "/api/email-drafts", {
        recipientEmail: to,
        subject,
        body,
        clientLink: clientLink || null,
      });
    } catch (error) {
      console.error('Failed to enroll in Manual Follow-Ups:', error);
    }
  };

  return (
    <Card className="mt-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Draft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">To:</div>
          <div className="text-sm">{to}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Subject:</div>
          <div className="text-sm">{subject}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-1">Body:</div>
          <div className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded border">
            {body}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {emailPreference === 'gmail_draft' && gmailConnected ? (
            <Button
              onClick={handleCreateDraft}
              disabled={isCreatingDraft}
              className="flex-1"
              data-testid="button-create-gmail-draft"
            >
              {isCreatingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Draft...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Create Gmail Draft
                </>
              )}
            </Button>
          ) : emailPreference === 'gmail_draft' && !gmailConnected ? (
            <>
              <Button
                onClick={handleCreateDraft}
                disabled={true}
                className="flex-1"
                data-testid="button-create-gmail-draft"
                title="Gmail not connected - Connect Gmail in Settings"
              >
                <Mail className="h-4 w-4 mr-2" />
                Create Gmail Draft (Unavailable)
              </Button>
              <Button
                variant="outline"
                asChild
                className="flex-1"
                data-testid="button-open-mailto"
              >
                <a href={mailtoLink} onClick={handleMailtoClick} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Email Client
                </a>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              asChild
              className="flex-1"
              data-testid="button-open-mailto"
            >
              <a href={mailtoLink} onClick={handleMailtoClick} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Email Client
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
