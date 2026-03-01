import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { QualificationCampaign, QualificationLead } from '@shared/schema';

type NewLeadForm = {
  company: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  website: string;
  source: string;
  notes: string;
  campaignId: string;
};

type AddLeadDialogProps = {
  isAddLeadOpen: boolean;
  setIsAddLeadOpen: (open: boolean) => void;
  newLead: NewLeadForm;
  setNewLead: React.Dispatch<React.SetStateAction<NewLeadForm>>;
  campaigns: QualificationCampaign[];
  isCreatePending: boolean;
  onCreate: () => void;
};

export function AddLeadDialog({
  isAddLeadOpen,
  setIsAddLeadOpen,
  newLead,
  setNewLead,
  campaigns,
  isCreatePending,
  onCreate,
}: AddLeadDialogProps) {
  return (
    <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Enter the lead information below</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name</Label>
            <Input id="company" value={newLead.company} onChange={(e) => setNewLead((prev) => ({ ...prev, company: e.target.value }))} placeholder="Acme Corp" data-testid="input-company" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={newLead.website} onChange={(e) => setNewLead((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://example.com" data-testid="input-website" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pocName">Contact Name</Label>
            <Input id="pocName" value={newLead.pocName} onChange={(e) => setNewLead((prev) => ({ ...prev, pocName: e.target.value }))} placeholder="John Doe" data-testid="input-poc-name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pocEmail">Contact Email</Label>
            <Input id="pocEmail" type="email" value={newLead.pocEmail} onChange={(e) => setNewLead((prev) => ({ ...prev, pocEmail: e.target.value }))} placeholder="john@example.com" data-testid="input-poc-email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pocPhone">Contact Phone</Label>
            <Input id="pocPhone" value={newLead.pocPhone} onChange={(e) => setNewLead((prev) => ({ ...prev, pocPhone: e.target.value }))} placeholder="+1 555-1234" data-testid="input-poc-phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Lead Source</Label>
            <Input id="source" value={newLead.source} onChange={(e) => setNewLead((prev) => ({ ...prev, source: e.target.value }))} placeholder="Website, Referral, etc." data-testid="input-source" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={newLead.address} onChange={(e) => setNewLead((prev) => ({ ...prev, address: e.target.value }))} placeholder="123 Main St" data-testid="input-address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={newLead.city} onChange={(e) => setNewLead((prev) => ({ ...prev, city: e.target.value }))} placeholder="New York" data-testid="input-city" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" value={newLead.state} onChange={(e) => setNewLead((prev) => ({ ...prev, state: e.target.value }))} placeholder="NY" data-testid="input-state" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={newLead.country} onChange={(e) => setNewLead((prev) => ({ ...prev, country: e.target.value }))} placeholder="e.g. USA, Canada, UK" data-testid="input-country" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign">Campaign</Label>
            <Select value={newLead.campaignId || '__none__'} onValueChange={(value) => setNewLead((prev) => ({ ...prev, campaignId: value === '__none__' ? '' : value }))}>
              <SelectTrigger data-testid="select-campaign">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Campaign</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={newLead.notes} onChange={(e) => setNewLead((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Additional notes about this lead..." data-testid="input-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddLeadOpen(false)} data-testid="button-cancel-add">Cancel</Button>
          <Button onClick={onCreate} disabled={isCreatePending} data-testid="button-submit-add">
            {isCreatePending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditLeadDialogProps = {
  isEditLeadOpen: boolean;
  setIsEditLeadOpen: (open: boolean) => void;
  editingLead: QualificationLead | null;
  setEditingLead: React.Dispatch<React.SetStateAction<QualificationLead | null>>;
  campaigns: QualificationCampaign[];
  isUpdatePending: boolean;
  onUpdate: () => void;
};

export function EditLeadDialog({
  isEditLeadOpen,
  setIsEditLeadOpen,
  editingLead,
  setEditingLead,
  campaigns,
  isUpdatePending,
  onUpdate,
}: EditLeadDialogProps) {
  return (
    <Dialog
      open={isEditLeadOpen}
      onOpenChange={(open) => {
        setIsEditLeadOpen(open);
        if (!open) setEditingLead(null);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>Update lead information</DialogDescription>
        </DialogHeader>
        {editingLead && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Company Name</Label><Input value={editingLead.company || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, company: e.target.value } : null))} placeholder="Acme Corp" data-testid="input-edit-company" /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={editingLead.website || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, website: e.target.value } : null))} placeholder="https://example.com" data-testid="input-edit-website" /></div>
            <div className="space-y-2"><Label>Contact Name</Label><Input value={editingLead.pocName || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, pocName: e.target.value } : null))} placeholder="John Doe" data-testid="input-edit-poc-name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={editingLead.pocEmail || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, pocEmail: e.target.value } : null))} placeholder="john@example.com" data-testid="input-edit-poc-email" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={editingLead.pocPhone || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, pocPhone: e.target.value } : null))} placeholder="+1 555-1234" data-testid="input-edit-poc-phone" /></div>
            <div className="space-y-2"><Label>City</Label><Input value={editingLead.city || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, city: e.target.value } : null))} placeholder="New York" data-testid="input-edit-city" /></div>
            <div className="space-y-2"><Label>State</Label><Input value={editingLead.state || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, state: e.target.value } : null))} placeholder="NY" data-testid="input-edit-state" /></div>
            <div className="space-y-2"><Label>Country</Label><Input value={editingLead.country || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, country: e.target.value } : null))} placeholder="e.g. USA, Canada, UK" data-testid="input-edit-country" /></div>
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={editingLead.campaignId || '__none__'} onValueChange={(value) => setEditingLead((prev) => (prev ? { ...prev, campaignId: value === '__none__' ? null : value } : null))}>
                <SelectTrigger data-testid="select-edit-campaign"><SelectValue placeholder="Select a campaign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No Campaign</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editingLead.status || 'new'} onValueChange={(value) => setEditingLead((prev) => (prev ? { ...prev, status: value } : null))}>
                <SelectTrigger data-testid="select-edit-status"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="disqualified">Disqualified</SelectItem>
                  <SelectItem value="exported">Exported</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2"><Label>Notes</Label><Textarea value={editingLead.notes || ''} onChange={(e) => setEditingLead((prev) => (prev ? { ...prev, notes: e.target.value } : null))} placeholder="Additional notes..." data-testid="input-edit-notes" /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditLeadOpen(false)} data-testid="button-cancel-edit">Cancel</Button>
          <Button onClick={onUpdate} disabled={isUpdatePending} data-testid="button-submit-edit">
            {isUpdatePending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
