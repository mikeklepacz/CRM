import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { Archive, ArchiveRestore, FolderKanban, Pencil, Plus, Star, Trash2 } from "lucide-react";

export function OrgAdminProjectsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="projects">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Manage projects for your organization</CardDescription>
          </div>
          <Button onClick={() => p.handleOpenProjectDialog()} data-testid="button-create-project">
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </CardHeader>
        <CardContent>
          {p.projectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(p.projectsData?.projects?.length || 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No projects found. Create your first project to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  p.projectsData?.projects?.map((project: any) => (
                    <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                      <TableCell className="font-medium" data-testid={`text-project-name-${project.id}`}>
                        {project.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{project.slug}</TableCell>
                      <TableCell>
                        <Badge variant={p.getProjectTypeBadgeVariant(project.projectType)} className="no-default-hover-elevate no-default-active-elevate">
                          {project.projectType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`no-default-hover-elevate no-default-active-elevate ${p.getProjectStatusBadgeClass(project.status)}`}
                        >
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.isDefault && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.formatDate(project.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => p.handleOpenProjectDialog(project)}
                            data-testid={`button-edit-project-${project.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {project.status === "archived" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => p.restoreProjectMutation.mutate(project.id)}
                              disabled={p.restoreProjectMutation.isPending}
                              data-testid={`button-restore-project-${project.id}`}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => p.setProjectToArchive(project)}
                              data-testid={`button-archive-project-${project.id}`}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          {!project.isDefault && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => p.setDefaultProjectMutation.mutate(project.id)}
                              disabled={p.setDefaultProjectMutation.isPending}
                              data-testid={`button-set-default-project-${project.id}`}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => p.setProjectToDelete(project)}
                            disabled={project.isDefault}
                            data-testid={`button-delete-project-${project.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
