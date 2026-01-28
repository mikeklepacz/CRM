import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, XCircle, CheckCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HealthIssue {
  severity: "critical" | "warning" | "info";
  component: string;
  message: string;
}

interface SystemHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  canMakeCalls: boolean;
  issues: HealthIssue[];
  timestamp: string;
  checks: {
    elevenlabs_api: boolean;
    webhook_registered: boolean;
    agents_configured: boolean;
    phone_numbers_configured: boolean;
    fly_proxy_healthy: boolean;
  };
}

interface SystemHealthBannerProps {
  className?: string;
  compact?: boolean;
}

export function SystemHealthBanner({ className, compact = false }: SystemHealthBannerProps) {
  const { data: health, isLoading, refetch, isRefetching } = useQuery<SystemHealthResponse>({
    queryKey: ["/api/elevenlabs/system-health"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (isLoading) {
    return null;
  }

  if (!health || health.status === "healthy") {
    return null;
  }

  const criticalIssues = health.issues.filter((i) => i.severity === "critical");
  const warningIssues = health.issues.filter((i) => i.severity === "warning");

  if (criticalIssues.length === 0 && warningIssues.length === 0) {
    return null;
  }

  const hasCritical = criticalIssues.length > 0;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
          hasCritical
            ? "bg-destructive/10 text-destructive border border-destructive/30"
            : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
          className
        )}
        data-testid="system-health-banner-compact"
      >
        {hasCritical ? (
          <XCircle className="h-4 w-4 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="flex-1 truncate">
          {hasCritical
            ? `${criticalIssues.length} critical issue${criticalIssues.length > 1 ? "s" : ""} - Calls blocked`
            : `${warningIssues.length} warning${warningIssues.length > 1 ? "s" : ""}`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="system-health-banner">
      {criticalIssues.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>Voice System Issues - Calls Blocked</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-6 px-2"
              data-testid="button-refresh-health"
            >
              <RefreshCw className={cn("h-3 w-3", isRefetching && "animate-spin")} />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {criticalIssues.map((issue, i) => (
                <li key={i} className="text-sm">
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warningIssues.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-400">
            Voice System Warnings
          </AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2 text-yellow-700 dark:text-yellow-400">
              {warningIssues.map((issue, i) => (
                <li key={i} className="text-sm">
                  {issue.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function useSystemHealth() {
  return useQuery<SystemHealthResponse>({
    queryKey: ["/api/elevenlabs/system-health"],
    refetchInterval: 60000,
    staleTime: 30000,
  });
}
