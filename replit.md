# Hemp Wick CRM & Commission Tracker

## Overview
This project is a Google Sheets-powered CRM and commission tracking system specifically designed for hemp wick sales teams. Its primary purpose is to streamline sales processes, manage client interactions, and accurately track agent commissions. Key capabilities include managing a dual-sheet system (Store Database and Commission Tracker), enabling inline editing directly from a client dashboard, implementing role-based access control for agents and administrators, and syncing orders from WooCommerce for automated commission calculations. The system aims to provide a unified, efficient platform for sales operations, offering valuable insights into team performance and facilitating accurate payout reporting.

## User Preferences
- All preferences automatically save to the database and sync across devices.
- Preferences include: column visibility, column order, column widths, selected states filter, font size (8-30px), row height (24-200px), and theme-specific colors.
- Theme-specific colors can be customized independently for light and dark modes, with an indicator showing the active theme (☀️ Light Mode or 🌙 Dark Mode).
- A reset button is available to reset only the active theme's colors to defaults.
- Independent color controls are available for various UI elements: Table Links, States Filter Button, Find Franchise Button, Status Filter Button, Columns Button, and Action Buttons.
- **Status Colors**: The status dropdown and table row coloring now read from the same source (useCustomTheme hook), ensuring visual consistency across the interface. The "Color Rows by Status" toggle is located in Display Settings.

## System Architecture
The application is built around a client dashboard that unifies data from two Google Sheets: a "Store Database" and a "Commission Tracker."
- **UI/UX Decisions**: The frontend utilizes React, Tailwind CSS, and Shadcn UI for a modern and responsive user experience. User preferences for dashboard layout, including column visibility, order, width, font size, row height, and theme colors, are persistent and sync across devices. Text wrapping is selectively applied to verbose columns, while terse columns remain single-line to maintain layout stability.
- **Technical Implementations**:
    - **Authentication**: Replit Auth with distinct 'admin' and 'agent' roles.
    - **Google Sheets Integration**: System-wide Google Sheets OAuth connection (admin setup) provides read/write access to Store Database and Commission Tracker for all users.
    - **Per-User Google Services**: Individual sales agents connect their own Google accounts (Gmail/Calendar) via OAuth for personalized features. Tokens stored in both `google*` and `googleCalendar*` fields for compatibility. System OAuth client credentials are shared with all users for token refresh.
    - **Inline Editing**: Allows direct modification of cell data within the dashboard, with changes reflecting in Google Sheets. Agents have read-only access to commission-critical columns (Order ID, Commission Type, Amount, Transaction ID) while admins can edit all columns.
    - **Row-Level Security**: Agents only see unclaimed stores and their own claimed stores based on the "Agent" column in the Commission Tracker sheet.
    - **WooCommerce Sync**: Fetches orders, matches them to stores, calculates commissions, and updates the Commission Tracker.
    - **Sales Reports**: Generates professional PDF commission reports for accountants and agents, with options for full company or individual agent reports and batch downloads.
    - **Smart Data Handling**: Auto-detection of email addresses and phone numbers in notes fields, auto-population of POC fields, smart date pickers, and formatted display for hours and links.
    - **Sales Assistant AI**: OpenAI-powered ChatGPT-like assistant with knowledge base integration for sales scripts, product info, and objection handlers. Accessible as a dedicated page or slide-out panel from anywhere in the app.
- **Feature Specifications**:
    - **Client Dashboard**: Unified view of both Google Sheets with extensive customization options for display and filtering (search, states filter with Canada toggle).
    - **Store Details Popup**: Comprehensive, collapsible view of store information, including sales info, contact details, and additional specifics. Phone numbers throughout the application (CRM, Reminders widget, Sales Analytics) navigate to the store details page when clicked, while still allowing the tel: link to function.
    - **Call/Email Logging**: Integrated logging system that records interactions, updates store status, and claims stores.
    - **Sales Assist**: AI-powered chat interface providing on-demand help with sales techniques, product information, and objection handling. Features include:
      - Dedicated Sales Assistant page accessible via navigation
      - Floating "Sales Assist" button on Client Dashboard (left edge, vertically centered)
      - Slide-out panel from left edge (max 1/3 screen width, capped at 500px) with ChatGPT-style conversation management
      - Projects (folders) for organizing conversations
      - Shared template library with tags and search
      - Personal tag management system: Each user maintains their own tags that auto-populate from template usage
      - Email preview with mailto: link generation
      - Context-aware: automatically reads store details from current page
      - Knowledge base file upload and management (admin only)
      - Chat history persistence across sessions
      - OpenAI API integration using Assistants API with file search capability
      - **Default Script System**: 
        - Only one Script template can be marked as default per user (enforced by backend)
        - Checkbox in Template Builder highlighted yellow when no default exists
        - Clicking phone numbers in Client Dashboard auto-opens AI Assistant and loads default script into message input
        - Race condition resolved: Default script loading waits for templates and store context to fully load
      - **Script Reference Styling**:
        - Script templates loaded into chat are prepended with `[SCRIPT: {title}]` marker
        - Messages with script references display with blue background, border, and "Script Reference" badge for visual distinction
      - **Template Variables**: Smart placeholder system with intelligent fallbacks:
        - `{{email}}` and `{{pocEmail}}` both use smart fallback: check POC email first, then fall back to general store email
        - Auto-detection properly handles store names with hyphens (e.g., "Chronic Therapy - Cortez" → {{storeName}})
        - Available variables: storeName, storeAddress, storeCity, storeState, storePhone, storeWebsite, email, pocName, pocEmail, pocPhone, agentName, agentEmail, agentPhone, agentMeetingLink, currentDate, currentTime
      - **Email Generation Protocol**: AI follows explicit priority when drafting emails:
        1. Uses POC Email if available (with transparency: "I'll address this to [POC Email]")
        2. Falls back to general Email if POC Email missing
        3. Asks user confirmation if neither email exists: "Would you like me to generate a template email that you can customize with the recipient later?"
- **System Design Choices**:
    - A PostgreSQL database (Neon) is used for user management and preference storage.
    - The backend is powered by Express.js and Node.js.
    - Commission calculation logic is implemented based on claim dates: 25% for the first 6 months post-claim, then 10%.
    - **Unified Status Color System**: Status dropdown and table rows both read from `statusColors` in the useCustomTheme hook, eliminating previous hard-coded color divergence.
    - **Debug Logging**: Centralized debug utility (`lib/debug.ts`) provides structured logging for status colors, preferences, and data operations with emoji-prefixed categories.
    - **Sales Assistant Architecture**: User's own OpenAI API key stored securely in database. Knowledge base files uploaded to OpenAI's servers (metadata in PostgreSQL, actual files on OpenAI). Chat uses Assistants API with file search tool when knowledge base is available, falls back to standard chat completion otherwise.

## External Dependencies
- **Google Sheets API**: For connecting and interacting with the "Store Database" and "Commission Tracker" Google Sheets.
- **WooCommerce REST API**: For synchronizing orders and calculating commissions.
- **Replit Auth (OpenID Connect)**: For user authentication and role management.
- **PostgreSQL (Neon)**: The primary database for user data, preferences, and potentially other application-specific data.
- **OpenAI API**: For AI-powered Sales Assistant with knowledge base file search. Admins configure their own API key via the Admin Dashboard.
- **Gmail API**: Manual OAuth integration (not using Replit connector) for creating email drafts from AI-generated content. Users can connect their Gmail account via Settings > Gmail tab to enable "Create Gmail Draft" functionality in the Sales Assistant.
- **Google Calendar API**: Per-user OAuth integration for creating calendar events from reminders. Each agent connects their own Google account to enable automatic calendar event creation when setting reminders.
    - **Timezone Architecture**: Reminders store local datetime + IANA timezone without UTC conversion. System uses simplified timezone handling:
      - Stores `scheduledDate` (YYYY-MM-DD), `scheduledTime` (HH:MM), and `timezone` (IANA identifier) as user entered them
      - Sends timezone-aware datetime strings to Google Calendar API (e.g., "2025-10-24T23:00:00" with timeZone="Europe/Warsaw")
      - Calculates event end times using pure string arithmetic (add 30 minutes to time string)
      - Handles midnight rollover using Date.UTC for timezone-neutral date advancement
      - Eliminates double timezone conversion bugs by avoiding server timezone assumptions
      - Webhook handler parses Google's datetime to extract local date/time components for bidirectional sync
    - **Webhook Management**: Admin dashboard includes comprehensive webhook management interface for Google Calendar push notifications:
      - Webhooks enable real-time two-way synchronization between reminders and Google Calendar
      - Webhook URLs automatically use correct domain: REPLIT_DOMAINS for production, REPLIT_DEV_DOMAIN for development
      - Admin can view all users' webhook status (active, expired, not registered, no calendar connected)
      - Individual webhook re-registration for specific users
      - Bulk re-register all webhooks (essential when deploying from development to production)
      - Webhooks expire after ~7 days and are automatically renewed by the system
      - Admin dashboard displays: total users, connected calendars, active webhooks, expired/missing webhooks, environment, and webhook URL

## Google Sheets Schema

### Store Database Sheet
The Store Database contains client information with the following columns:
- Store Name
- Address
- City
- State
- Phone
- Website
- Email
- POC (Point of Contact) Name
- POC Email
- POC Phone
- Status
- Agent
- Notes
- Last Contact Date

### Commission Tracker Sheet
The Commission Tracker records sales commissions with the following columns (column letters may vary):
- **Column A**: Link (store website URL)
- **Column B**: Agent Name (sales agent assigned to commission)
- **Column C**: Transaction ID
- **Column D**: Date (commission date)
- **Column E**: Order Number
- **Column F**: Commission Type ("Flat", "25%", "10%")
- **Column G**: Amount (commission amount in dollars)
- **Column H**: Status (commission status)

**Important Notes:**
- Backend code searches for columns using case-insensitive matching: `headers.findIndex(h => h.toLowerCase() === 'agent name')`
- The "Agent Name" column (not just "Agent") is used for role-based analytics filtering
- Analytics endpoints filter commission data by agent name for security (agents see only their own data)