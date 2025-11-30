import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Construction } from "lucide-react";

export default function Pipelines() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold" data-testid="text-pipelines-title">Pipelines</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" data-testid="text-pipelines-placeholder">
            The Pipelines feature is currently under development. This will allow you to configure custom sales pipelines with stages, automation rules, and AI-driven actions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
