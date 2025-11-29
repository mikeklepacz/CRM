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
- **Role Hierarchy**: `super_admin` (platform-wide), `org_admin` (tenant management), `agent` (standard user).
- **Authentication**: Replit Auth with session-based control and `req.user.tenantId` context.
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
- **AI Insights**: OpenAI-powered call performance analysis (admin-only).
- **Self-Evolving Knowledge Base**: Version-controlled KB with AI-powered improvements.
- **E-Hub: Email Campaign System**: AI-powered cold outreach with automated sequences, reply detection, and CRM sync (admin-only).
- **Manual Follow-Ups**: Human-to-AI handoff for follow-ups, triggered by Gmail drafts, with AI context preservation.
- **Real-Time Updates**: Server-Sent Events (SSE) for push-based UI updates and React Query cache invalidation.
- **Holiday Toggle System**: Admin controls for blocking federal holidays and custom date ranges.
- **Pipelines System**: Configurable pipelines with stages (action, decision, wait, complete) and AI configuration.
- **Projects System**: `tenant_projects` for multi-campaign support, enabling isolated configurations and project-specific resources.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for operational data and user preferences.
- **Backend**: Express.js and Node.js.
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
- **Matrix2 Scheduler**: Slot-first architecture for email scheduling.

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
- **Twilio API**: Outbound call origination.
- **Fly.io Voice Proxy**: Standalone Node.js service for Twilio WebSocket handling (`wss://hemp-voice-proxy.fly.dev/media-stream`).