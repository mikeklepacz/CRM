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
- **Sales Assistant AI**: OpenAI-powered ChatGPT-like assistant with knowledge base integration for sales scripts, product info, and objection handling. Includes conversation management, context-aware data reading, admin-only knowledge base file upload, chat history, default script system, and smart template variables.
- **Document Browser**: Simplified Google Drive integration for browsing and downloading files.
- **ElevenLabs AI Voice Calling**: Automated outbound AI voice calling with multi-agent support, three calling scenarios (Cold Calls, Follow-Ups, Recovery), queue management, real-time call status, and webhook integration for events and transcript capture. Features automated IVR/voicemail detection, agent prompt override, and AI call analytics with dynamic variables and comprehensive data extraction to PostgreSQL and Google Sheets.
- **AI Insights (Admin-Only)**: OpenAI-powered analysis of call performance data identifying common objections, success patterns, sentiment, and coaching recommendations with PII redaction.
- **Self-Evolving Knowledge Base System**: Complete KB management with version control and AI-powered improvements. Features bidirectional sync with ElevenLabs, audit trail, Aligner Assistant for proposing KB improvements, WordPress-style diff review, human-in-the-loop approval, optimistic locking, rollback capability, and Google Drive backup.
- **E-Hub: Email Campaign System (Admin-Only)**: Fully AI-powered cold outreach automation platform with zero manual template entry. AI generates all email content based on strategy conversations, with automated follow-up sequences, reply detection, and CRM synchronization. Features inline sequence creation (name only), conversational AI workflow for campaign strategy planning with chat interface, step delays configuration (days between emails), and validation-gated activation. Includes smart timing (1hr after business opens), AI personalization per recipient, rate-limited send queue, variant engine for A/B testing, and deliverability protection. Schema designed for AI-first: sequences store only planning metadata (strategyTranscript, stepDelays), actual email content generated and stored per recipient at send time.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for user management, preferences, and operational data.
- **Backend**: Express.js and Node.js.
- **Commission Logic**: 25% for first 6 months post-claim, then 10%, based on order date (`commissionDate`).
- **Unified Status Color System**: Status dropdown and table rows use a single source (`useCustomTheme` hook).
- **Debug Logging**: Centralized utility (`lib/debug.ts`) for structured logging.
- **Sales Assistant Architecture**: User's OpenAI API key stored securely, knowledge base files uploaded to OpenAI with metadata in PostgreSQL, utilizing the Assistants API with file search.
- **KB System Architecture**: Three tables (`kb_files`, `kb_file_versions`, `kb_change_proposals`), custom diff algorithm, standalone management UI, and API routes.
- **Database Migrations**: Manual SQL migrations.
- **Google Sheets Write Operations**: All writes use header-based column mapping for robustness.
- **E-Hub Data Source**: Unified contact feed merges Store Database (Email column) + Commission Tracker (POC EMAIL column), deduplicates by email, and enriches with sequence membership status.
- **E-Hub Contact Selection**: Multi-select system with three modes: individual checkboxes, select all on page, or select all matching current filters (server-side re-query). Supports bulk-adding 1 contact for testing or hundreds at once.
- **Shared Timezone Service**: `server/services/timezoneHours.ts` for consistent timezone calculations across features.
- **Dynamic Header Import**: Recipients import uses header-based column mapping for Google Sheets data.
- **State Normalization**: Handles various state formats for robust timezone detection.
- **Campaign Strategy Architecture**: E-Hub sequences store campaign planning data in PostgreSQL: `strategyTranscript` (jsonb) holds complete AI chat history, `stepDelays` (decimal(10,4)[]) defines gap-based delays between sequence steps. Client-side validation enforces non-negative delays and requires 1+ strategy message before activation. System messages are ephemeral (sent to OpenAI for context but not persisted).
- **E-Hub Gap-Based Delays**: Step delays are linear gaps, not cumulative from activation. Each delay is the time gap AFTER the previous step. stepDelays[0] = delay before Email 1, stepDelays[1] = gap after Email 1 before Email 2, etc. Supports decimal values (e.g., 0.0035 days = 5 minutes) for testing. Recipients initialize with nextSendAt = now + stepDelays[0], then after each send, nextSendAt = lastStepSentAt + stepDelays[currentStep].
- **E-Hub Repeat Last Step**: Optional feature allows the final step to repeat indefinitely until reply is detected. When enabled, after sending the last step, the system schedules another send using the last gap delay (stepDelays[length-1]) instead of marking the sequence as completed.
- **E-Hub AI Email Generation**: Uses OpenAI gpt-4o-mini to generate personalized emails per recipient based on strategyTranscript context. System prompt enforces: generic greeting ("Hi,"), Leafly reference, honest approach (acknowledges might not be contacting right person), HTML formatting, anti-spam language filter, and professional B2B tone. Recipient context (name, business hours, sales summary) provided to AI but instructed not to directly quote. Falls back to sequence template with variable replacement if OpenAI unavailable. Signature handling ensures exactly one sign-off in all paths (AI generation, template fallback, generic fallback).

## External Dependencies
- **Google Sheets API**: For "Store Database" and "Commission Tracker" interaction.
- **WooCommerce REST API**: For order synchronization and commission calculation.
- **Replit Auth (OpenID Connect)**: User authentication and role management.
- **PostgreSQL (Neon)**: Primary database for user data and preferences.
- **OpenAI API**: For the AI-powered Sales Assistant, AI Insights, and E-Hub email generation.
- **Gmail API**: For creating email drafts and E-Hub email sending/reply detection.
- **Google Calendar API**: Per-user OAuth for creating calendar events and webhook management.
- **ElevenLabs API**: For AI Voice Calling.