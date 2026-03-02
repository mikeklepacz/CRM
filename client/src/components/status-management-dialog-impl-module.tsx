import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon } from "lucide-react";
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { StatusFormSection } from "./status-management-dialog/form-section";
import { StatusTableSection } from "./status-management-dialog/table-section";
import { DeleteStatusDialog } from "./status-management-dialog/delete-dialog";
import type { Status, StatusFormData } from "./status-management-dialog/types";

interface StatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatusManagementDialog({ open, onOpenChange }: StatusManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    name: "",
    displayOrder: 1,
    lightBgColor: "#dbeafe",
    lightTextColor: "#1e40af",
    darkBgColor: "#1e3a8a",
    darkTextColor: "#bfdbfe",
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortedStatuses, setSortedStatuses] = useState<Status[]>([]);

  const { data: statusesData, isLoading } = useQuery<{ statuses: Status[] }>({ queryKey: ["/api/statuses"] });
  const statuses = statusesData?.statuses || [];

  useEffect(() => {
    const sorted = [...statuses].sort((a, b) => a.displayOrder - b.displayOrder);
    setSortedStatuses(sorted);
  }, [statuses]);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; displayOrder: number }[]) => await apiRequest("POST", "/api/statuses/reorder", { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      toast({ title: "Success", description: "Statuses reordered successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reorder statuses", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StatusFormData) => await apiRequest("POST", "/api/statuses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      resetForm();
      toast({ title: "Success", description: "Status created successfully" });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to create status", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StatusFormData> }) => await apiRequest("PUT", `/api/statuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      resetForm();
      toast({ title: "Success", description: "Status updated successfully" });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statuses"] });
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      toast({ title: "Success", description: "Status deleted successfully" });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to delete status", variant: "destructive" }),
  });

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: "",
      displayOrder: sortedStatuses.length + 1,
      lightBgColor: "#dbeafe",
      lightTextColor: "#1e40af",
      darkBgColor: "#1e3a8a",
      darkTextColor: "#bfdbfe",
    });
  };

  const startEdit = (status: Status) => {
    setIsEditing(true);
    setEditingId(status.id);
    setFormData({
      name: status.name,
      displayOrder: status.displayOrder,
      lightBgColor: status.lightBgColor,
      lightTextColor: status.lightTextColor,
      darkBgColor: status.darkBgColor,
      darkTextColor: status.darkTextColor,
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Status name is required", variant: "destructive" });
      return;
    }
    if (!formData.lightBgColor || !formData.lightTextColor || !formData.darkBgColor || !formData.darkTextColor) {
      toast({ title: "Validation Error", description: "All color fields are required", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({ ...formData, displayOrder: sortedStatuses.length + 1 });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate(deletingId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSortedStatuses((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const newOrder = arrayMove(items, oldIndex, newIndex);

      const updates = newOrder.map((item, index) => ({ id: item.id, displayOrder: index + 1 }));
      reorderMutation.mutate(updates);

      return newOrder.map((item, index) => ({ ...item, displayOrder: index + 1 }));
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-status-management">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Manage Statuses</DialogTitle>
                <DialogDescription>Create, edit, and reorder status types with custom colors for light and dark modes</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Preview Mode:</Label>
                <Button size="sm" variant={previewMode === "light" ? "default" : "outline"} onClick={() => setPreviewMode("light")} data-testid="button-preview-light">
                  <Sun className="h-4 w-4 mr-1" />Light
                </Button>
                <Button size="sm" variant={previewMode === "dark" ? "default" : "outline"} onClick={() => setPreviewMode("dark")} data-testid="button-preview-dark">
                  <Moon className="h-4 w-4 mr-1" />Dark
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6">
            <StatusFormSection
              isEditing={isEditing}
              formData={formData}
              previewMode={previewMode}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              onFormDataChange={setFormData}
              onSubmit={handleSubmit}
              onCancelEdit={resetForm}
            />
            <StatusTableSection
              sensors={sensors}
              isLoading={isLoading}
              sortedStatuses={sortedStatuses}
              previewMode={previewMode}
              onDragEnd={handleDragEnd}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </div>
        </DialogContent>
      </Dialog>

      <DeleteStatusDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} onConfirmDelete={confirmDelete} />
    </>
  );
}
