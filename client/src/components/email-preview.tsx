import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EmailPreviewProps {
  subject: string;
  to: string;
  body: string;
}

export function EmailPreview({ subject, to, body }: EmailPreviewProps) {
  const { toast } = useToast();
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  const handleCreateDraft = async () => {
    try {
      setIsCreatingDraft(true);
      const response = await apiRequest("POST", "/api/gmail/create-draft", {
        to,
        subject,
        body,
      });
      
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
          <Button
            variant="outline"
            asChild
            className="flex-1"
            data-testid="button-open-mailto"
          >
            <a href={mailtoLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Email Client
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
