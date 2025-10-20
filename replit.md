# Hemp Wick CRM & Commission Tracker

## Overview
A Google Sheets-powered CRM and commission tracking system for hemp wick sales teams. Features dual-sheet management (Store Database + Commission Tracker), inline editing, role-based access control, and WooCommerce order sync.

## Features
- **Authentication**: Replit Auth with Admin and Agent roles
- **Google Sheets Integration**: Direct editing of Store Database and Commission Tracker sheets
- **Client Dashboard**: Unified view of both sheets with column visibility controls and reordering
- **Inline Editing**: Edit cells directly in the dashboard, saves back to Google Sheets
- **Row-Level Security**: Agents see all unclaimed stores + only their claimed stores
- **Commission Tracking**: Track sales, follow-ups, and commissions per store
- **WooCommerce Sync**: Automatic order synchronization and commission calculation
- **Persistent User Preferences**: Dashboard view preferences (columns, filters, widths) automatically sync across all devices

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
Connect your two Google Sheets to power the Client Dashboard:

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

### 4. User Preferences
Your dashboard view preferences are automatically saved to the database and sync across all your devices:

**Auto-Saved Preferences:**
- Column visibility (which columns are shown/hidden)
- Column order (custom arrangement)
- Column widths (resized widths)
- Selected states filter
- Font size (8-30px for table text)
- Row height (24-200px for table spacing)
- Theme-specific colors (separate color sets for light and dark mode)

**How It Works:**
- Preferences save automatically 1 second after you make changes
- Login from any device (phone, computer, tablet) and see your custom view
- No setup required - works automatically

**Theme-Specific Color Customization:**
- Customize colors independently for light and dark themes
- Each theme remembers its own color scheme (table background, text, links, buttons, borders, etc.)
- Switch between light and dark mode to see which theme's colors you're editing
- Color customizer shows indicator (☀️ Light Mode or 🌙 Dark Mode) showing active theme
- Reset button resets only the active theme's colors to defaults
- Your custom colors automatically load when switching themes

**Independent Button Color Controls:**
Each button type can be customized independently with its own color:
- **Table Links** - Phone numbers, email addresses, and website links in the table
- **States Filter Button** - Button to open states/provinces filter
- **Find Franchise Button** - Button to open franchise finder
- **Status Filter Button** - Button to filter by status
- **Columns Button** - Button to show/hide columns
- **Action Buttons** - Save, Export, and Refresh buttons throughout the app

### 5. Client Dashboard Workflow
The Client Dashboard automatically loads both sheets:

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
- Sort columns by clicking headers (toggles ascending/descending)
- Editable columns marked with ✏️

**Display Controls:**
- **Font Size**: Dropdown selector with 19 options (8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30px) - affects all table text, from tiny to extra large
- **Row Height**: Precision slider control (24-200px with 1px increments) - ultra-compact to extra spacious vertical spacing
- **Text Wrapping**: Enabled automatically on verbose columns (address, notes, hours) while terse columns (dates, status, IDs, phone) remain single-line to prevent layout jitter

**Filtering:**
- **Shops Counter**: Displays "Showing X of Y shops" to track visible vs total shops in real-time
- **Search**: Search across all columns using the search box
- **States Filter**: Click "States" button to filter by state/province
  - Shows full state names (e.g., "Montana" instead of "MT", "Alberta" instead of "AB")
  - Each state displays its shop count in parentheses (e.g., "California (45)")
  - **Canada Toggle**: Quick checkbox at the top to show/hide all Canadian provinces at once
    - Displays total count of Canadian shops
    - Makes it easy to focus on US-only locations by unchecking Canada
  - All regions selected by default, uncheck to hide rows from those locations

**Editing Features:**
- **Phone Numbers**: Clickable with phone icon (📞) to trigger calls on compatible devices - opens call/email logging popup with sales summary
- **Email Addresses**: Clickable with email icon (✉️) to trigger emails on compatible devices - opens call/email logging popup with sales summary
- **Sales-ready Summary**: Displayed as clickable link (truncated to 50 characters) - click to view full summary in popup
- **Website URLs**: Auto-shortened to domain name (e.g., "lionheartcannabis.com") with external link icon, opens in new tab
- **Link Column**: Shows 🍁 emoji for Leafly links, 🔗 for other links - clickable to open in new tab
- **State Column**: Searchable dropdown showing only states in your current data - type to filter or scroll to select
- **Status Column**: Dropdown with predefined statuses (1 – Contacted, 2 – Interested, 3 – Sample Sent, 4 – Follow-Up, 5 – Closed Won, 6 – Closed Lost)
- **Date/Follow-up Columns**: Calendar date picker for easy date selection - saves in M/d/yyyy format
- **Hours Column**: Smart formatting that compresses consecutive days (e.g., "Mon-Fri: 9am - 5pm")
- **Existing Data**: Click the edit icon (⛶) to open popup editor (prevents accidental data loss)
- **Empty Cells**: Inline editing for new data entry
- **Long Text (>100 chars)**: Auto-truncated with expand icon for full view/edit in popup
- **Double-Click Protection**: All existing data edited via popup modal with Save button

**Store Details Popup:**
The Store Details popup provides comprehensive store information organized in collapsible accordion sections:

1. **Sales Info (Expanded by Default)**:
   - Sales-ready Summary: AI-generated insights about the store
   - Notes (Column K): Main notes field for call/contact information
   - Point of Contact, POC Email (Column M), POC Phone (Column N)
   - **Auto-Detection**: When you type contact info in Notes, the system automatically:
     - Detects email addresses using regex pattern matching
     - Detects phone numbers in various formats (xxx-xxx-xxxx, (xxx) xxx-xxxx, etc.)
     - Auto-populates POC Email and POC Phone fields if they're empty
     - Protects manually-entered data: once you edit a POC field, auto-detection won't overwrite it
   - **Unsaved Changes Warning**: If you try to close the popup with unsaved changes, you'll get a confirmation dialog

2. **Contact Information**: Store address, phone, email, hours
3. **Additional Details**: Website, type, CBD info, other store-specific data

**Call/Email Logging:**
When you click a phone number or email address, the system:
1. Opens a logging popup that displays the Sales-ready Summary at the top (if available)
2. Provides fields to record: Status, Follow-up Date, Next Action, Point of Contact, Notes
3. Automatically triggers the phone call or email action
4. Saves all activity details to the Commission Tracker sheet
5. Claims the store for you if it hasn't been claimed yet

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
- View all stores and all agent activity in Client Dashboard
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
