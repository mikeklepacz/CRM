import { useEffect } from "react";

export function useCallManagerEffects(props: any) {
  useEffect(() => {
    props.setSelectedStores(new Set());
    props.setSelectedAgentFilters(new Set());
    props.setSelectedStateFilters([]);
  }, [props.activeScenario]);

  useEffect(() => {
    if (props.user && !props.canAccessAdmin && !props.user.hasVoiceAccess) {
      props.setLocation("/");
    }
  }, [props.user, props.setLocation, props.canAccessAdmin]);

  useEffect(() => {
    if (props.insightsHistory && props.insightsHistory.length > 0 && !props.persistedInsights && !props.selectedInsightId) {
      const mostRecent = props.insightsHistory[0];
      props.setPersistedInsights(mostRecent);
      props.setSelectedInsightId(mostRecent.id);
    }
  }, [props.insightsHistory, props.persistedInsights, props.selectedInsightId]);
}
