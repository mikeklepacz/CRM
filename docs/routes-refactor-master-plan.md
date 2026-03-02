# CRM Route Refactor Master Plan

Last updated: February 25, 2026
Owner: Backend/Core
Scope: `/Users/mike/CRM/server/routes.ts` decomposition + responsibility hardening

## 1) Objective
Refactor routing and module boundaries so the platform can safely handle rapid tenant growth (example: +100 tenants) without cross-tenant leakage, queue starvation, or route fragility.

## 2) Success Criteria
1. `server/routes.ts` becomes a thin registrar (no feature logic).
2. Every route belongs to one module owner and one route file family.
3. No route module exceeds 300 LOC; split by subdomain when needed.
4. Tenant context is explicit at every route boundary.
5. Background workers run per tenant with fair work claiming.
6. SSE/events are tenant-scoped.
7. Route parity maintained during extraction (no behavior regressions).

## 3) Non-Negotiable Rules
1. Extraction first is move-only (zero behavior change).
2. No SQL/business logic in route handlers after hardening phase.
3. Route/controller layer stays orchestration only.
4. One module per file family (`routes`, `services`, optional `repos`).
5. Every batch must pass parity checklist and targeted verification.

## 4) Current Snapshot (Starting Point)
1. `server/routes.ts` is still the main monolith (~25k LOC).
2. Existing extracted areas: WooCommerce, Orders, EHub slices, Apollo slices.
3. Latest route inventory: `472` routes (`scripts/route-responsibility-audit.mjs`).
4. Critical risks already identified:
- Worker tenant context (`getAdminTenantId` dependency in queue/scheduling paths).
- EHub query tenant filters missing in hot paths.
- SSE tenant scoping gaps.
- Call dispatcher fairness bottleneck.

## 5) Module Map (Business Modules -> Code Areas)
1. Platform module
- `server/routes/platform/*`
- super-admin, tenant lifecycle, platform settings
2. Organization
- `server/routes/organization/*`
- org config, tenant projects, tenant policies
3. Admin
- `server/routes/admin/*`
- user admin, permissions, org admin operations
4. Dashboard
- `server/routes/dashboard/*`
- analytics/summary endpoints
5. Clients
- `server/routes/clients/*`
- clients, stores, statuses, categories
6. Follow-up
- `server/routes/followup/*`
- reminders, follow-ups, sequence-related follow-up operations
7. Map search
- `server/routes/maps/*`
- geocode/map search endpoints
8. Sales
- `server/routes/sales/*`
- orders, commissions, tracker/sales flows
9. Assistant
- `server/routes/assistant/*`
- OpenAI assistants, aligner assistant routes
10. Docs
- `server/routes/docs/*`
- drive, kb, docs endpoints
11. Label designer
- `server/routes/labelDesigner/*`
- label project routes
12. Qualification
- `server/routes/qualification/*`
- qualification leads/campaigns/invites
13. Call manager
- `server/routes/callManager/*`
- elevenlabs, twilio, call sessions/history/analytics
14. eHub
- `server/routes/ehub/*`
- queue, recipients, blacklist, no-send/holiday/test-email
15. Apollo
- `server/routes/apollo/*`
- enrichment/search/discovery/management/prescreen

## 6) Execution Strategy (Two Tracks)

### Track A: Route Decomposition (Parity, Move-Only)
Goal: make route boundaries modular without changing behavior.

Batch A1 (in progress)
1. Apollo completion
- Done: core, management, prescreen, leads-discovery extracted.
- Remaining: verify no Apollo endpoint left in monolith.

Batch A2
1. EHub + Follow-up completion
- Extract remaining sequence/follow-up handlers into `ehub` and `followup` route families.

Batch A3
1. Platform + Organization + Admin
- Pull super-admin/org-admin/admin endpoints into dedicated route families.

Batch A4
1. Call manager
- Extract ElevenLabs/Twilio/call-session/history/analytics into dedicated files.

Batch A5
1. Clients + Map search + Sales
- Extract clients/stores/maps/orders/commissions/tracker endpoints.

Batch A6
1. Assistant + Docs + Label designer + Dashboard + Qualification leftovers
- Finish remaining domains and leave monolith as pure registration shell.

Exit criteria for Track A
1. `server/routes.ts` only initializes shared deps + registers module route groups.
2. Each route file <= 300 LOC.
3. Domain routes are owned by one module family.

### Track B: Responsibility Hardening (Behavior Improvements)
Goal: remove the scalability and correctness risks exposed by audit.

Batch B1: Tenant Scope Hardening
1. Add tenant filters for all EHub queue/history/failure queries.
2. Ensure Matrix2 helpers always require `tenantId`.
3. Block cross-tenant reads by default.

Batch B2: Worker Context Hardening
1. Remove `getAdminTenantId()` from queue/scheduler flows.
2. Process jobs by explicit tenant work claims.
3. Add per-tenant work chunking + lock/lease.

Batch B3: Event Isolation Hardening
1. Register SSE clients with tenantId.
2. Enforce tenant-targeted emits for tenant events.
3. Audit and remove global broadcast usage where unsafe.

Batch B4: Fairness/Throughput Hardening
1. Replace global oldest-first dispatcher claiming with fair per-tenant strategy.
2. Add reconciliation worker lock and bounded concurrency.
3. Add starvation guard metrics.

Batch B5: Route-Service Boundary Cleanup
1. Move heavy logic from route files into module services (example: Apollo lead discovery).
2. Route handlers become parse -> service -> response only.

## 7) Concrete Deliverables Per Module
For each module (all 15):
1. `server/routes/<module>/...` route files (thin handlers).
2. `server/services/<module>/...` service files for business logic.
3. Optional repository helpers when direct DB logic exists.
4. Registration wiring in `server/routes.ts` (or `server/routes/index.ts` if introduced).
5. Module audit note in docs (what moved, what remains, risks).

## 8) Parity Checklist (Mandatory for Every Extraction Batch)
1. Endpoint path unchanged.
2. Middleware order unchanged.
3. Response status/body unchanged.
4. Tenant source unchanged.
5. Side-effect order unchanged.
6. No new DB/provider logic introduced in route files.
7. Route count script unchanged except intentional additions/removals.

## 9) Verification Gates
For each batch, run:
1. Inventory/parity
```bash
node scripts/route-responsibility-audit.mjs
```
2. Build smoke for touched files (bundle check acceptable when global TS is red)
```bash
npx esbuild <touched-route-file> --bundle --platform=node --format=esm --outfile=/tmp/<name>.js
```
3. Targeted runtime smoke (manual/API collection) for moved endpoints.

Report in PR/log:
1. What ran.
2. Pass/fail.
3. Residual risks.

## 10) Sequencing Recommendation (Recommended Priority)
1. Complete Track A first to stabilize ownership and reduce route fragility.
2. Immediately execute Track B1-B4 before major tenant onboarding.
3. Execute B5 continuously as each module is touched.

## 11) Risks and Mitigations
1. Risk: hidden behavior drift during extraction.
- Mitigation: strict move-only batches + parity checklist.
2. Risk: global type-check noise hides local regressions.
- Mitigation: per-file bundle checks + endpoint smoke tests.
3. Risk: throughput regressions when fairness locks added.
- Mitigation: ship behind feature flags and compare queue latency metrics.

## 12) Rollout Plan
1. Merge in small batches by module family.
2. After each merge, run route inventory and smoke tests.
3. Enable worker fairness changes behind config flags.
4. Observe queue depth, call latency, and tenant error rates.
5. Roll back by disabling flags if anomalies detected.

## 13) Definition of Done (Program-Level)
1. `server/routes.ts` is thin and stable.
2. All 15 business modules have isolated route families.
3. Critical tenant/fairness issues from audit are resolved.
4. No known cross-tenant read/write in hot paths.
5. Worker and event systems are tenant-scoped and fair.
6. Route inventory and smoke tests are green for final cutover.
