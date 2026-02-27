import type { Template } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trash2 } from "lucide-react";

type TemplateBuilderLibraryViewProps = {
  deletePending: boolean;
  onDeleteTemplate: (id: string) => void;
  onEditTemplate: (template: Template) => void;
  onTagFilterChange: (value: string | null) => void;
  onTemplateSearchChange: (value: string) => void;
  onTypeFilterChange: (value: "Email" | "Script" | null) => void;
  onUseTemplate: (template: Template) => void;
  selectedTagFilter: string | null;
  selectedTypeFilter: "Email" | "Script" | null;
  templateSearch: string;
  templates: Template[];
};

export function TemplateBuilderLibraryView({
  deletePending,
  onDeleteTemplate,
  onEditTemplate,
  onTagFilterChange,
  onTemplateSearchChange,
  onTypeFilterChange,
  onUseTemplate,
  selectedTagFilter,
  selectedTypeFilter,
  templateSearch,
  templates,
}: TemplateBuilderLibraryViewProps) {
  const availableTags = Array.from(new Set(templates.flatMap((template) => template.tags || [])));
  const visibleTemplates = templates.filter(
    (template) =>
      (template.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.content.toLowerCase().includes(templateSearch.toLowerCase()) ||
        template.tags?.some((tag) => tag.toLowerCase().includes(templateSearch.toLowerCase()))) &&
      (selectedTypeFilter === null || (template as any).type === selectedTypeFilter) &&
      (selectedTagFilter === null || template.tags?.includes(selectedTagFilter)),
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 px-6 pt-6 pb-6">
      <div className="flex flex-col flex-1 gap-4 overflow-hidden">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedTypeFilter === null ? "default" : "outline"}
            className="cursor-pointer hover-elevate"
            onClick={() => onTypeFilterChange(null)}
            data-testid="type-filter-all"
          >
            All
          </Badge>
          <Badge
            variant={selectedTypeFilter === "Email" ? "default" : "outline"}
            className="cursor-pointer hover-elevate"
            onClick={() => onTypeFilterChange("Email")}
            data-testid="type-filter-email"
          >
            Email
          </Badge>
          <Badge
            variant={selectedTypeFilter === "Script" ? "default" : "outline"}
            className="cursor-pointer hover-elevate"
            onClick={() => onTypeFilterChange("Script")}
            data-testid="type-filter-script"
          >
            Script
          </Badge>

          {availableTags.length > 0 && (
            <>
              <div className="w-px h-6 bg-border mx-1" />
              <Badge
                variant={selectedTagFilter === null ? "default" : "outline"}
                className="cursor-pointer hover-elevate"
                onClick={() => onTagFilterChange(null)}
                data-testid="tag-filter-clear"
              >
                All Tags
              </Badge>
            </>
          )}

          {availableTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTagFilter === tag ? "default" : "outline"}
              className="cursor-pointer hover-elevate"
              onClick={() => onTagFilterChange(tag)}
              data-testid={`tag-filter-${tag}`}
            >
              {tag}
            </Badge>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 h-[calc(100vh-400px)]">
          <div className="space-y-2 pr-4">
            {visibleTemplates.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg hover-elevate bg-card ${
                  (template as any).type === "Script" && (template as any).isDefault
                    ? "border-black dark:border-white border-2"
                    : ""
                }`}
                data-testid={`template-card-${template.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{template.title}</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUseTemplate(template)}
                      data-testid={`button-use-template-${template.id}`}
                    >
                      Use
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditTemplate(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(template.id);
                      }}
                      disabled={deletePending}
                      data-testid={`button-delete-template-builder-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-2 font-mono">
                  {template.content}
                </p>
                <div className="flex flex-wrap gap-1 items-center">
                  {(template as any).type && (
                    <Badge variant="default" className="text-xs">
                      {(template as any).type}
                    </Badge>
                  )}
                  {template.tags &&
                    template.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates yet</p>
                <p className="text-sm">Go back to builder to create your first template</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-4 mt-4 pt-4 border-t flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => onTemplateSearchChange(e.target.value)}
              className="pl-8"
              data-testid="input-search-templates-library"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
