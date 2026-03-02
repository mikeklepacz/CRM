import type { RefObject } from "react";
import { Table } from "@/components/ui/table";
import { ClientDashboardInlineStatus } from "@/components/client-dashboard/client-dashboard-inline-status";
import { ClientDashboardResultsShell } from "@/components/client-dashboard/client-dashboard-results-shell";
import { ClientDashboardTableHeader } from "@/components/client-dashboard/client-dashboard-table-header";
import { ClientDashboardVirtualizedTableBody } from "@/components/client-dashboard/client-dashboard-virtualized-table-body";

type ClientDashboardDataTableSectionProps = {
  customColors: any;
  dataLength: number;
  filteredDataLength: number;
  headerProps: any;
  isLoading: boolean;
  tableContainerRef: RefObject<HTMLDivElement>;
  bodyProps: any;
  storeSheetId: string;
  trackerSheetId: string;
};

export function ClientDashboardDataTableSection({
  customColors,
  dataLength,
  filteredDataLength,
  headerProps,
  isLoading,
  tableContainerRef,
  bodyProps,
  storeSheetId,
  trackerSheetId,
}: ClientDashboardDataTableSectionProps) {
  if (isLoading) {
    return <ClientDashboardInlineStatus loading message="Loading data..." />;
  }

  if (storeSheetId && trackerSheetId && dataLength > 0) {
    return (
      <ClientDashboardResultsShell
        background={customColors.background}
        border={customColors.border}
        rowCount={filteredDataLength}
        tableContainerRef={tableContainerRef}
        text={customColors.text}
        totalRows={dataLength}
      >
        <Table className="min-w-full" style={{ tableLayout: "fixed" }}>
          <ClientDashboardTableHeader {...headerProps} />
          <ClientDashboardVirtualizedTableBody {...bodyProps} />
        </Table>
      </ClientDashboardResultsShell>
    );
  }

  if (storeSheetId && trackerSheetId) {
    return <ClientDashboardInlineStatus message="No data found. Check your sheet selection and try refreshing." />;
  }

  return <ClientDashboardInlineStatus message="Select both Store Database and Commission Tracker sheets to view data." />;
}
