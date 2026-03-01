import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Info, Sparkles } from "lucide-react";

export function StoreDetailsDialogHeader(props: any) {
  const p = props;
  const claimedAgentName =
    p.row?.["Agent Name"] || p.row?.["agent name"] || p.row?.Agent || p.row?.agent || "";
  const isClaimed = typeof claimedAgentName === "string" ? claimedAgentName.trim().length > 0 : !!claimedAgentName;

  return (
    <DialogHeader>
      <DialogTitle className="flex items-center justify-center gap-3 w-full">
        {p.prevStore !== null || p.nextStore !== null ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 shrink-0"
              disabled={!p.prevStore}
              style={{ visibility: p.prevStore ? "visible" : "hidden" }}
              onClick={() => {
                if (p.prevStore && p.onNavigateToStore) {
                  const hasChanges = Object.keys(p.formData).some(
                    (k) => p.formData[k] !== p.initialData[k],
                  );
                  if (hasChanges) {
                    p.saveMutation.mutate({ closeDialog: false });
                  }
                  p.onNavigateToStore(p.prevStore);
                }
              }}
              data-testid="button-prev-store"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs max-w-[120px] truncate hidden sm:inline">
                {p.getStoreName(p.prevStore)}
              </span>
            </Button>
            <span className="truncate text-center flex-1 min-w-0">{p.formData.name || "Store Details"}</span>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 shrink-0"
              disabled={!p.nextStore}
              style={{ visibility: p.nextStore ? "visible" : "hidden" }}
              onClick={() => {
                if (p.nextStore && p.onNavigateToStore) {
                  const hasChanges = Object.keys(p.formData).some(
                    (k) => p.formData[k] !== p.initialData[k],
                  );
                  if (hasChanges) {
                    p.saveMutation.mutate({ closeDialog: false });
                  }
                  p.onNavigateToStore(p.nextStore);
                }
              }}
              data-testid="button-next-store"
            >
              <span className="text-xs max-w-[120px] truncate hidden sm:inline">
                {p.getStoreName(p.nextStore)}
              </span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <span className="truncate text-center flex-1">{p.formData.name || "Store Details"}</span>
        )}
      </DialogTitle>
      <DialogDescription className="sr-only">Store details</DialogDescription>
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-assistant"
              checked={p.showAssistant}
              onCheckedChange={(checked) => p.handleShowAssistantChange(!!checked)}
              data-testid="checkbox-show-assistant"
            />
            <Label
              htmlFor="show-assistant"
              className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Show AI Assistant
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-load-script"
              checked={p.autoLoadScript}
              onCheckedChange={(checked) => p.handleAutoLoadScriptChange(!!checked)}
              data-testid="checkbox-auto-load-script"
            />
            <Label
              htmlFor="auto-load-script"
              className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              Auto Load Script
            </Label>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="claimed"
              checked={isClaimed}
              onCheckedChange={async (checked) => {
                if (!checked) {
                  await p.handleUnclaim();
                }
              }}
              data-testid="checkbox-claimed"
            />
            <Label
              htmlFor="claimed"
              className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              Claimed
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 opacity-50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Uncheck to release this store back to the pool.</p>
                  <p className="text-xs">Commission/history rows are preserved when needed; Agent Name is cleared.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="listing-active"
              checked={p.formData.open === "TRUE" || p.formData.open === "true"}
              onCheckedChange={(checked) => p.handleInputChange("open", checked ? "TRUE" : "FALSE")}
              data-testid="checkbox-listing-active"
            />
            <Label htmlFor="listing-active" className="text-sm font-medium cursor-pointer whitespace-nowrap">
              Listing Active
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="hide-listing"
              checked={false}
              onCheckedChange={(checked) => {
                if (checked && p.handleHideListing) {
                  p.handleHideListing();
                }
              }}
              data-testid="checkbox-hide-listing"
            />
            <Label htmlFor="hide-listing" className="text-sm font-medium cursor-pointer whitespace-nowrap">
              Hide
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="automated-line"
              checked={p.formData.automated_line === "TRUE" || p.formData.automated_line === "true"}
              onCheckedChange={(checked) => p.handleInputChange("automated_line", checked ? "TRUE" : "FALSE")}
              data-testid="checkbox-automated-line"
            />
            <Label
              htmlFor="automated-line"
              className="text-sm font-medium cursor-pointer whitespace-nowrap flex items-center gap-1"
            >
              Automated Line
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 opacity-50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Indicates this phone number reaches an IVR system or voicemail.</p>
                  <p className="text-xs">Can be detected automatically during AI calls or set manually.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
          </div>
        </div>
      </div>
    </DialogHeader>
  );
}
