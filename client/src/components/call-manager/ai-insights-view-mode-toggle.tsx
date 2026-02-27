import { Button } from "@/components/ui/button";

type InsightsViewMode = "individual" | "all-time";

type AiInsightsViewModeToggleProps = {
  hasHistory: boolean;
  hasPersistedInsights: boolean;
  insightsViewMode: InsightsViewMode;
  onInsightsViewModeChange: (mode: InsightsViewMode) => void;
  onResetSelectedInsight: () => void;
};

export function AiInsightsViewModeToggle({
  hasHistory,
  hasPersistedInsights,
  insightsViewMode,
  onInsightsViewModeChange,
  onResetSelectedInsight,
}: AiInsightsViewModeToggleProps) {
  if (!hasHistory || !hasPersistedInsights) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="flex items-center gap-2">
        <Button
          variant={insightsViewMode === "individual" ? "default" : "outline"}
          size="sm"
          onClick={() => onInsightsViewModeChange("individual")}
          data-testid="button-view-individual"
        >
          Individual Analysis
        </Button>
        <Button
          variant={insightsViewMode === "all-time" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            onInsightsViewModeChange("all-time");
            onResetSelectedInsight();
          }}
          data-testid="button-view-all-time"
        >
          All-Time Summary
        </Button>
      </div>
    </div>
  );
}
