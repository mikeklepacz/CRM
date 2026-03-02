import { Skeleton } from "@/components/ui/skeleton";

export function SuperAdminPageHeader(props: any) {
  const p = props;

  return (
    <div className="mb-6">
      <h2 className="text-3xl font-semibold text-foreground" data-testid="text-page-title">
        Super Admin Dashboard
      </h2>
      <div className="text-muted-foreground" data-testid="text-page-subtitle">
        {p.metricsLoading ? (
          <Skeleton className="h-4 w-64 inline-block" />
        ) : (
          <>
            {p.metricsData?.totalTenants ?? 0} tenants, {p.metricsData?.totalUsers ?? 0} users, {p.metricsData?.totalClients ?? 0} clients
          </>
        )}
      </div>
    </div>
  );
}
