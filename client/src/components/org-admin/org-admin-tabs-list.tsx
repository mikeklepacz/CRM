import { BarChart3, FolderKanban, Settings as SettingsIcon, Tag, Users, Workflow } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function OrgAdminTabsList(props: any) {
  const p = props;

  return (
    <TabsList className="flex flex-wrap h-auto gap-1">
      <TabsTrigger value="team" data-testid="tab-team">
        <Users className="mr-2 h-4 w-4" />
        Team
      </TabsTrigger>
      <TabsTrigger value="settings" data-testid="tab-settings">
        <SettingsIcon className="mr-2 h-4 w-4" />
        Settings
      </TabsTrigger>
      <TabsTrigger value="stats" data-testid="tab-stats">
        <BarChart3 className="mr-2 h-4 w-4" />
        Stats
      </TabsTrigger>
      {p.isPipelinesAllowed && (
        <TabsTrigger value="pipelines" data-testid="tab-pipelines">
          <Workflow className="mr-2 h-4 w-4" />
          Pipelines
        </TabsTrigger>
      )}
      <TabsTrigger value="projects" data-testid="tab-projects">
        <FolderKanban className="mr-2 h-4 w-4" />
        Projects
      </TabsTrigger>
      <TabsTrigger value="categories" data-testid="tab-categories">
        <Tag className="mr-2 h-4 w-4" />
        Categories
      </TabsTrigger>
    </TabsList>
  );
}
