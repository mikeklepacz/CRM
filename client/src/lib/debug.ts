// Debug logging controlled by environment variable
// Set VITE_DEBUG_MODE=true in .env to enable debug logs
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_MODE === 'true';

export const debug = {
  statusPrefs: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
  },
  
  statusColors: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
  },
  
  statusSave: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
  },
  
  statusLoad: (message: string, data?: any) => {
    if (!DEBUG_ENABLED) return;
  }
};
