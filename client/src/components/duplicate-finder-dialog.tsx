import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Sparkles, AlertTriangle, CheckCircle2, ExternalLink, Ban, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { detectDuplicates, smartSelectDuplicates, selectKeeper, countNonEmptyFields, type DuplicateGroup, type StoreRecord, type StatusHierarchy } from "@shared/duplicateUtils";
import { useQuery } from "@tanstack/react-query";

interface DuplicateFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreRecord[];
  onDuplicatesDeleted?: () => void;
}

// Helper to get city/state from store data
function getCityState(store: StoreRecord): string {
  // First try to use City and State fields directly
  if (store.City && store.State) {
    return `${store.City}, ${store.State}`;
  }
  // Fallback: try to parse from address if it's comma-separated
  if (store.Address) {
    const parts = store.Address.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const city = parts[parts.length - 2];
      const stateZip = parts[parts.length - 1];
      const state = stateZip.split(' ')[0];
      return `${city}, ${state}`;
    }
  }
  return '';
}

export function DuplicateFinderDialog({ open, onOpenChange, stores, onDuplicatesDeleted }: DuplicateFinderDialogProps) {
  const { toast } = useToast();
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [deletionMap, setDeletionMap] = useState<Map<string, string>>(new Map()); // deleteLink -> keeperLink
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markedAsNotDuplicate, setMarkedAsNotDuplicate] = useState<Set<string>>(new Set()); // stores marked as not duplicates
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [showCanadaOnly, setShowCanadaOnly] = useState(false);

  // Fetch status hierarchy
  const { data: statusHierarchy } = useQuery<StatusHierarchy>({
    queryKey: ['/api/statuses/hierarchy'],
    enabled: open,
  });

  // Fetch non-duplicate pairs
  const { data: nonDuplicatePairs } = useQuery<Array<{link1: string, link2: string}>>({
    queryKey: ['/api/non-duplicates'],
    enabled: open,
  });

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Helper to check if a state is a Canadian province
  const isCanadianProvince = (state: string) => {
    const canadianProvinces = [
      'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
      'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
      'Nova Scotia', 'Northwest Territories', 'Nunavut', 'Ontario', 'Prince Edward Island',
      'Quebec', 'Saskatchewan', 'Yukon'
    ];
    return canadianProvinces.includes(state);
  };

  // Extract all unique states from duplicate groups
  const allStates = useMemo(() => {
    const states = new Set<string>();
    duplicateGroups.forEach(group => {
      group.stores.forEach(store => {
        if (store.State) {
          states.add(store.State);
        }
      });
    });
    return Array.from(states).sort();
  }, [duplicateGroups]);

  // Count stores by state
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    duplicateGroups.forEach(group => {
      group.stores.forEach(store => {
        if (store.State) {
          counts[store.State] = (counts[store.State] || 0) + 1;
        }
      });
    });
    return counts;
  }, [duplicateGroups]);

  // Filter duplicate groups by selected states
  const filteredDuplicateGroups = useMemo(() => {
    if (selectedStates.length === 0) {
      return duplicateGroups;
    }
    return duplicateGroups.filter(group =>
      group.stores.some(store => store.State && selectedStates.includes(store.State))
    );
  }, [duplicateGroups, selectedStates]);

  const handleStateChange = (state: string, isChecked: boolean) => {
    setSelectedStates(prev =>
      isChecked ? [...prev, state] : prev.filter(s => s !== state)
    );
  };

  // Detect duplicates when dialog opens - deferred to avoid blocking UI
  useEffect(() => {
    if (!open || stores.length === 0) {
      setDuplicateGroups([]);
      return;
    }

    setIsDetecting(true);

    // Defer detection to allow dialog to open smoothly
    const timeoutId = setTimeout(() => {
      try {
        const groups = detectDuplicates(stores, 0.75, nonDuplicatePairs);
        setDuplicateGroups(groups);
      } catch (error: any) {
        console.error('[DuplicateFinder] Error detecting duplicates:', error);
        toast({
          title: "Detection Error",
          description: "Failed to analyze store data for duplicates. Some data may be malformed.",
          variant: "destructive",
        });
        setDuplicateGroups([]);
      } finally {
        setIsDetecting(false);
      }
    }, 4);

    return () => clearTimeout(timeoutId);
  }, [open, stores, toast, nonDuplicatePairs]);

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedForDeletion(new Set());
      setDeletionMap(new Map());
    }
  }, [open]);

  const handleSmartSelect = () => {
    if (!statusHierarchy) {
      toast({
        title: "Loading",
        description: "Status hierarchy is still loading...",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use filtered groups so smart select only selects from visible groups
      const deletions = smartSelectDuplicates(filteredDuplicateGroups, statusHierarchy);
      const deleteSet = new Set(deletions.map(d => d.deleteLink));
      const deleteToKeeper = new Map(deletions.map(d => [d.deleteLink, d.keepLink]));
      
      setSelectedForDeletion(deleteSet);
      setDeletionMap(deleteToKeeper);
      
      toast({
        title: "Smart Selection Complete",
        description: `Selected ${deletions.length} duplicates (keeping claimed stores with better status)`,
      });
    } catch (error: any) {
      console.error('[DuplicateFinder] Error in smart select:', error);
      toast({
        title: "Selection Error",
        description: "Failed to automatically select duplicates. Please try selecting manually.",
        variant: "destructive",
      });
    }
  };

  const toggleSelection = (link: string, group: DuplicateGroup) => {
    if (!statusHierarchy) return;

    try {
      const newSelection = new Set(selectedForDeletion);
      const newDeletionMap = new Map(deletionMap);
      
      if (newSelection.has(link)) {
        newSelection.delete(link);
        newDeletionMap.delete(link);
      } else {
        // Find the keeper for this group
        const keeper = selectKeeper(group.stores, statusHierarchy);
        
        newSelection.add(link);
        newDeletionMap.set(link, keeper.Link);
      }
      
      setSelectedForDeletion(newSelection);
      setDeletionMap(newDeletionMap);
    } catch (error: any) {
      console.error('[DuplicateFinder] Error toggling selection:', error);
      toast({
        title: "Selection Error",
        description: "Failed to toggle selection for this store",
        variant: "destructive",
      });
    }
  };

  const toggleNotDuplicate = (link: string) => {
    const newMarked = new Set(markedAsNotDuplicate);
    if (newMarked.has(link)) {
      newMarked.delete(link);
    } else {
      newMarked.add(link);
    }
    setMarkedAsNotDuplicate(newMarked);
  };

  const handleSaveAllNotDuplicates = async () => {
    if (markedAsNotDuplicate.size === 0) {
      toast({
        title: "No Markings",
        description: "Please mark at least one store as 'Not a Duplicate'",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // For each marked store, create pairs with all other stores in its group
      const pairsToCreate: Array<{link1: string, link2: string}> = [];
      
      for (const group of duplicateGroups) {
        const groupLinks = group.stores.map(s => s.Link);
        const markedInGroup = groupLinks.filter(link => markedAsNotDuplicate.has(link));
        
        // For each marked store in this group, pair it with all other stores in the group
        for (const markedLink of markedInGroup) {
          for (const otherLink of groupLinks) {
            if (markedLink !== otherLink) {
              // Add pair (ensure no duplicates)
              const pair = [markedLink, otherLink].sort();
              if (!pairsToCreate.some(p => p.link1 === pair[0] && p.link2 === pair[1])) {
                pairsToCreate.push({ link1: pair[0], link2: pair[1] });
              }
            }
          }
        }
      }

      // Batch create all pairs
      for (const pair of pairsToCreate) {
        await apiRequest('POST', '/api/non-duplicates', pair);
      }

      // Invalidate cache and refetch
      await queryClient.invalidateQueries({ queryKey: ['/api/non-duplicates'] });
      const updatedPairs = await queryClient.fetchQuery<Array<{link1: string, link2: string}>>({
        queryKey: ['/api/non-duplicates'],
      });

      // Recompute groups
      const newGroups = detectDuplicates(stores, 0.75, updatedPairs);
      setDuplicateGroups(newGroups);
      setMarkedAsNotDuplicate(new Set());

      toast({
        title: "Saved",
        description: `Marked ${markedAsNotDuplicate.size} stores as not duplicates. They won't appear in these groups again.`,
      });
    } catch (error: any) {
      console.error('[DuplicateFinder] Error saving not duplicates:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save markings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedForDeletion.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one duplicate to delete",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!statusHierarchy) return;
    
    setIsDeleting(true);
    setShowConfirmDialog(false);
    
    try {
      const linksToDelete = Array.from(selectedForDeletion);
      
      // Delete each store via API with merging
      for (const link of linksToDelete) {
        const keeperLink = deletionMap.get(link);
        await apiRequest('DELETE', `/api/store/${encodeURIComponent(link)}`, {
          keeperLink,
          statusHierarchy,
        });
      }
      
      toast({
        title: "Success",
        description: `Deleted ${linksToDelete.length} duplicate ${linksToDelete.length === 1 ? 'store' : 'stores'} and merged data`,
      });
      
      // Clear selection and close dialog
      setSelectedForDeletion(new Set());
      setDeletionMap(new Map());
      onOpenChange(false);
      
      // Trigger refresh
      if (onDuplicatesDeleted) {
        onDuplicatesDeleted();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete duplicates",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.stores.length, 0);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Duplicate Store Finder</DialogTitle>
            <DialogDescription>
              {isDetecting
                ? 'Analyzing stores...'
                : selectedStates.length > 0
                  ? `Showing ${filteredDuplicateGroups.length} of ${duplicateGroups.length} duplicate groups (filtered by state)`
                  : `Found ${duplicateGroups.length} duplicate ${duplicateGroups.length === 1 ? 'group' : 'groups'} with ${totalDuplicates} total stores`
              }
            </DialogDescription>
          </DialogHeader>

          {isDetecting ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-lg font-medium">Analyzing stores...</p>
              <p className="text-sm mt-2">This may take a moment for large datasets</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No duplicates found</p>
              <p className="text-sm mt-2">Your store data looks clean!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 pb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSmartSelect}
                    data-testid="button-smart-select"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Smart Select
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-state-filter">
                        <Settings2 className="mr-2 h-4 w-4" />
                        {selectedStates.length > 0
                          ? `${selectedStates.length} state(s)`
                          : "Filter by State"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Filter by State</h4>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStates(allStates)}
                              data-testid="button-select-all-states"
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStates([])}
                              data-testid="button-clear-all-states"
                            >
                              None
                            </Button>
                          </div>
                        </div>

                        {/* Canada Checkbox */}
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                          <Checkbox
                            id="canada-toggle"
                            checked={showCanadaOnly}
                            onCheckedChange={(checked) => {
                              setShowCanadaOnly(!!checked);
                            }}
                            data-testid="checkbox-canada-toggle"
                          />
                          <Label
                            htmlFor="canada-toggle"
                            className="text-sm cursor-pointer flex-1 font-medium"
                          >
                            Canada
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            ({allStates.filter(isCanadianProvince).reduce((sum, state) => sum + (stateCounts[state] || 0), 0)} stores)
                          </span>
                        </div>

                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {allStates
                              .filter(state => showCanadaOnly ? isCanadianProvince(state) : !isCanadianProvince(state))
                              .map((state) => (
                              <div key={state} className="flex items-center gap-2">
                                <Checkbox
                                  id={`state-${state}`}
                                  checked={selectedStates.includes(state)}
                                  onCheckedChange={(checked) => handleStateChange(state, checked as boolean)}
                                  data-testid={`checkbox-state-${state}`}
                                />
                                <Label
                                  htmlFor={`state-${state}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {state}
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  ({stateCounts[state] || 0})
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  {markedAsNotDuplicate.size > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveAllNotDuplicates}
                      disabled={isSaving}
                      data-testid="button-save-all-not-duplicates"
                    >
                      <Ban className="mr-2 h-3 w-3" />
                      {isSaving ? 'Saving...' : `Save All (${markedAsNotDuplicate.size})`}
                    </Button>
                  )}
                  <Badge variant="secondary" data-testid="badge-selection-count">
                    {selectedForDeletion.size} selected for deletion
                  </Badge>
                </div>
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {filteredDuplicateGroups.map((group, groupIndex) => {
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
                            const isClaimed = store.Agent && store.Agent.trim() !== '';
                            const cityState = getCityState(store);
                            
                            return (
                              <div
                                key={store.Link}
                                className={`flex items-start gap-3 p-3 rounded border ${
                                  isSelected ? 'bg-destructive/10 border-destructive' : 
                                  isKeeper ? 'bg-primary/5 border-primary' : 
                                  'hover-elevate'
                                } cursor-pointer`}
                                data-testid={`duplicate-store-${groupIndex}-${storeIndex}`}
                                onClick={() => toggleSelection(store.Link, group)}
                              >
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelection(store.Link, group)}
                                    data-testid={`checkbox-store-${groupIndex}-${storeIndex}`}
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{store.Name}</p>
                                      {cityState && (
                                        <span className="text-xs text-muted-foreground">({cityState})</span>
                                      )}
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
                                          onCheckedChange={() => toggleNotDuplicate(store.Link)}
                                          data-testid={`checkbox-not-duplicate-${groupIndex}-${storeIndex}`}
                                        />
                                        <label className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer" onClick={() => toggleNotDuplicate(store.Link)}>
                                          Not a Duplicate
                                        </label>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    {store.Link && (
                                      <p>
                                        🔗{' '}
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
                  })}
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={selectedForDeletion.size === 0 || isDeleting}
                  data-testid="button-delete-selected"
                >
                  {isDeleting ? (
                    <>Deleting...</>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete {selectedForDeletion.size} {selectedForDeletion.size === 1 ? 'Store' : 'Stores'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion & Data Merge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedForDeletion.size} duplicate {selectedForDeletion.size === 1 ? 'store' : 'stores'}? 
              <br /><br />
              <strong>What will happen:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Data from duplicates will be merged into the keeper stores</li>
                <li>Commission Tracker references will be updated to the keeper stores</li>
                <li>Duplicate rows will be permanently deleted from the Store Database</li>
              </ul>
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-confirm-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
              data-primary="true"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
