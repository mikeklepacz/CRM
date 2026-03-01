import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { StoreFormData } from "./types";

interface BasicInformationCardProps {
  formData: StoreFormData;
  onInputChange: (field: string, value: string) => void;
}

export function BasicInformationCard({ formData, onInputChange }: BasicInformationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>Core store details and identification</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Store Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => onInputChange("name", e.target.value)} placeholder="Enter store name" data-testid="input-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Input id="type" value={formData.type} onChange={(e) => onInputChange("type", e.target.value)} placeholder="e.g., Dispensary, Headshop" data-testid="input-type" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="link">Profile Link</Label>
          <div className="flex gap-2">
            <Input id="link" value={formData.link} onChange={(e) => onInputChange("link", e.target.value)} placeholder="https://..." className="flex-1" data-testid="input-link" />
            {formData.link && (
              <Button variant="outline" size="icon" asChild>
                <a href={formData.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="about">About</Label>
          <Textarea id="about" value={formData.about} onChange={(e) => onInputChange("about", e.target.value)} placeholder="Store description..." rows={4} data-testid="textarea-about" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member_since">Member Since</Label>
          <Input id="member_since" value={formData.member_since} onChange={(e) => onInputChange("member_since", e.target.value)} placeholder="Date joined" data-testid="input-member-since" />
        </div>
      </CardContent>
    </Card>
  );
}
