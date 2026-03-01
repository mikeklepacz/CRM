import { useQuery } from "@tanstack/react-query";
import { isSuperAdmin } from "@/lib/authUtils";
import type { Metrics, SuperAdminTicket, Tenant, TenantDetails, TicketReply, UserWithMemberships } from "@/components/super-admin/super-admin.types";

export function useSuperAdminQueries(props: any) {
  const p = props;
  const canAccess = isSuperAdmin(p.user);

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery<{ tenants: Tenant[] }>({
    queryKey: ["/api/super-admin/tenants"],
    enabled: canAccess,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: UserWithMemberships[] }>({
    queryKey: ["/api/super-admin/users"],
    enabled: canAccess,
  });

  const { data: metricsData, isLoading: metricsLoading } = useQuery<Metrics>({
    queryKey: ["/api/super-admin/metrics"],
    enabled: canAccess,
  });

  const { data: tenantDetails, isLoading: detailsLoading } = useQuery<TenantDetails>({
    queryKey: [`/api/super-admin/tenants/${p.viewingTenantId}`],
    enabled: !!p.viewingTenantId,
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<{ tickets: SuperAdminTicket[] }>({
    queryKey: ["/api/super-admin/tickets"],
    enabled: canAccess,
  });

  const { data: ticketDetailData, isLoading: ticketDetailLoading } = useQuery<{ ticket: SuperAdminTicket; replies: TicketReply[] }>({
    queryKey: ["/api/tickets", p.selectedTicketId],
    enabled: !!p.selectedTicketId,
  });

  const { data: directElevenLabsData, isLoading: directElevenLabsLoading } = useQuery<{ useDirectElevenLabs: boolean }>({
    queryKey: [`/api/super-admin/tenants/${p.configTenantId}/elevenlabs-config`],
    enabled: canAccess && p.configTenantId !== "all",
  });

  return {
    detailsLoading,
    directElevenLabsData,
    directElevenLabsLoading,
    metricsData,
    metricsLoading,
    tenantDetails,
    tenantsData,
    tenantsLoading,
    ticketDetailData,
    ticketDetailLoading,
    ticketsData,
    ticketsLoading,
    usersData,
    usersLoading,
  };
}
