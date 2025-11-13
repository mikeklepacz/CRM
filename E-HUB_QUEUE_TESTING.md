# E-Hub Queue System - Comprehensive Test Plan

## System Overview
The E-Hub Queue Coordinator enforces FIFO ordering, rate limiting, and geographic distribution across all email scheduling operations.

## Test Scenarios

### Scenario 1: FIFO Ordering Preservation
**Objective**: Verify chronological ordering is maintained across all operations

**Test Case 1A: Sequential Enrollment**
- Enroll 5 recipients with 1-day delays
- Expected: Recipients ordered by activation time, then delay
- Validation: `nextSendAt` values strictly ascending

**Test Case 1B: Mixed Step Delays**
- Add recipients with delays: [0, 1, 2, 0, 1]
- Expected: 0-delay recipients before 1-day, 1-day before 2-day
- Validation: Queue groups by delay, preserves FIFO within groups

### Scenario 2: Cohort-Based Timezone Balancing
**Objective**: Verify geographic diversity while preserving FIFO

**Test Case 2A: Same-Minute Cohort**
- Add 12 recipients due at same minute:
  - 4x ET (America/New_York)
  - 4x CT (America/Chicago)
  - 4x MT (America/Denver)
  - 4x PT (America/Los_Angeles)
- Expected: Round-robin interleaving → ET, CT, MT, PT, ET, CT, MT, PT, ...
- Validation: No timezone clustering in same-minute cohort

**Test Case 2A: Different Due Times**
- Add recipients:
  - 9:05 ET1, 9:05 CT1, 9:05 ET2
  - 9:10 PT1, 9:10 ET3
- Expected: [9:05 ET1, 9:05 CT1, 9:05 ET2, 9:10 PT1, 9:10 ET3]
- Validation: Earlier cohort (9:05) fully processed before later cohort (9:10)

### Scenario 3: Rate Limiting & Continuous Spacing
**Objective**: Verify daily rate limit spreads emails evenly across admin window

**Test Case 3A: 200/day Default**
- Admin window: 9 AM - 5 PM ET (480 minutes)
- Rate limit: 200 emails/day
- Expected: 480 ÷ 200 = 2.4 minutes between sends
- Validation: Check spacing between consecutive `nextSendAt` values

**Test Case 3B: High-Volume Bulk Add**
- Add 50 recipients simultaneously
- Expected: First send immediate, subsequent sends spaced 2.4 minutes apart
- Validation: Last recipient ~120 minutes from first

### Scenario 4: Mutex Concurrency Protection
**Objective**: Verify bulk operations don't create race conditions

**Test Case 4A: Concurrent Bulk Adds**
- Simulate 2 simultaneous bulk-add requests (10 recipients each)
- Expected: Mutex serializes operations, all 20 recipients correctly ordered
- Validation: No duplicate slot allocations, no overlapping `nextSendAt`

### Scenario 5: Follow-Ups vs Fresh Emails
**Objective**: Verify two-tier priority queue

**Test Case 5A: Follow-Up Priority**
- Queue state:
  - 5 fresh emails (currentStep=0) due now
  - 3 follow-ups (currentStep=1) due now
- Expected: `getNextRecipientsToSend(10)` returns 3 follow-ups first, then 5 fresh
- Validation: Follow-ups processed before fresh emails

**Test Case 5B: Overdue Follow-Ups**
- 1 follow-up due 10 minutes ago
- 10 fresh emails due now
- Expected: Overdue follow-up sent first
- Validation: Chronological ordering within each tier

### Scenario 6: Edge Cases

**Test Case 6A: Missing Timezone**
- Recipient with `timezone=null`
- Expected: Falls back to 'America/New_York'
- Validation: Verify default timezone applied

**Test Case 6B: Missing nextSendAt**
- Recipient with `nextSendAt=null`
- Expected: Treated as "due now"
- Validation: Grouped in 'null' cohort, processed first

**Test Case 6C: All Same Timezone**
- 20 recipients all in 'America/New_York'
- Expected: No reordering (balanceByTimezone returns input as-is)
- Validation: Original FIFO order preserved

**Test Case 6D: Weekend Skipping**
- Add recipient on Friday 4 PM with 1-day delay
- skipWeekends=true
- Expected: nextSendAt = Monday 9 AM (not Saturday)
- Validation: Smart timing skips weekend

## Performance Benchmarks

### Benchmark 1: Bulk Add Performance
- Add 100 recipients simultaneously
- Measure: Mutex acquisition time, queue coordinator processing time
- Target: <2 seconds total

### Benchmark 2: getNextRecipientsToSend Performance
- Database with 1000 recipients (100 due now)
- Measure: Query time + cohort balancing time
- Target: <500ms

### Benchmark 3: Cohort Balancing Overhead
- 100 recipients in single cohort (all due at same minute)
- Measure: balanceWithinCohorts execution time
- Target: <100ms

## Geographic Distribution Validation

### Validation 1: US Timezone Coverage
- Add 40 recipients:
  - 10x ET (UTC-5)
  - 10x CT (UTC-6)
  - 10x MT (UTC-7)
  - 10x PT (UTC-8)
- Expected: Even distribution when cohorts have mixed timezones
- Validation: Count consecutive same-timezone sends (should be ≤2)

### Validation 2: Business Hours Alignment
- Recipient in PT (America/Los_Angeles)
- Business hours: 9 AM - 5 PM PT
- Admin in ET with window 9 AM - 5 PM ET
- Expected: Email sent during overlap window (12 PM - 5 PM ET = 9 AM - 2 PM PT)
- Validation: Verify `nextSendAt` respects both windows

## Integration Tests

### Integration 1: WooCommerce Duplicate Prevention
- Recipient exists in Commission Tracker
- Attempt to add via bulk-add
- Expected: Skipped with warning
- Validation: No duplicate enrollment

### Integration 2: OpenAI Email Generation
- Send email to recipient
- Expected: AI generates unique email using `strategyTranscript`
- Validation: Email content personalized, no template fallback

### Integration 3: Gmail Threading
- Send Email 1 to recipient
- Wait for threadId assignment
- Send Email 2 (follow-up)
- Expected: Email 2 uses same threadId (threaded reply)
- Validation: Both emails in same Gmail conversation

## Manual Test Execution Plan

### Setup Phase
1. Verify admin user logged in
2. Create test sequence: "Queue Test Sequence"
3. Set admin window: 9 AM - 5 PM ET
4. Set rate limit: 200/day
5. Enable skipWeekends

### Execution Phase
1. Run Scenario 2A (timezone balancing)
2. Run Scenario 3B (high-volume bulk add)
3. Run Scenario 5A (follow-up priority)
4. Document results in this file

### Validation Phase
1. Query database: `SELECT id, email, nextSendAt, timezone FROM sequence_recipients ORDER BY nextSendAt`
2. Verify FIFO ordering
3. Verify geographic diversity
4. Verify rate limiting spacing

## Success Criteria
- ✅ All FIFO ordering preserved across scenarios
- ✅ Timezone balancing achieves round-robin within cohorts
- ✅ Rate limiting spreads emails evenly (±10% tolerance)
- ✅ Mutex prevents race conditions
- ✅ Follow-ups prioritized over fresh emails
- ✅ Edge cases handled gracefully
- ✅ Performance targets met

## Test Results
(To be filled during execution)
