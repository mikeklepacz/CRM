import { InlineAIChatEnhanced } from "@/components/inline-ai-chat-enhanced";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function SalesAssistant() {
  const { isModuleEnabled, isLoading: moduleAccessLoading } = useModuleAccess();
  const [, setLocation] = useLocation();

  const moduleEnabled = isModuleEnabled("assistant");

  if (!moduleAccessLoading && !moduleEnabled) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">Module Not Available</h2>
                <p className="text-muted-foreground">
                  The AI Assistant module is not enabled for your organization. 
                  Contact your administrator to enable this feature.
                </p>
                <Button onClick={() => setLocation('/')} data-testid="button-go-home">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <InlineAIChatEnhanced />
    </div>
  );
}
