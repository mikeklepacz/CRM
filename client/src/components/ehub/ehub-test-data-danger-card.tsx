import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";

type EhubTestDataDangerCardProps = {
  onOpen: () => void;
};

export function EhubTestDataDangerCard({ onOpen }: EhubTestDataDangerCardProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone: Clear Test Data
        </CardTitle>
        <CardDescription>
          Delete test emails and sequence recipients to reset testing environment. Use with caution.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={onOpen} data-testid="button-open-nuke-dialog">
          <Trash2 className="w-4 h-4 mr-2" />
          Nuke Test Data
        </Button>
      </CardContent>
    </Card>
  );
}
