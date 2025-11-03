import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { detectDuplicates, smartSelectDuplicates, selectKeeper, countNonEmptyFields, type DuplicateGroup, type StoreRecord, type StatusHierarchy } from "@shared/duplicateUtils";
import { useQuery } from "@tanstack/react-query";

interface DuplicateFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreRecord[];
  onDuplicatesDeleted?: () => void;
}

export function DuplicateFinderDialog({ open, onOpenChange, stores, onDuplicatesDeleted }: DuplicateFinderDialogProps) {
  const { toast } = useToast();
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [deletionMap, setDeletionMap] = useState<Map<string, string>>(new Map()); // deleteLink -> keeperLink
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch status hierarchy
  const { data: statusHierarchy } = useQuery<StatusHierarchy>({
    queryKey: ['/api/statuses/hierarchy'],
    enabled: open,
  });

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

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
        const groups = detectDuplicates(stores, 0.75);
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
  }, [open, stores, toast]);

  // Reset selection when duplicateGroups change or dialog closes
  useEffect(() => {
    setSelectedForDeletion(new Set());
    setDeletionMap(new Map());
  }, [duplicateGroups, open]);

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
      const deletions = smartSelectDuplicates(duplicateGroups, statusHierarchy);
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

  const toggleSelection = (link: string, groupIndex: number) => {
    if (!statusHierarchy) return;

    try {
      const newSelection = new Set(selectedForDeletion);
      const newDeletionMap = new Map(deletionMap);
      
      if (newSelection.has(link)) {
        newSelection.delete(link);
        newDeletionMap.delete(link);
      } else {
        // Find the keeper for this group
        const group = duplicateGroups[groupIndex];
        const keeper = selectKeeper(group.stores, statusHierarchy);
        
        // Don't allow selecting the keeper
        if (link === keeper.Link) {
          toast({
            title: "Cannot Delete Keeper",
            description: "This store is marked as the keeper (has most complete data or best status)",
            variant: "destructive",
          });
          return;
        }
        
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
              {detectionResult.hasError
                ? 'Error analyzing store data'
                : `Found ${duplicateGroups.length} duplicate ${duplicateGroups.length === 1 ? 'group' : 'groups'} with ${totalDuplicates} total stores`
              }
            </DialogDescription>
          </DialogHeader>

          {detectionResult.hasError ? (
            <div className="py-12 text-center text-destructive">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Detection Failed</p>
              <p className="text-sm mt-2 text-muted-foreground">
                Failed to analyze store data for duplicates. Some data may be malformed.
              </p>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mt-4"
                data-testid="button-close-error"
              >
                Close
              </Button>
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
                  <span className="text-sm text-muted-foreground">
                    (Selects entries with less information)
                  </span>
                </div>
                <Badge variant="secondary" data-testid="badge-selection-count">
                  {selectedForDeletion.size} selected
                </Badge>
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {duplicateGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border rounded-lg p-4 space-y-3" data-testid={`duplicate-group-${groupIndex}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" data-testid={`badge-group-${groupIndex}-count`}>
                            {group.stores.length} duplicates
                          </Badge>
                          <span className="text-sm text-muted-foreground">{group.reason}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        {group.stores.map((store, storeIndex) => {
                          const fieldCount = countNonEmptyFields(store);
                          const isSelected = selectedForDeletion.has(store.Link);
                          const isKeeper = statusHierarchy && selectKeeper(group.stores, statusHierarchy).Link === store.Link;
                          const isClaimed = store.Agent && store.Agent.trim() !== '';
                          
                          return (
                            <div
                              key={store.Link}
                              className={`flex items-start gap-3 p-3 rounded border ${
                                isSelected ? 'bg-destructive/10 border-destructive' : 
                                isKeeper ? 'bg-primary/5 border-primary' : 
                                'hover-elevate'
                              }`}
                              data-testid={`duplicate-store-${groupIndex}-${storeIndex}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(store.Link, groupIndex)}
                                disabled={isKeeper}
                                data-testid={`checkbox-store-${groupIndex}-${storeIndex}`}
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{store.Name}</p>
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
                                  <Badge variant="outline" data-testid={`badge-field-count-${groupIndex}-${storeIndex}`}>
                                    {fieldCount} fields
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
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
                  ))}
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
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
