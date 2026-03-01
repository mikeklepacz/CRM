import { Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function CustomizeWidgetsDialog({
  open,
  onOpenChange,
  widgets,
  visibleWidgets,
  onToggleWidget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: Array<{ id: string; name: string; description: string }>;
  visibleWidgets: Set<string>;
  onToggleWidget: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-customize-widgets">
          <Settings2 className="h-4 w-4 mr-2" />
          Customize Widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" data-testid="dialog-customize-widgets">
        <DialogHeader>
          <DialogTitle>Customize Dashboard Widgets</DialogTitle>
          <DialogDescription>Choose which widgets to display on your dashboard</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {widgets.map((widget) => (
            <div key={widget.id} className="flex items-start space-x-3">
              <Checkbox
                id={`widget-${widget.id}`}
                checked={visibleWidgets.has(widget.id)}
                onCheckedChange={() => onToggleWidget(widget.id)}
                data-testid={`checkbox-widget-${widget.id}`}
              />
              <div className="grid gap-1.5 leading-none flex-1">
                <Label htmlFor={`widget-${widget.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  {widget.name}
                </Label>
                <p className="text-sm text-muted-foreground">{widget.description}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
