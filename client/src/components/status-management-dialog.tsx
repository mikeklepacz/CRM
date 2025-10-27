import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Save, X, Sun, Moon, Edit, Check, GripVertical } from "lucide-react";
import { HslColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface Status {
  id: string;
  name: string;
  displayOrder: number;
  lightBgColor: string;
  lightTextColor: string;
  darkBgColor: string;
  darkTextColor: string;
  isActive: boolean;
}

interface StatusFormData {
  name: string;
  lightBgColor: string;
  lightTextColor: string;
  darkBgColor: string;
  darkTextColor: string;
}

interface StatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SortableRowProps {
  status: Status;
  previewMode: 'light' | 'dark';
  onEdit: (status: Status) => void;
  onDelete: (id: string) => void;
}

function SortableRow({ status, previewMode, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} data-testid={`row-status-${status.id}`}>
      <TableCell className="w-8">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm">{status.displayOrder}</TableCell>
      <TableCell className="font-medium">{status.name}</TableCell>
      <TableCell>
        <div
          className="inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-medium"
          style={{
            backgroundColor: previewMode === 'light' ? status.lightBgColor : status.darkBgColor,
            color: previewMode === 'light' ? status.lightTextColor : status.darkTextColor,
          }}
        >
          {status.name}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(status)}
            data-testid={`button-edit-${status.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(status.id)}
            data-testid={`button-delete-${status.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function StatusManagementDialog({ open, onOpenChange }: StatusManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StatusFormData>({
    name: '',
    lightBgColor: '#dbeafe',
    lightTextColor: '#1e40af',
    darkBgColor: '#1e3a8a',
    darkTextColor: '#bfdbfe',
  });
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: statusesData, isLoading } = useQuery<{ statuses: Status[] }>({
    queryKey: ['/api/statuses'],
  });

  const statuses = statusesData?.statuses || [];

  const createMutation = useMutation({
    mutationFn: async (data: StatusFormData & { displayOrder: number }) => {
      return await apiRequest('POST', '/api/statuses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/statuses'] });
      resetForm();
      toast({
        title: "Success",
        description: "Status created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create status",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StatusFormData> }) => {
      return await apiRequest('PUT', `/api/statuses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/statuses'] });
      resetForm();
      toast({
        title: "Success",
        description: "Status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedStatuses: Status[]) => {
      const updates = reorderedStatuses.map((status, index) => ({
        id: status.id,
        displayOrder: index + 1,
      }));
      return await apiRequest('PUT', '/api/statuses/reorder', { updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/statuses'] });
      toast({
        title: "Success",
        description: "Status order updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reorder statuses",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/statuses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/statuses'] });
      setDeleteConfirmOpen(false);
      setDeletingId(null);
      toast({
        title: "Success",
        description: "Status deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      lightBgColor: '#dbeafe',
      lightTextColor: '#1e40af',
      darkBgColor: '#1e3a8a',
      darkTextColor: '#bfdbfe',
    });
    setIsEditing(false);
    setEditingId(null);
  };

  const startEdit = (status: Status) => {
    setFormData({
      name: status.name,
      lightBgColor: status.lightBgColor,
      lightTextColor: status.lightTextColor,
      darkBgColor: status.darkBgColor,
      darkTextColor: status.darkTextColor,
    });
    setEditingId(status.id);
    setIsEditing(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Status name is required",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      const maxOrder = statuses.reduce((max, s) => Math.max(max, s.displayOrder), 0);
      createMutation.mutate({ ...formData, displayOrder: maxOrder + 1 });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(statuses, oldIndex, newIndex).map((status, index) => ({
        ...status,
        displayOrder: index + 1,
      }));

      reorderMutation.mutate(reordered);
    }
  };

  const ColorPicker = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: string; 
    onChange: (color: string) => void;
  }) => {
    const hsl = hexToHsl(value);
    return (
      <div className="space-y-2">
        <Label className="text-xs">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-9"
              data-testid={`button-color-${label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div 
                className="w-5 h-5 rounded border"
                style={{ backgroundColor: value }}
              />
              <span className="text-xs font-mono">{value}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HslColorPicker
              color={hsl}
              onChange={(newHsl) => {
                const hex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
                onChange(hex);
              }}
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-2 font-mono text-xs"
              placeholder="#000000"
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-status-management">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Manage Statuses</DialogTitle>
                <DialogDescription>
                  Create, edit, and reorder status types with custom colors
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Preview Mode:</Label>
                <Button
                  size="sm"
                  variant={previewMode === 'light' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('light')}
                  data-testid="button-preview-light"
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Light
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'dark' ? 'default' : 'outline'}
                  onClick={() => setPreviewMode('dark')}
                  data-testid="button-preview-dark"
                >
                  <Moon className="h-4 w-4 mr-1" />
                  Dark
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6">
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {isEditing ? 'Edit Status' : 'Create New Status'}
                </h3>
                {isEditing && (
                  <Button size="sm" variant="ghost" onClick={resetForm} data-testid="button-cancel-edit">
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Status Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Contacted"
                    data-testid="input-status-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div 
                    className="h-9 rounded-md flex items-center justify-center px-3 text-sm font-medium"
                    style={{
                      backgroundColor: previewMode === 'light' ? formData.lightBgColor : formData.darkBgColor,
                      color: previewMode === 'light' ? formData.lightTextColor : formData.darkTextColor,
                    }}
                    data-testid="preview-status"
                  >
                    {formData.name || 'Status Preview'}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Light Mode Colors *
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <ColorPicker
                      label="Background"
                      value={formData.lightBgColor}
                      onChange={(color) => setFormData({ ...formData, lightBgColor: color })}
                    />
                    <ColorPicker
                      label="Text"
                      value={formData.lightTextColor}
                      onChange={(color) => setFormData({ ...formData, lightTextColor: color })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Dark Mode Colors *
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <ColorPicker
                      label="Background"
                      value={formData.darkBgColor}
                      onChange={(color) => setFormData({ ...formData, darkBgColor: color })}
                    />
                    <ColorPicker
                      label="Text"
                      value={formData.darkTextColor}
                      onChange={(color) => setFormData({ ...formData, darkTextColor: color })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-status"
                >
                  {isEditing ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Update Status
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Status
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-12">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-40">Preview</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Loading statuses...
                      </TableCell>
                    </TableRow>
                  ) : statuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No statuses found. Create your first status above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={statuses.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {statuses.map((status) => (
                          <SortableRow
                            key={status.id}
                            status={status}
                            previewMode={previewMode}
                            onEdit={startEdit}
                            onDelete={handleDelete}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this status. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
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
