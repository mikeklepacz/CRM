# Hemp Wick CRM & Commission Tracker

## Overview
This project is a Google Sheets-powered CRM and commission tracking system specifically designed for hemp wick sales teams. Its primary purpose is to streamline sales processes, manage client interactions, and accurately track agent commissions. Key capabilities include managing a dual-sheet system (Store Database and Commission Tracker), enabling inline editing directly from a client dashboard, implementing role-based access control for agents and administrators, and syncing orders from WooCommerce for automated commission calculations. The system aims to provide a unified, efficient platform for sales operations, offering valuable insights into team performance and facilitating accurate payout reporting.

## User Preferences
- All preferences automatically save to the database and sync across devices.
- Preferences include: column visibility, column order, column widths, selected states filter, font size (8-30px), row height (24-200px), and theme-specific colors.
- Theme-specific colors can be customized independently for light and dark modes, with an indicator showing the active theme (☀️ Light Mode or 🌙 Dark Mode).
- A reset button is available to reset only the active theme's colors to defaults.
- Independent color controls are available for various UI elements: Table Links, States Filter Button, Find Franchise Button, Status Filter Button, Columns Button, and Action Buttons.

## System Architecture
The application is built around a client dashboard that unifies data from two Google Sheets: a "Store Database" and a "Commission Tracker."
- **UI/UX Decisions**: The frontend utilizes React, Tailwind CSS, and Shadcn UI for a modern and responsive user experience. User preferences for dashboard layout, including column visibility, order, width, font size, row height, and theme colors, are persistent and sync across devices. Text wrapping is selectively applied to verbose columns, while terse columns remain single-line to maintain layout stability.
- **Technical Implementations**:
    - **Authentication**: Replit Auth with distinct 'admin' and 'agent' roles.
    - **Google Sheets Integration**: Direct read/write access to specified Google Sheets for data management.
    - **Inline Editing**: Allows direct modification of cell data within the dashboard, with changes reflecting in Google Sheets.
    - **Row-Level Security**: Agents only see unclaimed stores and their own claimed stores based on the "Agent" column in the Commission Tracker sheet.
    - **WooCommerce Sync**: Fetches orders, matches them to stores, calculates commissions, and updates the Commission Tracker.
    - **Sales Reports**: Generates professional PDF commission reports for accountants and agents, with options for full company or individual agent reports and batch downloads.
    - **Smart Data Handling**: Auto-detection of email addresses and phone numbers in notes fields, auto-population of POC fields, smart date pickers, and formatted display for hours and links.
- **Feature Specifications**:
    - **Client Dashboard**: Unified view of both Google Sheets with extensive customization options for display and filtering (search, states filter with Canada toggle).
    - **Store Details Popup**: Comprehensive, collapsible view of store information, including sales info, contact details, and additional specifics.
    - **Call/Email Logging**: Integrated logging system that records interactions, updates store status, and claims stores.
- **System Design Choices**:
    - A PostgreSQL database (Neon) is used for user management and preference storage.
    - The backend is powered by Express.js and Node.js.
    - Commission calculation logic is implemented based on claim dates: 25% for the first 6 months post-claim, then 10%.

## External Dependencies
- **Google Sheets API**: For connecting and interacting with the "Store Database" and "Commission Tracker" Google Sheets.
- **WooCommerce REST API**: For synchronizing orders and calculating commissions.
- **Replit Auth (OpenID Connect)**: For user authentication and role management.
- **PostgreSQL (Neon)**: The primary database for user data, preferences, and potentially other application-specific data.