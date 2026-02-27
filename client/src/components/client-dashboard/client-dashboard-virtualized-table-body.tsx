import type { CSSProperties } from "react";
import { TableBody } from "@/components/ui/table";
import { ClientDashboardCellDisplay } from "@/components/client-dashboard/client-dashboard-cell-display";
import { ClientDashboardEditableCell } from "@/components/client-dashboard/client-dashboard-editable-cell";

type StatusColorMap = Record<string, { background: string; text: string }>;

type ClientDashboardVirtualizedTableBodyProps = {
  columnWidths: Record<string, number>;
  colorRowByStatus: boolean;
  currentUser: any;
  customColors: any;
  editableColumns: string[];
  editedCells: Record<string, { value: string }>;
  filteredData: any[];
  fontSize: number;
  formatHours: (value: string) => string;
  freezeFirstColumn: boolean;
  getUniqueColumnValues: (header: string) => string[];
  handleCellEdit: (row: any, header: string, value: string) => void;
  handleCellUpdate: (row: any, header: string, value: string) => void;
  headers: string[];
  isAdmin: boolean;
  openCombobox: string | null;
  openExpandedView: (targetRow: any, targetHeader: string, targetValue: string, isEditable: boolean) => void;
  openStoreDetailsFromTableRow: (row: any, autoLoadAssistant: boolean) => void;
  rowVirtualizer: any;
  statusColors: StatusColorMap;
  statusOptions: string[];
  storeSheetId: string;
  textAlign: "left" | "center" | "right" | "justify";
  trackerHeaders: string[];
  trackerSheetId: string;
  verticalAlign: "top" | "middle" | "bottom";
  visibleHeaders: string[];
  onOpenComboboxChange: (value: string | null) => void;
};

export function ClientDashboardVirtualizedTableBody({
  columnWidths,
  colorRowByStatus,
  currentUser,
  customColors,
  editableColumns,
  editedCells,
  filteredData,
  fontSize,
  formatHours,
  freezeFirstColumn,
  getUniqueColumnValues,
  handleCellEdit,
  handleCellUpdate,
  headers,
  isAdmin,
  openCombobox,
  openExpandedView,
  openStoreDetailsFromTableRow,
  rowVirtualizer,
  statusColors,
  statusOptions,
  storeSheetId,
  textAlign,
  trackerHeaders,
  trackerSheetId,
  verticalAlign,
  visibleHeaders,
  onOpenComboboxChange,
}: ClientDashboardVirtualizedTableBodyProps) {
  return (
    <TableBody>
      <tr style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
        <td colSpan={visibleHeaders.length} style={{ padding: 0, border: "none" }}>
          <div style={{ position: "relative", height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
              const rowIdx = virtualRow.index;
              const row = filteredData[rowIdx];
              const rowKey = row._storeRowIndex || row._trackerRowIndex || rowIdx;
              const isDeletedRow = row._deletedFromStore;

              const statusColumns = headers.filter((h: string) => h.toLowerCase().includes("status"));
              const rowStatus = statusColumns.length > 0 ? row[statusColumns[0]] : null;
              const rowStatusColor = colorRowByStatus && rowStatus && (statusColors as any)?.[rowStatus];

              const agentColumns = headers.filter((h: string) => h.toLowerCase() === "agent" || h.toLowerCase() === "agent name");
              const rowAgent = agentColumns.length > 0 ? row[agentColumns[0]] : null;
              const isClaimedByCurrentUser = rowAgent && currentUser?.agentName && rowAgent === currentUser.agentName;

              return (
                <div
                  key={virtualRow.key}
                  data-testid={`row-data-${rowIdx}`}
                  className={isDeletedRow ? "bg-destructive/10 hover:bg-destructive/20" : ""}
                  title={isDeletedRow ? "This order was deleted from the store sheet" : ""}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    fontSize: `${fontSize}px`,
                    backgroundColor: rowStatusColor ? rowStatusColor.background : undefined,
                    color: rowStatusColor ? rowStatusColor.text : customColors.tableTextColor,
                    display: "flex",
                    fontWeight: isClaimedByCurrentUser ? "bold" : "normal",
                  }}
                >
                  {visibleHeaders.map((header: string) => {
                    const isEditable = editableColumns.some((col: string) => col.toLowerCase() === header.toLowerCase());
                    const isTrackerColumn = trackerHeaders.some((h: string) => h.toLowerCase() === header.toLowerCase());
                    const sheetId = isTrackerColumn ? trackerSheetId : storeSheetId;
                    const rowLink = row.link || row.Link || `row-${rowKey}`;
                    const cellKey = `${rowLink}-${header}-${sheetId}`;
                    const cellValue = editedCells[cellKey]?.value ?? row[header] ?? "";

                    const isPhoneColumn = header.toLowerCase().includes("phone");
                    const isEmailColumn = header.toLowerCase().includes("email") || header.toLowerCase().includes("e-mail");
                    const isWebsiteColumn = header.toLowerCase().includes("website") || header.toLowerCase().includes("url") || header.toLowerCase().includes("site");
                    const isLinkColumn = header.toLowerCase() === "link";
                    const isStateColumn = header.toLowerCase() === "state";
                    const isStatusColumn = header.toLowerCase().includes("status");
                    const isHoursColumn = header.toLowerCase().includes("hour");
                    const isDateColumn = header.toLowerCase().includes("date") || header.toLowerCase().includes("follow");
                    const isSalesSummaryColumn = header.toLowerCase().includes("sales-ready") || header.toLowerCase().includes("sales ready") || header.toLowerCase().includes("sales_ready");
                    const isAddressColumn = header.toLowerCase().includes("address") ||
                      header.toLowerCase().includes("city") ||
                      (header.toLowerCase().includes("state") && header.toLowerCase().includes("city")) ||
                      header.toLowerCase().includes("point of contact");

                    const isNotesColumn = header.toLowerCase().includes("note") || header.toLowerCase().includes("comment");
                    const shouldWrap = isAddressColumn || isNotesColumn || isHoursColumn;

                    const cellStyle: CSSProperties = {
                      width: columnWidths[header] || 200,
                      maxWidth: columnWidths[header] || 200,
                      padding: `${Math.max(8, fontSize * 0.5)}px 16px`,
                      lineHeight: `${fontSize * 1.4}px`,
                      height: "inherit",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      textAlign: textAlign,
                      verticalAlign: verticalAlign,
                      ...(shouldWrap ? { wordBreak: "break-word" as const, whiteSpace: "normal" as const, overflow: "visible" } : {}),
                    };

                    let cleanedValue = cellValue;
                    if (isHoursColumn) {
                      cleanedValue = formatHours(cellValue);
                    }

                    const isLongText = cleanedValue.length > 100;
                    const displayValue = isLongText ? cleanedValue.substring(0, 100) + "..." : cleanedValue;

                    const comboboxKey = `${rowKey}-${header}`;
                    const uniqueStates = isStateColumn ? getUniqueColumnValues(header) : [];
                    const isFirstColumn = visibleHeaders.indexOf(header) === 0;

                    return (
                      <div
                        key={header}
                        style={{
                          ...cellStyle,
                          ...(isFirstColumn && freezeFirstColumn ? {
                            position: "sticky",
                            left: 0,
                            zIndex: 10,
                            backgroundColor: rowStatusColor ? rowStatusColor.background : customColors.background,
                          } : {}),
                        }}
                      >
                        {isEditable ? (
                          <ClientDashboardEditableCell
                            cellValue={cellValue}
                            comboboxKey={comboboxKey}
                            header={header}
                            isAdmin={isAdmin}
                            isDateColumn={isDateColumn}
                            isStateColumn={isStateColumn}
                            isStatusColumn={isStatusColumn}
                            openCombobox={openCombobox}
                            row={row}
                            rowKey={rowKey}
                            statusColors={statusColors}
                            statusOptions={statusOptions}
                            uniqueStates={uniqueStates}
                            onCellEdit={handleCellEdit}
                            onCellUpdate={handleCellUpdate}
                            onOpenComboboxChange={onOpenComboboxChange}
                          />
                        ) : (
                          <ClientDashboardCellDisplay
                            cellValue={cellValue}
                            displayValue={displayValue}
                            header={header}
                            isEmailColumn={isEmailColumn}
                            isLinkColumn={isLinkColumn}
                            isLongText={isLongText}
                            isPhoneColumn={isPhoneColumn}
                            isSalesSummaryColumn={isSalesSummaryColumn}
                            isWebsiteColumn={isWebsiteColumn}
                            primaryColor={customColors.primary}
                            row={row}
                            rowKey={rowKey}
                            textAlign={textAlign}
                            onOpenExpandedView={(targetRow, targetHeader, targetValue) =>
                              openExpandedView(targetRow, targetHeader, targetValue, false)
                            }
                            onOpenStoreDetails={(targetRow) => openStoreDetailsFromTableRow(targetRow, false)}
                            onOpenStoreDetailsWithAutoScript={(targetRow) => openStoreDetailsFromTableRow(targetRow, true)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    </TableBody>
  );
}
