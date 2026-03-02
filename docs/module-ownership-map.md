# Module Ownership Map

Last updated: 2026-03-01

## Guardrails
- Soft cap: 300 LOC per touched file.
- Route/controller layers stay thin; business logic belongs in service/domain modules.
- Mechanical refactor rule: behavior-preserving moves only unless explicitly approved.

## Module Map

### Platform module
- Primary paths: `server/routes.ts`, `server/routes-impl.ts`, `server/authGuards.ts`, `shared/schema.ts`.
- Main functions:
  - App wiring, middleware, and API registration.
  - Auth/session/tenant boundary enforcement.
  - Shared contracts and schema exports.

### Organization
- Primary paths: `client/src/pages/org-admin.tsx`, `client/src/components/org-admin/*`, `server/services/organization/*`.
- Main functions:
  - Tenant org/project/pipeline administration.
  - Team and access configuration flows.
  - Org-level settings persistence.

### Admin
- Primary paths: `client/src/pages/admin.tsx`, `client/src/components/admin-ticket-inbox*`, `server/services/docs/ticketsService*`.
- Main functions:
  - Admin dashboard orchestration.
  - Support ticket triage/status/reply workflows.
  - Admin-level operational controls.

### Dashboard
- Primary paths: `client/src/pages/dashboard.tsx`, `client/src/pages/sales-dashboard.tsx`, `client/src/components/widgets/*`.
- Main functions:
  - Widget composition/layout rendering.
  - KPI/status visibility and activity summaries.
  - User dashboard preference application.

### Clients
- Primary paths: `client/src/pages/client-dashboard.tsx`, `server/services/clients/*`, `server/storage-methods/*`.
- Main functions:
  - Client list/search/filter/query orchestration.
  - Client detail loading and status updates.
  - Client data storage and retrieval.

### Follow-up
- Primary paths: `client/src/pages/follow-up-center.tsx`, `server/services/followup/*`, `client/src/components/quick-reminder*`.
- Main functions:
  - Follow-up queue and scheduling interfaces.
  - Reminder creation/edit/delete flows.
  - Follow-up business rules execution.

### Map search
- Primary paths: `client/src/pages/map-search.tsx`, `client/src/components/map-search/*`, `server/googleMaps.ts`.
- Main functions:
  - Place search/filter pipeline.
  - Result enrichment and dedupe handling.
  - Map interaction and import flows.

### Sales
- Primary paths: `client/src/components/sales-reports*`, `server/services/emailSender*`, `server/services/emailQueue*`.
- Main functions:
  - Sales reporting and pipeline metrics.
  - Outbound email generation/dispatch.
  - Send queue and slot orchestration.

### Assistant
- Primary paths: `client/src/components/ai-chat*`, `server/services/assistant/*`, `server/services/openai*`.
- Main functions:
  - Assistant chat and prompt orchestration.
  - Assistant proposal/KB sync handlers.
  - LLM settings and runtime integration.

### Docs
- Primary paths: `client/src/pages/documents.tsx`, `client/src/components/kb-editor*`, `server/services/pdfBuilder*`.
- Main functions:
  - KB/document editing and versioning UI.
  - Document generation/export flows.
  - Document sync and persistence.

### Label designer
- Primary paths: `client/src/pages/product-mockup.tsx`, `client/src/components/product-mockup/*`.
- Main functions:
  - Canvas/layout editing for mockups.
  - Element manipulation and rendering.
  - Export and project save/load operations.

### Qualification
- Primary paths: `client/src/pages/qualification.tsx`, `client/src/components/qualification*`, `shared/franchiseUtils*`.
- Main functions:
  - Qualification campaign setup.
  - Lead qualification workflows.
  - Qualification data transform/validation.

### Call manager
- Primary paths: `client/src/pages/call-manager.tsx`, `client/src/components/call-manager/*`, `server/services/callManager/*`.
- Main functions:
  - Call session/campaign management UI.
  - Transcript/insight viewing and actions.
  - Call pipeline orchestration and reporting.

### eHub
- Primary paths: `client/src/pages/ehub.tsx`, `client/src/components/ehub/*`, `server/services/ehubContacts*`.
- Main functions:
  - Sequence/campaign operations.
  - Contact pool and sending config management.
  - EHub integration execution.

### Apollo
- Primary paths: `client/src/pages/apollo.tsx`, `client/src/pages/apollo/*`, `server/services/apolloService*`.
- Main functions:
  - Apollo import/review flows.
  - Contact/company enrichment operations.
  - Apollo settings and storage integration.

## Ownership Rule of Thumb
- New feature logic must go into the module-specific folder first.
- If an orchestrator file approaches 260 LOC, split before adding behavior.
- Keep shared utilities in `shared/*` only when used by 2+ modules.
