import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SearchRefreshControlsProps {
  searchTerm: string;
  isLoading: boolean;
  isRefreshing: boolean;
  showMyStoresOnly: boolean;
  showUnclaimedOnly: boolean;
  textColor?: string;
  actionButtonColor?: string;
  onSearchTermChange: (value: string) => void;
  onRefresh: () => void;
  onToggleMyStoresOnly: (checked: boolean) => void;
  onToggleUnclaimedOnly: (checked: boolean) => void;
}

export function SearchRefreshControls({
  searchTerm,
  isLoading,
  isRefreshing,
  showMyStoresOnly,
  showUnclaimedOnly,
  textColor,
  actionButtonColor,
  onSearchTermChange,
  onRefresh,
  onToggleMyStoresOnly,
  onToggleUnclaimedOnly,
}: SearchRefreshControlsProps) {
  return (
    <div className="flex flex-col gap-2 flex-1 min-w-[300px]">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search all columns..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className="flex-1 max-w-md"
          data-testid="input-search"
        />
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isLoading || isRefreshing}
          data-testid="button-refresh"
          style={actionButtonColor ? { backgroundColor: actionButtonColor, borderColor: actionButtonColor } : undefined}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="my-stores-only"
            checked={showMyStoresOnly}
            onCheckedChange={(checked) => onToggleMyStoresOnly(checked === true)}
            data-testid="checkbox-my-stores-only"
          />
          <Label
            htmlFor="my-stores-only"
            className="text-sm font-medium cursor-pointer"
            style={textColor ? { color: textColor } : undefined}
          >
            My Stores Only
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="unclaimed-only"
            checked={showUnclaimedOnly}
            onCheckedChange={(checked) => onToggleUnclaimedOnly(checked === true)}
            data-testid="checkbox-unclaimed-only"
          />
          <Label
            htmlFor="unclaimed-only"
            className="text-sm font-medium cursor-pointer"
            style={textColor ? { color: textColor } : undefined}
          >
            Show Unclaimed Shops
          </Label>
        </div>
      </div>
    </div>
  );
}
