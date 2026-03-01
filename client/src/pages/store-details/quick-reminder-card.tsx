import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickReminder } from "@/components/quick-reminder";

import type { StoreFormData } from "./types";

interface QuickReminderCardProps {
  formData: StoreFormData;
  storeData: any;
  userPreferences: any;
  isSaving: boolean;
  onSaveReminder: (data: any) => void;
}

export function QuickReminderCard({ formData, storeData, userPreferences, isSaving, onSaveReminder }: QuickReminderCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Reminder</CardTitle>
        <CardDescription>Set a reminder for this store</CardDescription>
      </CardHeader>
      <CardContent>
        <QuickReminder
          onSave={onSaveReminder}
          isSaving={isSaving}
          storeAddress={formData.address}
          storeCity={formData.city}
          storeState={formData.state}
          userTimezone={userPreferences?.timezone}
          defaultTimezoneMode={userPreferences?.timezoneMode}
          timeFormat={userPreferences?.timeFormat}
          pointOfContact={storeData?.["Point of Contact"] || storeData?.["POC"]}
          pocEmail={storeData?.["POC Email"] || storeData?.["poc email"]}
          pocPhone={storeData?.["POC Phone"] || storeData?.["poc phone"]}
          defaultEmail={formData.email}
          defaultPhone={formData.phone}
          defaultCalendarReminders={userPreferences?.calendarReminders}
        />
      </CardContent>
    </Card>
  );
}
