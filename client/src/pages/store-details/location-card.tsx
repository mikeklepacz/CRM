import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { StoreFormData } from "./types";

interface LocationCardProps {
  formData: StoreFormData;
  onInputChange: (field: string, value: string) => void;
}

export function LocationCard({ formData, onInputChange }: LocationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <CardDescription>Physical address details</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="address">Street Address</Label>
          <Input id="address" value={formData.address} onChange={(e) => onInputChange("address", e.target.value)} placeholder="123 Main St" data-testid="input-address" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={formData.city} onChange={(e) => onInputChange("city", e.target.value)} placeholder="City" data-testid="input-city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={formData.state} onChange={(e) => onInputChange("state", e.target.value)} placeholder="State" data-testid="input-state" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
