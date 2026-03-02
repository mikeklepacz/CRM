import { ChevronDown, ChevronUp, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import type { FollowUpClient } from "./types";
import { getClientName, getClientPhone } from "./utils";

interface FollowUpSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  countTestId: string;
  filterTestId: string;
  sliderTestId: string;
  daysLabel: string;
  daysRange: number[];
  onDaysRangeChange: (value: number[]) => void;
  clients: FollowUpClient[];
  noteButtonTestIdPrefix: string;
  callButtonTestIdPrefix: string;
  dateText: (client: FollowUpClient) => string;
  onOpenStoreDetails: (client: FollowUpClient) => void;
  onFollowUpCall: (client: FollowUpClient) => void;
}

export function FollowUpSection({
  open,
  onOpenChange,
  title,
  description,
  countTestId,
  filterTestId,
  sliderTestId,
  daysLabel,
  daysRange,
  onDaysRangeChange,
  clients,
  noteButtonTestIdPrefix,
  callButtonTestIdPrefix,
  dateText,
  onOpenStoreDetails,
  onFollowUpCall,
}: FollowUpSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card className="p-4">
        <CollapsibleTrigger className="w-full" asChild>
          <div className="flex items-center justify-between cursor-pointer hover-elevate p-2 rounded-md" data-testid={filterTestId}>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-lg px-3 py-1" data-testid={countTestId}>
                {clients.length}
              </Badge>
              {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-3">
          <div className="space-y-2 p-3 bg-muted/30 rounded-md">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{daysLabel}</span>
              <span className="text-muted-foreground">
                {daysRange[0]} - {daysRange[1]} days
              </span>
            </div>
            <Slider value={daysRange} onValueChange={onDaysRangeChange} min={1} max={365} step={1} className="w-full" data-testid={sliderTestId} />
          </div>

          {clients.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No clients match these criteria</p>
          ) : (
            <div className="space-y-2">
              {clients.map((client, idx) => (
                <Card key={client.id} className="p-3 hover-elevate" data-testid={`${filterTestId}-client-${idx}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{getClientName(client)}</h4>
                      <p className="text-sm text-muted-foreground">{getClientPhone(client)}</p>
                      <p className="text-xs text-muted-foreground mt-1">{dateText(client)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenStoreDetails(client);
                        }}
                        data-testid={`${noteButtonTestIdPrefix}-${idx}`}
                        className="h-auto py-2 flex flex-col items-center gap-0"
                      >
                        <span className="text-xs leading-tight">Notes</span>
                        <span className="text-xs leading-tight">Follow up</span>
                      </Button>
                      <Button size="sm" onClick={() => onFollowUpCall(client)} data-testid={`${callButtonTestIdPrefix}-${idx}`}>
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
