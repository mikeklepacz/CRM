import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StoreDetailsSalesContactStatus(props: any) {
  const p = props;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="point_of_contact">Point of Contact</Label>
          <Input
            id="point_of_contact"
            data-testid="input-point-of-contact"
            value={p.formData.point_of_contact}
            onChange={(e) => p.handleInputChange("point_of_contact", e.target.value)}
            placeholder="Primary contact person"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poc_email">POC Email</Label>
          <Input
            id="poc_email"
            data-testid="input-poc-email"
            type="email"
            value={p.formData.poc_email}
            onChange={(e) => p.handleInputChange("poc_email", e.target.value)}
            placeholder="contact@store.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poc_phone">POC Phone</Label>
          <Input
            id="poc_phone"
            data-testid="input-poc-phone"
            type="tel"
            value={p.formData.poc_phone}
            onChange={(e) => p.handleInputChange("poc_phone", e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t">
        <Label htmlFor="status">Status</Label>
        <Select value={p.formData.status} onValueChange={(value) => p.handleInputChange("status", value)}>
          <SelectTrigger
            id="status"
            data-testid="select-status"
            style={
              p.formData.status && p.statusColors[p.formData.status]
                ? {
                    backgroundColor: p.statusColors[p.formData.status].background,
                    color: p.statusColors[p.formData.status].text,
                  }
                : undefined
            }
          >
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {p.statusOptions.map((status: string) => {
              const colors = p.statusColors[status];
              return (
                <SelectItem
                  key={status}
                  value={status}
                  data-testid={`status-option-${status.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  style={{
                    backgroundColor: colors?.background || "transparent",
                    color: colors?.text || "inherit",
                  }}
                >
                  {status}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
