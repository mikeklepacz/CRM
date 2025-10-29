# Hemp Wick CRM & Commission Tracker

## Overview
This project is a Google Sheets-powered CRM and commission tracking system for hemp wick sales teams. It aims to streamline sales processes, manage client interactions, and accurately track agent commissions. Key capabilities include a dual-sheet system (Store Database and Commission Tracker), inline editing, role-based access control, and automated WooCommerce order syncing for commission calculations. The system provides a unified platform for sales operations, offering insights into team performance and facilitating accurate payout reporting.

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
- **Per-User Google Services**: Sales agents connect their own Google accounts (Gmail/Calendar) via OAuth for personalized features; tokens are stored securely.
- **Inline Editing**: Direct modification of cell data in dashboard, syncing to Google Sheets. Agents have read-only access to commission-critical columns.
- **Row-Level Security**: Agents only see unclaimed stores and their own claimed stores.
- **WooCommerce Sync**: Fetches orders, matches to stores, calculates commissions, and updates the Commission Tracker, including backfilling historical records.
- **Referral Commission System**: Single-level tracking (10% of referred agents' monthly commissions); uses ledger approach with separate commission records.
- **Inline Commission Editing**: Admins can edit commission type and amount in WooCommerce sync table with auto-save.
- **Sales Reports**: Generates PDF commission reports for accountants and agents.
- **Smart Data Handling**: Auto-detection of emails/phone numbers, auto-population of POC fields, smart date pickers.
- **Sales Assistant AI**: OpenAI-powered ChatGPT-like assistant with knowledge base integration for sales scripts, product info, and objection handling. Features include:
    - Dedicated page and slide-out panel access.
    - Conversation management with projects and shared/personal template libraries.
    - Context-aware data reading from current store.
    - Admin-only knowledge base file upload.
    - Chat history persistence.
    - Default script system for auto-loading into chat from dashboard actions (e.g., clicking phone numbers).
    - Distinct styling for script references in chat.
    - Smart template variables with intelligent fallbacks (e.g., `{{pocEmail}}` falls back to `{{email}}`).
    - Email generation protocol with explicit priority for POC email, general email, or user confirmation.

**System Design Choices:**
- **Database**: PostgreSQL (Neon) for user management and preference storage.
- **Backend**: Express.js and Node.js.
- **Commission Logic**: 25% for first 6 months post-claim, then 10%. `commissionDate` tracks order date for accurate historical reporting.
- **Unified Status Color System**: Status dropdown and table rows use a single source (`useCustomTheme` hook).
- **Debug Logging**: Centralized utility (`lib/debug.ts`) for structured logging.
- **Sales Assistant Architecture**: User's OpenAI API key stored securely. Knowledge base files uploaded to OpenAI, metadata in PostgreSQL. Uses Assistants API with file search.
- **Database Migrations**: Manual SQL migrations (0001-0008); Drizzle metadata is absent to avoid conflicts.
- **Google Sheets Write Operations**: All writes use header-based column mapping (read headers, find indices by name, build data dynamically) for robustness against column changes.

## External Dependencies
- **Google Sheets API**: For "Store Database" and "Commission Tracker" interaction.
- **WooCommerce REST API**: For order synchronization and commission calculation.
- **Replit Auth (OpenID Connect)**: User authentication and role management.
- **PostgreSQL (Neon)**: Primary database for user data and preferences.
- **OpenAI API**: For the AI-powered Sales Assistant.
- **Gmail API**: For creating email drafts from AI-generated content (manual OAuth integration).
- **Google Calendar API**: Per-user OAuth for creating calendar events from reminders. Handles timezones by storing local datetime + IANA timezone and sending timezone-aware strings to Google Calendar API.
    - **Webhook Management**: Admin dashboard provides comprehensive interface for Google Calendar push notifications, including status viewing, re-registration (individual/bulk), and automatic renewal.