# Hemp Wick CRM & Commission Tracker → Super CRM Platform

## Overview
This project started as a Google Sheets-powered CRM for hemp wick sales teams and is now being transformed into a multi-tenant "Super CRM" platform serving multiple organizations with isolated data, customizable workflows, and per-tenant configurations.

## Multi-Tenant Transformation Progress (Active)
**Goal**: Convert single-tenant NMU Hemp Wick CRM into a multi-tenant platform.

### Completed Phases:
- **Phase 1**: Created foundation tables (tenants, user_tenants, tenant_integrations, pipelines, pipeline_stages)
- **Phase 2**: Added tenant_id column to all 67 business tables
- **Phase 3**: Created NMU tenant, backfilled 1500+ records with tenant_id = 'nmu-hemp-wick'
- **Phase 4**: Enforced tenant isolation
  - Made tenant_id NOT NULL on all tables with composite indexes
  - Added tenant context to auth (req.user.tenantId, req.user.roleInTenant)
  - Updated storage layer methods to filter by tenantId (clients, orders, statuses, categories, reminders, notifications, templates, calls, notes, commissions, knowledge base, AI/ElevenLabs, sequences)
  - Routes inject tenantId from req.user for all CRUD operations
- **Phase 5**: Role system expansion (super_admin/org_admin/agent)
  - Added isSuperAdmin boolean to users table (platform-wide role)
  - Designated michael@naturalmaterials.eu as super_admin
  - Created route guards: requireSuperAdmin, requireOrgAdmin, requireAgent (with built-in auth checks)
  - Created client/src/lib/authUtils.ts with canAccessAdminFeatures() and isSuperAdmin() helpers
  - Updated 9 frontend files to use centralized role checking
  - Backward compatible with legacy 'admin' role during transition

### Pending Phases:
- **Phase 6**: Build Super Admin dashboard
- **Phase 7**: Build Org Admin features
- **Phase 8**: Build Pipelines system (workflow definitions, stages, AI prompts)

### Architecture Decisions:
- **Row-level multi-tenancy**: Same database, tenant_id separation (not separate databases)
- **Role hierarchy**: super_admin > org_admin > agent (replacing admin/agent)
- **Tenant context**: Available on req.user after authentication via user_tenants table

## User Preferences
- All preferences automatically save to the database and sync across devices.
- Preferences include: column visibility, column order, column widths, selected states filter, font size (8-30px), row height (24-200px), and theme-specific colors.
- Theme-specific colors can be customized independently for light and dark modes, with an indicator showing the active theme (☀️ Light Mode or 🌙 Dark Mode).
- A reset button is available to reset only the active theme's colors to defaults.
- Independent color controls are available for various UI elements: Table Links, States Filter Button, Find Franchise Button, Status Filter Button, Columns Button, and Action Buttons.
- **Status Colors**: The status dropdown and table row coloring now read from the same source (useCustomTheme hook), ensuring visual consistency across the interface. The "Color Rows by Status" toggle is located in Display Settings.

## System Architecture
The application is built around a client dashboard unifying data from "Store Database" and "Commission Tracker" Google Sheets.

**UI/UX Decisions:**
- Frontend uses React, Tailwind CSS, and Shadcn UI.
- User preferences for dashboard layout (column visibility, order, width, font size, row height, theme colors) are persistent and sync across devices.
- Text wrapping for verbose columns; terse columns remain single-line.

**Technical Implementations:**
- **Authentication**: Replit Auth with 'admin' and 'agent' roles.
- **Google Sheets Integration**: System-wide Google Sheets OAuth for read/write access.
- **Per-User Google Services**: Sales agents connect their own Google accounts (Gmail/Calendar) for personalized features.
- **Inline Editing**: Direct modification of cell data in dashboard, syncing to Google Sheets, with read-only access for agents on commission-critical columns.
- **Row-Level Security**: Agents only see unclaimed stores and their own claimed stores.
- **WooCommerce Sync**: Fetches orders, matches to stores, calculates commissions, and updates the Commission Tracker.
- **Referral Commission System**: Single-level tracking (10% of referred agents' monthly commissions).
- **Sales Reports**: Generates PDF commission reports.
- **Automated Status Updates**: Commission Tracker status updates automatically when email drafts are created via Gmail integration.
- **Sales Assistant Page**: UI powered by an OpenAI-driven assistant for sales scripts, product info, and objection handling.
- **Document Browser**: Simplified Google Drive integration.
- **ElevenLabs AI Voice Calling**: Automated outbound AI voice calling with multi-agent support and queue management. Uses hybrid architecture with Fly.io voice-proxy (`hemp-voice-proxy.fly.dev`) handling WebSocket connections from Twilio, with background office ambient audio mixing directly controlled from Replit UI.
- **AI Insights (Admin-Only)**: OpenAI-powered analysis of call performance data.
- **Self-Evolving Knowledge Base System**: KB management with version control and AI-powered improvements.
- **E-Hub: Email Campaign System (Admin-Only)**: AI-powered cold outreach automation with automated follow-up sequences, reply detection, and CRM synchronization.
- **Manual Follow-Ups System**: Automated human-to-AI handoff for follow-ups, triggered by Gmail draft creation.
- **Real-Time Event Gateway (SSE)**: Server-Sent Events for push-based UI updates, invalidating React Query caches.
- **Holiday Toggle System**: Admin controls to enable/disable holiday blocking for individual federal holidays and extended windows. Useful for retail businesses that operate on "bank holidays" like Columbus Day or Veterans Day. Toggles are persisted in `ignored_holidays` table with priority order: Custom dates > Ignored holidays > Extended windows > Federal holidays.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for user management, preferences, and operational data.
- **Backend**: Express.js and Node.js.
- **Commission Logic**: 25% for first 6 months post-claim, then 10%, based on order date.
- **Unified Status Color System**: Status dropdown and table rows use a single source (`useCustomTheme` hook).
- **AI Architecture**: Exclusively uses OpenAI Assistants API with specialized knowledge bases. Aligner is for E-Hub, call transcript analysis, and KB management. Wick Coach is for sales assist and first-pass call analysis.
- **KB System Architecture**: Three tables (`kb_files`, `kb_file_versions`, `kb_change_proposals`), custom diff algorithm, standalone management UI, and API routes.
- **Google Sheets Write Operations**: All writes use header-based column mapping.
- **E-Hub Data Source**: Unified contact feed from Store Database and Commission Tracker, deduplicated by email.
- **E-Hub Contact Selection**: Multi-select system.
- **Shared Timezone Service**: `server/services/timezoneHours.ts` for consistent timezone calculations.
- **Campaign Strategy Architecture**: E-Hub sequences store `strategyTranscript` and `stepDelays` in PostgreSQL.
- **E-Hub Reply Detection**: Two-gate pre-send system checks Gmail for replies, cancelling sends and updating recipient status.
- **Gmail Push Notifications**: Real-time reply detection using Google Pub/Sub, replacing polling.
- **E-Hub AI Email Generation**: Uses Aligner Assistant for generating subjects and HTML bodies.
- **E-Hub Queue Coordinator**: Centralized scheduling system enforcing FIFO ordering, rate limiting, and geographic distribution.
- **Matrix2 Slot-First Scheduler**: Production email scheduling system using a slot-first architecture for multi-step progression and dynamic slot assignment.
- **Manual Follow-Ups System Architecture**: Manual emails are Step 1, AI follow-ups start at Step 2. Auto-enrollment via Gmail drafts or Scanner. Original email content provides AI context for subsequent follow-ups. Safety checks prevent double-enrollment, blacklisting, or existing customers. Dedicated management UI in E-Hub.

## External Dependencies
- **Google Sheets API**: For "Store Database" and "Commission Tracker" interaction.
- **WooCommerce REST API**: For order synchronization and commission calculation.
- **Replit Auth (OpenID Connect)**: User authentication and role management.
- **PostgreSQL (Neon)**: Primary database for user data and preferences.
- **OpenAI API**: For AI assistants (Wick Coach and Aligner), AI Insights, and E-Hub email generation.
- **Gmail API**: For creating email drafts and E-Hub email sending/reply detection.
- **Google Cloud Pub/Sub**: For Gmail push notifications.
- **Google Calendar API**: Per-user OAuth for creating calendar events.
- **ElevenLabs API**: For AI Voice Calling.
- **Twilio API**: For outbound call origination; TwiML routes to Fly.io WebSocket endpoint.
- **Fly.io Voice Proxy**: Standalone Node.js service (`fly-voice-proxy/`) hosting WebSocket server at `wss://hemp-voice-proxy.fly.dev/media-stream`. Receives audio from Replit's public endpoint and accepts runtime config updates (volume, audio URL) via POST `/config`. Architecture solves Replit's reverse proxy blocking inbound Twilio WebSockets.