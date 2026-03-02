import { Copy, Store } from "lucide-react";
import type { FranchiseGroup } from "@shared/franchiseUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FranchiseControlsProps {
  selectedFranchise: FranchiseGroup | null;
  isAdmin: boolean;
  franchiseButtonColor?: string;
  onOpenFranchiseFinder: () => void;
  onClearFranchise: () => void;
  onOpenDuplicateFinder: () => void;
}

export function FranchiseControls({
  selectedFranchise,
  isAdmin,
  franchiseButtonColor,
  onOpenFranchiseFinder,
  onClearFranchise,
  onOpenDuplicateFinder,
}: FranchiseControlsProps) {
  return (
    <>
      {selectedFranchise ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onOpenFranchiseFinder}
            data-testid="button-franchise-finder"
            style={franchiseButtonColor ? { backgroundColor: franchiseButtonColor, borderColor: franchiseButtonColor } : undefined}
          >
            <Store className="mr-2 h-4 w-4" />
            {selectedFranchise.brandName}
            <Badge variant="secondary" className="ml-2">
              {selectedFranchise.locations.length}
            </Badge>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFranchise}
            data-testid="button-clear-franchise"
          >
            Clear
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={onOpenFranchiseFinder}
          data-testid="button-franchise-finder"
          style={franchiseButtonColor ? { backgroundColor: franchiseButtonColor, borderColor: franchiseButtonColor } : undefined}
        >
          <Store className="mr-2 h-4 w-4" />
          Find Franchises
        </Button>
      )}

      {isAdmin && (
        <Button
          variant="outline"
          onClick={onOpenDuplicateFinder}
          data-testid="button-dups"
        >
          <Copy className="mr-2 h-4 w-4" />
          DUPS
        </Button>
      )}
    </>
  );
}
