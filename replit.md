# Hemp Wick CRM & Commission Tracker

## Overview
A comprehensive web-based CRM and commission tracking system for internal hemp wick sales teams. Features CSV-powered client management, role-based access control, WooCommerce integration, and automated commission calculations.

## Features
- **Authentication**: Replit Auth with Admin and Agent roles
- **Google Sheets Integration**: Real-time bidirectional sync with Google Sheets for client data management
- **CSV Management**: Upload client data with automatic header detection and smart merging
- **Client Management**: Claim system, filtering, search, and detailed tracking
- **Commission Tracking**: Automated calculation (25% first 6 months, 10% thereafter)
- **WooCommerce Sync**: Automatic order synchronization and client matching
- **Notes & Follow-ups**: Track client interactions and follow-up activities
- **Dashboards**: Separate views for Admin (all clients) and Agent (claimed clients only)

## Setup Instructions

### 1. Initial Setup
The application is already configured with:
- PostgreSQL database (via Replit)
- WooCommerce credentials (WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, WOOCOMMERCE_CONSUMER_SECRET)
- Session management

### 2. Make First User Admin
After logging in for the first time, you need to grant admin access to at least one user:

1. Note your email address from your profile
2. Open the Database tab in Replit
3. Run this SQL command:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```
4. Log out and log back in to see the Admin dashboard

### 3. Connect Google Sheets (Recommended)
The preferred method for managing client data is through Google Sheets integration:

1. Go to Admin Dashboard → Google Sheets tab
2. Click to authorize access to your Google Sheets
3. Select the spreadsheet containing your client data
4. Choose the sheet/tab name (e.g., "Dispensaries")
5. Set the unique identifier column (e.g., "link" for Leafly URLs)
6. Click "Connect Sheet"
7. Use "Bidirectional Sync" to keep data synchronized in real-time

**Benefits of Google Sheets:**
- Real-time updates: Changes in the sheet appear instantly in the CRM
- Flexible columns: Add new columns anytime and they sync automatically
- Team collaboration: Multiple people can update the sheet simultaneously
- No file uploads: Direct integration eliminates manual CSV imports

### 4. Alternative: Upload CSV Data
If you prefer CSV files:
1. Go to Admin Dashboard → CSV Upload tab
2. Select your client CSV file
3. Choose a unique identifier column (e.g., Email, Company, or Link)
4. Upload - the system will merge existing clients and create new ones

### 5. Sync WooCommerce Orders
To synchronize orders and calculate commissions:
1. Go to Admin Dashboard → WooCommerce Sync tab
2. Click "Sync Orders"
3. The system will:
   - Fetch recent orders from WooCommerce
   - Match orders to clients by email or company name
   - Calculate commissions based on claim dates
   - Update client sales totals

### 6. Agent Workflow
Agents can:
1. View all unassigned clients in their dashboard
2. Claim clients to start earning commission
3. Filter clients by inactivity (90/180/365 days) to prioritize follow-ups
4. Add notes and track follow-up activities
5. View their total sales and commission earnings

## Commission Calculation
- **First 6 months after claim**: 25% commission on all sales
- **After 6 months**: 10% commission on all sales
- Commission is calculated based on the claim date, not the order date

## User Roles

### Admin
- Connect and manage Google Sheets integration
- Upload and manage CSV data
- View all clients across all agents
- Sync WooCommerce orders
- Unclaim clients and reassign them
- View overall sales and commission metrics

### Agent (Default)
- View and claim unassigned clients
- See only their claimed clients
- Track their sales and commission
- Add notes and follow-ups to their clients
- Filter clients by inactivity for targeted outreach

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OpenID Connect)
- **External API**: WooCommerce REST API

## Data Model
- **Users**: Authentication and role management
- **Clients**: CSV data + tracking fields (assigned agent, claim date, sales, commission)
- **Orders**: WooCommerce order data linked to clients
- **Notes**: Follow-up tracking and client communications
- **CSV Uploads**: Upload history and metadata
- **Google Sheets**: Connected spreadsheet tracking and sync status

## Environment Variables
All required environment variables are already configured:
- `DATABASE_URL`: PostgreSQL connection
- `SESSION_SECRET`: Session encryption
- `WOOCOMMERCE_URL`: WooCommerce store URL
- `WOOCOMMERCE_CONSUMER_KEY`: WooCommerce API key
- `WOOCOMMERCE_CONSUMER_SECRET`: WooCommerce API secret
- `REPLIT_DOMAINS`: Replit authentication domains
- `REPL_ID`: Replit application ID

## Maintenance

### Regular Tasks
1. **Sync Orders**: Run WooCommerce sync regularly (daily/weekly) to keep commission data current
2. **Review Claims**: Admin should monitor unclaimed clients and agent performance
3. **Google Sheets Sync**: Use bidirectional sync to keep data current between CRM and Google Sheets
4. **CSV Updates**: Upload fresh CSV data when client information changes (if not using Google Sheets)

### Troubleshooting
- If orders don't match clients, ensure client CSV has accurate email or company names
- If agents can't see claimed clients, refresh the page after claiming
- For commission discrepancies, verify the claim date is set correctly

## Security Notes
- User roles are managed in the database
- Only admins can upload CSV, sync WooCommerce, and unclaim clients
- Agents can only access their own claimed clients
- WooCommerce credentials are stored securely in environment variables
