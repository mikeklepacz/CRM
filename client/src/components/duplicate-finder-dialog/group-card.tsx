import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { countNonEmptyFields, selectKeeper, type DuplicateGroup, type StatusHierarchy } from "@shared/duplicateUtils";
import { getCityState } from "./utils";

interface GroupCardProps {
  group: DuplicateGroup;
  groupIndex: number;
  statusHierarchy?: StatusHierarchy;
  selectedForDeletion: Set<string>;
  markedAsNotDuplicate: Set<string>;
  onToggleSelection: (link: string, group: DuplicateGroup) => void;
  onToggleNotDuplicate: (link: string) => void;
}

export function DuplicateGroupCard({
  group,
  groupIndex,
  statusHierarchy,
  selectedForDeletion,
  markedAsNotDuplicate,
  onToggleSelection,
  onToggleNotDuplicate,
}: GroupCardProps) {
  return (
    <div key={groupIndex} className="border rounded-lg p-4 space-y-3" data-testid={`duplicate-group-${groupIndex}`}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" data-testid={`badge-group-${groupIndex}-count`}>
          {group.stores.length} duplicates
        </Badge>
        <span className="text-sm text-muted-foreground">{group.reason}</span>
      </div>

      <Separator />

      <div className="space-y-2">
        {group.stores.map((store, storeIndex) => {
          const fieldCount = countNonEmptyFields(store);
          const isSelected = selectedForDeletion.has(store.Link);
          const isKeeper = statusHierarchy && selectKeeper(group.stores, statusHierarchy).Link === store.Link;
          const isClaimed = store.Agent && store.Agent.trim() !== "";
          const cityState = getCityState(store);

          return (
            <div
              key={store.Link}
              className={`flex items-start gap-3 p-3 rounded border ${
                isSelected ? "bg-destructive/10 border-destructive" : isKeeper ? "bg-primary/5 border-primary" : "hover-elevate"
              } cursor-pointer`}
              data-testid={`duplicate-store-${groupIndex}-${storeIndex}`}
              onClick={() => onToggleSelection(store.Link, group)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(store.Link, group)}
                  data-testid={`checkbox-store-${groupIndex}-${storeIndex}`}
                />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{store.Name}</p>
                    {cityState && <span className="text-xs text-muted-foreground">({cityState})</span>}
                    {isKeeper && (
                      <Badge variant="default" className="text-xs" data-testid={`badge-keeper-${groupIndex}-${storeIndex}`}>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        KEEPER
                      </Badge>
                    )}
                    {isClaimed && (
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-claimed-${groupIndex}-${storeIndex}`}>
                        Claimed
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" data-testid={`badge-field-count-${groupIndex}-${storeIndex}`}>
                      {fieldCount} fields
                    </Badge>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={markedAsNotDuplicate.has(store.Link)}
                        onCheckedChange={() => onToggleNotDuplicate(store.Link)}
                        data-testid={`checkbox-not-duplicate-${groupIndex}-${storeIndex}`}
                      />
                      <label className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer" onClick={() => onToggleNotDuplicate(store.Link)}>
                        Not a Duplicate
                      </label>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  {store.Link && (
                    <p>
                      🔗{" "}
                      <a
                        href={store.Link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-leafly-${groupIndex}-${storeIndex}`}
                      >
                        Leafly Profile
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  )}
                  {store.Agent && <p>👤 {store.Agent}</p>}
                  {store.Status && <p>📊 {store.Status}</p>}
                  {store.Phone && <p>📞 {store.Phone}</p>}
                  {store.Address && <p>📍 {store.Address}</p>}
                  {store.Email && <p>✉️ {store.Email}</p>}
                  {store.Website && <p>🌐 {store.Website}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
