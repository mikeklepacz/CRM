# Routes Refactor Blueprint (Zero Behavior Change)

## Purpose
This file is the source of truth for refactoring `/Users/mike/CRM/server/routes.ts` into modular route files with **zero behavior change**.

## Current State Snapshot
- File: `/Users/mike/CRM/server/routes.ts`
- Size: `28,076` lines
- API handlers: `464`
- Problem: mixed responsibilities across the entire app in one file.

## Top Route Groups (by count)
1. `super-admin` 50
2. `org-admin` 34
3. `elevenlabs` 30
4. `ehub` 24
5. `sequences` 19
6. `sheets` 18
7. `kb` 14
8. `apollo` 14
9. `stores` 13
10. `aligner` 13
11. `qualification` 13
12. `maps` 12

## Extraction Order
1. `ehub` + `sequences` + `test-email` + `no-send-dates` + `holidays`
2. `org-admin` + `qualification`
3. `super-admin`
4. `maps` + `stores` + `clients`
5. `elevenlabs` + `twilio` + call routes
6. `apollo` + `kb` + `assistants` + `openai`

## Target Directory Layout
```text
/Users/mike/CRM/server
├── index.ts
├── app.ts
├── db.ts
├── storage.ts
├── env.ts
├── constants.ts
├── types
│   ├── api.ts
│   ├── auth.ts
│   ├── tenant.ts
│   └── pagination.ts
├── middleware
│   ├── auth.ts
│   ├── requireSuperAdmin.ts
│   ├── requireOrgAdmin.ts
│   ├── tenantContext.ts
│   ├── projectContext.ts
│   ├── errorHandler.ts
│   ├── requestLogger.ts
│   └── validate.ts
├── lib
│   ├── logger.ts
│   ├── http.ts
│   ├── dates.ts
│   ├── timezone.ts
│   ├── pagination.ts
│   ├── ids.ts
│   └── zod.ts
├── routes
│   ├── index.ts
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── users.routes.ts
│   ├── platform
│   │   ├── superAdmin.routes.ts
│   │   └── orgAdmin.routes.ts
│   ├── ehub
│   │   ├── ehub.routes.ts
│   │   ├── sequences.routes.ts
│   │   ├── sequenceRecipients.routes.ts
│   │   ├── testEmail.routes.ts
│   │   ├── blacklist.routes.ts
│   │   ├── noSendDates.routes.ts
│   │   └── holidays.routes.ts
│   ├── crm
│   │   ├── clients.routes.ts
│   │   ├── stores.routes.ts
│   │   ├── statuses.routes.ts
│   │   ├── categories.routes.ts
│   │   ├── exclusions.routes.ts
│   │   ├── reminders.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── tickets.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── templates.routes.ts
│   │   └── userTags.routes.ts
│   ├── maps
│   │   └── maps.routes.ts
│   ├── voice
│   │   ├── elevenlabs.routes.ts
│   │   ├── twilio.routes.ts
│   │   ├── voiceProxy.routes.ts
│   │   ├── callSessions.routes.ts
│   │   ├── callHistory.routes.ts
│   │   └── analysis.routes.ts
│   ├── integrations
│   │   ├── gmail.routes.ts
│   │   ├── googleSheets.routes.ts
│   │   ├── googleCalendar.routes.ts
│   │   ├── emailAccounts.routes.ts
│   │   ├── woocommerce.routes.ts
│   │   ├── apollo.routes.ts
│   │   └── integrations.routes.ts
│   ├── docs
│   │   ├── drive.routes.ts
│   │   ├── kb.routes.ts
│   │   ├── assistants.routes.ts
│   │   ├── aligner.routes.ts
│   │   └── labelProjects.routes.ts
│   ├── ops
│   │   ├── analytics.routes.ts
│   │   ├── reports.routes.ts
│   │   ├── orders.routes.ts
│   │   ├── commissions.routes.ts
│   │   └── events.routes.ts
│   └── qualification
│       ├── campaigns.routes.ts
│       ├── leads.routes.ts
│       └── invites.routes.ts
├── modules
│   ├── auth
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.schemas.ts
│   │   └── auth.types.ts
│   ├── ehub
│   │   ├── ehub.controller.ts
│   │   ├── ehub.service.ts
│   │   ├── ehub.repository.ts
│   │   ├── ehub.schemas.ts
│   │   └── ehub.types.ts
│   ├── sequences
│   │   ├── sequences.controller.ts
│   │   ├── sequences.service.ts
│   │   ├── sequences.repository.ts
│   │   ├── sequences.schemas.ts
│   │   └── sequences.types.ts
│   ├── recipients
│   │   ├── recipients.controller.ts
│   │   ├── recipients.service.ts
│   │   ├── recipients.repository.ts
│   │   ├── recipients.schemas.ts
│   │   └── recipients.types.ts
│   ├── projects
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── projects.repository.ts
│   │   ├── projects.schemas.ts
│   │   └── projects.types.ts
│   ├── platform
│   │   ├── superAdmin.controller.ts
│   │   ├── superAdmin.service.ts
│   │   ├── orgAdmin.controller.ts
│   │   ├── orgAdmin.service.ts
│   │   └── platform.repository.ts
│   ├── voice
│   │   ├── elevenlabs.controller.ts
│   │   ├── elevenlabs.service.ts
│   │   ├── twilio.controller.ts
│   │   ├── twilio.service.ts
│   │   ├── calls.controller.ts
│   │   └── calls.service.ts
│   ├── maps
│   │   ├── maps.controller.ts
│   │   ├── maps.service.ts
│   │   ├── maps.repository.ts
│   │   └── maps.schemas.ts
│   ├── integrations
│   │   ├── gmail.controller.ts
│   │   ├── gmail.service.ts
│   │   ├── sheets.controller.ts
│   │   ├── sheets.service.ts
│   │   ├── calendar.controller.ts
│   │   ├── calendar.service.ts
│   │   ├── emailAccounts.controller.ts
│   │   └── emailAccounts.service.ts
│   └── qualification
│       ├── qualification.controller.ts
│       ├── qualification.service.ts
│       ├── qualification.repository.ts
│       └── qualification.schemas.ts
├── services
│   ├── emailQueue.ts
│   ├── emailSender.ts
│   ├── tenantTimezone.ts
│   ├── slotMaintenance.ts
│   ├── Matrix2
│   │   ├── queueRebuilder.ts
│   │   ├── slotGenerator.ts
│   │   ├── slotAssigner.ts
│   │   ├── slotDb.ts
│   │   └── recipientDb.ts
│   └── ...
├── jobs
│   ├── queue.job.ts
│   ├── gmailWatch.job.ts
│   ├── webhookRenewal.job.ts
│   └── reminders.job.ts
└── tests
    ├── routes
    ├── modules
    └── services
```

## Rules For Every Batch
1. Move-only first: copy handlers exactly, do not change behavior.
2. Keep old route paths exactly identical.
3. Keep middleware stack identical for each route.
4. Keep response shape and status codes identical.
5. No feature work in extraction commits.
6. Each extracted file should stay under 300 LOC where practical; split by subdomain if needed.

## Batch Checklist Template
Use this checklist for each batch:

- [ ] Create module route files
- [ ] Move handlers with zero logic changes
- [ ] Mount in `server/routes/index.ts`
- [ ] Replace moved block in `server/routes.ts` with mount call
- [ ] Build: `npm run build`
- [ ] Smoke test moved endpoints
- [ ] Diff audit confirms path/middleware parity

## Progress Tracker
- [ ] Batch 1: `ehub` + `sequences` + `test-email` + `no-send-dates` + `holidays`
- [x] Batch 1A complete: extracted `ehub` core endpoints (`/api/ehub/settings`, queue, recipients, contacts/history/failures/scan, blacklist) into `server/routes/ehub/*`
- [ ] Batch 1B pending: extract `sequences` + `test-email` + `no-send-dates` + `holidays`
- [ ] Batch 2: `org-admin` + `qualification`
- [ ] Batch 3: `super-admin`
- [ ] Batch 4: `maps` + `stores` + `clients`
- [ ] Batch 5: `elevenlabs` + `twilio` + call routes
- [ ] Batch 6: `apollo` + `kb` + `assistants` + `openai`
