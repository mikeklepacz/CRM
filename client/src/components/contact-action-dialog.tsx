import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ContactActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactType: 'phone' | 'email';
  contactValue: string;
  row: any;
  trackerSheetId: string;
  joinColumn: string;
  userEmail: string;
}

const statusOptions = [
  '1 – Contacted',
  '2 – Interested',
  '3 – Sample Sent',
  '4 – Follow-Up',
  '5 – Closed Won',
  '6 – Closed Lost',
];

export function ContactActionDialog({
  open,
  onOpenChange,
  contactType,
  contactValue,
  row,
  trackerSheetId,
  joinColumn,
  userEmail,
}: ContactActionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState(row.Status || row.status || '');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [nextAction, setNextAction] = useState('');
  const [notes, setNotes] = useState('');
  const [pointOfContact, setPointOfContact] = useState('');
  const [email, setEmail] = useState(contactType === 'email' ? contactValue : (row.Email || row.email || ''));
  const [phone, setPhone] = useState(contactType === 'phone' ? contactValue : (row.Phone || row.phone || ''));

  // Trigger phone call or email when dialog opens
  useEffect(() => {
    if (open) {
      if (contactType === 'phone') {
        window.location.href = `tel:${contactValue}`;
      } else {
        window.location.href = `mailto:${contactValue}`;
      }
    }
  }, [open, contactType, contactValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const linkValue = row[joinColumn];

      // If row doesn't have tracker data, claim it first
      if (!row._trackerRowIndex) {
        return await apiRequest("POST", `/api/sheets/${trackerSheetId}/claim-store-with-contact`, {
          linkValue,
          joinColumn,
          agent: userEmail,
          status,
          followUpDate: followUpDate ? format(followUpDate, 'M/d/yyyy') : '',
          nextAction,
          notes,
          pointOfContact,
        });
      } else {
        // Update existing tracker row
        return await apiRequest("PUT", `/api/sheets/${trackerSheetId}/update-contact-action`, {
          rowIndex: row._trackerRowIndex,
          status,
          followUpDate: followUpDate ? format(followUpDate, 'M/d/yyyy') : '',
          nextAction,
          notes,
          pointOfContact,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Contact action saved",
        description: "Contact information logged successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["merged-data"] });
      onOpenChange(false);

      // Trigger the contact method after dialog closes
      setTimeout(() => {
        if (contactType === 'phone') {
          window.location.href = `tel:${phone}`;
        } else {
          window.location.href = `mailto:${email}`;
        }
      }, 100);
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

  // Extract sales summary from row
  const salesSummary = row['Sales-ready Summary'] || row['sales-ready summary'] || row.sales_ready_summary || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Log {contactType === 'phone' ? 'Call' : 'Email'} Activity
          </DialogTitle>
          <DialogDescription>
            Record your contact with {contactValue}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {salesSummary && (
            <Card data-testid="card-sales-summary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sales-ready Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{salesSummary}</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="followup">Follow-up Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="followup"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {followUpDate ? format(followUpDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={followUpDate}
                  onSelect={setFollowUpDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next-action">Next Action</Label>
            <Input
              id="next-action"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="What should happen next?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="point-of-contact">Point of Contact</Label>
            <Input
              id="point-of-contact"
              value={pointOfContact}
              onChange={(e) => setPointOfContact(e.target.value)}
              placeholder="Who did you speak with?"
            />
          </div>

          {contactType === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
              />
            </div>
          )}

          {contactType === 'phone' && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this contact..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
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