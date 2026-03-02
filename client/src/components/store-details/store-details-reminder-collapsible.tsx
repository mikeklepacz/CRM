import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { QuickReminder } from "@/components/quick-reminder";
import { format } from "date-fns";
import { getLinkValue } from "@/components/store-details/store-details-utils";
import { apiRequest } from "@/lib/queryClient";

export function StoreDetailsReminderCollapsible(props: any) {
  const p = props;
  const queryClient = useQueryClient();

  return (
    <Collapsible open={p.reminderSectionOpen} onOpenChange={p.setReminderSectionOpen} className="pt-4 border-t">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-3 h-auto" data-testid="button-toggle-reminder">
          <span className="font-medium">Set Reminder</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${p.reminderSectionOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <QuickReminder
          isSaving={p.isSavingReminder}
          onSave={async (reminderData) => {
            p.setIsSavingReminder(true);
            try {
              const response = await apiRequest("POST", "/api/reminders", {
                title: `Follow up: ${p.formData.name}`,
                description: reminderData.note,
                reminderDate: reminderData.date,
                reminderTime: reminderData.time,
                storeMetadata: {
                  sheetId: p.trackerSheetId,
                  uniqueIdentifier: getLinkValue(p.row),
                  storeName: p.formData.name,
                  address: p.formData.address,
                  city: p.formData.city,
                  state: p.formData.state,
                  pointOfContact: p.formData.point_of_contact,
                  pocEmail: p.formData.poc_email || p.formData.email,
                  pocPhone: p.formData.poc_phone || p.formData.phone,
                },
                useCustomerTimezone: reminderData.useCustomerTimezone,
                customerTimezone: reminderData.customerTimezone,
                agentTimezone: reminderData.agentTimezone,
                calendarReminders: reminderData.calendarReminders,
              });

              const [year, month, day] = reminderData.date.split("-").map(Number);
              const dateObj = new Date(year, month - 1, day);
              const followUpDate = format(dateObj, "M/d/yyyy");
              p.handleInputChange("follow_up_date", followUpDate);
              p.handleInputChange("next_action", reminderData.note);

              try {
                const link = p.formData.link || getLinkValue(p.row);
                if (link && p.trackerSheetId) {
                  await p.upsertTrackerFieldsMutation.mutateAsync({
                    link,
                    updates: {
                      "Follow-Up Date": followUpDate,
                      "Next Action": reminderData.note,
                    },
                  });

                  p.setInitialData((prev: any) => ({
                    ...prev,
                    follow_up_date: followUpDate,
                    next_action: reminderData.note,
                  }));

                  p.toast({
                    title: "Reminder Created",
                    description: response.warning
                      ? response.warning.message
                      : "Your reminder has been saved and Follow-Up Date updated.",
                    variant: response.warning ? "default" : "default",
                  });
                } else {
                  p.toast({
                    title: "Reminder Created",
                    description: response.warning
                      ? response.warning.message
                      : "Your reminder has been saved but Follow-Up Date could not be updated (missing link or tracker sheet).",
                    variant: response.warning ? "default" : "default",
                  });
                }
              } catch (saveError: any) {
                p.toast({
                  title: "Partial Success",
                  description:
                    "Reminder created but Follow-Up Date could not be saved: " + (saveError.message || "Unknown error"),
                  variant: "destructive",
                });
              }

              queryClient.invalidateQueries({
                predicate: (query) => {
                  const key = query.queryKey[0];
                  return typeof key === "string" && key.startsWith("/api/reminders");
                },
              });
              return true;
            } catch (error: any) {
              console.error("[REMINDER] Error:", error);
              p.toast({
                title: "Error",
                description: error.message || "Failed to create reminder",
                variant: "destructive",
              });
              return false;
            } finally {
              p.setIsSavingReminder(false);
            }
          }}
          storeAddress={p.formData.address}
          storeCity={p.formData.city}
          storeState={p.formData.state}
          userTimezone={p.userPreferences?.timezone}
          defaultTimezoneMode={p.userPreferences?.defaultTimezoneMode}
          timeFormat={p.userPreferences?.timeFormat}
          defaultCalendarReminders={p.userPreferences?.defaultCalendarReminders}
          pointOfContact={p.formData.point_of_contact}
          pocEmail={p.formData.poc_email}
          pocPhone={p.formData.poc_phone}
          defaultEmail={p.formData.email}
          defaultPhone={p.formData.phone}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
