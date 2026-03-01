import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import type { Client } from "@shared/schema";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";
import { apiRequest } from "@/lib/queryClient";
import { RemindersWidget } from "@/components/widgets/reminders";
import { CallHistoryDialog } from "@/components/call-history-dialog";
import { StoreDetailsDialog } from "@/components/store-details-dialog";
import { DashboardMetricsSection } from "./dashboard/metrics-section";
import { DashboardClientsSection } from "./dashboard/clients-section";
import { getTimePeriodDates, isClientInTimeRange } from "./dashboard/filters";
import type { Status } from "./dashboard/types";

export default function Dashboard() {
  const RemindersWidgetCompat = RemindersWidget as any;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const voip = useTwilioVoip();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [inactivityDays, setInactivityDays] = useState("all");
  const [timePeriod, setTimePeriod] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [storeDetailsDialog, setStoreDetailsDialog] = useState<{ open: boolean; row: any; autoCallPhone?: string } | null>(null);
  const [storeDetailsLoading, setStoreDetailsLoading] = useState<string | null>(null);

  const [contextUpdateTrigger, setContextUpdateTrigger] = useState(0);
  const [loadDefaultScriptTrigger, setLoadDefaultScriptTrigger] = useState(0);

  const { currentColors, statusColors, statusOptions } = useCustomTheme();

  const { data: clients = [], isLoading: clientsLoading, refetch: refetchClients } = useQuery<Client[]>({ queryKey: ["/api/clients/my"] });
  const { data: statusesResponse } = useQuery<{ statuses: Status[] }>({ queryKey: ["/api/statuses"] });
  const { data: userPreferences } = useQuery<any>({ queryKey: ["/api/user/preferences"] });
  const { data: sheetsData } = useQuery<{ sheets: any[] }>({ queryKey: ["/api/sheets"] });

  const statuses = statusesResponse?.statuses || [];
  const trackerSheet = sheetsData?.sheets?.find((sheet: any) => sheet.sheetPurpose === "commissions");
  const storeDbSheet = sheetsData?.sheets?.find((sheet: any) => sheet.sheetPurpose === "Store Database");

  useEffect(() => {
    if (storeDetailsDialog?.open && storeDetailsDialog?.autoCallPhone) {
      const phoneNumber = storeDetailsDialog.autoCallPhone;
      const row = storeDetailsDialog.row;
      const storeLink = row.link || row.Link;
      const storeName = row.name || row.Name || row.Company || "Unknown Store";

      setLoadDefaultScriptTrigger((prev) => prev + 1);

      setTimeout(() => {
        voip.makeCall(phoneNumber, { storeName, storeLink: storeLink || undefined });
      }, 800);

      setStoreDetailsDialog((prev) => (prev ? { ...prev, autoCallPhone: undefined } : null));
    }
  }, [storeDetailsDialog?.open, storeDetailsDialog?.autoCallPhone]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [user, authLoading, toast]);

  if (authLoading || !user) return null;

  const timeFilter = getTimePeriodDates(timePeriod, customDateRange);

  const filteredClients = clients.filter((client) => {
    if (search) {
      const searchLower = search.toLowerCase();
      const dataStr = JSON.stringify(client.data).toLowerCase();
      if (!dataStr.includes(searchLower)) return false;
    }

    if (status !== "all") {
      const googleSheetsStatus = client.data?.["Status"] || client.data?.["status"];
      const databaseStatus = client.status;
      const matchesGoogleSheets = googleSheetsStatus === status;
      const matchesDatabase = databaseStatus?.toLowerCase() === status.toLowerCase();
      if (!matchesGoogleSheets && !matchesDatabase) return false;
    }

    if (inactivityDays !== "all") {
      if (!client.lastOrderDate) return true;
      const daysSinceOrder = Math.floor((Date.now() - new Date(client.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceOrder < parseInt(inactivityDays)) return false;
    }

    if (!isClientInTimeRange(client, timeFilter)) return false;
    return true;
  });

  const statsClients = clients.filter((client) => isClientInTimeRange(client, timeFilter));
  const totalSales = statsClients.reduce((sum, c) => sum + parseFloat(c.totalSales || "0"), 0);
  const totalCommission = statsClients.reduce((sum, c) => sum + parseFloat(c.commissionTotal || "0"), 0);
  const inactive90Days = statsClients.filter((c) => {
    if (!c.lastOrderDate) return false;
    const days = Math.floor((Date.now() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
    return days >= 90;
  }).length;

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setInactivityDays("all");
    setTimePeriod("all");
    setCustomDateRange(undefined);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, inactivityDays, timePeriod, customDateRange, itemsPerPage]);

  const totalPages = itemsPerPage === -1 ? 1 : Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = itemsPerPage === -1 ? filteredClients : filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-shrink-0 px-4 py-6 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">My Dashboard</h2>
            <p className="text-muted-foreground">Track your claimed clients and commissions</p>
          </div>

          <DashboardMetricsSection
            timePeriod={timePeriod}
            customDateRange={customDateRange}
            statsClientsCount={statsClients.length}
            totalSales={totalSales}
            totalCommission={totalCommission}
            inactive90Days={inactive90Days}
            onTimePeriodChange={setTimePeriod}
            onCustomDateRangeChange={setCustomDateRange}
          />
        </div>

        <DashboardClientsSection
          user={user}
          clientsLoading={clientsLoading}
          filteredClients={filteredClients}
          paginatedClients={paginatedClients}
          statuses={statuses}
          search={search}
          status={status}
          inactivityDays={inactivityDays}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          totalPages={totalPages}
          storeDetailsLoading={storeDetailsLoading}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onInactivityDaysChange={setInactivityDays}
          onItemsPerPageChange={setItemsPerPage}
          onClearFilters={clearFilters}
          onOpenCallHistory={() => setCallHistoryOpen(true)}
          onPreviousPage={() => setCurrentPage(Math.max(1, currentPage - 1))}
          onNextPage={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          onNotesClick={async (clientId: string) => {
            const client = filteredClients.find((c) => c.id === clientId);
            if (!client) return;
            const link = client.data?.Link || client.id;
            if (!link) {
              setStoreDetailsDialog({ open: true, row: client });
              return;
            }
            setStoreDetailsLoading(clientId);
            try {
              const response = await fetch(`/api/stores/by-link?link=${encodeURIComponent(link)}`);
              if (response.ok) {
                const { storeRow, meta } = await response.json();
                setStoreDetailsDialog({ open: true, row: { ...storeRow, meta: { rowIndex: meta.rowIndex, storeSheetId: meta.storeSheetId } } });
              } else {
                setStoreDetailsDialog({ open: true, row: client });
              }
            } catch {
              setStoreDetailsDialog({ open: true, row: client });
            } finally {
              setStoreDetailsLoading(null);
            }
          }}
        />
      </div>

      <div className="w-80 border-l flex-shrink-0 overflow-auto">
        <RemindersWidgetCompat
          trackerSheetId={trackerSheet?.id}
          storeDbSheetId={storeDbSheet?.id}
          userPreferences={userPreferences}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger}
          loadDefaultScriptTrigger={loadDefaultScriptTrigger}
          setLoadDefaultScriptTrigger={setLoadDefaultScriptTrigger}
        />
      </div>

      <CallHistoryDialog open={callHistoryOpen} onOpenChange={setCallHistoryOpen} />

      {storeDetailsDialog && (
        <StoreDetailsDialog
          open={storeDetailsDialog.open}
          onOpenChange={(open) => setStoreDetailsDialog(open ? storeDetailsDialog : null)}
          row={storeDetailsDialog.row}
          trackerSheetId={trackerSheet?.id}
          storeSheetId={storeDbSheet?.id}
          refetch={refetchClients}
          currentColors={currentColors}
          statusOptions={statusOptions}
          statusColors={statusColors}
          contextUpdateTrigger={contextUpdateTrigger}
          setContextUpdateTrigger={setContextUpdateTrigger}
          loadDefaultScriptTrigger={loadDefaultScriptTrigger}
        />
      )}
    </div>
  );
}
