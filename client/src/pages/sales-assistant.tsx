import { AIChat } from "@/components/ai-chat";
import { Card } from "@/components/ui/card";

export default function SalesAssistant() {
  return (
    <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Sales Assistant</h2>
        <p className="text-muted-foreground">Get help with scripts, objections, and product info</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <AIChat className="flex-1" />
      </Card>
    </div>
  );
}
