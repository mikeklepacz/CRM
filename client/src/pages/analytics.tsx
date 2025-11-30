import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Construction } from "lucide-react";

export default function Analytics() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold" data-testid="text-analytics-title">Analytics</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Coming Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" data-testid="text-analytics-placeholder">
            The Analytics dashboard is currently under development. This will provide insights into sales performance, call metrics, email campaign effectiveness, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
