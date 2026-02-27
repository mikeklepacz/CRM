import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TenantUser } from "@/components/org-admin/org-admin.types";

type Props = {
  user: TenantUser;
  onSave: (data: Record<string, any>) => void;
  onCancel: () => void;
  isPending: boolean;
};

export function EditUserForm({ user, onSave, onCancel, isPending }: Props) {
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    agentName: user.agentName || "",
    phone: user.phone || "",
    twilioPhoneNumber: user.twilioPhoneNumber || "",
    meetingLink: user.meetingLink || "",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-firstName">First Name</Label>
          <Input
            id="edit-firstName"
            value={formData.firstName}
            onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
            data-testid="input-edit-firstName"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-lastName">Last Name</Label>
          <Input
            id="edit-lastName"
            value={formData.lastName}
            onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
            data-testid="input-edit-lastName"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-agentName">Agent Name</Label>
        <Input
          id="edit-agentName"
          value={formData.agentName}
          onChange={(e) => setFormData((prev) => ({ ...prev, agentName: e.target.value }))}
          placeholder="Name used in WooCommerce/Sheets matching"
          data-testid="input-edit-agentName"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-phone">Personal Phone</Label>
        <Input
          id="edit-phone"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          placeholder="Agent's personal phone number"
          data-testid="input-edit-phone"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-twilioPhoneNumber">Twilio VoIP Number</Label>
        <Input
          id="edit-twilioPhoneNumber"
          value={formData.twilioPhoneNumber}
          onChange={(e) => setFormData((prev) => ({ ...prev, twilioPhoneNumber: e.target.value }))}
          placeholder="+1XXXXXXXXXX (E.164 format)"
          data-testid="input-edit-twilioPhoneNumber"
        />
        <p className="text-xs text-muted-foreground">Assign a Twilio number for in-browser VoIP calling. Leave empty to use tel: links.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-meetingLink">Meeting Link</Label>
        <Input
          id="edit-meetingLink"
          value={formData.meetingLink}
          onChange={(e) => setFormData((prev) => ({ ...prev, meetingLink: e.target.value }))}
          placeholder="Calendly, Google Meet, etc."
          data-testid="input-edit-meetingLink"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-edit">
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)} disabled={isPending} data-testid="button-save-edit">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
