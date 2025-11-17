// server/services/slotMaintenance.ts
import { ensureDailySlots } from "./Matrix2/slotGenerator";
import { storage } from "../storage";
import { formatInTimeZone } from "date-fns-tz";

let maintenanceInterval: NodeJS.Timeout | null = null;
let lastRunHour: number | null = null;

/**
 * Check if current hour matches one of the maintenance hours
 * Runs at sending_hours_start and sending_hours_end from SQL settings
 */
async function checkAndRunMaintenance() {
  try {
    const settings = await storage.getEhubSettings();
    if (!settings) {
      return;
    }

    const adminUser = await storage.getAdminUser();
    const adminTz = adminUser?.timezone || 'America/New_York';
    const now = new Date();
    const currentHour = parseInt(formatInTimeZone(now, adminTz, 'HH'));
    
    const sendingHoursStart = settings.sendingHoursStart || 6;
    const sendingHoursEnd = settings.sendingHoursEnd || 23;

    // Run maintenance at start hour or end hour (once per hour)
    const shouldRun = (currentHour === sendingHoursStart || currentHour === sendingHoursEnd) 
                      && lastRunHour !== currentHour;

    if (shouldRun) {
      console.log(`[SlotMaintenance] Running slot maintenance at ${currentHour}:00 ${adminTz}`);
      await ensureDailySlots();
      lastRunHour = currentHour;
    }
  } catch (error) {
    console.error('[SlotMaintenance] Error during maintenance check:', error);
  }
}

/**
 * Start the slot maintenance scheduler
 * Checks every minute if we're at a maintenance hour
 */
export function startSlotMaintenance() {
  console.log('[SlotMaintenance] Starting slot maintenance scheduler...');
  
  // Run on startup to ensure 3 days buffer
  console.log('[SlotMaintenance] Running initial slot generation on startup...');
  ensureDailySlots().catch(err => {
    console.error('[SlotMaintenance] Error during startup slot generation:', err);
  });

  // Check every minute if we're at a maintenance hour
  maintenanceInterval = setInterval(checkAndRunMaintenance, 60000); // 60 seconds
  
  console.log('[SlotMaintenance] ✅ Scheduler started (checks hourly schedule every 60s)');
}

/**
 * Stop the slot maintenance scheduler
 */
export function stopSlotMaintenance() {
  if (maintenanceInterval) {
    clearInterval(maintenanceInterval);
    maintenanceInterval = null;
    console.log('[SlotMaintenance] Scheduler stopped');
  }
}
