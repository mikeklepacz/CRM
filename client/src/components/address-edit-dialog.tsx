
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddressEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: any;
  trackerSheetId: string;
  joinColumn: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function AddressEditDialog({
  open,
  onOpenChange,
  row,
  trackerSheetId,
  joinColumn,
}: AddressEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState(row.Address || row.address || '');
  const [city, setCity] = useState(row.City || row.city || '');
  const [state, setState] = useState(row.State || row.state || '');
  const [phone, setPhone] = useState(row.Phone || row.phone || '');
  const [email, setEmail] = useState(row.Email || row.email || '');
  const [pointOfContact, setPointOfContact] = useState(row['Point of Contact'] || row['point of contact'] || '');

  useEffect(() => {
    if (open) {
      setAddress(row.Address || row.address || '');
      setCity(row.City || row.city || '');
      setState(row.State || row.state || '');
      setPhone(row.Phone || row.phone || '');
      setEmail(row.Email || row.email || '');
      setPointOfContact(row['Point of Contact'] || row['point of contact'] || '');
    }
  }, [open, row]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const linkValue = row[joinColumn];

      return await apiRequest("PUT", `/api/sheets/${trackerSheetId}/update-address`, {
        linkValue,
        joinColumn,
        rowIndex: row._trackerRowIndex,
        address,
        city,
        state,
        phone,
        email,
        pointOfContact,
      });
    },
    onSuccess: () => {
      toast({
        title: "Address updated",
        description: "Address information saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Address Information</DialogTitle>
          <DialogDescription>
            Update the address and contact details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((stateCode) => (
                    <SelectItem key={stateCode} value={stateCode}>
                      {stateCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              type="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="point-of-contact">Point of Contact</Label>
            <Input
              id="point-of-contact"
              value={pointOfContact}
              onChange={(e) => setPointOfContact(e.target.value)}
              placeholder="Contact person name"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-primary="true">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
