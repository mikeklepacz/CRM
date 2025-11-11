# Hemp Wick CRM & Commission Tracker

## Overview
This project is a Google Sheets-powered CRM and commission tracking system designed to streamline sales processes, manage client interactions, and accurately track agent commissions for hemp wick sales teams. It features a dual-sheet system (Store Database and Commission Tracker), inline editing, role-based access control, and automated WooCommerce order syncing. The system provides a unified platform for sales operations, offering insights into team performance and facilitating accurate payout reporting.

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
- **Per-User Google Services**: Sales agents connect their own Google accounts (Gmail/Calendar) for personalized features; tokens are stored securely.
- **Inline Editing**: Direct modification of cell data in dashboard, syncing to Google Sheets. Agents have read-only access to commission-critical columns.
- **Row-Level Security**: Agents only see unclaimed stores and their own claimed stores.
- **WooCommerce Sync**: Fetches orders, matches to stores, calculates commissions, and updates the Commission Tracker, including backfilling historical records.
- **Referral Commission System**: Single-level tracking (10% of referred agents' monthly commissions); uses ledger approach.
- **Inline Commission Editing**: Admins can edit commission type and amount in WooCommerce sync table with auto-save.
- **Sales Reports**: Generates PDF commission reports for accountants and agents.
- **Smart Data Handling**: Auto-detection of emails/phone numbers, auto-population of POC fields, smart date pickers.
- **Sales Assistant AI**: OpenAI-powered ChatGPT-like assistant with knowledge base integration for sales scripts, product info, and objection handling. Features include conversation management, context-aware data reading, admin-only knowledge base file upload, chat history, default script system, and smart template variables.
- **Document Browser**: Simplified Google Drive integration for browsing and downloading files, supporting any Drive URL format and real-time file listing.
- **ElevenLabs AI Voice Calling**: Automated outbound AI voice calling with multi-agent support, three calling scenarios (Cold Calls, Follow-Ups, Recovery), queue management, real-time call status, webhook integration for events and transcript capture. Includes automated IVR/voicemail detection, agent prompt override system for IVR handling, and AI call analytics. Dynamic variables (name, poc_name, shipping_address, poc_email) passed to agents for personalized conversations. Comprehensive data extraction from calls via 19 custom placeholders, saving to PostgreSQL and syncing POC data to Google Sheet.
- **AI Insights (Admin-Only)**: OpenAI-powered analysis of call performance data identifying common objections, success patterns, sentiment, and coaching recommendations. Features PII redaction, limited call processing, and optional auto-trigger for analysis.
- **Self-Evolving Knowledge Base System**: Complete KB management with version control and AI-powered improvements. Features bidirectional sync with ElevenLabs, full audit trail, Aligner Assistant for proposing KB improvements, WordPress-style diff review, human-in-the-loop approval, optimistic locking, rollback capability, and Google Drive backup of every KB file version. Supports agent-isolated analysis with shared general files and agent-specific files.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for user management and preference storage.
- **Backend**: Express.js and Node.js.
- **Commission Logic**: 25% for first 6 months post-claim, then 10%. `commissionDate` tracks order date.
- **Unified Status Color System**: Status dropdown and table rows use a single source (`useCustomTheme` hook).
- **Debug Logging**: Centralized utility (`lib/debug.ts`) for structured logging.
- **Sales Assistant Architecture**: User's OpenAI API key stored securely. Knowledge base files uploaded to OpenAI, metadata in PostgreSQL. Uses Assistants API with file search.
- **KB System Architecture**: Three tables (kb_files, kb_file_versions, kb_change_proposals). Custom diff algorithm. Aligner assistant uses standalone management UI and API routes. Strict security and version control measures.
- **Database Migrations**: Manual SQL migrations.
- **Google Sheets Write Operations**: All writes use header-based column mapping for robustness.

## External Dependencies
- **Google Sheets API**: For "Store Database" and "Commission Tracker" interaction.
- **WooCommerce REST API**: For order synchronization and commission calculation.
- **Replit Auth (OpenID Connect)**: User authentication and role management.
- **PostgreSQL (Neon)**: Primary database for user data and preferences.
- **OpenAI API**: For the AI-powered Sales Assistant and AI Insights.
- **Gmail API**: For creating email drafts.
- **Google Calendar API**: Per-user OAuth for creating calendar events and webhook management.
- **ElevenLabs API**: For AI Voice Calling.

## Recent Changes (November 2025)

### ElevenLabs Data Extraction Implementation
- **Database Schema**: Added 19 new columns to call_sessions table for comprehensive data extraction
  - Interest & Outcome: interest_level, objections, follow_up_needed, follow_up_date
  - POC Information: poc_name, poc_email, poc_phone, poc_title
  - Shipping: shipping_name, shipping_address, shipping_city, shipping_state
  - Business Intelligence: current_supplier, monthly_volume, decision_maker, business_type, pain_points, next_action, extracted_notes

- **Webhook Enhancement**: Updated ElevenLabs webhook handler to:
  - Process extracted_data from analysis.extracted_data in post_call_transcription webhooks
  - Save all 19 extracted fields to call_sessions table in PostgreSQL
  - Auto-sync POC data to Google Sheets:
    - POC name/email/phone → Store Database
    - POC Title → Commission Tracker Column T
    - Follow-up Date → Commission Tracker Column I
    - Call Notes → Commission Tracker Column K (append mode with timestamp, interest, objections, summary)
  - Include ElevenLabs automatic call summary in notes
  - Handle all 3 webhook types: call_initiation_failure, post_call_audio, post_call_transcription
  - Update campaign target status based on webhook events

- **Admin UI**: Added Data Collection Placeholders card in Admin Dashboard > Voice tab
  - Displays all 19 placeholder definitions organized by category
  - Copy-to-clipboard functionality for each placeholder description
  - Instructions for configuring in ElevenLabs agent settings

### Manual Setup Required
- **Commission Tracker Google Sheet**: Add the following columns for automatic call data updates
  - **Column I - Follow-up Date**: Will be auto-populated with extracted follow-up dates from calls
  - **Column K - Notes**: Will auto-append timestamped call notes (interest level, objections, summary)
  - **Column T - POC Title**: Will be auto-populated with POC job titles from calls
  - All column names are case-insensitive
  - System matches rows by Link field for accurate updates

## E-Hub: Email Campaign System (November 2025)

### Purpose
Admin-only cold outreach automation platform for controlled email campaigns at scale. Sends personalized AI-generated emails with automated follow-up sequences, reply detection, and CRM synchronization.

### System Architecture

**Data Source:**
- Pulls from Google Sheets "Store Database"
  - Column A: Name
  - Column K: Email (externally verified - system assumes all emails are pre-validated)
  - Column N: Hours (for smart timing)
  - Column P: Sales Summary (for AI personalization)

**Core Features:**
1. **Smart Timing Engine**
   - Only sends 1 hour after business opening time (uses existing timezone detection from Voice Hub)
   - No emails after 2pm local time
   - No weekends/holidays
   - Reuses timezone logic from Reminders feature and AI Voice Calling

2. **AI Personalization (OpenAI)**
   - Generates unique email bodies using: Name, Email, Sales Summary
   - Custom prompt injection field for tone/structure rules
   - Keyword bin for additional context
   - Target: <70 words per email
   - Subject lines: AI-generated OR variant bin (3-5 words, <35 chars, title case)

3. **Follow-Up Sequencer**
   - Default schedule: Day 1 → 3 → 7 → 15 → 31 → Monthly
   - Adjustable schedule per campaign
   - Threaded replies (uses Gmail API threadId + In-Reply-To headers)
   - Auto-stops sequence when reply detected

4. **Send Queue**
   - Rate-limited: 1 email every X-Y minutes (admin configurable, randomized)
   - Target: ~200 emails/day total (initials + follow-ups)
   - Respects Gmail limits (500/day free, 2000/day Workspace)
   - No batch blasts - one at a time
   - Randomized timing prevents spam filter patterns

5. **Reply Detection**
   - Gmail REST API threads.get checks for replies
   - Polling: Every hour 3PM-Midnight Warsaw time
   - On reply: halt sequence, flag in CRM, notify admin

6. **Variant Engine**
   - Subject bin + Body bin with placeholders
   - Randomized selection OR AI-generated
   - Light variations for deliverability
   - A/B testing based on reply rate only (no open tracking)

7. **CRM Sync**
   - Step 1 send → Update Commission Tracker Column H to "Contacted"
   - Timestamp logging
   - Agent awareness: tracks who contacted each shop
   - Prevents duplicate outreach across agents

8. **Deliverability Protection**
   - No tracking pixels
   - No heavy images
   - Randomized timing (1-3 minute delays)
   - Warm-up curve (start slow, ramp up)
   - Bounce detection via SMTP codes
   - Auto-remove hard bounces

**Database Schema:**
- `campaigns` table: name, subject, body, status (draft/active/paused/completed), minDelay, maxDelay, promptInjection, keywordBin, createdBy
- `campaign_recipients` table: campaignId, email, name, salesSummary, status (pending/sent/failed/replied), sentAt, threadId, messageId, errorLog, sequenceStep
- `campaign_sequences` table: campaignId, step, daysDelay, subjectTemplate, bodyTemplate, isActive

**Gmail API Integration:**
- Uses existing Gmail OAuth integration (userIntegrations table)
- Scope: https://mail.google.com/ (already configured)
- **Threading Requirements**:
  - Store Message-ID from response headers (NOT API response id)
  - Follow-ups include: threadId + In-Reply-To header + References header
  - Subject prefixed with "Re:" for threading
- **Rate limits**: Enforced at queue level (500 or 2000/day depending on account type)
- **Reply detection**: threads.get API call to check if thread has >1 message

**Dashboard Features:**
- Campaign creation UI (select template from Sales Assistant library OR custom)
- Recipient import (from Google Sheets Column K with auto-deduplication)
- Progress tracking: X sent / Y total
- Real-time send log
- Pause/Resume/Cancel controls
- Global stats: sends per day, remaining quota, bounce metrics
- Variant performance (reply rate by subject/body combo)

**Phase 1 Deliverables (Current - November 2025):**
- ✓ Database schema for campaigns, recipients, sequences
- ✓ Import emails from Google Sheets with auto-deduplication
- ✓ Basic campaign creation form
- ✓ Rate-limited send queue with randomization
- ✓ Test send functionality
- ✓ Dashboard with campaign list and basic stats

**Future Phases:**
- Phase 2: AI personalization with OpenAI, smart timing engine, variant bins
- Phase 3: IMAP reply detection (3PM-midnight Warsaw), auto-stop sequences, A/B testing analytics

---

## Deferred Features (Future Phases)

### Phase 2: Voice Hub Enhancements
- **Agent History Tab**: Fourth tab in Call Manager showing complete call history across all campaigns
  - Unified view of all call sessions for selected agent
  - Filters by date range, status, campaign
  - Export functionality for reporting

### Phase 3: Advanced Call Management
- **Dashboard Card Fixes**: Improve Completed/Failed call count accuracy in Voice Hub dashboard
  - Real-time updates from webhook events
  - Historical data reconciliation
  
- **Manual Rescheduling**: UI for manually rescheduling failed or incomplete calls
  - Drag-and-drop calendar interface
  - Bulk reschedule operations
  - Custom scheduling rules per store