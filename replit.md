# Hemp Wick CRM & Commission Tracker

## Overview
A Google Sheets-powered CRM and commission tracking system for hemp wick sales teams. Features dual-sheet management (Store Database + Commission Tracker), inline editing, role-based access control, and WooCommerce order sync.

## Features
- **Authentication**: Replit Auth with Admin and Agent roles
- **Google Sheets Integration**: Direct editing of Store Database and Commission Tracker sheets
- **Sales Dashboard**: Unified view of both sheets with column visibility controls and reordering
- **Inline Editing**: Edit cells directly in the dashboard, saves back to Google Sheets
- **Row-Level Security**: Agents see all unclaimed stores + only their claimed stores
- **Commission Tracking**: Track sales, follow-ups, and commissions per store
- **WooCommerce Sync**: Automatic order synchronization and commission calculation

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

### 3. Connect Google Sheets
Connect your two Google Sheets to power the Sales Dashboard:

1. Go to Admin Dashboard → Google Sheets tab
2. Click to authorize access to your Google Sheets
3. **Connect Store Database Sheet:**
   - Select your spreadsheet
   - Choose the sheet/tab with store data
   - Set Purpose: "Store Database"
   - This sheet contains all stores to contact
4. **Connect Commission Tracker Sheet:**
   - Select your spreadsheet
   - Choose the sheet/tab for tracking
   - Set Purpose: "Commission Tracker"
   - This sheet tracks agent activity and sales

**Required Columns:**
- Both sheets must have a "link" column (unique identifier per store)
- Commission Tracker must have an "Agent" column (for row-level security)

### 4. Sales Dashboard Workflow
The Sales Dashboard automatically loads both sheets:

**For Agents:**
1. See all unclaimed stores (from Store Database)
2. See only their claimed stores (from Commission Tracker)
3. Update status to claim a store
4. Track calls, emails, and follow-ups
5. Edit phone, email, notes, status, etc.
6. Save changes back to Google Sheets

**For Admins:**
- See all stores and all agent activity
- Manage both sheets
- Sync WooCommerce orders

**Column Management:**
- All columns shown by default
- Hide/show any column using the Columns button
- Reorder columns with left/right arrows (UX only, doesn't affect Google Sheets)
- Resize columns by dragging the right edge of column headers (min 100px)
- Editable columns marked with ✏️

**Editing Features:**
- **Phone Numbers**: Clickable with phone icon (📞) to trigger calls on compatible devices
- **Website URLs**: Auto-shortened to domain name (e.g., "lionheartcannabis.com") with external link icon, opens in new tab
- **Existing Data**: Click the edit icon (⛶) to open popup editor (prevents accidental data loss)
- **Empty Cells**: Inline editing for new data entry
- **Long Text (>100 chars)**: Auto-truncated with expand icon for full view/edit in popup
- **Double-Click Protection**: All existing data edited via popup modal with Save button

### 5. Sync WooCommerce Orders
To synchronize orders and calculate commissions:
1. Go to Admin Dashboard → WooCommerce Sync tab
2. Click "Sync Orders"
3. The system will:
   - Fetch recent orders from WooCommerce
   - Match orders to stores
   - Calculate commissions
   - Update sales totals in Commission Tracker

## Commission Calculation
- **First 6 months after claim**: 25% commission on all sales
- **After 6 months**: 10% commission on all sales
- Commission is calculated based on the claim date, not the order date

## User Roles

### Admin
- Connect and manage Google Sheets (Store Database + Commission Tracker)
- View all stores and all agent activity in Sales Dashboard
- Sync WooCommerce orders
- Edit any cell in either sheet
- Manage team assignments

### Agent (Default)
- View all unclaimed stores (from Store Database)
- View only their claimed stores (from Commission Tracker)
- Claim stores by updating status
- Track calls, emails, and follow-ups
- Edit phone, email, notes, status, dates
- Search and filter stores
- Customize column visibility and order

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: Replit Auth (OpenID Connect)
- **External API**: WooCommerce REST API

## Data Model

### Database Tables
- **Users**: Authentication and role management
- **Google Sheets**: Connected spreadsheet tracking (Store Database + Commission Tracker)
- **Orders**: WooCommerce order data (future integration)

### Google Sheets Structure
**Store Database Sheet:**
- Contains master list of all stores to contact
- Editable fields: phone, email, additional phone, additional email
- Must have "link" column as unique identifier
- Admin maintains this data

**Commission Tracker Sheet:**
- Tracks agent activity and sales per store
- All columns editable except "Agent" and "link"
- "Agent" column determines row-level access
- Must have "link" column to join with Store Database
- Typical columns: Status, Follow-Up Date, Next Action, Notes, Sales Total, Commission

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
1. **Update Store Database**: Add new stores to the Store Database sheet in Google Sheets
2. **Sync WooCommerce**: Run sync regularly (daily/weekly) to update sales and commissions
3. **Monitor Agent Activity**: Review Commission Tracker sheet for follow-ups and conversions
4. **Column Management**: Add new columns to Google Sheets as needed - they'll appear automatically in the dashboard

### Troubleshooting
- **Sheets not loading**: Ensure both sheets are connected with Purpose "Store Database" and "Commission Tracker"
- **Can't save edits**: Check that you have edit permissions in Google Sheets
- **Wrong data showing**: Verify "link" column exists in both sheets and has matching values
- **Agents see wrong stores**: Check "Agent" column in Commission Tracker matches user email exactly

## Security Notes
- User roles are managed in the database
- Only admins can upload CSV, sync WooCommerce, and unclaim clients
- Agents can only access their own claimed clients
- WooCommerce credentials are stored securely in environment variables
