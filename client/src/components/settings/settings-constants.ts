export const defaultModules: Record<string, boolean> = {
  admin: true,
  dashboard: true,
  clients: true,
  followUp: true,
  mapSearch: true,
  sales: true,
  assistant: true,
  docs: true,
  labelDesigner: true,
  callManager: true,
  ehub: true,
  qualification: true,
};

export const visibilityToNavKey: Record<string, string> = {
  clients: 'clients',
  followUp: 'follow-up-center',
  mapSearch: 'map-search',
  sales: 'sales',
  assistant: 'assistant',
  docs: 'documents',
  labelDesigner: 'product-mockup',
  callManager: 'call-manager',
  ehub: 'ehub',
  qualification: 'qualification',
};

export const CALENDAR_REMINDER_OPTIONS = [
  { value: 0, label: 'At event time' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
];
