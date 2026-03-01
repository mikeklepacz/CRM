import { useMemo } from "react";
import { filterAndSortUsers, filterTickets, getAvailableTenants, getUserCountByStatus } from "@/components/super-admin/super-admin-utils";
import type { SortDirection, SortField, SuperAdminTicket, Tenant, UserWithMemberships } from "@/components/super-admin/super-admin.types";

interface UseSuperAdminDerivedProps {
  searchQuery: string;
  selectedUser: UserWithMemberships | null;
  sortDirection: SortDirection;
  sortField: SortField;
  tenantFilter: string;
  tenants?: Tenant[];
  ticketCategoryFilter: string;
  ticketStatusFilter: string;
  ticketTenantFilter: string;
  tickets?: SuperAdminTicket[];
  userStatusFilter: "active" | "inactive";
  users?: UserWithMemberships[];
}

export function useSuperAdminDerived(props: UseSuperAdminDerivedProps) {
  const filteredAndSortedUsers = useMemo(() => {
    return filterAndSortUsers(
      props.users,
      props.userStatusFilter,
      props.tenantFilter,
      props.searchQuery,
      props.sortField,
      props.sortDirection,
    );
  }, [props.users, props.userStatusFilter, props.tenantFilter, props.searchQuery, props.sortField, props.sortDirection]);

  const activeUsersCount = useMemo(() => {
    return getUserCountByStatus(props.users, "active");
  }, [props.users]);

  const inactiveUsersCount = useMemo(() => {
    return getUserCountByStatus(props.users, "inactive");
  }, [props.users]);

  const filteredTickets = useMemo(() => {
    return filterTickets(props.tickets, props.ticketStatusFilter, props.ticketCategoryFilter, props.ticketTenantFilter);
  }, [props.tickets, props.ticketStatusFilter, props.ticketCategoryFilter, props.ticketTenantFilter]);

  const availableTenants = getAvailableTenants(props.selectedUser, props.tenants);

  return {
    activeUsersCount,
    availableTenants,
    filteredAndSortedUsers,
    filteredTickets,
    inactiveUsersCount,
  };
}
