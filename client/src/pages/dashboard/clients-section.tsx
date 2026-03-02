import { Search, Phone as PhoneIcon } from "lucide-react";
import type { Client } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientsTable } from "@/components/clients-table";
import type { Status } from "./types";

interface DashboardClientsSectionProps {
  user: any;
  clientsLoading: boolean;
  filteredClients: Client[];
  paginatedClients: Client[];
  statuses: Status[];
  search: string;
  status: string;
  inactivityDays: string;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
  storeDetailsLoading: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onInactivityDaysChange: (value: string) => void;
  onItemsPerPageChange: (value: number) => void;
  onClearFilters: () => void;
  onOpenCallHistory: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onNotesClick: (clientId: string) => void;
}

export function DashboardClientsSection({
  user,
  clientsLoading,
  filteredClients,
  paginatedClients,
  statuses,
  search,
  status,
  inactivityDays,
  itemsPerPage,
  currentPage,
  totalPages,
  storeDetailsLoading,
  onSearchChange,
  onStatusChange,
  onInactivityDaysChange,
  onItemsPerPageChange,
  onClearFilters,
  onOpenCallHistory,
  onPreviousPage,
  onNextPage,
  onNotesClick,
}: DashboardClientsSectionProps) {
  return (
    <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border rounded-lg bg-card mb-4">
        <div className="relative min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" data-testid="input-search-clients" />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]" data-testid="select-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={inactivityDays} onValueChange={onInactivityDaysChange}>
          <SelectTrigger className="w-[200px]" data-testid="select-inactivity">
            <SelectValue placeholder="Since Last Ordered" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="90">90+ days</SelectItem>
            <SelectItem value="180">180+ days</SelectItem>
            <SelectItem value="365">365+ days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={onClearFilters} data-testid="button-clear-filters">
          Clear All
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={onOpenCallHistory} data-testid="button-call-history">
          <PhoneIcon className="h-4 w-4 mr-2" />
          Call History
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show:</span>
          <Select value={itemsPerPage === -1 ? "all" : itemsPerPage.toString()} onValueChange={(value) => onItemsPerPageChange(value === "all" ? -1 : parseInt(value))}>
            <SelectTrigger className="w-[100px]" data-testid="select-items-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="all">ALL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">My Clients</h3>
        <p className="text-sm text-muted-foreground">
          {itemsPerPage === -1
            ? `Showing all ${filteredClients.length} client${filteredClients.length !== 1 ? "s" : ""}`
            : `Showing ${Math.min((currentPage - 1) * itemsPerPage + 1, filteredClients.length)}-${Math.min(currentPage * itemsPerPage, filteredClients.length)} of ${filteredClients.length} client${filteredClients.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <ClientsTable clients={paginatedClients} currentUser={user} isLoading={clientsLoading} loadingClientId={storeDetailsLoading} onNotesClick={onNotesClick} />

      {itemsPerPage !== -1 && filteredClients.length > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={currentPage === 1} data-testid="button-prev-page">
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={onNextPage} disabled={currentPage === totalPages} data-testid="button-next-page">
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
