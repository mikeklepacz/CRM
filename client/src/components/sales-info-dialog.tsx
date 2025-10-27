import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ChevronDown } from "lucide-react";
import { QuickReminder } from "./quick-reminder";
import { format } from "date-fns";

interface SalesInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  storeData: {
    link: string;
    notes: string;
    address: string;
    city: string;
    state: string;
    point_of_contact: string;
    poc_email: string;
    poc_phone: string;
    email: string;
    phone: string;
  };
  trackerSheetId: string | null;
  storeSheetId: string | null;
  userPreferences: any;
}

export function SalesInfoDialog({
  open,
  onOpenChange,
  storeName,
  storeData,
  trackerSheetId,
  storeSheetId,
  userPreferences,
}: SalesInfoDialogProps) {
  const [notes, setNotes] = useState(storeData.notes || "");
  const [reminderOpen, setReminderOpen] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation to save notes to Store Database
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!storeSheetId) throw new Error("Store database sheet not found");
      
      return await apiRequest("PUT", `/api/sheets/${storeSheetId}/update-contact-action`, {
        linkValue: storeData.link,
        joinColumn: 'link',
        notes,
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes saved",
        description: "Your notes have been updated in the Store Database",
      });
      queryClient.invalidateQueries({ queryKey: ['merged-data'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save notes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to upsert tracker fields
  const upsertTrackerFieldsMutation = useMutation({
    mutationFn: async ({ updates }: { updates: Record<string, string> }) => {
      return await apiRequest('POST', '/api/sheets/tracker/upsert', {
        link: storeData.link,
        updates,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tracker",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveNotes = () => {
    if (!notes.trim()) {
      toast({
        title: "Empty notes",
        description: "Please enter some notes",
        variant: "destructive",
      });
      return;
    }
    saveNotesMutation.mutate();
  };

  const handleSaveReminder = async (reminderData: any) => {
    try {
      const response = await apiRequest('POST', '/api/reminders', {
        title: `Follow up: ${storeName}`,
        description: reminderData.note,
        reminderDate: reminderData.date.toISOString(),
        reminderTime: reminderData.time,
        storeMetadata: {
          sheetId: trackerSheetId,
          uniqueIdentifier: storeData.link,
          storeName: storeName,
          address: storeData.address,
          city: storeData.city,
          state: storeData.state,
          pointOfContact: storeData.point_of_contact,
          pocEmail: storeData.poc_email || storeData.email,
          pocPhone: storeData.poc_phone || storeData.phone,
        },
        useCustomerTimezone: reminderData.useCustomerTimezone,
        customerTimezone: reminderData.customerTimezone,
        agentTimezone: reminderData.agentTimezone,
        calendarReminders: reminderData.calendarReminders,
      });

      // Update Follow-Up Date and Next Action in tracker sheet
      const followUpDate = format(reminderData.date, 'M/d/yyyy');
      if (trackerSheetId) {
        await upsertTrackerFieldsMutation.mutateAsync({
          updates: {
            'Follow-Up Date': followUpDate,
            'Next Action': reminderData.note,
          }
        });

        toast({
          title: "Reminder Created",
          description: response.warning 
            ? response.warning.message 
            : "Your reminder has been saved and Follow-Up Date updated.",
        });
      } else {
        toast({
          title: "Reminder Created",
          description: "Your reminder has been saved but Follow-Up Date could not be updated (missing tracker sheet).",
        });
      }

      // Invalidate all reminder queries (including agent filters and date queries)
      await queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/reminders');
        }
      });
      await queryClient.invalidateQueries({ queryKey: ['merged-data'] });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create reminder",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Notes & Follow-up - {storeName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              data-testid="textarea-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Call notes, contact info from store worker..."
              rows={6}
            />
            <Button
              onClick={handleSaveNotes}
              disabled={saveNotesMutation.isPending || !notes.trim()}
              data-testid="button-save-notes"
              className="w-full"
            >
              {saveNotesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Notes...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </div>

          {/* Reminder Section */}
          <Collapsible open={reminderOpen} onOpenChange={setReminderOpen} className="pt-4 border-t">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto"
                data-testid="button-toggle-reminder"
              >
                <span className="font-medium">Set Reminder</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${reminderOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <QuickReminder
                onSave={handleSaveReminder}
                storeAddress={storeData.address}
                storeCity={storeData.city}
                storeState={storeData.state}
                userTimezone={userPreferences?.timezone}
                defaultTimezoneMode={userPreferences?.defaultTimezoneMode}
                timeFormat={userPreferences?.timeFormat}
                pointOfContact={storeData.point_of_contact}
                pocEmail={storeData.poc_email}
                pocPhone={storeData.poc_phone}
                defaultEmail={storeData.email}
                defaultPhone={storeData.phone}
                defaultCalendarReminders={userPreferences?.defaultCalendarReminders || [{ method: 'popup', minutes: 10 }]}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}
