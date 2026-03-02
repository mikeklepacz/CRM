import type { ReactNode, Ref } from "react";

type ClientDashboardResultsShellProps = {
  background: string;
  border: string;
  children: ReactNode;
  rowCount: number;
  tableContainerRef: Ref<HTMLDivElement>;
  text: string;
  totalRows: number;
};

export function ClientDashboardResultsShell({
  background,
  border,
  children,
  rowCount,
  tableContainerRef,
  text,
  totalRows,
}: ClientDashboardResultsShellProps) {
  return (
    <>
      <h2 className="text-2xl font-semibold mb-4" style={{ color: text }}>
        My Client Dashboard
      </h2>
      <div className="border rounded-md overflow-hidden" style={{ borderColor: border }}>
        <div
          ref={tableContainerRef}
          className="h-[600px] w-full overflow-auto"
          style={{ backgroundColor: background }}
        >
          {children}
        </div>
      </div>
      {rowCount > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {rowCount} of {totalRows} rows
        </div>
      )}
    </>
  );
}
