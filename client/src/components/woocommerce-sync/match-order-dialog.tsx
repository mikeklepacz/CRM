import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Sparkles } from "lucide-react";
import type { MatchSuggestionsResponse, StoreSelection, WooOrder } from "./types";

type Props = {
  order: WooOrder;
  selectedStores: StoreSelection[];
  dbaName: string;
  showAllClients: boolean;
  clientSearch: string;
  commissionTypes: Record<string, string>;
  commissionAmounts: Record<string, string>;
  matchSuggestions: MatchSuggestionsResponse | null;
  isPending: boolean;
  onConfirmMatch: () => void;
  onToggleStoreSelection: (link: string, name: string) => void;
  onClearSelections: () => void;
  onDbaNameChange: (value: string) => void;
  onShowAllClientsChange: (value: boolean) => void;
  onClientSearchChange: (value: string) => void;
  onCommissionTypeChange: (orderId: string, value: string) => void;
  onCommissionAmountChange: (orderId: string, value: string) => void;
  isStoreSelected: (link: string) => boolean;
};

export function MatchOrderDialog({
  order,
  selectedStores,
  dbaName,
  showAllClients,
  clientSearch,
  commissionTypes,
  commissionAmounts,
  matchSuggestions,
  isPending,
  onConfirmMatch,
  onToggleStoreSelection,
  onClearSelections,
  onDbaNameChange,
  onShowAllClientsChange,
  onClientSearchChange,
  onCommissionTypeChange,
  onCommissionAmountChange,
  isStoreSelected,
}: Props) {
  const suggestions = matchSuggestions?.suggestions || [];

  return (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Match Order to Client</DialogTitle>
        <DialogDescription>Select a client to match with order #{order.orderNumber}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2 p-3 bg-muted rounded-md">
          <p className="text-sm"><strong>Email:</strong> {order.billingEmail || "N/A"}</p>
          <p className="text-sm"><strong>Company:</strong> {order.billingCompany || "N/A"}</p>
          <p className="text-sm"><strong>Total:</strong> ${parseFloat(order.total).toFixed(2)}</p>
        </div>

        <div className="space-y-3 p-4 bg-primary/5 border-2 border-primary/20 rounded-md">
          <h4 className="font-semibold text-sm">Commission Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`commission-type-${order.id}`}>Commission Type</Label>
              <Select
                value={commissionTypes[order.id] || "flat"}
                onValueChange={(value) => onCommissionTypeChange(order.id, value)}
              >
                <SelectTrigger id={`commission-type-${order.id}`} data-testid={`select-commission-type-${order.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Fee</SelectItem>
                  <SelectItem value="25">25%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="auto">Auto (6-month rule)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`commission-amount-${order.id}`}>
                Amount {commissionTypes[order.id] === "flat" ? "($)" : "(auto)"}
              </Label>
              <Input
                id={`commission-amount-${order.id}`}
                type="number"
                step="0.01"
                placeholder="500.00"
                value={commissionAmounts[order.id] || "500.00"}
                onChange={(e) => onCommissionAmountChange(order.id, e.target.value)}
                disabled={commissionTypes[order.id] !== "flat"}
                data-testid={`input-commission-amount-${order.id}`}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            💡 First orders typically use Flat Fee ($500). Reorders use Auto (6-month rule).
          </p>
        </div>

        <Button
          onClick={onConfirmMatch}
          disabled={selectedStores.length === 0 || isPending}
          className="w-full"
          data-testid="button-confirm-match"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Matching...
            </>
          ) : selectedStores.length > 0 ? (
            `Match Order to ${selectedStores.length} Store${selectedStores.length > 1 ? "s" : ""}`
          ) : (
            "Select Store(s) to Match"
          )}
        </Button>

        {selectedStores.length > 0 && (
          <div className="p-3 bg-primary/10 border-2 border-primary rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Selected Stores ({selectedStores.length})</h4>
              <Button variant="ghost" size="sm" onClick={onClearSelections} data-testid="button-clear-selections">
                Clear All
              </Button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedStores.map((store) => (
                <div key={store.link} className="text-sm flex items-center gap-2">
                  <span className="text-primary">✓</span>
                  <span className="flex-1">{store.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedStores.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="dba-name">DBA / Umbrella Company Name (Optional)</Label>
            <Input
              id="dba-name"
              placeholder="e.g., Lift Cannabis Co"
              value={dbaName}
              onChange={(e) => onDbaNameChange(e.target.value)}
              data-testid="input-dba-name"
            />
            <p className="text-xs text-muted-foreground">
              This DBA will be assigned to all {selectedStores.length} selected store(s)
            </p>
          </div>
        )}

        {suggestions.length > 0 && !showAllClients && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Smart Suggestions</h4>
            </div>
            <SuggestionList
              suggestions={suggestions}
              isStoreSelected={isStoreSelected}
              onToggleStoreSelection={onToggleStoreSelection}
              prefix="suggestion"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShowAllClientsChange(true)}
              className="w-full"
              data-testid="button-show-all-clients"
            >
              <Search className="h-4 w-4 mr-2" />
              Search More Stores
            </Button>
          </div>
        )}

        {(showAllClients || suggestions.length === 0) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search stores by name, company, email..."
                value={clientSearch}
                onChange={(e) => onClientSearchChange(e.target.value)}
                data-testid="input-search-clients"
              />
            </div>

            {suggestions.length > 0 && (
              <SuggestionList
                suggestions={suggestions}
                isStoreSelected={isStoreSelected}
                onToggleStoreSelection={onToggleStoreSelection}
                prefix="search-result"
              />
            )}

            {showAllClients && suggestions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onShowAllClientsChange(false);
                  onClientSearchChange("");
                }}
                className="w-full"
              >
                Back to Suggestions
              </Button>
            )}
          </div>
        )}
      </div>
    </DialogContent>
  );
}

type SuggestionListProps = {
  suggestions: NonNullable<MatchSuggestionsResponse["suggestions"]>;
  isStoreSelected: (link: string) => boolean;
  onToggleStoreSelection: (link: string, name: string) => void;
  prefix: string;
};

function SuggestionList({ suggestions, isStoreSelected, onToggleStoreSelection, prefix }: SuggestionListProps) {
  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.link}
          className={`p-3 rounded-md border-2 transition-all hover-elevate ${
            isStoreSelected(suggestion.link) ? "border-primary bg-primary/10" : "border-border"
          }`}
          data-testid={`${prefix}-${suggestion.link}`}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isStoreSelected(suggestion.link)}
              onCheckedChange={() => onToggleStoreSelection(suggestion.link, suggestion.displayName)}
              data-testid={`checkbox-${prefix}-${suggestion.link}`}
            />
            <div className="flex-1">
              <p className="font-medium">{suggestion.displayName}</p>
              {suggestion.displayInfo && <p className="text-sm text-muted-foreground">{suggestion.displayInfo}</p>}
              {suggestion.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {suggestion.reasons.map((reason, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {reason}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Badge variant={suggestion.score >= 80 ? "default" : "secondary"} className="ml-2">
              {Math.round(suggestion.score)}% match
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
