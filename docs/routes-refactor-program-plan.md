# Routes Refactor Program Plan

Last updated: February 25, 2026
Repo: `/Users/mike/CRM`
Owner: Backend Platform

## Purpose
Refactor routing into module-owned boundaries so rapid tenant growth does not create fragility, cross-tenant leakage, or queue starvation.

## Non-Negotiables
1. Keep route behavior unchanged during extraction (move-only first).
2. Route handlers are thin: parse -> service -> response.
3. Business logic moves to `server/services/<module>/*`.
4. Every tenant-scoped call passes explicit `tenantId`.
5. Keep touched route/service files under 300 LOC.
6. Verify each batch with targeted build checks + route audit script.

## Module Map (Canonical)
1. Platform module
- Route family: `server/routes/platform/*`
- Scope: super-admin controls, tenant lifecycle, platform diagnostics
- Status: Not started

2. Organization
- Route family: `server/routes/organization/*`
- Scope: org settings, projects, tenant policy
- Status: Not started

3. Admin
- Route family: `server/routes/admin/*`
- Scope: user admin, role/permission operations
- Status: Not started

4. Dashboard
- Route family: `server/routes/dashboard/*`
- Scope: KPI and summary endpoints
- Status: Not started

5. Clients
- Route family: `server/routes/clients/*`
- Scope: clients/stores/status/category endpoints
- Status: Not started

6. Follow-up
- Route family: `server/routes/followup/*`
- Scope: follow-up workflows and center endpoints
- Status: In progress (core follow-up center extracted)

7. Map search
- Route family: `server/routes/maps/*`
- Scope: geocode and map search endpoints
- Status: Not started

8. Sales
- Route family: `server/routes/sales/*`
- Scope: sales reporting, commissions/tracker sales flows
- Status: Partial (orders/woocommerce extracted elsewhere)

9. Assistant
- Route family: `server/routes/assistant/*`
- Scope: assistant orchestration and AI assistant endpoints
- Status: Not started

10. Docs
- Route family: `server/routes/docs/*`
- Scope: drive/knowledge-base/document endpoints
- Status: Not started

11. Label designer
- Route family: `server/routes/labelDesigner/*`
- Scope: label designer + label project APIs
- Status: Not started

12. Qualification
- Route family: `server/routes/qualification/*`
- Scope: campaigns, leads, qualification controls
- Status: In progress (campaigns/leads extracted)

13. Call manager
- Route family: `server/routes/callManager/*`
- Scope: ElevenLabs, Twilio, call sessions/history/analytics
- Status: Not started (high-risk domain)

14. eHub
- Route family: `server/routes/ehub/*`
- Scope: sequences, recipients, queue, blacklist, operations, no-send/test-email
- Status: In progress (major sequence slices extracted)

15. Apollo
- Route family: `server/routes/apollo/*`
- Scope: management, core, lead discovery, prescreen
- Status: In progress (primary slices extracted)

## Current Progress Snapshot
1. Extracted and registered route modules:
- `server/routes/ehub/sequencesCore.routes.ts`
- `server/routes/ehub/sequencesStrategy*.routes.ts`
- `server/routes/ehub/sequencesConfig.routes.ts`
- `server/routes/ehub/sequencesSyntheticTest.routes.ts`
- `server/routes/ehub/sequencesRecipientsRead.routes.ts`
- `server/routes/ehub/sequencesRecipientsWrite.routes.ts`
- `server/routes/followup/*`
- `server/routes/qualification/*`
- `server/routes/apollo/*`

2. Tenant hardening landed in eHub queue path:
- `server/routes/ehub/ehubQueueRecipients.routes.ts`
- `server/storage.ts` method signatures now accept optional `tenantId` where needed.

## Execution Waves

### Wave 1: Finish EHub + Apollo route extraction
1. Complete any remaining inline eHub and Apollo handlers.
2. Move residual heavy route logic to services.
3. Keep route outputs unchanged.

### Wave 2: Call manager + Map search
1. Extract call routes into `callManager/*`.
2. Split webhooks/public routes from authenticated routes.
3. Add tenant-scoped event emission contracts.

### Wave 3: Platform + Organization + Admin
1. Move platform/org/admin endpoints into dedicated families.
2. Standardize guard ordering and auth contracts.
3. Remove role/business branching from route handlers.

### Wave 4: Clients + Sales
1. Extract clients/stores and remaining sales/tracker endpoints.
2. Move sheet mapping and normalization logic to services.
3. Add tenant guard tests for write paths.

### Wave 5: Dashboard + Assistant + Docs + Label designer + final Qualification
1. Decompose remaining feature domains.
2. Finalize service boundaries and clean route orchestration.
3. Reduce `server/routes.ts` to a registrar-only shell.

## Responsibility Audit Workstream (parallel with waves)
1. Remove single-tenant worker assumptions (`getAdminTenantId` dependency chain).
2. Enforce tenant context in scheduler/queue/slot assigner paths.
3. Scope SSE subscriptions and emits by tenant.
4. Add fair tenant claim strategy for queued processing.

## Per-Batch Verification
1. Route inventory/parity
```bash
node scripts/route-responsibility-audit.mjs
```
2. Build smoke (touched route/service files)
```bash
npx esbuild <file> --bundle --platform=node --format=esm --outfile=/tmp/<name>.js
```
3. Report required for each batch
- Commands run
- Pass/fail
- Residual risk

## Program Definition of Done
1. `server/routes.ts` is thin registration only.
2. All 15 modules own their route family.
3. No route file contains heavy business/provider logic.
4. Tenant scoping is explicit in route and service boundaries.
5. Queue/worker/event flows are tenant-safe and fair under load.
