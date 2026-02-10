# Hemp Wick CRM & Commission Tracker → Super CRM Platform

## Overview
This project is transforming a Google Sheets-powered CRM for hemp wick sales into a multi-tenant "Super CRM" platform. It will serve multiple organizations with isolated data, customizable workflows, and per-tenant configurations. The platform aims to centralize CRM functionalities, automate sales processes, and provide advanced AI-driven tools for sales, communication, and knowledge management, ultimately enhancing efficiency and scalability for diverse business needs.

## User Preferences
All preferences automatically save to the database and sync across devices. Preferences include: column visibility, column order, column widths, selected states filter, font size (8-30px), row height (24-200px), and theme-specific colors. Theme-specific colors can be customized independently for light and dark modes, with an indicator showing the active theme (☀️ Light Mode or 🌙 Dark Mode). A reset button is available to reset only the active theme's colors to defaults. Independent color controls are available for various UI elements: Table Links, States Filter Button, Find Franchise Button, Status Filter Button, Columns Button, and Action Buttons. Status Colors: The status dropdown and table row coloring now read from the same source (useCustomTheme hook), ensuring visual consistency across the interface. The "Color Rows by Status" toggle is located in Display Settings.

## System Architecture
The application features a client dashboard unifying data, transitioning from a single-tenant Google Sheets-based system to a multi-tenant platform.

**UI/UX Decisions:**
- Frontend: React, Tailwind CSS, Shadcn UI.
- Persistent user preferences for dashboard layout (column visibility, order, width, font size, row height, theme colors).
- Text wrapping for verbose columns; terse columns remain single-line.
- Color-coded header bars and a project switcher dropdown for multi-project navigation (Chrome Profiles UX).

**Technical Implementations:**
- **Multi-tenancy**: Row-level separation with `tenant_id` on all business tables, enforced via composite indexes and API filtering.
- **Role Hierarchy**: Three roles in order of access:
  - `Super Admin` (isSuperAdmin flag): Platform-wide access, manages all tenants via Platform Admin page
  - `Admin` (roleInTenant='org_admin' in DB): Tenant administrator, has access to Admin page, Call Manager, E-Hub, Organization settings. Has all Agent capabilities plus admin features.
  - `Agent` (roleInTenant='agent' in DB): Standard user, can make sales calls, use CRM, but no admin access
  - Note: The database stores 'org_admin' but UI displays 'Admin'. The `canAccessAdminFeatures()` function grants admin access.
- **Module Access**: Two-layer system:
  - `allowedModules` (tenant level, Super Admin controls): What modules a tenant CAN use. `null/undefined` = all allowed, `[]` = none allowed.
  - `visibleModules` (user preference): Personal choice to show/hide modules in navigation.
- **Authentication**: Replit Auth with session-based control and `req.user.tenantId` context. The `/api/auth/user` endpoint returns user data plus `tenantId` and `roleInTenant` from session.
- **Google Sheets Integration**: System-wide OAuth for read/write, per-user Google accounts for personalized features (Gmail/Calendar).
- **Inline Editing**: Dashboard data modification syncing to Google Sheets; role-based read-only access.
- **Row-Level Security**: Agents see only unclaimed or their own claimed stores.
- **WooCommerce Sync**: Fetches orders, calculates commissions, updates Commission Tracker.
- **Commission System**: Referral commissions and dynamic percentage logic (25% for 6 months, then 10%).
- **Sales Reports**: PDF commission report generation.
- **Automated Status Updates**: Commission Tracker updates via Gmail integration.
- **AI Sales Assistant**: OpenAI-driven UI for sales scripts and objection handling.
- **Document Browser**: Google Drive integration.
- **ElevenLabs AI Voice Calling**: Automated outbound calling with multi-agent support, queue management, and ambient audio mixing. Uses a Fly.io voice-proxy for Twilio WebSocket handling.
- **Twilio VoIP Browser Calling**: Agents with assigned Twilio phone numbers can make outbound calls directly from the browser using @twilio/voice-sdk. The `useTwilioVoip` hook handles device initialization, token management, and call lifecycle. Agents without a Twilio number assigned continue using tel: links. Admin Users tab has an Edit dialog for assigning Twilio numbers. Backend endpoints: GET /api/twilio/voip-token (access tokens), POST /api/twilio/voip-twiml (call routing), POST /api/twilio/voip-status (webhooks). Requires env vars: TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID.
- **AI Insights**: OpenAI-powered call performance analysis (admin-only).
- **Self-Evolving Knowledge Base**: Version-controlled KB with AI-powered improvements.
- **E-Hub: Email Campaign System**: AI-powered cold outreach with automated sequences, reply detection, and CRM sync (admin-only). Integrated with Apollo.io for enriched contacts. Supports inline images in email templates via `{{image:URL}}` placeholders — users can paste Google Drive links or any image URL through the Image Library button in the Template Builder. Images are stored per-tenant in `email_images` table and converted to HTML `<img>` tags when emails are sent.
- **Apollo.io Integration**: Lead enrichment system to add contact data (emails, phone numbers, job titles, seniorities) from Apollo.io. Features preview-before-enrich workflow to minimize API credit usage, bulk enrichment, credit tracking, and integration with E-Hub email sequences. Uses the "Link" column from Google Sheets as the universal connector between systems.
- **Manual Follow-Ups**: Human-to-AI handoff for follow-ups, triggered by Gmail drafts, with AI context preservation.
- **Real-Time Updates**: Server-Sent Events (SSE) for push-based UI updates and React Query cache invalidation.
- **Holiday Toggle System**: Admin controls for blocking federal holidays and custom date ranges.
- **Pipelines System**: Configurable pipelines with stages (action, decision, wait, complete) and AI configuration.
- **Projects System**: `tenant_projects` for multi-campaign support, enabling isolated configurations and project-specific resources.
- **Super Admin Dashboard**: Platform-wide management with tenant context selector:
  - **Tenants Tab**: Create, edit, view all tenants and their status.
  - **Users Tab**: Manage users across all tenants, reset passwords, toggle super admin/voice access.
  - **Metrics Tab**: Platform-wide statistics (total tenants, users, clients).
  - **Tickets Tab**: Full ticket management with tenant/status/category filters, ticket detail view, reply system, and status updates.
  - **Webhooks Tab**: Google Calendar webhook management with tenant filtering, bulk registration, individual webhook controls, stats dashboard (Total Users, Connected Calendars, Active Webhooks, Expired/Missing).
  - **Voice Tab**: Per-tenant ElevenLabs voice agent settings (placeholder with tenant selector).
  - **Google Sheets Tab**: Per-tenant Google Sheets sync configuration (placeholder with tenant selector).
- **Admin Page**: Tenant-specific administration:
  - **Users Tab**: Tenant user management.
  - **Support Tickets Tab**: Tenant-scoped ticket management.
  - **Reports Tab**: Sales commission reports.
  - **Webhooks Tab**: Tenant webhook management.
  - **Calendar Tab**: Holiday and date range blocking.
  - **Voice Tab**: ElevenLabs voice agent configuration.
  - **OpenAI Tab**: OpenAI API management.
  - **Aligner Tab**: Aligner assistant configuration.
  - **Google Sheets Tab**: Google Sheets sync settings.
  - **Docs Tab**: Google Drive folder configuration (renamed from Assets).
  - **WooCommerce Sync Tab**: WooCommerce order synchronization.
- **Ticket Tenant Isolation**: All ticket endpoints enforce strict tenant isolation:
  - Super admins can access all tickets across all tenants.
  - Tenant admins can only view/manage tickets from their own tenant.
  - Regular users can only see and interact with their own tickets.
  - Ticket creation automatically assigns the user's tenantId.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for operational data and user preferences.
- **Backend**: Express.js and Node.js.
- **API Conservation**: Avoid background workers that poll constantly (10,000+ locations could overwhelm Google Sheets API). Prefer "opportunistic cleanup" patterns - execute cleanup during normal user-initiated data loads rather than scheduled polling.
- **Unified Status Color System**: Consistent status coloring across UI elements.
- **AI Architecture**: Exclusively OpenAI Assistants API (Aligner for E-Hub/KB/call analysis; Wick Coach for sales assist/call analysis).
- **KB System**: Three tables (`kb_files`, `kb_file_versions`, `kb_change_proposals`), custom diff algorithm.
- **Google Sheets Writes**: Header-based column mapping.
- **E-Hub Data**: Unified, deduplicated contact feed from Store Database and Commission Tracker.
- **Shared Timezone Service**: Consistent timezone calculations.
- **E-Hub Strategy**: Sequences store `strategyTranscript` and `stepDelays` in PostgreSQL.
- **E-Hub Reply Detection**: Two-gate pre-send system using Gmail for reply detection; Google Pub/Sub for real-time notifications.
- **E-Hub AI Email Generation**: Aligner Assistant generates subjects and HTML bodies.
- **E-Hub Queue Coordinator**: Centralized FIFO scheduling, rate limiting, and geographic distribution.
- **Matrix2 Scheduler**: Slot-first architecture for email scheduling with strict safety controls:
  - **Present-focused queue**: Only processes slots within 10-minute window of NOW (no catch-up)
  - **Expired slots DELETED**: Slots older than 10 minutes are deleted entirely (not cleared)
  - **Failed sends DELETED**: Any slot that fails to send is deleted, recipient returns to bin
  - **Slot lifecycle**: Created (filled=false) → Assigned (filled=true) → Sent (sent=true) OR Deleted
  - **No stale slots**: Slots never transition back to filled=false - they succeed or get deleted
  - **History table**: Over time, daily_send_slots becomes mostly sent email history
  - **Daily limit is LAW**: Slot generation enforces per-account daily email limit (e.g., 250/account)
  - **No batch sending**: Removed LIMIT clause - slot generation IS the rate limiter
  - **Email account required**: Slots must have valid email_account_id to be processed

## External Dependencies
- **Google Sheets API**: For "Store Database" and "Commission Tracker".
- **WooCommerce REST API**: For order synchronization.
- **Replit Auth (OpenID Connect)**: User authentication.
- **PostgreSQL (Neon)**: Primary database.
- **OpenAI API**: AI assistants, insights, and email generation.
- **Gmail API**: Email drafting, sending, and reply detection.
- **Google Cloud Pub/Sub**: Gmail push notifications.
- **Google Calendar API**: Calendar event creation.
- **ElevenLabs API**: AI Voice Calling.
- **Twilio API**: Outbound call origination (AI voice via ElevenLabs) + browser-based VoIP calling for agents with assigned Twilio numbers.
- **Fly.io Voice Proxy**: Standalone Node.js service for Twilio WebSocket handling (`wss://hemp-voice-proxy.fly.dev/media-stream`).
- **Apollo.io API**: Lead enrichment for contact data (emails, phones, job titles, seniorities).