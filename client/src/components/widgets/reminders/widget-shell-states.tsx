import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RemindersLoadingState() {
  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle>Reminders</CardTitle>
        <CardDescription>Custom alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function RemindersErrorState() {
  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle>Reminders</CardTitle>
        <CardDescription>Custom alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-destructive" data-testid="error-reminders">
          Failed to load reminders
        </p>
      </CardContent>
    </Card>
  );
}
