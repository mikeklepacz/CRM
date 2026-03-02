import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MatchedStore } from "./types";
import { getConfidenceBadgeVariant, getConfidenceLabel } from "./confidence";

interface MatchedStoresListProps {
  stores: MatchedStore[];
  selectedMatches: Set<string>;
  onToggleMatch: (link: string) => void;
}

export const MatchedStoresList = ({ stores, selectedMatches, onToggleMatch }: MatchedStoresListProps) => {
  if (stores.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-hidden">
      <h3 className="text-sm font-semibold">Matched Stores ({stores.length})</h3>
      <ScrollArea className="flex-1 border rounded-md">
        <div className="p-4 space-y-3">
          {stores.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 border rounded-md hover-elevate"
              data-testid={`matched-store-${idx}`}
            >
              <Checkbox
                checked={selectedMatches.has(item.match.link)}
                onCheckedChange={() => onToggleMatch(item.match.link)}
                data-testid={`checkbox-match-${idx}`}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.match.name}</span>
                  <Badge variant={getConfidenceBadgeVariant(item.confidence)}>
                    {getConfidenceLabel(item.confidence)} ({item.confidence}%)
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.match.address && <div>{item.match.address}</div>}
                  <div>
                    {item.match.city}, {item.match.state}
                  </div>
                  {item.match.phone && <div>{item.match.phone}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
