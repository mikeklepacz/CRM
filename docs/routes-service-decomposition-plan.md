# Routes Service Decomposition Plan (Post-P1)

Last updated: February 26, 2026  
Workspace: `/Users/mike/CRM`

## Snapshot (Current)
- `server/routes.ts`: **2,724 LOC**
- Inline `/api` route declarations in `routes.ts`: **0**
- Remaining inline `const handle... = async` blocks in `routes.ts`: **19**
- Largest handlers still in `routes.ts`:
  - `handleOpenaiChat` (~536 LOC)
  - `handleAlignerChat` (~254 LOC)
  - `handleUserListingAnalysis` (~205 LOC)
  - `handleAuthRegister` (~157 LOC)
  - `handleUserUploadLoadingLogo` (~136 LOC)
- Missing-auth candidates (route audit): **34**
  - `handleAgreeAndCreateProposals` (~230 LOC)
  - `handleAlignerChat` (~188 LOC)

## Progress Completed In This Pass
- Call Manager extracted to services:
  - `eligibleStores`, `batchCall`, `debugCallTrace`, `syncCalls`, `reconcileSessions`, `analyzeCalls`
  - `elevenLabsWebhook` split into `handler`, `flow`, and `extraction` services
- Clients extracted to services:
  - `getMyClients`
  - `filteredClients`, `claimClient`, `unclaimClient`, `getClientNotes`, `createClientNote`, `crawlClientEmails`
- Organization extracted to services:
  - `sheetsMergedData` handler pipeline
- Admin extracted to services:
  - `deactivateUser`, `reactivateUser`, `deleteUser`
- Assistant extracted to services:
  - `kbAnalyzeAndPropose`
  - `kbSync`
  - `kb sync helper cluster` (document-swap workflow + fuzzy matcher)
  - `aligner proposal flows` (`agreeAndCreateProposals`, `createProposalsFromChat`)
- `server/routes.ts` reduced by **4,387 LOC** in this phase (7,111 -> 2,724)

## Blunt Assessment
P1 solved route declaration sprawl, but **core business logic is still concentrated in `routes.ts`**.  
Your estimate is directionally right: **28 new files is the floor**.  
Given the 300 LOC cap, **realistic safe target is 34-38 files**.

## Minimum Viable Decomposition (28 New Files)

### Platform (5)
1. `server/routes/platform/authPassword.routes.ts`
2. `server/routes/platform/authUser.routes.ts`
3. `server/routes/platform/userSettings.routes.ts`
4. `server/services/platform/authPasswordService.ts`
5. `server/services/platform/userSettingsService.ts`

### Admin (5)
6. `server/routes/admin/usersRead.routes.ts`
7. `server/routes/admin/usersWrite.routes.ts`
8. `server/routes/admin/usersLifecycle.routes.ts`
9. `server/services/admin/usersReadService.ts`
10. `server/services/admin/usersWriteLifecycleService.ts`

### Clients (5)
11. `server/routes/clients/clientsRead.routes.ts`
12. `server/routes/clients/clientsMutations.routes.ts`
13. `server/routes/clients/clientNotes.routes.ts`
14. `server/services/clients/clientsReadService.ts`
15. `server/services/clients/clientsMutationsService.ts`

### Organization (4)
16. `server/routes/organization/sheetsMergedData.routes.ts`
17. `server/services/organization/mergedDataLoadService.ts`
18. `server/services/organization/mergedDataMergeService.ts`
19. `server/services/organization/mergedDataResponseService.ts`

### Call Manager (5)
20. `server/routes/callManager/elevenLabsWebhook.routes.ts`
21. `server/routes/callManager/elevenLabsOperations.routes.ts`
22. `server/routes/callManager/callTraceDebug.routes.ts`
23. `server/services/callManager/elevenLabsWebhookService.ts`
24. `server/services/callManager/elevenLabsOperationsService.ts`

### Assistant (4)
25. `server/routes/assistant/assistantLegacyOrchestrator.routes.ts`
26. `server/services/assistant/openaiChatServiceV2.ts`
27. `server/services/assistant/alignerKbSyncServiceV2.ts`
28. `server/services/assistant/proposalWorkflowServiceV2.ts`

## Recommended Safe Decomposition (34-38 Files)
Add extra splits for known over-size hotspots:
- Split `sheetsMergedData` into `load`, `expiration`, `merge`, `editability`, `cache`.
- Split `elevenLabsWebhook` into `validate`, `session-upsert`, `transcript`, `projection`.
- Split assistant flows (`kbSync`, `kbAnalyzeAndPropose`, `openaiChat`) into separate services.

This prevents creating new 500-700 LOC service files and avoids a second refactor cycle.

## Execution Order
1. Call manager service extraction (highest risk).
2. Organization merged-data extraction.
3. Assistant heavy handlers extraction.
4. Clients extraction.
5. Admin extraction.
6. Platform extraction.
7. Remove all `*Legacy` wrappers.

## Gate Per Batch
1. `npx esbuild server/routes.ts --bundle --platform=node --format=esm --outfile=/tmp/routes-bundle-check.js`
2. `npx esbuild <each new file> --bundle --platform=node --format=esm --outfile=/tmp/<name>.js`
3. `node scripts/route-responsibility-audit.mjs`
4. Route parity smoke test for moved endpoints.

## Latest Status (Current)
- `server/routes.ts` is now **272 LOC** (from 7,111 at kickoff).
- Inline route handlers in `routes.ts`: **0**.
- Route audit unchanged in count and auth-candidate output:
  - `471 routes`
  - `Missing-auth candidates: 34`
- New helper modules added in the latest phase:
  - `server/services/platform/authCoreLegacyHandlers.service.ts`
  - `server/services/platform/authContextHelpers.service.ts`
  - `server/services/platform/authUserLegacy.handler.ts`
  - `server/services/platform/userSettingsLegacyHandlers.service.ts`
  - `server/services/admin/usersLegacyCoreHandlers.service.ts`
  - `server/services/clients/clientsLegacyHandlers.service.ts` (extended with `createGetClientsHandler`)
  - `server/services/callManager/legacy/storeHoursLegacy.service.ts`
  - `server/services/callManager/legacy/elevenLabsAdminHelpers.service.ts`
  - `server/services/assistant/legacy/alignerOpsHelpers.service.ts`
  - `server/services/organization/sheetsMergedDataCache.service.ts`
  - `server/services/mapSearch/geocodeAddress.service.ts`
- `server/routes.ts` is now an orchestration/composition layer only, with route modules and service factories wired by module.

## Module Registrar Layer Added
- New module registrars (all under 300 LOC):
  - `server/routes/modules/callManagerModule.routes.ts` (145)
  - `server/routes/modules/assistantModule.routes.ts` (136)
  - `server/routes/modules/engagementModule.routes.ts` (108)
  - `server/routes/modules/organizationModule.routes.ts` (84)
  - `server/routes/modules/adminModule.routes.ts` (79)
  - `server/routes/modules/governanceModule.routes.ts` (72)
  - `server/routes/modules/clientsModule.routes.ts` (65)
  - `server/routes/modules/storesMapModule.routes.ts` (51)
- `server/routes.ts` now wires platform auth/context once, then registers module registrars in sequence.
