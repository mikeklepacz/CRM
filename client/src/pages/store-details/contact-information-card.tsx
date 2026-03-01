import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { StoreFormData } from "./types";

interface ContactInformationCardProps {
  formData: StoreFormData;
  onInputChange: (field: string, value: string) => void;
}

export function ContactInformationCard({ formData, onInputChange }: ContactInformationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>How to reach this store</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" value={formData.phone} onChange={(e) => onInputChange("phone", e.target.value)} placeholder="(555) 123-4567" data-testid="input-phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => onInputChange("email", e.target.value)} placeholder="contact@store.com" data-testid="input-email" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <div className="flex gap-2">
            <Input id="website" value={formData.website} onChange={(e) => onInputChange("website", e.target.value)} placeholder="https://www.store.com" className="flex-1" data-testid="input-website" />
            {formData.website && (
              <Button variant="outline" size="icon" asChild>
                <a href={formData.website.startsWith("http") ? formData.website : `https://${formData.website}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
