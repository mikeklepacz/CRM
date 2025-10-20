const DEBUG_ENABLED = true;

export const debug = {
  statusPrefs: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
    console.log(`🎯 [STATUS PREFS] ${message}`, data || '');
  },
  
  statusColors: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
    console.log(`🎨 [STATUS COLORS] ${message}`, data || '');
  },
  
  statusSave: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
    console.log(`💾 [STATUS SAVE] ${message}`, data || '');
  },
  
  statusLoad: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
    console.log(`📥 [STATUS LOAD] ${message}`, data || '');
  }
};
