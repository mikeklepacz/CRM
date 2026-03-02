import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Edit, Trash2 } from "lucide-react";
import type { QualificationCampaign } from "@shared/schema";
import type { FieldDefinition } from "@/components/qualification-campaign-management/types";

interface QualificationCampaignListProps {
  campaigns: QualificationCampaign[];
  setIsCreateOpen: (v: boolean) => void;
  copyKnowledgeBasePrompt: (campaign: QualificationCampaign) => void;
  openEdit: (campaign: QualificationCampaign) => void;
  deleteMutation: any;
}

export function QualificationCampaignList({
  campaigns,
  setIsCreateOpen,
  copyKnowledgeBasePrompt,
  openEdit,
  deleteMutation,
}: QualificationCampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No campaigns created yet.</p>
          <Button onClick={() => setIsCreateOpen(true)} className="mt-4" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Campaign
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                {campaign.name}
                {campaign.isActive ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
              </CardTitle>
              {campaign.description && <CardDescription className="mt-1">{campaign.description}</CardDescription>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyKnowledgeBasePrompt(campaign)}
                data-testid={`button-copy-campaign-${campaign.id}`}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy for KB
              </Button>
              <Button variant="outline" size="sm" onClick={() => openEdit(campaign)} data-testid={`button-edit-campaign-${campaign.id}`}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this campaign?")) {
                    deleteMutation.mutate(campaign.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-campaign-${campaign.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {(campaign.fieldDefinitions as FieldDefinition[])?.length || 0} qualification fields defined
            </div>
            {(campaign.fieldDefinitions as FieldDefinition[])?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(campaign.fieldDefinitions as FieldDefinition[]).map((field, idx) => (
                  <Badge key={idx} variant="outline">
                    {field.label} ({field.type})
                    {field.weight && field.weight > 1 && ` [×${field.weight}]`}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
