import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function InvalidFormatCard() {
  return (
    <Card data-testid="card-error">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <div>
            <p className="font-medium">Invalid edit format</p>
            <p className="text-sm text-muted-foreground">
              The proposal content is not in the expected JSON format. Please edit or reject.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
