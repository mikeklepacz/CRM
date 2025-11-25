import { db } from './db';
import { clients, callHistory } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function backfillContactDates() {
  
  try {
    // Get all call history records
    const allCalls = await db
      .select()
      .from(callHistory)
      .orderBy(callHistory.calledAt);
    
    
    // Group calls by client (using storeLink to match)
    const clientCallsMap = new Map<string, Date>();
    let matchedCalls = 0;
    let unmatchedCalls = 0;
    
    for (const call of allCalls) {
      if (!call.storeLink) {
        unmatchedCalls++;
        continue;
      }
      
      // Find the client by storeLink using the same logic as runtime
      // This matches against the client.uniqueIdentifier field
      const clientResults = await db
        .select()
        .from(clients)
        .where(eq(clients.uniqueIdentifier, call.storeLink))
        .limit(1);
      
      const client = clientResults[0];
      if (!client) {
        unmatchedCalls++;
        continue;
      }
      
      matchedCalls++;
      const callDate = new Date(call.calledAt);
      const existingDate = clientCallsMap.get(client.id);
      
      // Keep only the most recent call date
      if (!existingDate || callDate > existingDate) {
        clientCallsMap.set(client.id, callDate);
      }
    }
    
    
    // Update each client's lastContactDate using atomic conditional update
    let updatedCount = 0;
    
    for (const [clientId, mostRecentCallDate] of clientCallsMap.entries()) {
      // Atomic update: only update if no existing lastContactDate OR historical date is newer
      const result = await db
        .update(clients)
        .set({
          lastContactDate: mostRecentCallDate,
          updatedAt: new Date(),
        })
        .where(
          sql`${clients.id} = ${clientId} AND (${clients.lastContactDate} IS NULL OR ${clients.lastContactDate} < ${mostRecentCallDate})`
        )
        .returning();
      
      if (result.length > 0) {
        updatedCount++;
      } else {
      }
    }
    
    
  } catch (error) {
    throw error;
  }
}

// Run the backfill
backfillContactDates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
