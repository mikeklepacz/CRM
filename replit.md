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
- **E-Hub AI Email Generation**: Uses the specialized Aligner Assistant for generating subjects and HTML bodies, leveraging knowledge base for best practices.
- **E-Hub Queue Coordinator**: Centralized scheduling system enforcing FIFO ordering, rate limiting, and geographic distribution, using cohort-based timezone balancing and two-tier priority.
- **Matrix2 Slot-First Scheduler**: Production email scheduling system using a slot-first architecture, pre-generating daily email slots and assigning eligible recipients. COMPLETE multi-step progression: After Step N sends, recipient automatically advances to Step N+1 and gets scheduled into the next available slot respecting step_delays. Slot eligibility query filters out recipients with pending slots to prevent double-scheduling. Post-send assignment trigger ensures seamless multi-step continuity without manual intervention. Supports midnight crossover sending windows (e.g., 15:00 to 01:00 next day) by automatically detecting when sendingHoursEnd < sendingHoursStart and extending the slot generation boundary to the next day.
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
- **Google Calendar API**: Per-user OAuth for creating calendar events.
- **ElevenLabs API**: For AI Voice Calling.