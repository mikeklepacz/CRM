# Route Responsibility Audit - Phase 1

## Objective
Lock a safe refactor contract for route extraction with zero behavior change first, then controlled architecture cleanup.

## Snapshot (Generated)
Source: `docs/route-audit-summary.json` (from `scripts/route-responsibility-audit.mjs`)

- Total routes discovered: `472`
- Unique route domains: `62`
- Route source files scanned: `17`
- Top domains by route count:
  - `super-admin` 50
  - `org-admin` 34
  - `elevenlabs` 30
  - `ehub` 24
  - `apollo` 21
  - `sequences` 19

## Route Responsibility Contract (Mandatory)
Every route module must satisfy all of the following:

1. Route handlers are orchestration only.
- Allowed: parse request, call service(s), map response.
- Not allowed: business logic branches, SQL, direct provider orchestration.

2. Tenant resolution is explicit at route boundary.
- Use `req.user.tenantId` or explicit super-admin override helper.
- Pass `tenantId` into every service/storage method.

3. Auth and role are explicit per endpoint.
- No implied auth.
- Public/webhook routes must be explicitly marked and isolated.

4. Side effects live in services.
- Email send, queue scheduling, external API calls, and event emitters are service responsibilities.

5. Cross-tenant queries are forbidden in route/data paths.
- Exceptions require explicit platform-level route + guard.

6. Route response shape remains unchanged during extraction.
- Phase 1 refactor is move-only behavior parity.

7. Route modules are single-purpose and small.
- Keep files under 300 LOC by sub-splitting.

8. Add a parity checklist before each extraction PR.
- Path parity, middleware parity, response/status parity, tenant scope parity.

## Current Critical Violations (Must Fix During Refactor)

### A) Single-tenant background assumptions in multi-tenant workflows
- `server/storage.ts:5932` `getAdminTenantId()` chooses one admin-default tenant.
- Used by queue/scheduling paths:
  - `server/services/emailQueue.ts:34`
  - `server/services/Matrix2/slotGenerator.ts:173`
  - `server/services/Matrix2/slotAssigner.ts:141`
  - `server/services/slotMaintenance.ts:16`

Impact: onboarding many tenants does not scale fairly; jobs run with wrong tenant context.

### B) Hardcoded admin identity in Gmail/send paths
- `server/services/emailQueue.ts:152`
- `server/services/gmailClient.ts:4`
- `server/services/gmailWatchManager.ts:52`
- `server/services/gmailHistoryService.ts:1`

Impact: reply detection/send behavior can couple to one mailbox/user instead of tenant-owned account.

### C) Missing tenant filters in hot E-Hub queries
- Queue endpoint reads slots without tenant filter:
  - `server/routes/ehub/ehubQueueRecipients.routes.ts:57`
- Slot/recipient DB helpers do cross-tenant scans:
  - `server/services/Matrix2/slotDb.ts:46`
  - `server/services/Matrix2/recipientDb.ts:29`
- Paused/history/failure queries are not tenant-scoped:
  - `server/storage.ts:4773`
  - `server/storage.ts:4933`
  - `server/routes/ehub/ehubOperations.routes.ts:97`
  - `server/routes/ehub/ehubOperations.routes.ts:223`

Impact: cross-tenant data leakage and load amplification.

### D) SSE tenant scoping gap
- Event stream client registration omits tenantId:
  - `server/routes.ts:954-959`
- Event gateway supports tenant filtering but relies on provided tenantId:
  - `server/services/events/gateway.ts:73`
- Several emits are global broadcasts (no tenant filter):
  - `server/services/Matrix2/slotAssigner.ts:104`
  - `server/services/Matrix2/slotAssigner.ts:222`
  - `server/services/Matrix2/slotGenerator.ts:251`
  - `server/routes.ts:8695`
  - `server/call_dispatcher.ts:233`

Impact: wrong tenants can receive cache-invalidation/event noise.

### E) Platform fairness bottlenecks
- Call dispatcher claims global oldest 50, not per-tenant fair share:
  - `server/storage.ts:3666`
- Reconciliation worker loops all tenants serially on interval with no run lock:
  - `server/services/elevenLabsReconciliation.ts:244`

Impact: large tenants can starve smaller tenants during bursts.

## Phase 1 Deliverables (Done)
- Added inventory script: `scripts/route-responsibility-audit.mjs`
- Added machine snapshot: `docs/route-audit-summary.json`
- Added this contract doc: `docs/route-responsibility-audit-P1.md`

## Phase 2 Execution Order (Recommended)

1. Secure route boundary first (no behavior changes)
- Extract domains into route modules with parity tests/checklist.
- Start with domains already partially extracted: `ehub`, `apollo`.

2. Tenant-scope hardening pass
- Add tenant filters to every E-Hub queue/history/failure query.
- Pass `tenantId` through Matrix2 DB helpers.

3. Worker context hardening
- Remove `getAdminTenantId()` from queue/scheduler flows.
- Process per-tenant with explicit work-claiming.

4. SSE isolation hardening
- Register client with tenantId.
- Require tenant filter for tenant events.

## Per-Batch Parity Checklist
Use this for every extraction batch:

- [ ] Endpoint path is unchanged
- [ ] Middleware stack is unchanged
- [ ] Response body/status is unchanged
- [ ] Tenant source is explicit and unchanged
- [ ] Side effects still occur in same order
- [ ] No new direct DB queries in route file
- [ ] Build/type check passes for touched server paths

## Notes
This audit intentionally separates "move-only extraction" from "behavior fixes." Keep that separation to avoid fragile rewrites.
