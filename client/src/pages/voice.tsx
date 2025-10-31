import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, Clock, Users, BarChart3 } from "lucide-react";
import { useNavigate } from "wouter";
import { useEffect } from "react";

export default function Voice() {
  const { user } = useAuth();
  const [, setLocation] = useNavigate();

  // Redirect if user doesn't have voice access
  useEffect(() => {
    if (user && user.role !== 'admin' && !user.hasVoiceAccess) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Check if user should have access (admin always has access, agents need hasVoiceAccess)
  const hasAccess = user?.role === 'admin' || user?.hasVoiceAccess;

  if (!hasAccess) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-voice-title">Voice AI Calling</h1>
          <p className="text-muted-foreground mt-2" data-testid="text-voice-description">
            Automate your outreach with AI-powered voice calls
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Initiate Call Card */}
          <Card data-testid="card-initiate-calls">
            <CardHeader>
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-primary" />
                <CardTitle>Start Calling</CardTitle>
              </div>
              <CardDescription>
                Select clients and initiate AI-powered outbound calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="button-start-calling">
                <PhoneCall className="h-4 w-4 mr-2" />
                Start Calling
              </Button>
            </CardContent>
          </Card>

          {/* Call History Card */}
          <Card data-testid="card-call-history">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Call History</CardTitle>
              </div>
              <CardDescription>
                View past calls, listen to recordings, and read transcripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-view-history">
                <Clock className="h-4 w-4 mr-2" />
                View History
              </Button>
            </CardContent>
          </Card>

          {/* Batch Calling Card */}
          <Card data-testid="card-batch-calling">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Batch Calls</CardTitle>
              </div>
              <CardDescription>
                Schedule and manage multiple calls simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-batch-calls">
                <Users className="h-4 w-4 mr-2" />
                Batch Calls
              </Button>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <Card data-testid="card-analytics">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Call Analytics</CardTitle>
              </div>
              <CardDescription>
                Track call performance, success rates, and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-view-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Settings Card (Admin Only) */}
          {user?.role === 'admin' && (
            <Card data-testid="card-settings">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <CardTitle>Voice Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure ElevenLabs and Twilio integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" data-testid="button-voice-settings">
                  <Phone className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coming Soon Notice */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Voice calling features are currently under development. Integration with ElevenLabs and Twilio coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
