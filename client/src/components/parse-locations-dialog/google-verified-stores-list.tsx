import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleVerifiedStore } from "./types";

interface GoogleVerifiedStoresListProps {
  stores: GoogleVerifiedStore[];
  selectedGoogleStores: Set<string>;
  onToggleGoogleStore: (placeId: string) => void;
}

export const GoogleVerifiedStoresList = ({
  stores,
  selectedGoogleStores,
  onToggleGoogleStore,
}: GoogleVerifiedStoresListProps) => {
  if (stores.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 flex-1 overflow-hidden">
      <h3 className="text-sm font-semibold text-blue-600">Google-Verified Stores ({stores.length})</h3>
      <ScrollArea className="flex-1 border rounded-md">
        <div className="p-4 space-y-3">
          {stores.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 border rounded-md hover-elevate bg-blue-50 dark:bg-blue-950/20"
              data-testid={`google-store-${idx}`}
            >
              <Checkbox
                checked={selectedGoogleStores.has(item.googleResult.place_id)}
                onCheckedChange={() => onToggleGoogleStore(item.googleResult.place_id)}
                data-testid={`checkbox-google-${idx}`}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-base">{item.googleResult.name}</div>
                    {item.parsed.name !== item.googleResult.name && (
                      <div className="text-xs text-muted-foreground italic">(Searched for: "{item.parsed.name}")</div>
                    )}
                  </div>
                  <Badge variant="default" className="bg-blue-600 shrink-0">
                    From Google
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <div className="font-medium">{item.googleResult.fullAddress}</div>
                  {item.googleResult.phone && <div>📞 {item.googleResult.phone}</div>}
                  {item.googleResult.website && (
                    <div className="truncate">
                      🌐{" "}
                      <a
                        href={item.googleResult.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        {item.googleResult.website}
                      </a>
                    </div>
                  )}
                  {item.googleResult.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <span>⭐ {item.googleResult.rating}</span>
                      {item.googleResult.user_ratings_total && (
                        <span className="text-xs">({item.googleResult.user_ratings_total} reviews)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
