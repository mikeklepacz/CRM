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
    - **Google Sheets Integration**: Direct read/write access to specified Google Sheets for data management.
    - **Inline Editing**: Allows direct modification of cell data within the dashboard, with changes reflecting in Google Sheets. Agents have read-only access to commission-critical columns (Order ID, Commission Type, Amount, Transaction ID) while admins can edit all columns.
    - **Row-Level Security**: Agents only see unclaimed stores and their own claimed stores based on the "Agent" column in the Commission Tracker sheet.
    - **WooCommerce Sync**: Fetches orders, matches them to stores, calculates commissions, and updates the Commission Tracker.
    - **Sales Reports**: Generates professional PDF commission reports for accountants and agents, with options for full company or individual agent reports and batch downloads.
    - **Smart Data Handling**: Auto-detection of email addresses and phone numbers in notes fields, auto-population of POC fields, smart date pickers, and formatted display for hours and links.
    - **Sales Assistant AI**: OpenAI-powered ChatGPT-like assistant with knowledge base integration for sales scripts, product info, and objection handlers. Accessible as a dedicated page or slide-out panel from anywhere in the app.
- **Feature Specifications**:
    - **Client Dashboard**: Unified view of both Google Sheets with extensive customization options for display and filtering (search, states filter with Canada toggle).
    - **Store Details Popup**: Comprehensive, collapsible view of store information, including sales info, contact details, and additional specifics.
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
      - **Template Variables**: Smart placeholder system with intelligent fallbacks:
        - `{{email}}` and `{{pocEmail}}` both use smart fallback: check POC email first, then fall back to general store email
        - Auto-detection properly handles store names with hyphens (e.g., "Chronic Therapy - Cortez" → {{storeName}})
        - Available variables: storeName, storeAddress, storeCity, storeState, storePhone, storeWebsite, email, pocName, pocEmail, pocPhone, agentName, agentEmail, agentPhone, agentMeetingLink, currentDate, currentTime
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
- **Google Calendar API** (Deferred): Integration prepared but not yet activated. Reminder system is built to support Google Calendar event creation when the user is ready to authorize the OAuth connection.