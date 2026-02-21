import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link2 } from "lucide-react";
import { MatchOrderDialog } from "./match-order-dialog";
import type { MatchSuggestionsResponse, StoreSelection, WooOrder } from "./types";

type Props = {
  orders: WooOrder[];
  sortDirection: "asc" | "desc";
  matchingOrderId: string | null;
  selectedStores: StoreSelection[];
  dbaName: string;
  showAllClients: boolean;
  clientSearch: string;
  commissionTypes: Record<string, string>;
  commissionAmounts: Record<string, string>;
  matchSuggestions: MatchSuggestionsResponse | null;
  matchOrderPending: boolean;
  onToggleSort: () => void;
  onCommissionTypeChange: (orderId: string, value: string) => void;
  onCommissionAmountChange: (orderId: string, value: string) => void;
  calculateCommission: (orderId: string, total: number) => string;
  onOpenMatchDialog: (order: WooOrder) => void;
  onCloseMatchDialog: () => void;
  onConfirmMatch: () => void;
  onToggleStoreSelection: (link: string, name: string) => void;
  onClearStoreSelections: () => void;
  onDbaNameChange: (value: string) => void;
  onShowAllClientsChange: (value: boolean) => void;
  onClientSearchChange: (value: string) => void;
  onOpenStoreDetails: (orderId: string, clientId?: string | null) => void;
};

export function OrdersTable({
  orders,
  sortDirection,
  matchingOrderId,
  selectedStores,
  dbaName,
  showAllClients,
  clientSearch,
  commissionTypes,
  commissionAmounts,
  matchSuggestions,
  matchOrderPending,
  onToggleSort,
  onCommissionTypeChange,
  onCommissionAmountChange,
  calculateCommission,
  onOpenMatchDialog,
  onCloseMatchDialog,
  onConfirmMatch,
  onToggleStoreSelection,
  onClearStoreSelections,
  onDbaNameChange,
  onShowAllClientsChange,
  onClientSearchChange,
  onOpenStoreDetails,
}: Props) {
  if (orders.length === 0) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer hover-elevate select-none" onClick={onToggleSort} data-testid="header-order-number-sort">
              Order # {sortDirection === "desc" ? "↓" : "↑"}
            </TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Sales Agent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Commission Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Matched Client</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">#{order.orderNumber}</TableCell>
              <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
              <TableCell>{order.billingEmail || "-"}</TableCell>
              <TableCell>{order.billingCompany || "-"}</TableCell>
              <TableCell>
                {order.salesAgentName ? <Badge variant="outline">{order.salesAgentName}</Badge> : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                <Badge variant={order.status === "completed" ? "default" : "secondary"}>{order.status}</Badge>
              </TableCell>
              <TableCell className="text-right">${parseFloat(order.total).toFixed(2)}</TableCell>
              <TableCell>
                <Select value={commissionTypes[order.id] || "auto"} onValueChange={(value) => onCommissionTypeChange(order.id, value)}>
                  <SelectTrigger className="w-[140px]" data-testid={`select-commission-type-${order.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (6mo rule)</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="flat">Flat Fee</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                {commissionTypes[order.id] === "flat" ? (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-[120px] text-right"
                    value={commissionAmounts[order.id] || ""}
                    onChange={(e) => onCommissionAmountChange(order.id, e.target.value)}
                    data-testid={`input-commission-amount-${order.id}`}
                  />
                ) : (
                  <span className="font-medium">
                    {commissionTypes[order.id] === "auto" || !commissionTypes[order.id] ? (
                      <span className="text-muted-foreground italic">{calculateCommission(order.id, parseFloat(order.total))}</span>
                    ) : (
                      `$${calculateCommission(order.id, parseFloat(order.total))}`
                    )}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {order.hasTrackerRows ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenStoreDetails(order.id, order.clientId);
                    }}
                    className="bg-green-600 hover:bg-green-700 border-green-700"
                    data-testid={`button-match-${order.id}`}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Open Store Details
                  </Button>
                ) : (
                  <Dialog open={matchingOrderId === order.id} onOpenChange={(open) => (!open ? onCloseMatchDialog() : onOpenMatchDialog(order))}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onOpenMatchDialog(order);
                        }}
                        data-testid={`button-match-${order.id}`}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Match
                      </Button>
                    </DialogTrigger>
                    <MatchOrderDialog
                      order={order}
                      selectedStores={selectedStores}
                      dbaName={dbaName}
                      showAllClients={showAllClients}
                      clientSearch={clientSearch}
                      commissionTypes={commissionTypes}
                      commissionAmounts={commissionAmounts}
                      matchSuggestions={matchSuggestions}
                      isPending={matchOrderPending}
                      onConfirmMatch={onConfirmMatch}
                      onToggleStoreSelection={onToggleStoreSelection}
                      onClearSelections={onClearStoreSelections}
                      onDbaNameChange={onDbaNameChange}
                      onShowAllClientsChange={onShowAllClientsChange}
                      onClientSearchChange={onClientSearchChange}
                      onCommissionTypeChange={onCommissionTypeChange}
                      onCommissionAmountChange={onCommissionAmountChange}
                      isStoreSelected={(link) => selectedStores.some((s) => s.link === link)}
                    />
                  </Dialog>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
