import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

type EhubBlacklistCheckingCardProps = {
  enabled: boolean;
  isPending: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function EhubBlacklistCheckingCard({
  enabled,
  isPending,
  onCheckedChange,
}: EhubBlacklistCheckingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Blacklist Checking</CardTitle>
        <CardDescription>
          Control whether enrollment checks the blacklist. Turn OFF for testing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={onCheckedChange}
              disabled={isPending}
              data-testid="toggle-blacklist-check"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Blacklist Check: {enabled ? "ON" : "OFF"}</span>
              <Badge variant={enabled ? "default" : "secondary"}>
                {enabled ? "✓ Enabled" : "✗ Disabled"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
