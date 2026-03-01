import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IntegrationsAboutCard() {
  return (
    <Card className="bg-muted/30 max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">About These Integrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground mb-1">Why separate accounts?</p>
          <p>
            You can use different Google accounts for different purposes. For example, use your business account for Google Sheets and your personal account for Calendar/Gmail.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">What you can do:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Google Sheets:</strong> Access store database and commission tracker (managed via Admin Dashboard)
            </li>
            <li>
              <strong>Google Calendar:</strong> Automatically sync CRM reminders to your calendar
            </li>
            <li>
              <strong>Gmail:</strong> Send automated email reminders and follow-ups to clients
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
