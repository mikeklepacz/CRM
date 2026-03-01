import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export function StoreDetailsDbaManagementSection(props: any) {
  const p = props;

  const shouldShow =
    (p.childLocations && p.childLocations.children && p.childLocations.children.length > 0) || p.formData.parent_link;

  if (!shouldShow) {
    return null;
  }

  return (
    <AccordionItem value="dba-management" data-testid="accordion-item-dba-management">
      <AccordionTrigger className="text-lg font-semibold" data-testid="trigger-dba-management">
        DBA Management
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 pt-2">
          {p.formData.parent_link && (
            <div className="p-3 bg-muted/30 rounded-md space-y-2">
              <Label className="text-sm font-medium">This is a child location</Label>
              <p className="text-xs text-muted-foreground">
                Parent: <span className="font-medium">{p.formData.dba || "Unknown"}</span>
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/dba/unlink-children", {
                      parentLink: p.formData.parent_link,
                      childLinks: [p.currentStoreLink],
                    });

                    p.toast({
                      title: "Success",
                      description: "Removed from parent DBA",
                    });

                    await p.queryClient.invalidateQueries({ queryKey: ["merged-data"] });
                    await p.refetch();
                    await p.refetchChildren();
                  } catch (error: any) {
                    p.toast({
                      title: "Error",
                      description: error.message || "Failed to unlink from parent",
                      variant: "destructive",
                    });
                  }
                }}
                data-testid="button-unlink-from-parent"
              >
                Remove from Parent DBA
              </Button>
            </div>
          )}

          {p.childLocations && p.childLocations.children && p.childLocations.children.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Child Locations ({p.childLocations.children.length})</Label>
                {p.childLocations.headOffice && (
                  <Badge variant="secondary" className="text-xs">
                    Head Office: {p.childLocations.headOffice.Name || p.childLocations.headOffice.name}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                {p.childLocations.children.map((child: any) => {
                  const childName = child.Name || child.name || "";
                  const childLink = child.Link || child.link || "";
                  const childAddress = child.Address || child.address || "";
                  const childCity = child.City || child.city || "";
                  const childState = child.State || child.state || "";

                  return (
                    <div
                      key={childLink}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                      data-testid={`child-location-${childLink}`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{childName}</p>
                        {childAddress && (
                          <p className="text-xs text-muted-foreground">
                            {childAddress}, {childCity}, {childState}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {p.childLocations.headOfficeLink === childLink && (
                          <Badge variant="default" className="text-xs">
                            HQ
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!confirm(`Remove "${childName}" from this DBA?`)) return;

                            try {
                              await apiRequest("POST", "/api/dba/unlink-children", {
                                parentLink: p.currentStoreLink,
                                childLinks: [childLink],
                              });

                              p.toast({
                                title: "Success",
                                description: `Removed ${childName} from DBA`,
                              });

                              await p.queryClient.invalidateQueries({ queryKey: ["merged-data"] });
                              await p.refetch();
                              await p.refetchChildren();
                            } catch (error: any) {
                              p.toast({
                                title: "Error",
                                description: error.message || "Failed to remove child location",
                                variant: "destructive",
                              });
                            }
                          }}
                          data-testid={`button-remove-child-${childLink}`}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
