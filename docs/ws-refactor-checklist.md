# WebSocket Refactor - Staged Implementation Checklist

**Objective:** Reduce server noise, improve responsiveness, prepare for multi-tenant architecture.
**Strategy:** Staged rollout. Verify each phase before moving to next. No breaking changes.

---

## PHASE 1: Immediate Noise Reduction (Today)

### ✅ Task 1.1: Condense MY-CLIENTS Logging
**File:** `server/routes.ts` (lines ~7608-7771)

**Change:** Replace 150+ individual row-skip logs with one summary line

**Before:**
```
[MY-CLIENTS] Row 77: Skipping child location - has parent link 3a9f9ba3-f0a7-43c0-803b-4b824d728c8a
[MY-CLIENTS] Row 78: Skipping child location - has parent link 3a9f9ba3-f0a7-43c0-803b-4b824d728c8a
... (repeat 150 times)
```

**After:**
```
[MY-CLIENTS] Skipped 154 child locations (have parent links)
```

**Verification:**
- [ ] Logs run once
- [ ] One summary line for skipped rows
- [ ] No individual row skip logs
- [ ] Still logs processed count, unique stores, enrichment count

---

### ✅ Task 1.2: Short-Circuit Matrix2 Assigner
**File:** `server/services/Matrix2/slotAssigner.ts` (lines 84-134 in `assignRecipientsToSlots()`)

**Change:** Check recipients BEFORE fetching slots. If zero recipients, return early.

**Before:**
```typescript
// Lines 94-105: Fetch all slots first (600+ rows)
for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
  // ... fetch slots
}

// Line 117: Then check recipients
const recipients = await getEligibleRecipientsForAssignment();
if (recipients.length === 0) {
  console.log(`[Matrix2 Assigner] No eligible recipients for assignment`);
  return;
}
```

**After:**
```typescript
// Check recipients FIRST
const recipients = await getEligibleRecipientsForAssignment();
if (recipients.length === 0) {
  console.log('[Matrix2 Assigner] No eligible recipients, skipping slot fetch');
  return;
}

// Only fetch slots if we have recipients
for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
  // ... fetch slots
}
```

**Verification:**
- [ ] Recipients query happens BEFORE slot fetch
- [ ] Early return if recipients.length === 0
- [ ] When 0 recipients, no slot fetch occurs
- [ ] When recipients exist, normal flow continues

---

### ✅ Task 1.3: Slow Frontend Polling Intervals
**Files:** 
- `client/src/lib/queryClient.ts` (line 67)
- `client/src/pages/call-manager.tsx` (lines 1297, 1326)

**Changes:**

**queryClient.ts:**
```typescript
refetchInterval: 30000,  // OLD: 30 seconds
refetchInterval: 120000, // NEW: 2 minutes (120 seconds)
```

**call-manager.tsx:**
```typescript
// callQueueStats query (line 1297)
refetchInterval: 5000,   // OLD: 5 seconds
refetchInterval: 30000,  // NEW: 30 seconds

// jobStatus query (line 1326)
refetchInterval: 2000,   // OLD: 2 seconds
refetchInterval: 10000,  // NEW: 10 seconds
```

**Verification:**
- [ ] queryClient default interval is 120000ms
- [ ] call-manager callQueueStats is 30000ms
- [ ] call-manager jobStatus is 10000ms
- [ ] No other aggressive polling intervals remain

---

### ✅ Task 1.4: Reduce isRecipientEligible() Logging Verbosity
**File:** `server/services/Matrix2/slotAssigner.ts` (lines 201-296 in `isRecipientEligible()`)

**Change:** Only log failures and final eligibility result. Remove step-by-step logs.

**Remove these verbose logs:**
- `[Matrix2 Assigner] 🔍 Checking eligibility for...`
- `[Matrix2 Assigner] 🕐 Slot local time...`
- `[Matrix2 Assigner] 📅 Day of week...`
- `[Matrix2 Assigner] 🏪 Parsing business hours...`
- `[Matrix2 Assigner] 📊 Parsed result...`
- `[Matrix2 Assigner] 🗓️ Day schedule...`
- `[Matrix2 Assigner] ⏰ Business hours...`
- `[Matrix2 Assigner] 🕐 Current local time...`
- `[Matrix2 Assigner] 🪟 Eligible window...`

**Keep only:**
- Return false cases with reason (timezone errors, closed hours, etc.)
- `[Matrix2 Assigner] ✅ Recipient {email} is ELIGIBLE for slot...` (final result)

**Verification:**
- [ ] No step-by-step eligibility logs appear
- [ ] Failures are still logged with reason
- [ ] Final eligibility result logged for successful assignments
- [ ] Logs reduced by ~70% on typical assignment cycle

---

## PHASE 1 VALIDATION
**Expected Result:**
- 70% reduction in log volume
- 40% reduction in unnecessary backend work
- 304 responses reduced (less aggressive polling)

**How to verify:**
- [ ] Check latest logs
- [ ] MY-CLIENTS shows 1 summary line instead of 150+
- [ ] Matrix2 Assigner shows "No eligible recipients, skipping slot fetch" when 0 recipients
- [ ] isRecipientEligible doesn't spam logs
- [ ] Call queue checks run every 30s instead of 5s

---

## PHASE 2a: Sheet Hashing + WebSocket Gateway

### ✅ Task 2a.1: Implement Sheet Hash-Diff for MY-CLIENTS
**File:** `server/routes.ts` (around MY-CLIENTS endpoint)

**Create hash storage (in-memory for now):**
```typescript
let lastMyClientsHash: string | null = null;

function computeSheetHash(data: any[]): string {
  // Simple hash of stringified relevant data
  return require('crypto')
    .createHash('sha1')
    .update(JSON.stringify(data))
    .digest('hex');
}
```

**In MY-CLIENTS endpoint:**
```typescript
const hash = computeSheetHash(trackerRows);
if (hash === lastMyClientsHash) {
  console.log('[MY-CLIENTS] Data unchanged, using cached results');
  return cachedClients; // Skip reprocessing
}
lastMyClientsHash = hash;
// ... continue with normal processing
```

**Verification:**
- [ ] Hash computed for sheet data
- [ ] If hash unchanged, skip reprocessing
- [ ] If hash changed, reprocess and cache
- [ ] Log shows "Data unchanged" when skipped

---

### ✅ Task 2a.2: Create WebSocket Event Gateway
**New File:** `server/services/events/gateway.ts`

**Structure:**
```typescript
import { WebSocket, Server as WSServer } from 'ws';

interface EventPayload {
  type: string;
  data: any;
  timestamp: number;
  companyId?: string; // For future multi-tenant
}

const subscribers: Map<string, Set<WebSocket>> = new Map();

export function initEventGateway(wss: WSServer) {
  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (message: string) => {
      const { subscribe, eventType } = JSON.parse(message);
      if (subscribe) {
        if (!subscribers.has(eventType)) {
          subscribers.set(eventType, new Set());
        }
        subscribers.get(eventType)!.add(ws);
      }
    });

    ws.on('close', () => {
      subscribers.forEach(subs => subs.delete(ws));
    });
  });
}

export function emitEvent(type: string, data: any, companyId?: string) {
  const payload: EventPayload = {
    type,
    data,
    timestamp: Date.now(),
    companyId,
  };

  const subs = subscribers.get(type);
  if (subs) {
    subs.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    });
  }
}
```

**Defined Event Types (for reference):**
- `clients:updated` - MY-CLIENTS data changed
- `matrix:slotsChanged` - Slots generated/modified (Phase 2b)
- `matrix:assigned` - Recipient assigned (Phase 2b)
- `calls:queueChanged` - Call queue changed (Phase 2b)
- `gmail:newMessage` - Gmail webhook (Phase 2b)
- `calendar:eventChanged` - Calendar webhook (Phase 2b)
- `tickets:new` - Ticket created (Phase 2b)

**Verification:**
- [ ] File exists at `server/services/events/gateway.ts`
- [ ] `initEventGateway()` creates WebSocket handler
- [ ] `emitEvent()` broadcasts to subscribers
- [ ] Event payload includes type, data, timestamp, companyId

---

### ✅ Task 2a.3: Wire clients:updated Event from MY-CLIENTS
**File:** `server/routes.ts` (MY-CLIENTS endpoint)

**Add import:**
```typescript
import { emitEvent } from '../services/events/gateway';
```

**In MY-CLIENTS response handler:**
```typescript
// After successful processing, emit event
emitEvent('clients:updated', {
  count: enrichedClients.length,
  lastSync: new Date().toISOString(),
});
```

**Verification:**
- [ ] emitEvent imported
- [ ] Called after MY-CLIENTS processing
- [ ] Payload includes count and lastSync
- [ ] Only emitted when data actually changes (via hash-diff)
- [ ] WS connections can subscribe to `clients:updated`

---

## PHASE 2a VALIDATION
**Expected Result:**
- MY-CLIENTS only processes when sheet data changes
- One WebSocket event type working reliably
- WS connection stable for minimum 24 hours before Phase 2b

**How to verify:**
- [ ] Check logs: "Data unchanged, using cached" appears after first run
- [ ] MY-CLIENTS endpoint doesn't log processing on repeated calls
- [ ] `clients:updated` event appears in WS logs when data changes
- [ ] No WS connection drops during normal operation
- [ ] Event payload well-formed

---

## PHASE 2b: Add More Backend Events (After Stability Verified)

### ✅ Task 2b.1: Add Matrix2 Events
**File:** `server/services/Matrix2/slotGenerator.ts` and `slotAssigner.ts`

**In slot generation after creating slots:**
```typescript
emitEvent('matrix:slotsChanged', {
  date: dateIso,
  slotCount: createdCount,
  totalAvailable: totalSlots,
});
```

**In slot assignment after fillSlot():**
```typescript
emitEvent('matrix:assigned', {
  recipientId: r.id,
  slotId: slot.id,
  email: r.email,
});
```

**Verification:**
- [ ] `matrix:slotsChanged` emitted after slot generation
- [ ] `matrix:assigned` emitted after each recipient assignment
- [ ] Events include relevant data

---

### ✅ Task 2b.2: Add Calls/Gmail/Calendar Events
**Files:** emailQueue.ts, Gmail webhook handler, Calendar webhook handler

**In call dispatch after queue changes:**
```typescript
emitEvent('calls:queueChanged', { queueLength: queue.length });
```

**In Gmail push handler after processing:**
```typescript
emitEvent('gmail:newMessage', { threadId, messageId });
```

**In Calendar sync after changes:**
```typescript
emitEvent('calendar:eventChanged', { eventId, calendarId });
```

**Verification:**
- [ ] All three event types emitted appropriately
- [ ] WS broadcasts working for all event types

---

## PHASE 3: Frontend Event-Driven Updates (After Phase 2a Stable for 1 Week)

### ✅ Task 3.1: Create Frontend EventStreamProvider
**New File:** `client/src/providers/EventStreamProvider.tsx`

**Functionality:**
- Connect to WebSocket
- Subscribe to event types
- Reconnect with exponential backoff
- Heartbeat/ping handling

**Verification:**
- [ ] Provider connects to WS
- [ ] Reconnects on disconnect
- [ ] Handles network failures gracefully

---

### ✅ Task 3.2: Map WS Events to React Query Invalidations
**Updates to:** `client/src/pages/*` components

**Map events to query invalidations:**
- `clients:updated` → invalidate `/api/clients/my`
- `matrix:slotsChanged` → invalidate `/api/matrix/slots`
- `matrix:assigned` → invalidate `/api/matrix/queue`
- `calls:queueChanged` → invalidate `/api/elevenlabs/call-queue`
- `gmail:newMessage` → invalidate `/api/tickets/unread-count`
- `calendar:eventChanged` → invalidate `/api/reminders`

**Verification:**
- [ ] UI updates instantly on WS events
- [ ] No waiting for next polling interval
- [ ] Fallback polling still works if WS fails

---

### ✅ Task 3.3: Keep 5-Min Fallback Polling
**File:** `client/src/lib/queryClient.ts`

**Keep but reduce:**
```typescript
refetchInterval: 300000, // 5 minutes (300 seconds) - fallback only
```

**Verification:**
- [ ] Fallback polling at 5 minutes (not aggressive)
- [ ] WS events provide real-time updates
- [ ] If WS drops, fallback polling kicks in after 5 min

---

## PHASE 3 VALIDATION
**Expected Result:**
- Instant UI updates on backend changes
- No more constant polling
- 90% reduction in 304 responses
- Lower Replit costs

**How to verify:**
- [ ] Make change in sheet/create recipient/etc
- [ ] UI updates within 200ms via WS event
- [ ] Logs show 1 event emission, not 100 polling cycles
- [ ] Fallback polling logs appear only after WS disconnect

---

## ROLLBACK PLAN

If any phase destabilizes:

**Phase 1 Rollback:** Revert logging changes and polling intervals (harmless)
**Phase 2a Rollback:** Remove event emissions, keep hash-diff if stable
**Phase 3 Rollback:** Remove EventStreamProvider, restore original polling intervals

---

## SUCCESS CRITERIA

✅ All criteria met = Ready for multi-tenant deployment

- [ ] Phase 1: 70% log reduction, 40% less backend work
- [ ] Phase 2a: MY-CLIENTS hash-diff working, 1 WS event type stable 24+ hours
- [ ] Phase 2b: All event types emitting correctly
- [ ] Phase 3: Instant UI updates, 5-min fallback polling only
- [ ] No breaking changes during any phase
- [ ] Production logs show event flow, not polling spam
