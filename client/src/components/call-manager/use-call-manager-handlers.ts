export function useCallManagerHandlers(props: any) {
  const handleSelectAll = () => {
    if (props.selectedStores.size === props.filteredStores.length) {
      props.setSelectedStores(new Set());
    } else {
      props.setSelectedStores(new Set(props.filteredStores.map((store: any) => store.link)));
    }
  };

  const handleToggleStore = (storeLink: string) => {
    const next = new Set(props.selectedStores);
    if (next.has(storeLink)) next.delete(storeLink);
    else next.add(storeLink);
    props.setSelectedStores(next);
  };

  const handleBatchCall = () => {
    if (!props.selectedAgent || props.selectedStores.size === 0) {
      props.toast({
        title: "Missing Information",
        description: "Please select an agent and at least one store.",
        variant: "destructive",
      });
      return;
    }

    if (props.schedulingMode === "scheduled" && !props.scheduledTime) {
      props.toast({
        title: "Missing Schedule",
        description: "Please select a date and time for scheduled calls.",
        variant: "destructive",
      });
      return;
    }

    if (props.schedulingMode === "scheduled" && props.scheduledTime) {
      const scheduledDate = new Date(props.scheduledTime);
      if (scheduledDate <= new Date()) {
        props.toast({ title: "Invalid Schedule", description: "Scheduled time must be in the future.", variant: "destructive" });
        return;
      }
    }

    const agent = props.agents.find((entry: any) => entry.id === props.selectedAgent);
    if (!agent) return;

    const selectedStoreData = props.eligibleStores.filter((store: any) => props.selectedStores.has(store.link));
    const payload: any = {
      agent_record_id: agent.id,
      agent_id: agent.agent_id,
      phone_number_id: agent.phone_number_id,
      stores: Array.from(props.selectedStores),
      scenario: props.activeScenario,
      ivr_behavior: props.ivrBehavior,
      store_data: selectedStoreData,
    };

    if (props.schedulingMode === "auto") {
      payload.auto_schedule = true;
    } else if (props.schedulingMode === "scheduled" && props.scheduledTime) {
      payload.scheduled_for = new Date(props.scheduledTime).toISOString();
    }

    props.batchCallMutation.mutate(payload);
  };

  const handleToggleAgentFilter = (agentName: string) => {
    const next = new Set(props.selectedAgentFilters);
    if (next.has(agentName)) next.delete(agentName);
    else next.add(agentName);
    props.setSelectedAgentFilters(next);
  };

  const handleStateChange = (state: string, checked: boolean) => {
    if (checked) {
      props.setSelectedStateFilters([...props.selectedStateFilters, state]);
    } else {
      props.setSelectedStateFilters(props.selectedStateFilters.filter((entry: string) => entry !== state));
    }
  };

  const handleSyncFromElevenLabs = async () => {
    props.setSyncingCalls(true);
    try {
      const data = await props.apiRequest("POST", "/api/elevenlabs/sync-calls", {
        projectId: props.currentProjectId,
      });

      if (data.success) {
        props.toast({ title: "Sync Complete", description: `Imported ${data.imported} new calls, skipped ${data.skipped} existing calls` });
        props.queryClient.invalidateQueries({ queryKey: ["/api/elevenlabs/call-analytics"] });
      } else {
        props.toast({ variant: "destructive", title: "Sync Failed", description: data.error || "Failed to sync calls from ElevenLabs" });
      }
    } catch (error: any) {
      props.toast({ variant: "destructive", title: "Sync Failed", description: error.message || "An error occurred while syncing calls" });
    } finally {
      props.setSyncingCalls(false);
    }
  };

  return {
    handleBatchCall,
    handleSelectAll,
    handleStateChange,
    handleSyncFromElevenLabs,
    handleToggleAgentFilter,
    handleToggleStore,
  };
}
