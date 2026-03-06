import { Check, ChevronDown, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ProjectBarProps {
  currentProject: any;
  projects: any[];
  projectContext: any;
}

export function ProjectBar({ currentProject, projects, projectContext }: ProjectBarProps) {
  if (!currentProject) {
    return (
      <div
        className="px-2 py-1.5 md:px-3 flex items-center justify-between gap-2 bg-amber-500/20 text-amber-200 border-b border-amber-500/30"
        data-testid="project-bar-empty"
      >
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4" />
          <span className="text-sm font-semibold">No project loaded</span>
        </div>
      </div>
    );
  }

  const accentColor = currentProject.accentColor || "#6366f1";
  const r = parseInt(accentColor.slice(1, 3), 16);
  const g = parseInt(accentColor.slice(3, 5), 16);
  const b = parseInt(accentColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.5 ? "#000000" : "#ffffff";

  return (
    <div className="px-2 py-1.5 md:px-3 flex items-center justify-between gap-2" style={{ backgroundColor: accentColor, color: textColor }} data-testid="project-bar">
      <div className="flex items-center gap-2">
        <FolderKanban className="h-4 w-4" style={{ color: textColor }} />
        <span className="text-sm font-semibold" data-testid="current-project-name">
          {currentProject.name}
        </span>
        {currentProject.status !== "active" && (
          <Badge variant="outline" className="text-xs border-current" style={{ color: textColor, borderColor: textColor }}>
            {currentProject.status}
          </Badge>
        )}
      </div>
      {projects.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-white/20" style={{ color: textColor }} data-testid="button-switch-project">
              Switch
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Switch Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projects
              .filter((p) => p.status === "active")
              .map((project) => (
                <DropdownMenuItem key={project.id} onClick={() => projectContext?.switchProject(project.id)} className="flex items-center gap-2" data-testid={`project-option-${project.id}`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.accentColor || "#6366f1" }} />
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.id === currentProject.id && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
