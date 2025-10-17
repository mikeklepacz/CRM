# Hemp Wick CRM Design Guidelines

## Design Approach: Enterprise Data System

**Selected Approach**: Design System-Based using Material Design principles adapted for data-heavy applications

**Rationale**: This is a utility-focused internal tool where efficiency, data readability, and consistent patterns are critical. The application is information-dense with tables, filters, and dashboards requiring standard enterprise UI patterns.

**Core Principles**:
- Clarity over decoration
- Scannable data presentation
- Consistent interaction patterns
- Role-based visual hierarchy

---

## Color Palette

**Light Mode**:
- Primary: 221 83% 53% (Professional blue for key actions)
- Background: 0 0% 100% (Clean white canvas)
- Surface: 220 13% 97% (Subtle gray for cards/tables)
- Border: 220 13% 91% (Table dividers and separators)
- Text Primary: 220 9% 16%
- Text Secondary: 220 9% 46%
- Success: 142 71% 45% (Order confirmations, positive metrics)
- Warning: 38 92% 50% (Follow-up alerts, commission deadlines)
- Error: 0 72% 51% (Overdue items, validation errors)

**Dark Mode**:
- Primary: 221 83% 53%
- Background: 222 47% 11%
- Surface: 217 33% 17%
- Border: 217 33% 24%
- Text Primary: 210 20% 98%
- Text Secondary: 215 16% 65%

---

## Typography

**Font Stack**: Inter (via Google Fonts CDN) for superior readability in data-dense interfaces

**Hierarchy**:
- Dashboard Headers: font-semibold text-2xl (Admin/Agent dashboard titles)
- Section Headers: font-semibold text-lg (Table headers, filter sections)
- Table Headers: font-medium text-sm uppercase tracking-wide
- Body Text: font-normal text-sm (Table cells, form labels)
- Data Values: font-medium text-sm (Sales figures, commission amounts)
- Metadata: font-normal text-xs text-secondary (Last updated, claim dates)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 for consistent rhythm
- Component padding: p-4 or p-6
- Section gaps: gap-6 or gap-8
- Table cell padding: px-4 py-3
- Card spacing: p-6

**Container Structure**:
- Max width: max-w-7xl for main dashboard content
- Sidebar width: w-64 (navigation, filters)
- Full-width tables with horizontal scroll on mobile

---

## Component Library

### Navigation & Layout
- **Admin Navigation**: Top bar with role badge, logout, dark mode toggle
- **Sidebar Filters**: Collapsible on mobile, persistent on desktop with State/Tag/Status/Agent/Date range controls
- **Breadcrumbs**: Show navigation path (Dashboard > Clients > Client Details)

### Data Display
- **Data Tables**: Striped rows, sticky headers, sortable columns, inline edit capability
  - Row hover: Subtle background change
  - Selected row: Primary color at 10% opacity
  - Pagination: Bottom-aligned with items per page selector
- **Metric Cards**: Display key stats (Total Sales, Commission Owed, Active Clients)
  - Grid layout: 2-column mobile, 4-column desktop
  - Icon + Value + Label + Trend indicator
- **Status Badges**: Rounded pills for Claimed/Unclaimed, order status
  - Claimed: Green badge with agent name
  - Unclaimed: Gray badge with "Available" text

### Forms & Inputs
- **CSV Upload**: Drag-and-drop zone with file preview and unique key selector dropdown
- **Filter Controls**: Multi-select dropdowns for State/Tag/Status, date range picker for inactivity filters
- **Search Bar**: Full-width with search icon, debounced input, clear button
- **Notes Section**: Expandable textarea with character count, save/cancel actions

### Actions & Interactions
- **Claim Button**: Primary button for agents, visible only on unclaimed records
- **Action Menus**: Three-dot overflow menu for Edit/Reassign/Unclaim (admin only)
- **Clickable Data**: Phone numbers (tel: links with phone icon), emails (mailto: links with envelope icon) with visual hover underline
- **Follow-up Toggle**: Checkbox with timestamp display when marked complete

### Dashboard Layouts
- **Admin Dashboard**: 
  - Top: Metric cards (4-column)
  - Middle: CSV upload section + user management panel
  - Bottom: Full client table with all filters
- **Agent Dashboard**:
  - Top: Personal metrics (claimed clients, commission earned)
  - Middle: Inactivity filter quick actions (90/180/365 day buttons)
  - Bottom: Claimed clients table with follow-up column

---

## Accessibility & Interactions

- Focus states: 2px ring in primary color for keyboard navigation
- Loading states: Skeleton loaders for tables, spinner for actions
- Empty states: Centered message with icon and action CTA
- Error handling: Inline validation messages below inputs
- Toast notifications: Top-right for success/error feedback (4-second auto-dismiss)

---

## Images

**No hero images required** - this is a data-focused internal application. Use icons from Heroicons (via CDN) for:
- Dashboard metric cards (chart, users, currency icons)
- Table action buttons (pencil, trash, arrow icons)
- Empty states (document, folder icons)
- Filter controls (funnel, calendar icons)