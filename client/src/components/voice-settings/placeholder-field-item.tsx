import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

export function PlaceholderFieldItem({
  name,
  description,
  toast,
}: {
  name: string;
  description: string;
  toast: any;
}) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(description);
    toast({
      title: "Copied",
      description: `Placeholder "${name}" copied to clipboard`,
    });
  };

  return (
    <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 hover-elevate">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono bg-background px-2 py-1 rounded">{name}</code>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        data-testid={`button-copy-${name}`}
        className="shrink-0"
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}
