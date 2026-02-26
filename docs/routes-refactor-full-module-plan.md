# Routes Refactor Full Module Plan (Execution Contract)

Last updated: February 26, 2026
Applies to: `/Users/mike/CRM`
Primary goal: make routing/module boundaries safe for fast multi-tenant growth.

## 0) Ground Rules (Mandatory)
1. Move-only extraction first. No behavior changes while relocating handlers.
2. Keep all paths/middleware/response shapes identical during extraction.
3. Route files stay <= 300 LOC. Split by subdomain if needed.
4. Route handlers are orchestration only; business logic lives in services.
5. Tenant context is explicit at route boundary for every tenant-scoped endpoint.
6. Run verification after every batch and record pass/fail + residual risk.

## 1) Current State
1. Monolith file still exists: `server/routes.ts` (~7.1k LOC, currently 7,111 lines).
2. Route inventory latest snapshot: `471` routes (after removing one duplicated `/api/conversations/:id` route definition).
3. Partially modular already:
- `server/routes/ehub/*`
- `server/routes/apollo/*`
- `server/routes/orders*`
- `server/routes/woocommerce*`
4. Progress update (February 26, 2026):
- Platform routes now extracted to `server/routes/platform/*` for super-admin tenant/user/sheets/webhooks/ElevenLabs/tickets.
- Organization routes now extracted to `server/routes/organization/*` for org-admin users/settings/invites/pipelines/projects/blueprints.
- Admin routes partially extracted to `server/routes/admin/*` (`emailAccounts`, `adminWebhooks`).
- Docs routes partially extracted to `server/routes/docs/*` (`drive`).
- Sheets routes extracted to `server/routes/sheets/*` for catalog/sync/update/tracker upsert/tracker unclaim/auto-claim/claim-store/contact-action.
- Call Manager routes include manual call history extraction (`server/routes/callManager/manualCallHistory.routes.ts`).
- Clients store route families extracted to `server/routes/clients/*` (`storeDetailsRead`, `storeDetailsUpdate`, `storeLifecycle`, `storeDiscovery`, `storeAssignmentAdmin`).
- Clients manual match/non-duplicate flows extracted to `server/routes/clients/*` (`storeManualMatching`, `nonDuplicates`).
- Clients parse-and-match flow extracted to `server/routes/clients/*` (`storeParseMatch`) with shared service modules in `server/services/clients/storeParseMatch/*`.
- Map search Google-store lookup extracted to `server/routes/mapSearch/*` (`storeGoogleSearch`).
- Dashboard analytics routes extracted to `server/routes/dashboard/*` (`analyticsDashboardSummary`, `analyticsCommissionBreakdown`, `analyticsPortfolioMetrics`, `analyticsTopClients`).
- Dashboard widget layout routes extracted to `server/routes/dashboard/*` (`widgetLayout`).
- Dashboard notifications/integrations routes extracted to `server/routes/dashboard/*` (`notifications`, `integrations`).
- Follow-up reminder routes extracted to `server/routes/followup/*` (`reminderRead`, `reminderMutations`, `reminderCalendar`).
- Follow-up reminder create route extracted to `server/routes/followup/*` (`reminderCreate`) with service split in `server/services/followup/reminderCreate/*`.
- Follow-up manual draft enrollment route now uses shared service ownership in `server/services/followup/manualDraftEnrollmentService.ts` (also reused by Gmail draft flow to remove duplicated follow-up DB logic).
- Follow-up calendar webhook routes/services extracted to `server/routes/followup/*` + `server/services/followup/calendarWebhook/*` (`webhook-status`, `webhook-register`, `webhooks/google-calendar`, renewal scheduler).
- Follow-up route registration is consolidated under `registerFollowUpRoutes` (`followup.routes.ts`) and no Follow-up HTTP handlers remain inline in `server/routes.ts`.
- Assistant OpenAI settings routes extracted to `server/routes/assistant/*` (`openaiSettings`).
- Assistant conversations routes extracted to `server/routes/assistant/*` (`conversations`) and duplicated inline conversation delete route removed.
- Assistant OpenAI chat history routes extracted to `server/routes/assistant/*` (`openaiChatHistory`).
- Assistant OpenAI file-management routes extracted to `server/routes/assistant/*` (`openaiFilesRead`, `openaiFilesUpload`, `openaiFilesMutations`).
- Assistant management routes extracted to `server/routes/assistant/*` (`assistants`) for `/api/assistants*`.
- Assistant KB management routes extracted to `server/routes/assistant/*` (`kbManagement`) for `/api/kb/files*` and `/api/kb/proposals` list/delete paths, with update flow logic moved to `server/services/assistant/kbFileUpdateService.ts`.
- Assistant KB proposal mutations extracted to `server/routes/assistant/*` (`kbProposalMutations`) for `/api/kb/proposals/:id` edit/reject actions.
- Assistant KB rollback extracted to `server/routes/assistant/*` (`kbRollback`) for `/api/kb/files/:id/rollback` with rollback/versioning logic in `server/services/assistant/kbRollbackService.ts`.
- Assistant KB proposal approval extracted to `server/routes/assistant/*` (`kbProposalApproval`) for `/api/kb/proposals/:id/approve` with edit-application/sync workflow in `server/services/assistant/kbProposalApprovalService.ts`.
- Assistant Aligner core routes extracted to `server/routes/assistant/*` (`alignerCore`) for `/api/aligner` + settings mutation endpoints.
- Assistant Aligner file/sync routes extracted to `server/routes/assistant/*` (`alignerFiles`) with services in `server/services/assistant/alignerFiles/*`.
- Assistant Aligner history routes extracted to `server/routes/assistant/*` (`alignerHistory`) for `chat/history` + conversation-message history paths.
- Assistant heavy chat/sync/proposal entrypoints are now module-owned registrations (`openaiChat`, `alignerProposalFlows`, `kbSyncAnalyze`) with shared handler delegation in `routes.ts`; next step is full service extraction of those handler bodies.
- Map-search preference/history routes extracted to `server/routes/mapSearch/*` (`preferences`) for active exclusions + search history + selected category persistence.
- Map-search core/read routes extracted to `server/routes/mapSearch/*` (`searchCore`) for `/api/maps/search`, `/api/maps/grid-search`, `/api/maps/place/:placeId`, `/api/maps/reverse-geocode`, `/api/maps/check-duplicates` with logic in `server/services/mapSearch/searchCoreService.ts`.
- Map-search save actions extracted to `server/routes/mapSearch/*` (`saveActions`) for `/api/maps/save-to-sheet` and `/api/maps/save-to-qualification` with logic in `server/services/mapSearch/saveActionsService.ts`.
- Map-search client pins extracted to `server/routes/mapSearch/*` (`clientPins`) for `/api/maps/client-pins` with merge/geocode batching logic in `server/services/mapSearch/clientPinsService.ts`.
- Docs email image library routes extracted to `server/routes/docs/emailImages.routes.ts` with business logic in `server/services/docs/emailImagesService.ts`.
- Docs ticket routes extracted to `server/routes/docs/ticketsRead.routes.ts` and `server/routes/docs/ticketsWrite.routes.ts` with shared logic in `server/services/docs/ticketsService.ts`.
- Docs Google Sheets auth routes extracted to `server/routes/docs/googleSheetsAuth.routes.ts` with OAuth/settings/disconnect logic in `server/services/docs/googleSheetsAuthService.ts`.
- Docs Gmail auth/push routes extracted to `server/routes/docs/gmailOauthSupport.routes.ts` + `server/routes/docs/gmailPush.routes.ts` with services in `server/services/docs/gmailOauthSupportService.ts` and `server/services/docs/gmailPushService.ts`.
- Docs Gmail draft flow extracted to `server/routes/docs/gmailDraft.routes.ts` with main logic in `server/services/docs/gmailDraftService.ts` and label resolution in `server/services/docs/gmailDraftLabelsService.ts`.
- Organization CSV upload extracted to `server/routes/organization/csvUpload.routes.ts` with row upsert logic in `server/services/organization/csvUploadService.ts`.
- Organization merged-sheet endpoint extracted to `server/routes/organization/sheetsMergedDataLegacy.routes.ts` with delegated handler ownership.
- Call manager legacy ElevenLabs/debug endpoints extracted to `server/routes/callManager/elevenLabsLegacy.routes.ts` (module-owned route registration with delegated handlers to preserve behavior during this phase).
- Clients `/api/stores/by-link` extracted to `server/routes/clients/storeByLink.routes.ts` with lookup logic in `server/services/clients/storeByLinkService.ts`.
- Clients remaining inline family extracted to `server/routes/clients/clientsLegacy.routes.ts` with delegated handler ownership for `/api/clients*`.
- Admin remaining user-management family extracted to `server/routes/admin/usersLegacy.routes.ts` with delegated handler ownership for `/api/users*` and `/api/admin/users/:userId`.
- Platform auth/user/event endpoints extracted to `server/routes/platform/platformAuthUserLegacy.routes.ts` with delegated handler ownership for `/api/auth/*`, `/api/user/*`, and `/api/events`.
- Call manager voice-proxy health/metrics routes extracted to `server/routes/callManager/*` (`voiceProxyHealth`).
- Sales project/template/tag routes extracted to `server/routes/sales/*` (`projects`, `templates`, `userTags`) with template defaulting logic moved to `server/services/sales/templateDefaultsService.ts`.
- Sales category/status routes extracted to `server/routes/sales/*` (`categories`, `statuses`) with status seeding moved to `server/services/sales/statusSeedService.ts`.
- Sales exclusions routes extracted to `server/routes/sales/*` (`exclusions`).
- Sales reports/commissions routes extracted to `server/routes/sales/*` (`reports`, `commissions`) with reporting logic moved to `server/services/sales/reportsService.ts`.
- Label Designer export route extracted to `server/routes/labelDesigner/labelProjectsExport.routes.ts` with ZIP/PDF/Drive orchestration in `server/services/labelDesigner/labelProjectExportService.ts`.
- `server/routes.ts` reduced to orchestration for platform/org-admin families (no inline `/api/super-admin/*` or `/api/org-admin/*` handlers remain) and now sits at ~7.1k LOC (7,111 lines) with zero inline `/api` route declarations.
4. Critical scale risks to fix after extraction:
- Cross-tenant query gaps in EHub/Matrix2 data paths.
- Worker context tied to admin-default tenant.
- SSE/event tenant scoping gaps.
- Global call-dispatcher fairness bottleneck.

## 2) Exact Module List and Plan

### 1. Platform module
Current state: Route registration extraction complete; service extraction/hardening pending.
Target route family: `server/routes/platform/*`
Scope:
- super-admin platform controls
- platform-wide tenant lifecycle routes
- platform-only settings and diagnostics
Extraction batch: Wave 3
Hardening tasks:
- enforce explicit platform guards for cross-tenant operations
Done criteria:
- no platform endpoint remains inline in `server/routes.ts`

### 2. Organization
Current state: Route registration extraction complete; service extraction/hardening pending.
Target route family: `server/routes/organization/*`
Scope:
- tenant/org settings
- tenant project and module settings
- org-level policy routes
Extraction batch: Wave 3
Hardening tasks:
- verify org-only boundaries vs platform boundaries
Done criteria:
- org config endpoints grouped and module-owned

### 3. Admin
Current state: Route registration extraction complete; service extraction/hardening pending.
Target route family: `server/routes/admin/*`
Scope:
- user management
- role assignment/permission operations
- admin maintenance endpoints
Extraction batch: Wave 3
Hardening tasks:
- standardize admin guard order across all admin endpoints
Done criteria:
- admin endpoints moved with unchanged behavior

### 4. Dashboard
Current state: Route extraction complete for current endpoint inventory.
Target route family: `server/routes/dashboard/*`
Scope:
- dashboard summary and KPI endpoints
- tenant-scoped overview endpoints
Extraction batch: Wave 6
Hardening tasks:
- ensure all dashboard aggregations are tenant-scoped
Done criteria:
- dashboard routes are isolated and thin

### 5. Clients
Current state: Route registration extraction complete; service extraction/hardening pending.
Target route family: `server/routes/clients/*`
Scope:
- clients/stores/status/category endpoints
- core CRM customer data operations
Extraction batch: Wave 5
Hardening tasks:
- remove direct data-shaping logic from routes into services
Done criteria:
- clients/stores stack fully extracted and grouped

### 6. Follow-up
Current state: Route extraction complete; service hardening in progress.
Target route family: `server/routes/followup/*`
Scope:
- follow-up workflows
- reminder/follow-up-related sequence operations
Extraction batch: Wave 2 and Wave 5 split
Hardening tasks:
- normalize follow-up due-date logic into service layer
Done criteria:
- no follow-up logic remains embedded in monolith routes

### 7. Map search
Current state: Route extraction complete.
Target route family: `server/routes/maps/*`
Scope:
- geocoding/map lookup endpoints
- map search API wrappers
Extraction batch: Wave 4
Hardening tasks:
- cache and provider calls handled in services only
Done criteria:
- map routes are separate and route handlers are thin

### 8. Sales
Current state: Route extraction complete for planned sales route families.
Target route family: `server/routes/sales/*`
Scope:
- orders/commissions/tracker-related sales endpoints
- sales-oriented reporting endpoints
Extraction batch: Wave 5
Hardening tasks:
- unify tracker and commission logic under service layer
Done criteria:
- remaining sales endpoints extracted from monolith

### 9. Assistant
Current state: Route registration extraction complete; service extraction for delegated handlers pending.
Target route family: `server/routes/assistant/*`
Scope:
- assistant/aligner/openai assistant endpoints
- assistant orchestration routes
Extraction batch: Wave 6
Hardening tasks:
- move prompt/build orchestration logic out of route handlers
Done criteria:
- assistant routes modularized with clear ownership

### 10. Docs
Current state: Route extraction complete for current docs endpoint inventory.
Target route family: `server/routes/docs/*`
Scope:
- drive/kb/doc-management endpoints
- document pipeline endpoints
Extraction batch: Wave 6
Hardening tasks:
- isolate file-provider side effects in services
Done criteria:
- docs/kb/drive endpoints no longer inline

### 11. Label designer
Current state: Route extraction complete.
Target route family: `server/routes/labelDesigner/*`
Scope:
- label designer HTTP routes
- label project CRUD endpoints
Extraction batch: Wave 6
Hardening tasks:
- keep route-level validation only; rendering logic in service
Done criteria:
- label designer has dedicated route module family

### 12. Qualification
Current state: Route extraction complete.
Target route family: `server/routes/qualification/*`
Scope:
- qualification leads/campaigns/invites
- qualification automation endpoints
Extraction batch: Wave 2 and Wave 6 split
Hardening tasks:
- enforce module-enabled guard consistently for all qualification routes
Done criteria:
- qualification routes isolated and tenant-scoped

### 13. Call manager
Current state: Route registration extraction complete; service extraction for legacy delegated handlers pending.
Target route family: `server/routes/callManager/*`
Scope:
- ElevenLabs webhooks + initiate/batch/queue/analytics
- Twilio status/twiml/voip endpoints
- call session/history endpoints
Extraction batch: Wave 4 (highest risk)
Hardening tasks:
- tenant-scoped SSE events
- fairness in call queue claiming
Done criteria:
- call stack extracted and worker safety tasks implemented

### 14. eHub
Current state: Route extraction complete for planned eHub families.
Target route family: `server/routes/ehub/*`
Scope:
- queue/recipients/operations/blacklist/no-send/test-email
- remaining sequence-related eHub routes
Extraction batch: Wave 2
Hardening tasks:
- add missing tenant filters in queue/history/failure queries
- pass tenantId through Matrix2 DB helpers
Done criteria:
- all eHub routes modular + tenant-safe hot paths

### 15. Apollo
Current state: Largely extracted (`management`, `core`, `leadDiscovery`, `prescreen`).
Target route family: `server/routes/apollo/*`
Scope:
- enrichment/search/preview/enrich/management/discovery/prescreen
Extraction batch: Wave 1 (mostly done)
Hardening tasks:
- move heavy lead-discovery logic into service layer (`apolloLeadDiscovery` cleanup)
Done criteria:
- no inline Apollo handlers remain in `server/routes.ts`

## 3) Wave Plan (Ordered)

### Wave 1 (Complete or near-complete)
1. Apollo extraction completion.
2. Apollo parity verification and cleanup list.

### Wave 2
1. eHub completion.
2. Follow-up + Qualification extraction pass 1.
3. Start tenant-scope hardening in EHub/Matrix2.

### Wave 3
1. Platform extraction.
2. Organization extraction.
3. Admin extraction.

### Wave 4
1. Call manager extraction (ElevenLabs, Twilio, call sessions/history).
2. Map search extraction.
3. SSE tenant scope hardening pass.

### Wave 5
1. Clients extraction.
2. Sales extraction (remaining non-order/woocommerce pieces).
3. Follow-up pass 2 completion.

### Wave 6
1. Assistant extraction.
2. Docs extraction.
3. Label designer extraction.
4. Dashboard extraction.
5. Qualification final cleanup.

### Wave 7 (Hardening/Scale Final)
1. Worker tenant-context hardening (`getAdminTenantId` removal path).
2. Fair call-dispatch claim strategy.
3. Reconciliation worker lock + bounded concurrency.
4. Route-service boundary cleanup for any heavy routes left.

## 4) Verification Checklist (Run Every Batch)
1. Route inventory parity
```bash
node scripts/route-responsibility-audit.mjs
```
2. Bundle smoke for each touched route file
```bash
npx esbuild <file> --bundle --platform=node --format=esm --outfile=/tmp/<name>.js
```
3. Endpoint smoke for moved routes (manual or scripted collection).
4. Record:
- Commands run
- Pass/fail
- Residual risk

## 5) Batch Acceptance Gate (No Merge if Failed)
1. Moved endpoints still reachable on original paths.
2. Middleware stack unchanged.
3. Response code/body unchanged.
4. Tenant source unchanged.
5. No new cross-tenant query path introduced.
6. Touched route files respect 300 LOC cap.

## 6) Deliverables Required at End
1. `server/routes.ts` reduced to registrar only.
2. All 15 modules have dedicated route families.
3. All critical tenant/fairness risks resolved.
4. Final route inventory stable and documented.
5. Production rollout checklist and rollback toggles documented.

## 7) Immediate Next 3 Batches (Concrete)
1. Batch N+1
- Service-extract delegated call-manager legacy handlers (`elevenLabsLegacy`) into `server/services/callManager/*` slices.
2. Batch N+2
- Service-extract delegated platform auth/user handlers (`platformAuthUserLegacy`) into `server/services/platform/*` + `server/services/organization/*` where appropriate.
3. Batch N+3
- Service-extract delegated admin/clients/organization legacy handlers (`usersLegacy`, `clientsLegacy`, `sheetsMergedDataLegacy`) and remove legacy wrappers.

## 8) Remaining Route Queue (Current Snapshot)
Inline routes left in `server/routes.ts`: `0`.

Module backlog (remaining inline handlers):
1. Assistant: route registration extraction complete for this wave; remaining work is service extraction inside delegated handlers (`openaiChat`, `alignerProposalFlows`, `kbSyncAnalyze`).
2. Sales: route extraction complete for this wave (`projects`, `templates`, `user-tags`, `categories`, `statuses`, `exclusions`, `reports`, `commissions`).
3. Docs: route extraction complete for this wave.
4. Map search: extraction complete for this wave (`storeGoogleSearch`, `preferences`, `searchCore`, `saveActions`, `clientPins`).
5. Call manager: route registration extraction complete for this wave; remaining work is service extraction for delegated legacy handlers.
6. Platform module: route registration extraction complete; remaining work is service extraction for delegated legacy handlers.
7. Admin: route registration extraction complete; remaining work is service extraction for delegated legacy handlers.
8. Clients: route registration extraction complete; remaining work is service extraction for delegated legacy handlers.
9. Organization: route registration extraction complete; remaining work is service extraction for delegated legacy handlers.
10. Label designer: extraction complete (`/api/label-projects/export` moved).

Modules at/near completion for route extraction:
1. Follow-up: complete (reminders + center + manual drafts + calendar webhooks + renewal extraction done).
2. Qualification: extracted to dedicated modules.
3. eHub: extracted to dedicated modules.
4. Apollo: extracted to dedicated modules.
5. Dashboard: analytics/widget/notifications/integrations extracted; minor shared endpoints remain to classify.

Execution order (remaining):
1. Call-manager legacy service extraction and decomposition.
2. Platform/admin/clients/organization legacy service extraction and decomposition.
3. Legacy route wrapper cleanup once service ownership is complete.
4. Hardening pass for tenant-safety/fairness/worker context.
