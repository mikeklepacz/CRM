import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Category } from "./types";

interface CategoryListCardProps {
  categories: Category[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
}

export function CategoryListCard({ categories, onAdd, onDelete, onEdit }: CategoryListCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Business Categories</CardTitle>
            <CardDescription>
              Manage categories for Map Search filtering. Categories help agents focus on specific business niches.
            </CardDescription>
          </div>
          <Button onClick={onAdd} data-testid="button-add-category">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-4">Create your first category to start organizing businesses</p>
            <Button onClick={onAdd} data-testid="button-add-first-category">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    {category.projectId ? (
                      <Badge variant="outline">{category.projectName || "Unknown"}</Badge>
                    ) : (
                      <Badge variant="secondary">All Projects</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {category.description || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{category.displayOrder}</TableCell>
                  <TableCell>
                    {category.isActive ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(category)}
                        data-testid={`button-edit-${category.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(category.id)}
                        data-testid={`button-delete-${category.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
