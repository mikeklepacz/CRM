import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar as CalendarIcon, StickyNote } from "lucide-react";
import { QuickReminder } from "./quick-reminder";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Client } from "@shared/schema";

interface ClientNotesDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientNotesDialog({ clientId, open, onOpenChange }: ClientNotesDialogProps) {
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("notes");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch client data to get Store Database fields
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: open,
  });

  // Fetch current user for reminder preferences
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/user"],
    enabled: open,
  });

  // Load existing notes when client data is available
  useEffect(() => {
    if (client?.data) {
      const existingNotes = client.data['Notes'] || client.data['notes'] || '';
      setNotes(existingNotes);
    }
  }, [client]);

  // Get store database connection
  const { data: sheetsData } = useQuery<{ sheets: any[] }>({
    queryKey: ["/api/sheets"],
    enabled: open,
  });

  const storeDbSheet = sheetsData?.sheets?.find((sheet: any) => 
    sheet.purpose === 'Store Database'
  );

  // Save notes mutation
  const saveNotesMutation = useMutation({
    mutationFn: async () => {
      if (!client?.data || !storeDbSheet) {
        throw new Error("Client data or Store Database sheet not found");
      }

      const link = client.data['Link'] || client.data['link'] || '';
      const rowIndex = (client as any).googleSheetRowId;

      if (!link) {
        throw new Error("Client link not found");
      }

      return await apiRequest("PUT", `/api/sheets/${storeDbSheet.id}/contact-action`, {
        linkValue: link,
        joinColumn: storeDbSheet.uniqueIdentifierColumn || 'link',
        rowIndex,
        agent: client.assignedAgent || '',
        status: client.status || '',
        followUpDate: '',
        nextAction: '',
        notes,
        pointOfContact: client.data['Point of Contact'] || client.data['POC'] || '',
      });
    },
    onSuccess: () => {
      toast({
        title: "Notes saved",
        description: "Your notes have been updated in the Store Database",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients/my"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to save notes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: async (data: {
      note: string;
      date: Date;
      time: string;
      useCustomerTimezone: boolean;
      customerTimezone: string | null;
      agentTimezone: string;
      calendarReminders: Array<{ method: string; minutes: number }>;
    }) => {
      if (!client?.data) {
        throw new Error("Client data not found");
      }

      const link = client.data['Link'] || client.data['link'] || '';
      
      return await apiRequest("POST", "/api/reminders", {
        storeLink: link,
        note: data.note,
        scheduledDate: data.date.toISOString().split('T')[0],
        scheduledTime: data.time,
        useCustomerTimezone: data.useCustomerTimezone,
        customerTimezone: data.customerTimezone,
        agentTimezone: data.agentTimezone,
        timezone: data.useCustomerTimezone ? data.customerTimezone : data.agentTimezone,
        calendarReminders: data.calendarReminders,
      });
    },
    onSuccess: () => {
      toast({
        title: "Reminder created",
        description: "Your follow-up reminder has been saved and added to your calendar",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Failed to create reminder",
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

  const handleSaveReminder = (data: any) => {
    createReminderMutation.mutate(data);
  };

  if (isLoadingClient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!client) {
    return null;
  }

  const storeName = client.data?.['Name'] || client.data?.['name'] || 'Unknown Store';
  const storeAddress = client.data?.['Address'] || client.data?.['address'] || null;
  const storeCity = client.data?.['City'] || client.data?.['city'] || null;
  const storeState = client.data?.['State'] || client.data?.['state'] || null;
  const pointOfContact = client.data?.['Point of Contact'] || client.data?.['POC'] || null;
  const pocEmail = client.data?.['POC Email'] || client.data?.['poc email'] || null;
  const pocPhone = client.data?.['POC Phone'] || client.data?.['poc phone'] || null;
  const defaultEmail = client.data?.['Email'] || client.data?.['email'] || null;
  const defaultPhone = client.data?.['Phone'] || client.data?.['phone'] || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Notes & Follow-up - {storeName}</DialogTitle>
          <DialogDescription>
            Add notes or schedule a follow-up reminder for this client
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="reminder" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Set Reminder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="flex-1 flex flex-col space-y-4 mt-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="notes-content">Notes (synced with Store Database)</Label>
              <Textarea
                id="notes-content"
                placeholder="Enter your notes about this client..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[300px] resize-none"
                data-testid="textarea-store-notes"
              />
              <p className="text-xs text-muted-foreground">
                These notes are saved directly to the "Notes" column in your Store Database Google Sheet
              </p>
            </div>

            <div className="flex gap-2 justify-end border-t pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-notes"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNotes}
                disabled={saveNotesMutation.isPending || !notes.trim()}
                data-testid="button-save-notes"
              >
                {saveNotesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reminder" className="flex-1 overflow-y-auto mt-4">
            <QuickReminder
              onSave={handleSaveReminder}
              isSaving={createReminderMutation.isPending}
              storeAddress={storeAddress}
              storeCity={storeCity}
              storeState={storeState}
              userTimezone={currentUser?.timezone || null}
              defaultTimezoneMode={currentUser?.defaultTimezoneMode || "agent"}
              timeFormat={currentUser?.timeFormat || "12hr"}
              pointOfContact={pointOfContact}
              pocEmail={pocEmail}
              pocPhone={pocPhone}
              defaultEmail={defaultEmail}
              defaultPhone={defaultPhone}
              defaultCalendarReminders={currentUser?.defaultCalendarReminders || [{ method: 'popup', minutes: 10 }]}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
