export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
}

export const AVAILABLE_MODULES: ModuleDefinition[] = [
  { id: "voice_kb", label: "Voice & Knowledge Base", description: "AI voice calling with knowledge base" },
  { id: "ehub", label: "E-Hub", description: "Email campaigns and sequences" },
  { id: "crm", label: "Sales CRM", description: "Store Database & Commission Tracker" },
  { id: "assistant", label: "AI Assistant", description: "Sales scripts and objection handling" },
  { id: "docs", label: "Documents", description: "Google Drive document browser" },
  { id: "map_search", label: "Map Search", description: "Geographic store search" },
  { id: "analytics", label: "Sales Analytics", description: "Performance dashboards" },
  { id: "label_designer", label: "Label Designer", description: "Custom label creation" },
  { id: "followup", label: "Follow-up", description: "Manual follow-up tracking" },
  { id: "pipelines", label: "Pipelines", description: "Workflow automation" },
];

export function getModuleById(id: string): ModuleDefinition | undefined {
  return AVAILABLE_MODULES.find(module => module.id === id);
}

export function getModulesByIds(ids: string[]): ModuleDefinition[] {
  return AVAILABLE_MODULES.filter(module => ids.includes(module.id));
}
