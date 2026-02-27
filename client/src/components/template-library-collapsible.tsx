import { ChevronDown, Copy, FileText, Mail, Pencil, Search, Tag, Trash2 } from "lucide-react";
import type { Template } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

type TemplateLibraryCollapsibleProps = {
  deletePending: boolean;
  filteredTemplates: Template[];
  hasEmailContext: boolean;
  onCopyTemplate: (template: Template) => void;
  onDeleteTemplate: (id: string) => void;
  onEditTemplate: (template: Template) => void;
  onEmailTemplate: (template: Template) => void;
  onInjectTemplate: (template: Template) => void;
  onOpenTemplateBuilder: () => void;
  onSearchChange: (value: string) => void;
  onToggle: (open: boolean) => void;
  templateSearch: string;
  templates: Template[];
  templatesOpen: boolean;
};

export function TemplateLibraryCollapsible({
  deletePending,
  filteredTemplates,
  hasEmailContext,
  onCopyTemplate,
  onDeleteTemplate,
  onEditTemplate,
  onEmailTemplate,
  onInjectTemplate,
  onOpenTemplateBuilder,
  onSearchChange,
  onToggle,
  templateSearch,
  templates,
  templatesOpen,
}: TemplateLibraryCollapsibleProps) {
  return (
    <Collapsible open={templatesOpen} onOpenChange={onToggle} className={templatesOpen ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "flex-shrink-0"}>
      <div className="border-t flex-shrink-0">
        <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover-elevate active-elevate-2" data-testid="button-toggle-templates">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="font-semibold text-sm">Template Library</span>
            <Badge variant="secondary">{templates.length}</Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${templatesOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="p-2 space-y-3">
          <Button
            onClick={onOpenTemplateBuilder}
            className="w-full"
            variant="default"
            data-testid="button-template-builder"
          >
            Template Builder
          </Button>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
              data-testid="input-template-search"
            />
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="p-2 border rounded-md bg-card" data-testid={`template-${template.id}`}>
                <div className="flex items-start justify-between mb-1">
                  <h5 className="text-xs font-semibold">{template.title}</h5>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onEditTemplate(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-destructive"
                      onClick={() => onDeleteTemplate(template.id)}
                      disabled={deletePending}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {template.content}
                </p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {template.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-1">
                  {template.type === "Script" ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => onInjectTemplate(template)}
                      data-testid={`button-inject-template-${template.id}`}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Inject
                    </Button>
                  ) : template.type === "Email" && hasEmailContext ? (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => onEmailTemplate(template)}
                      data-testid={`button-email-template-${template.id}`}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onCopyTemplate(template)}
                    data-testid={`button-copy-template-${template.id}`}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
