import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { StoreFormData } from "./types";

interface AdditionalDetailsCardProps {
  formData: StoreFormData;
  onInputChange: (field: string, value: string) => void;
}

export function AdditionalDetailsCard({ formData, onInputChange }: AdditionalDetailsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Details</CardTitle>
        <CardDescription>Extra information and metadata</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="hours">Hours</Label>
          <Textarea id="hours" value={formData.hours} onChange={(e) => onInputChange("hours", e.target.value)} placeholder="Business hours..." rows={3} data-testid="textarea-hours" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="followers">Followers</Label>
            <Input id="followers" value={formData.followers} onChange={(e) => onInputChange("followers", e.target.value)} placeholder="Number of followers" data-testid="input-followers" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vibe_score">Vibe Score</Label>
            <Input id="vibe_score" value={formData.vibe_score} onChange={(e) => onInputChange("vibe_score", e.target.value)} placeholder="Score" data-testid="input-vibe-score" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sales_ready_summary">Sales-ready Summary</Label>
          <Textarea
            id="sales_ready_summary"
            value={formData.sales_ready_summary}
            onChange={(e) => onInputChange("sales_ready_summary", e.target.value)}
            placeholder="Summary for sales team..."
            rows={4}
            data-testid="textarea-sales-ready-summary"
          />
        </div>
      </CardContent>
    </Card>
  );
}
