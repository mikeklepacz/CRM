import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientDashboardFrameProps = {
  background: string;
  bodyBackground?: string;
  border: string;
  children: ReactNode;
  secondary: string;
  text: string;
};

export function ClientDashboardFrame({
  background,
  bodyBackground,
  border,
  children,
  secondary,
  text,
}: ClientDashboardFrameProps) {
  return (
    <div
      className="min-h-screen"
      style={bodyBackground ? { backgroundColor: bodyBackground } : {}}
    >
      <div
        className="container mx-auto p-6 space-y-6"
        style={{
          backgroundColor: background,
          color: text,
        }}
      >
        <Card style={{ backgroundColor: secondary, borderColor: border }}>
          <CardHeader className="pb-3">
            <CardTitle>Client Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
