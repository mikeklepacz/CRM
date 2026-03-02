import { Skeleton } from "@/components/ui/skeleton";

export function OrgAdminPageHeader(props: any) {
  const p = props;

  return (
    <div className="mb-6">
      <h2 className="text-3xl font-semibold text-foreground" data-testid="text-page-title">
        Organization Admin
      </h2>
      <div className="text-muted-foreground" data-testid="text-page-subtitle">
        {p.settingsLoading ? (
          <Skeleton className="h-4 w-64 inline-block" />
        ) : (
          <>Manage {p.settingsData?.tenant?.name || "your organization"}</>
        )}
      </div>
    </div>
  );
}
