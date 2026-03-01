interface UseClientDashboardUiHandlersProps {
  currentProjectId?: string;
  data: any[];
  editableColumns: string[];
  filteredData: any[];
  fontSize: number;
  refetch: () => Promise<any>;
  searchTerm: string;
  selectedStates: Set<string>;
  setColumnOrder: (value: any) => void;
  setColumnWidths: (value: any) => void;
  setEmailCrawlResults: (value: any) => void;
  setIsEmailCrawling: (value: boolean) => void;
  setIsRefreshing: (value: boolean) => void;
  setSelectedStates: (value: Set<string>) => void;
  setShowStateless: (value: boolean) => void;
  setSortColumn: (value: string | null) => void;
  setSortDirection: (value: "asc" | "desc") => void;
  setVisibleColumns: (value: any) => void;
  showStateless: boolean;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
  toast: (props: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  visibleHeaders: string[];
  isEmailCrawling: boolean;
  allStates: string[];
}

export function useClientDashboardUiHandlers(props: UseClientDashboardUiHandlersProps) {
  const handleManualRefresh = async () => {
    try {
      props.setIsRefreshing(true);
      await fetch("/api/sheets/refresh", {
        method: "POST",
        credentials: "include",
      });
      await props.refetch();
    } catch (error) {
      console.error("Refresh failed:", error);
      props.toast({
        title: "Refresh failed",
        description: "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      props.setIsRefreshing(false);
    }
  };

  const toggleColumn = (column: string) => {
    props.setVisibleColumns((prev: Record<string, boolean>) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const moveColumnLeft = (column: string) => {
    props.setColumnOrder((prev: string[]) => {
      const index = prev.indexOf(column);
      if (index <= 0) return prev;
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder;
    });
  };

  const moveColumnRight = (column: string) => {
    props.setColumnOrder((prev: string[]) => {
      const index = prev.indexOf(column);
      if (index === -1 || index >= prev.length - 1) return prev;
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder;
    });
  };

  const handleSort = (column: string) => {
    if (props.sortColumn === column) {
      props.setSortDirection(props.sortDirection === "asc" ? "desc" : "asc");
    } else {
      props.setSortColumn(column);
      props.setSortDirection("asc");
    }
  };

  const getUniqueColumnValues = (column: string): string[] => {
    const values = new Set<string>();
    props.data.forEach((row: any) => {
      const value = row[column];
      if (value && String(value).trim()) {
        values.add(String(value).trim());
      }
    });
    return Array.from(values).sort();
  };

  const toggleState = (state: string) => {
    const next = new Set(props.selectedStates);
    if (next.has(state)) {
      next.delete(state);
    } else {
      next.add(state);
    }
    props.setSelectedStates(next);
  };

  const selectAllStates = () => {
    props.setSelectedStates(new Set(props.allStates));
    props.setShowStateless(true);
  };

  const clearAllStates = () => {
    props.setSelectedStates(new Set());
    props.setShowStateless(false);
  };

  const autoFitColumns = () => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    const newWidths: Record<string, number> = {};
    context.font = `${props.fontSize}px system-ui, -apple-system, sans-serif`;

    props.visibleHeaders.forEach((header: string) => {
      const headerWidth = context.measureText(header).width + 100;
      const contentWidths = props.filteredData.slice(0, 100).map((row: any) => {
        const value = String(row[header] || "");
        let baseWidth = context.measureText(value).width;

        const isEditableColumn = props.editableColumns.some((col: string) => col.toLowerCase() === header.toLowerCase());
        const isLinkColumn = header.toLowerCase() === "link";
        const isStatusColumn = header.toLowerCase().includes("status");

        if (isLinkColumn) baseWidth += 60;
        else if (isStatusColumn) baseWidth += 40;
        else if (isEditableColumn) baseWidth += 30;

        return baseWidth + 50;
      });

      const maxContentWidth = Math.max(...contentWidths, 0);
      const optimalWidth = Math.max(100, Math.min(600, Math.max(headerWidth, maxContentWidth)));
      newWidths[header] = Math.ceil(optimalWidth);
    });

    props.setColumnWidths(newWidths);
    props.toast({
      title: "Columns Auto-fitted",
      description: "Column widths adjusted to fit content",
    });
  };

  const handleFindEmails = async () => {
    if (props.isEmailCrawling) return;
    props.setIsEmailCrawling(true);
    props.setEmailCrawlResults(null);

    try {
      const normalizeUrl = (url: string) => {
        if (!url) return "";
        return url.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      };

      const visibleWebsites = props.filteredData
        .map((row: any) => ({
          website: normalizeUrl(row.Website || row.website || ""),
          hasEmail: !!(row.Email || row.email),
        }))
        .filter((value: any) => value.website);

      const response = await fetch("/api/clients/crawl-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibleWebsites, projectId: props.currentProjectId }),
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        props.setEmailCrawlResults({ totalProcessed: data.totalProcessed, emailsFound: data.emailsFound });
        const moreText = data.hasMore ? ` (${data.remainingToProcess} more to check - click again)` : "";
        props.toast({
          title: data.emailsFound > 0 ? "Emails Found!" : "Crawl Complete",
          description: `Found ${data.emailsFound} emails from ${data.totalProcessed} websites${moreText}`,
        });
        props.refetch();
      } else {
        props.toast({
          title: "Error",
          description: data.message || "Failed to crawl emails",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      props.toast({
        title: "Error",
        description: error.message || "Failed to crawl emails",
        variant: "destructive",
      });
    } finally {
      props.setIsEmailCrawling(false);
    }
  };

  return {
    autoFitColumns,
    clearAllStates,
    getUniqueColumnValues,
    handleFindEmails,
    handleManualRefresh,
    handleSort,
    moveColumnLeft,
    moveColumnRight,
    selectAllStates,
    toggleColumn,
    toggleState,
  };
}
