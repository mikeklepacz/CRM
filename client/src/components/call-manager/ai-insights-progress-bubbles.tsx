import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type WorkflowStatus = "idle" | "running" | "complete" | "error";

type AiInsightsProgressBubblesProps = {
  alignerCallCount: number;
  alignerError: string | null;
  alignerKbFileCount: number;
  alignerStatus: WorkflowStatus;
  wickCoachCallCount: number;
  wickCoachError: string | null;
  wickCoachStatus: WorkflowStatus;
};

function WorkflowStatusCard({
  title,
  status,
  message,
  testId,
}: {
  title: string;
  status: WorkflowStatus;
  message: string;
  testId: string;
}) {
  return (
    <Card
      className={`border-2 ${
        status === "complete"
          ? "border-green-500 bg-green-50 dark:bg-green-950"
          : status === "error"
            ? "border-red-500 bg-red-50 dark:bg-red-950"
            : status === "running"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-300 bg-gray-50 dark:bg-gray-900"
      }`}
      data-testid={testId}
    >
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          {status === "running" && <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />}
          {status === "complete" && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
          {status === "error" && <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
          <div className="flex-1">
            <p
              className={`font-semibold ${
                status === "complete"
                  ? "text-green-900 dark:text-green-100"
                  : status === "error"
                    ? "text-red-900 dark:text-red-100"
                    : status === "running"
                      ? "text-blue-900 dark:text-blue-100"
                      : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {title}
            </p>
            <p
              className={`text-sm ${
                status === "complete"
                  ? "text-green-700 dark:text-green-300"
                  : status === "error"
                    ? "text-red-700 dark:text-red-300"
                    : status === "running"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiInsightsProgressBubbles({
  alignerCallCount,
  alignerError,
  alignerKbFileCount,
  alignerStatus,
  wickCoachCallCount,
  wickCoachError,
  wickCoachStatus,
}: AiInsightsProgressBubblesProps) {
  if (wickCoachStatus === "idle" && alignerStatus === "idle") {
    return null;
  }

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="container-workflow-progress">
      <WorkflowStatusCard
        title="Wick Coach"
        status={wickCoachStatus}
        message={
          wickCoachStatus === "running"
            ? "Analyzing calls..."
            : wickCoachStatus === "complete"
              ? `Analyzed ${wickCoachCallCount} call${wickCoachCallCount !== 1 ? "s" : ""}`
              : wickCoachStatus === "error"
                ? (wickCoachError || "Analysis failed")
                : ""
        }
        testId="card-wick-coach-status"
      />
      <WorkflowStatusCard
        title="Aligner (Strategist)"
        status={alignerStatus}
        message={
          alignerStatus === "idle"
            ? "Waiting for Wick Coach..."
            : alignerStatus === "running"
              ? "Analyzing calls and KB files..."
              : alignerStatus === "complete"
                ? `Completed: ${alignerCallCount} calls, ${alignerKbFileCount} KB files`
                : (alignerError || "Analysis failed")
        }
        testId="card-aligner-status"
      />
    </div>
  );
}
