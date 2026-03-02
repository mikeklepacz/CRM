import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  detectDuplicates,
  smartSelectDuplicates,
  selectKeeper,
  type DuplicateGroup,
  type StoreRecord,
  type StatusHierarchy,
} from "@shared/duplicateUtils";
import { DuplicateFinderBody } from "./duplicate-finder-dialog/body";
import { ConfirmDeleteDialog } from "./duplicate-finder-dialog/confirm-delete-dialog";

interface DuplicateFinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: StoreRecord[];
  onDuplicatesDeleted?: () => void;
}

export function DuplicateFinderDialog({ open, onOpenChange, stores, onDuplicatesDeleted }: DuplicateFinderDialogProps) {
  const { toast } = useToast();
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [deletionMap, setDeletionMap] = useState<Map<string, string>>(new Map());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markedAsNotDuplicate, setMarkedAsNotDuplicate] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [showCanadaOnly, setShowCanadaOnly] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const { data: statusHierarchy } = useQuery<StatusHierarchy>({
    queryKey: ["/api/statuses/hierarchy"],
    enabled: open,
  });

  const { data: nonDuplicatePairs } = useQuery<Array<{ link1: string; link2: string }>>({
    queryKey: ["/api/non-duplicates"],
    enabled: open,
  });

  const allStates = useMemo(() => {
    const states = new Set<string>();
    duplicateGroups.forEach((group) => {
      group.stores.forEach((store) => {
        if (store.State) states.add(store.State);
      });
    });
    return Array.from(states).sort();
  }, [duplicateGroups]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    duplicateGroups.forEach((group) => {
      group.stores.forEach((store) => {
        if (store.State) counts[store.State] = (counts[store.State] || 0) + 1;
      });
    });
    return counts;
  }, [duplicateGroups]);

  const filteredDuplicateGroups = useMemo(() => {
    if (selectedStates.length === 0) return duplicateGroups;
    return duplicateGroups.filter((group) => group.stores.some((store) => store.State && selectedStates.includes(store.State)));
  }, [duplicateGroups, selectedStates]);

  useEffect(() => {
    if (!open || stores.length === 0) {
      setDuplicateGroups([]);
      return;
    }

    setIsDetecting(true);
    const timeoutId = setTimeout(() => {
      try {
        const groups = detectDuplicates(stores, 0.75, nonDuplicatePairs);
        setDuplicateGroups(groups);
      } catch (error: any) {
        console.error("[DuplicateFinder] Error detecting duplicates:", error);
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

  useEffect(() => {
    if (!open) {
      setSelectedForDeletion(new Set());
      setDeletionMap(new Map());
    }
  }, [open]);

  const handleStateChange = (state: string, isChecked: boolean) => {
    setSelectedStates((prev) => (isChecked ? [...prev, state] : prev.filter((s) => s !== state)));
  };

  const handleSmartSelect = () => {
    if (!statusHierarchy) {
      toast({ title: "Loading", description: "Status hierarchy is still loading...", variant: "destructive" });
      return;
    }

    try {
      const deletions = smartSelectDuplicates(filteredDuplicateGroups, statusHierarchy);
      setSelectedForDeletion(new Set(deletions.map((d) => d.deleteLink)));
      setDeletionMap(new Map(deletions.map((d) => [d.deleteLink, d.keepLink])));
      toast({
        title: "Smart Selection Complete",
        description: `Selected ${deletions.length} duplicates (keeping claimed stores with better status)`,
      });
    } catch (error: any) {
      console.error("[DuplicateFinder] Error in smart select:", error);
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
        const keeper = selectKeeper(group.stores, statusHierarchy);
        newSelection.add(link);
        newDeletionMap.set(link, keeper.Link);
      }

      setSelectedForDeletion(newSelection);
      setDeletionMap(newDeletionMap);
    } catch (error: any) {
      console.error("[DuplicateFinder] Error toggling selection:", error);
      toast({ title: "Selection Error", description: "Failed to toggle selection for this store", variant: "destructive" });
    }
  };

  const toggleNotDuplicate = (link: string) => {
    const newMarked = new Set(markedAsNotDuplicate);
    if (newMarked.has(link)) newMarked.delete(link);
    else newMarked.add(link);
    setMarkedAsNotDuplicate(newMarked);
  };

  const handleSaveAllNotDuplicates = async () => {
    if (markedAsNotDuplicate.size === 0) {
      toast({ title: "No Markings", description: "Please mark at least one store as 'Not a Duplicate'", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const pairsToCreate: Array<{ link1: string; link2: string }> = [];
      for (const group of duplicateGroups) {
        const groupLinks = group.stores.map((s) => s.Link);
        const markedInGroup = groupLinks.filter((link) => markedAsNotDuplicate.has(link));
        for (const markedLink of markedInGroup) {
          for (const otherLink of groupLinks) {
            if (markedLink !== otherLink) {
              const pair = [markedLink, otherLink].sort();
              if (!pairsToCreate.some((p) => p.link1 === pair[0] && p.link2 === pair[1])) {
                pairsToCreate.push({ link1: pair[0], link2: pair[1] });
              }
            }
          }
        }
      }

      for (const pair of pairsToCreate) {
        await apiRequest("POST", "/api/non-duplicates", pair);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/non-duplicates"] });
      const updatedPairs = await queryClient.fetchQuery<Array<{ link1: string; link2: string }>>({ queryKey: ["/api/non-duplicates"] });
      setDuplicateGroups(detectDuplicates(stores, 0.75, updatedPairs));
      setMarkedAsNotDuplicate(new Set());

      toast({
        title: "Saved",
        description: `Marked ${markedAsNotDuplicate.size} stores as not duplicates. They won't appear in these groups again.`,
      });
    } catch (error: any) {
      console.error("[DuplicateFinder] Error saving not duplicates:", error);
      toast({ title: "Error", description: error.message || "Failed to save markings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedForDeletion.size === 0) {
      toast({ title: "No Selection", description: "Please select at least one duplicate to delete", variant: "destructive" });
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
      for (const link of linksToDelete) {
        const keeperLink = deletionMap.get(link);
        await apiRequest("DELETE", `/api/store/${encodeURIComponent(link)}`, { keeperLink, statusHierarchy });
      }

      toast({
        title: "Success",
        description: `Deleted ${linksToDelete.length} duplicate ${linksToDelete.length === 1 ? "store" : "stores"} and merged data`,
      });

      setSelectedForDeletion(new Set());
      setDeletionMap(new Map());
      onOpenChange(false);
      if (onDuplicatesDeleted) onDuplicatesDeleted();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete duplicates", variant: "destructive" });
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
                ? "Analyzing stores..."
                : selectedStates.length > 0
                  ? `Showing ${filteredDuplicateGroups.length} of ${duplicateGroups.length} duplicate groups (filtered by state)`
                  : `Found ${duplicateGroups.length} duplicate ${duplicateGroups.length === 1 ? "group" : "groups"} with ${totalDuplicates} total stores`}
            </DialogDescription>
          </DialogHeader>

          <DuplicateFinderBody
            isDetecting={isDetecting}
            duplicateGroups={duplicateGroups}
            filteredDuplicateGroups={filteredDuplicateGroups}
            selectedStates={selectedStates}
            allStates={allStates}
            showCanadaOnly={showCanadaOnly}
            stateCounts={stateCounts}
            selectedForDeletion={selectedForDeletion}
            markedAsNotDuplicate={markedAsNotDuplicate}
            isSaving={isSaving}
            isDeleting={isDeleting}
            statusHierarchy={statusHierarchy}
            onSmartSelect={handleSmartSelect}
            onSelectedStatesChange={setSelectedStates}
            onShowCanadaOnlyChange={setShowCanadaOnly}
            onStateChange={handleStateChange}
            onSaveAllNotDuplicates={handleSaveAllNotDuplicates}
            onToggleSelection={toggleSelection}
            onToggleNotDuplicate={toggleNotDuplicate}
            onCancel={() => onOpenChange(false)}
            onDelete={handleDelete}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={showConfirmDialog}
        selectedCount={selectedForDeletion.size}
        onOpenChange={setShowConfirmDialog}
        onConfirmDelete={confirmDelete}
      />
    </>
  );
}
