import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type {
  SortDirection,
  SortField,
  SuperAdminTicket,
  Tenant,
  UserWithMemberships,
} from "@/components/super-admin/super-admin.types";

export const TICKET_CATEGORIES = [
  "Bug Report",
  "Feature Request",
  "Technical Support",
  "Account Issue",
  "Billing Question",
  "Data Issue",
  "Performance Problem",
  "Integration Help",
  "General Question",
  "Other",
] as const;

export function getAvailableTenants(
  selectedUser: UserWithMemberships | null,
  tenants: Tenant[] | undefined,
): Tenant[] {
  if (!selectedUser || !tenants) return [];
  const memberTenantIds = new Set(selectedUser.tenantMemberships.map((membership) => membership.tenantId));
  return tenants.filter((tenant) => !memberTenantIds.has(tenant.id));
}

export function filterAndSortUsers(
  users: UserWithMemberships[] | undefined,
  userStatusFilter: "active" | "inactive",
  tenantFilter: string,
  searchQuery: string,
  sortField: SortField,
  sortDirection: SortDirection,
): UserWithMemberships[] {
  if (!users) return [];

  const filtered = users.filter((user) => {
    const isActiveMatch = userStatusFilter === "active" ? user.isActive !== false : user.isActive === false;
    if (!isActiveMatch) return false;

    if (tenantFilter !== "all") {
      const hasTenant = user.tenantMemberships?.some((membership) => membership.tenantId === tenantFilter);
      if (!hasTenant) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
      const email = (user.email || "").toLowerCase();
      const agentName = (user.agentName || "").toLowerCase();

      if (!fullName.includes(query) && !email.includes(query) && !agentName.includes(query)) {
        return false;
      }
    }

    return true;
  });

  if (sortField) {
    filtered.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      switch (sortField) {
        case "name":
          aVal = `${a.firstName || ""} ${a.lastName || ""}`.trim().toLowerCase();
          bVal = `${b.firstName || ""} ${b.lastName || ""}`.trim().toLowerCase();
          break;
        case "email":
          aVal = (a.email || "").toLowerCase();
          bVal = (b.email || "").toLowerCase();
          break;
        case "tenants":
          aVal = String(a.tenantMemberships?.length || 0);
          bVal = String(b.tenantMemberships?.length || 0);
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  return filtered;
}

export function getUserCountByStatus(
  users: UserWithMemberships[] | undefined,
  status: "active" | "inactive",
): number {
  if (!users) return 0;
  return users.filter((user) => (status === "active" ? user.isActive !== false : user.isActive === false)).length;
}

export function getSortIcon(
  sortField: SortField,
  sortDirection: SortDirection,
  field: SortField,
) {
  if (sortField !== field) {
    return <ArrowUpDown className="ml-1 h-3 w-3" />;
  }

  return sortDirection === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3" />
    : <ArrowDown className="ml-1 h-3 w-3" />;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "trial":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
}

export function filterTickets(
  tickets: SuperAdminTicket[] | undefined,
  ticketStatusFilter: string,
  ticketCategoryFilter: string,
  ticketTenantFilter: string,
): SuperAdminTicket[] {
  if (!tickets) return [];

  return tickets.filter((ticket) => {
    const statusMatch = ticketStatusFilter === "all" || ticket.status === ticketStatusFilter;
    const categoryMatch = ticketCategoryFilter === "all" || ticket.category === ticketCategoryFilter;
    const tenantMatch = ticketTenantFilter === "all" || ticket.tenantId === ticketTenantFilter;
    return statusMatch && categoryMatch && tenantMatch;
  });
}

export function getUnreadTicketCount(tickets: SuperAdminTicket[] | undefined): number {
  return tickets?.filter((ticket) => ticket.isUnreadByAdmin).length ?? 0;
}
