import { Card, CardContent } from "@/components/ui/card";
import { CategoryFormDialog } from "@/components/category-management/category-form-dialog";
import { CategoryListCard } from "@/components/category-management/category-list-card";
import { useCategoryManagement } from "@/components/category-management/use-category-management";

export function CategoryManagement() {
  const {
    categories,
    editingCategory,
    formData,
    handleDelete,
    handleOpenDialog,
    handleSubmit,
    isDialogOpen,
    isLoading,
    isSaving,
    projects,
    resetForm,
    setFormData,
    setIsDialogOpen,
  } = useCategoryManagement();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading categories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <CategoryListCard categories={categories} onAdd={() => handleOpenDialog()} onDelete={handleDelete} onEdit={handleOpenDialog} />
      <CategoryFormDialog
        editingCategory={editingCategory}
        formData={formData}
        isDialogOpen={isDialogOpen}
        isSaving={isSaving}
        onClose={() => {
          setIsDialogOpen(false);
          resetForm();
        }}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        projects={projects}
        setFormData={setFormData}
      />
    </div>
  );
}
