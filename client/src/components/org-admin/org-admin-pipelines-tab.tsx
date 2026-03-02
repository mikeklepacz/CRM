import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableStageItem } from "@/components/org-admin/sortable-stage-item";

export function OrgAdminPipelinesTab(props: any) {
  const p = props;

  return (
    <TabsContent value="pipelines">
      {p.selectedPipelineId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => p.setSelectedPipelineId(null)}
                data-testid="button-back-to-pipelines"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                {p.selectedPipelineLoading ? (
                  <>
                    <Skeleton className="h-6 w-48 mb-1" />
                    <Skeleton className="h-4 w-64" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <CardTitle data-testid="text-pipeline-name">{p.selectedPipelineData?.pipeline?.name}</CardTitle>
                      <Badge variant={p.getPipelineTypeBadgeVariant(p.selectedPipelineData?.pipeline?.pipelineType || "")} className="no-default-hover-elevate no-default-active-elevate">
                        {p.selectedPipelineData?.pipeline?.pipelineType}
                      </Badge>
                      {!p.selectedPipelineData?.pipeline?.isActive && (
                        <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription data-testid="text-pipeline-description">
                      {p.selectedPipelineData?.pipeline?.description || "No description"}
                    </CardDescription>
                  </>
                )}
              </div>
            </div>
            <Button onClick={() => p.handleOpenStageDialog()} data-testid="button-add-stage">
              <Plus className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
          </CardHeader>
          <CardContent>
            {p.selectedPipelineLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(p.selectedPipelineData?.pipeline?.stages?.length || 0) === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-stages">
                    No stages yet. Click "Add Stage" to create your first stage.
                  </div>
                ) : (
                  <DndContext sensors={p.sensors} collisionDetection={closestCenter} onDragEnd={p.handleDragEnd}>
                    <SortableContext
                      items={p.selectedPipelineData?.pipeline?.stages?.map((s: any) => s.id) || []}
                      strategy={verticalListSortingStrategy}
                    >
                      {p.selectedPipelineData?.pipeline?.stages
                        ?.sort((a: any, b: any) => a.stageOrder - b.stageOrder)
                        .map((stage: any) => (
                          <SortableStageItem
                            key={stage.id}
                            stage={stage}
                            onEdit={() => p.handleOpenStageDialog(stage)}
                            onDelete={() => p.handleDeleteStage(stage)}
                            isDeleting={p.deletingStageId === stage.id}
                          />
                        ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle>Pipelines</CardTitle>
              <CardDescription>Manage workflow pipelines for your organization</CardDescription>
            </div>
            <Button onClick={() => p.handleOpenPipelineDialog()} data-testid="button-create-pipeline">
              <Plus className="mr-2 h-4 w-4" />
              Create Pipeline
            </Button>
          </CardHeader>
          <CardContent>
            {p.pipelinesLoading ? (
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
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(p.pipelinesData?.pipelines?.length || 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No pipelines found. Create your first pipeline to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    p.pipelinesData?.pipelines?.map((pipeline: any) => (
                      <TableRow
                        key={pipeline.id}
                        data-testid={`row-pipeline-${pipeline.id}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => p.setSelectedPipelineId(pipeline.id)}
                      >
                        <TableCell className="font-medium" data-testid={`text-pipeline-name-${pipeline.id}`}>
                          {pipeline.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.getPipelineTypeBadgeVariant(pipeline.pipelineType)} className="no-default-hover-elevate no-default-active-elevate">
                            {pipeline.pipelineType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">{pipeline.description || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={pipeline.isActive ? "default" : "outline"} className="no-default-hover-elevate no-default-active-elevate">
                            {pipeline.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                p.handleOpenPipelineDialog(pipeline);
                              }}
                              data-testid={`button-edit-pipeline-${pipeline.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                p.setPipelineToDelete(pipeline);
                              }}
                              data-testid={`button-delete-pipeline-${pipeline.id}`}
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
      )}
    </TabsContent>
  );
}
