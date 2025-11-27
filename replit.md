# Hemp Wick CRM & Commission Tracker

## Overview
This project is a Google Sheets-powered CRM and commission tracking system designed to streamline sales processes, manage client interactions, and accurately track agent commissions for hemp wick sales teams. It features a dual-sheet system (Store Database and Commission Tracker), inline editing, role-based access control, and automated WooCommerce order syncing. The system provides a unified platform for sales operations, offering insights into team performance and facilitating accurate payout reporting. The project aims to enhance sales operations through AI-powered tools for sales assistance, automated voice calling, and email campaigns, alongside robust knowledge base management.

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
- **WooCommerce Sync**: Fetches orders, matches to stores, calculates commissions, and updates the Commission Tracker, including backfilling historical records.
- **Referral Commission System**: Single-level tracking (10% of referred agents' monthly commissions).
- **Sales Reports**: Generates PDF commission reports.
- **Automatic Status Updates**: Commission Tracker status automatically updates to "Emailed" when agents create email drafts via Gmail integration.
- **Sales Assistant Page**: UI page powered by Wick Coach assistant, providing OpenAI-powered chat with knowledge base integration for sales scripts, product info, and objection handling.
- **Document Browser**: Simplified Google Drive integration for browsing and downloading files.
- **ElevenLabs AI Voice Calling**: Automated outbound AI voice calling with multi-agent support, queue management, real-time call status, and webhook integration.
- **AI Insights (Admin-Only)**: OpenAI-powered analysis of call performance data identifying common objections, success patterns, sentiment, and coaching recommendations with PII redaction.
- **Self-Evolving Knowledge Base System**: Complete KB management with version control and AI-powered improvements, including human-in-the-loop approval and Google Drive backup.
- **E-Hub: Email Campaign System (Admin-Only)**: AI-powered cold outreach automation with automated follow-up sequences, reply detection, and CRM synchronization. AI generates all email content based on strategy conversations.
- **Manual Follow-Ups System**: Automated human→AI handoff system that bridges manual outreach with AI-powered follow-up sequences, triggered by Gmail draft creation.
- **Real-Time Event Gateway (SSE)**: Server-Sent Events implementation for push-based UI updates. Eliminates wasteful polling by broadcasting events (clients:updated, matrix:slotsChanged, matrix:assigned, calls:queueChanged, gmail:newMessage, calendar:eventChanged) to connected clients. Frontend EventStreamProvider automatically invalidates React Query caches on event receipt. Includes 30-second heartbeat keepalive for proxy compatibility.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for user management, preferences, and operational data.
- **Backend**: Express.js and Node.js.
- **Commission Logic**: 25% for first 6 months post-claim, then 10%, based on order date (`commissionDate`).
- **Unified Status Color System**: Status dropdown and table rows use a single source (`useCustomTheme` hook).
- **AI Architecture**: Exclusively uses OpenAI Assistants API with specialized knowledge bases; vanilla ChatGPT is prohibited, except for DBA operations.
  - **Aligner**: Primary AI for E-Hub (email generation, strategy chat, campaign brief synthesis), call transcript analysis, and knowledge base management.
  - **Wick Coach**: Embedded sales assist module, provides first-pass call analysis opinions to Aligner, and powers the Sales Assistant page.
- **KB System Architecture**: Three tables (`kb_files`, `kb_file_versions`, `kb_change_proposals`), custom diff algorithm, standalone management UI, and API routes.
- **Google Sheets Write Operations**: All writes use header-based column mapping for robustness.
- **E-Hub Data Source**: Unified contact feed from Store Database and Commission Tracker, deduplicated by email.
- **E-Hub Contact Selection**: Multi-select system with individual checkboxes, select all on page, or select all matching current filters.
- **Shared Timezone Service**: `server/services/timezoneHours.ts` for consistent timezone calculations.
- **Campaign Strategy Architecture**: E-Hub sequences store `strategyTranscript` (AI chat history) and `stepDelays` (gap-based delays) in PostgreSQL.
- **E-Hub Reply Detection**: Two-gate pre-send system checks Gmail for replies, cancelling sends and updating recipient status upon detection.
- **Gmail Push Notifications**: Real-time reply detection using Google Pub/Sub. Replaces wasteful 60-second polling with instant push notifications when emails arrive. Architecture: Gmail → Pub/Sub → `/api/gmail/push` webhook → History fetch → Reply processing → Recipient status update. Watch lifecycle: 7-day expiration with automatic 6-hour renewal checks. Admin endpoints: `/api/gmail/push/status`, `/api/gmail/push/watch`, `/api/gmail/push/stop`.
- **E-Hub AI Email Generation**: Uses the specialized Aligner Assistant for generating subjects and HTML bodies, leveraging knowledge base for best practices.
- **E-Hub Queue Coordinator**: Centralized scheduling system enforcing FIFO ordering, rate limiting, and geographic distribution, using cohort-based timezone balancing and two-tier priority.
- **Matrix2 Slot-First Scheduler**: Production email scheduling system using a slot-first architecture, pre-generating daily email slots and assigning eligible recipients. COMPLETE multi-step progression: After Step N sends, recipient automatically advances to Step N+1 and gets scheduled into the next available slot respecting step_delays. Slot eligibility query filters out recipients with pending slots to prevent double-scheduling. Post-send assignment trigger ensures seamless multi-step continuity without manual intervention. Duration-based window calculation (sendingHoursDuration: hours of continuous sending window, starting at sendingHoursStart) eliminates midnight crossover complexity. Jitter window calculation uses duration directly: endHour = (startHour + duration) % 24, ensuring correct average spacing and min/max delay ranges for all time windows including midnight crossovers.
- **Matrix2 Priority Tiers (Planned)**: Three-tier priority system for slot assignment: Tier 1 (Manual Follow-Ups at step 1+ after human contact), Tier 2 (active follow-ups at step 2+), Tier 3 (cold outreach at step 0). Higher priority recipients get first access to available slots.
- **Complete Queue Rebuild**: Admin can nuke and rebuild entire queue (all slots deleted, regenerated from today forward) via "Rebuild Queue" button in Queue view. Preserves all recipients and reassigns them to new slots in order, applying new jitter settings across entire queue.
- **Manual Follow-Ups System Architecture**: 
  - **Step Numbering**: All manual emails (Store Details drafts + Scanner enrollments) are stored at Step 1, NOT Step 0. First AI follow-up happens at Step 2 after wait period. This prevents accidental instant-sends if stepDelays[1] = 0.
  - **Auto-Enrollment Triggers**: (1) Store Details Gmail drafts with `clientLink` parameter trigger automatic enrollment at Step 1 via POST /api/email-drafts. (2) Gmail Reply Scanner enrolls recipients at Step 1 when scanning sent emails.
  - **Original Email as Context**: Full email content (subject, body) stored in `sequence_recipient_messages` at stepNumber=1 enables AI to reference previous outreach when generating Step 2+ emails.
  - **Promotion Logic**: Background job (Gmail Reply Scanner) checks contacts at Step 1 after configurable wait period (default 3 days), promotes to Step 2 (status: in_sequence) if no replies detected.
  - **Safety Checks**: Enrollment skips if already enrolled, blacklisted, or existing customer (Amount > $0 in Commission Tracker).
  - **AI Context Handling**: `personalizeEmailWithAI` queries all previous messages (including Step 1 manual email) when generating Step 2+ follow-ups, providing AI with full conversation history.
  - **Dedicated Management UI**: Scanner Management tab in E-Hub with Gmail Reply Scanner controls, blacklist management, and selective enrollment with checkboxes.
  - **Deduplication**: System-wide email deduplication prevents double-enrollment across manual drafts and scanner operations.

## Google Sheets Column Schemas

### Commission Tracker Columns
Complete column schema for Commission Tracker Google Sheet (used for matching recipients and enrichment):
- **Link**: Store URL (primary matching field)
- **POC EMAIL**: Point of Contact email address (secondary matching field)
- **Point of Contact**: Contact name (used for Name enrichment)
- **Status**: Contact status (e.g., "Contacted", "Emailed")
- **Sales-ready Summary**: Sales summary text (Column P, used for enrichment)
- Transaction ID, Date, Agent Name, Order ID, Commission Type, Amount, Follow-Up Date, Next Action, Notes, POC Phone, time, update, Total, DBA, Parent Link, POC Title

### Store Database Columns
Complete column schema for Store Database Google Sheet:
- **Link**: Store URL (primary matching field)
- **Email**: Store contact email (secondary matching field)
- **Name**: Store/business name
- **Sales-ready Summary**: Sales summary text (used for enrichment)
- Type, Member Since, Address, City, State, Zip, Phone, Website, Followers, Tags, Hours, Vibe Score, OPEN, Category, Automated Line

**Matching Logic**: Recipients are matched to Google Sheet rows by Link OR Email (POC EMAIL in Commission Tracker, Email in Store Database). Data is enriched from matched rows regardless of what was stored during import.

## External Dependencies
- **Google Sheets API**: For "Store Database" and "Commission Tracker" interaction.
- **WooCommerce REST API**: For order synchronization and commission calculation.
- **Replit Auth (OpenID Connect)**: User authentication and role management.
- **PostgreSQL (Neon)**: Primary database for user data and preferences.
- **OpenAI API**: For the AI-powered assistants (Wick Coach and Aligner), AI Insights, and E-Hub email generation.
- **Gmail API**: For creating email drafts and E-Hub email sending/reply detection.
- **Google Cloud Pub/Sub**: For Gmail push notifications (topic: `gmail-inbox-push`). Used by E-Hub for real-time reply detection without polling.
- **Google Calendar API**: Per-user OAuth for creating calendar events.
- **ElevenLabs API**: For AI Voice Calling.

---

## Future Development: Multi-Tenancy / Super CRM

### Vision
Transform the Hemp Wick CRM into a multi-tenant "Super CRM" platform that serves multiple customers (organizations) with isolated data, customizable modules, and per-tenant configurations. Each customer (tenant) operates independently while sharing the same underlying platform.

### Use Cases Supported
1. **Sales CRM** (current NMU use case): Find businesses → AI calls to qualify/pitch → Close sale → Track commissions
2. **Lead Qualification/Intake** (legal, insurance, settlements): List of potential claimants → AI calls to interview/qualify → Determine eligibility → Enroll qualified ones

The core machinery is identical—what differs is the script, data fields, and pipeline stages.

### Architecture: Super Admin + Organizations

**Super Admin (Platform Level)**
- Master Twilio account credentials (buy numbers, assign to tenants)
- Platform-wide settings and configurations
- Create/manage organizations, assign modules, assign users to orgs
- View all tenants and usage analytics
- Per-number Twilio cost tracking and reporting

**Organization Admin (Per-Tenant)**
- Their own OpenAI API key (separate OpenAI project = separate billing)
- Assigned Twilio phone number(s) from master pool
- Their own ElevenLabs agent configurations
- Their own knowledge base, scripts, email templates
- Their own Google Sheets connections

**Credential & Billing Model:**
- **Twilio**: Platform owns master account, assigns numbers to orgs. Orgs tracked by assigned phone number. You can report usage per-number.
- **OpenAI**: Each org provides their own API key. They manage their own OpenAI project. Direct billing relationship between org and OpenAI.
- **ElevenLabs**: Each org manages their own agents. Can use per-tenant API key if needed or shared key with usage tracking.

### Core Building Blocks

1. **Organizations Table**
   - `id`, `name`, `industry_type` (sales/qualification), `enabled_modules[]`, `is_active`, `created_at`, `updated_at`
   - Stores per-org settings and configuration

2. **Link Users to Organizations**
   - Add `organizationId` to users table
   - Each user belongs to exactly one organization

3. **Super Admin Role**
   - New role above "admin" 
   - Can see ALL organizations, create orgs, manage cross-org settings
   - Regular admins only see their own org

4. **Organization Credentials Storage**
   - New table: `organization_credentials`
   - Fields: `organizationId`, `openai_api_key`, `assigned_twilio_phone_numbers[]`, `elevenlabs_agent_ids[]`, `created_at`, `updated_at`

5. **Scope All Data to Organizations**
   - Add `organizationId` to: `clients`, `notes`, `templates`, `kbFiles`, `kbFileVersions`, `kbChangeProposals`, `googleSheets`, `sequences`, `sequenceRecipients`, `callSessions`, `callTranscripts`, `emailBlacklist`, `projects`, `conversations`, `userTags`, `ehubSettings`, `callCampaigns`, `openaiAssistants`, `backgroundAudioSettings`, etc.
   - All queries automatically filter by user's organization

6. **Migration Script**
   - Create "NMU" as organization #1
   - Tag all existing users, data, and settings with `organizationId = 'nmu-org-1'`

7. **API Route Filtering**
   - Every API route extracts organizationId from authenticated user
   - All storage layer queries append WHERE clause `organizationId = ?`
   - Queries to external APIs (Twilio, OpenAI) use org-specific credentials

8. **Super Admin Panel**
   - New page for super admin: Organization Management
   - Create new organizations, configure industry type, enable/disable modules
   - Assign users to organizations, promote admins
   - Assign Twilio numbers to orgs
   - View usage and analytics per organization
   - Manage platform-level settings

9. **Org-Specific Settings**
   - Move module visibility, dashboard type, AI prompts, colors to organization level
   - Each org can customize their own settings
   - Inherit platform defaults for new orgs

### Module-by-Module Notes

| Module | Considerations |
|--------|---|
| **Admin Panel** | Super Admin panel for org management. Regular Admin can create users within their org, manage roles, assign modules. |
| **Dashboard** | Two modes per org: Sales Dashboard vs Qualification Dashboard. Super Admin assigns mode when creating org. |
| **Clients** | Super Admin helps design default table structure when org created. Sales orgs: Store DB + Commission Tracker (dual Google Sheets). Qualification orgs: SQL primary + Google Sheets backup. |
| **Map Search** | Per-org categories. Some universal defaults (restaurants, retail). Org-specific categories managed by org admin. |
| **E-Hub** | Already flexible. Per-org AI prompt injection, keyword bin, sending settings. Templates per-user (already scoped). Sequences per-org. |
| **Call Manager** | Each org has own ElevenLabs agents. Build agents/prompts FROM platform using org's OpenAI key. KB per-org. Twilio numbers assigned to org. |
| **AI Chat (Wick Coach)** | Per-org setup, uses org's OpenAI key. Can help design qualification criteria. |
| **Settings** | Module visibility, API integrations all moved to organization level. Super Admin configures platform defaults. |

### Build Sequence (When Ready)

1. **Organizations table + user relationship** (foundation)
2. **Super admin role** (so you can manage orgs)
3. **Migration script** (assign NMU to org #1)
4. **Filter data by organization** (security layer)
5. **Super admin panel** (UX for org management)
6. **Credential storage & per-org APIs** (so each org can use own keys)
7. **Per-module adaptations** (dashboards, KB, templates, etc.)

### Notes for Implementation

- Each organization is completely data-isolated—queries automatically scope to organization
- No shared data between organizations except platform-level settings
- Super Admin has special bypass permissions to view cross-org analytics
- New tenant onboarding: Create org → Create admin user → Auto-create Google Sheets → Configure modules → Ready to use
- Existing data (NMU) becomes tenant #1 with no data loss
- All future bug fixes and features work across all tenants automatically
