import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileSpreadsheet, TrendingUp, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-foreground">
              Hemp Wick CRM
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Internal sales and commission tracking system for hemp wick sales agents.
              Manage clients, track orders, and calculate commissions seamlessly.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              Sign In to Continue
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  CSV-Powered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Upload and manage client data from CSV files with automatic header detection and smart merging
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Claim System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Agents claim clients and track follow-ups with automatic commission calculation
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  WooCommerce Sync
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic order synchronization from your WooCommerce store for real-time commission tracking
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Commission Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  25% commission for first 6 months, 10% thereafter with detailed reporting and analytics
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
