import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Lightbulb } from "lucide-react";
import { AlignerChat } from "@/components/aligner-chat";
import { KBLibraryTab } from "@/components/call-manager/kb-library-tab";
import { QualificationCampaignManagement } from "@/components/qualification-campaign-management";

interface CallManagerAdminTabsProps {
  canAccessAdmin: boolean;
}

export function CallManagerAdminTabs({ canAccessAdmin }: CallManagerAdminTabsProps) {
  if (!canAccessAdmin) return null;

  return (
    <>
      {/* Aligner Chat Tab */}
      <TabsContent value="aligner-chat" className="space-y-6">
        <Card data-testid="card-aligner-chat">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Aligner Chat
            </CardTitle>
            <CardDescription>
              Have a conversation with the Aligner about call patterns, KB improvements, and sales strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[600px]">
              <AlignerChat />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* KB Library Tab */}
      <TabsContent value="kb-library" className="space-y-6">
        <KBLibraryTab />
      </TabsContent>

      {/* Campaigns Tab */}
      <TabsContent value="campaigns" className="space-y-6">
        <QualificationCampaignManagement />
      </TabsContent>
    </>
  );
}
