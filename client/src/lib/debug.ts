// Debug logging controlled by environment variable
// Set VITE_DEBUG_MODE=true in .env to enable debug logs
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_MODE === 'true';

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
