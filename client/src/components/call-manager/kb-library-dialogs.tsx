import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Eye, FileEdit } from "lucide-react";
import { ProposalDiffViewer } from "@/components/proposal-diff-viewer";

export function KBLibraryDialogs(props: any) {
  return (
    <>
      <Dialog
        open={props.isVersionDialogOpen}
        onOpenChange={(open) => {
          props.setIsVersionDialogOpen(open);
          if (!open) props.setSelectedVersionsForDiff([]);
        }}
      >
        <DialogContent className="max-w-4xl" data-testid="dialog-version-history">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle data-testid="text-dialog-title">Version History</DialogTitle>
              <Button
                size="sm"
                onClick={props.openVersionDiff}
                disabled={props.selectedVersionsForDiff.length !== 2}
                data-testid="button-compare-versions"
              >
                Compare Selected ({props.selectedVersionsForDiff.length}/2)
              </Button>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[500px]" data-testid="scroll-version-list">
            {props.versions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-versions">
                No versions found
              </p>
            ) : (
              <div className="space-y-4">
                {props.versions.map((version: any, idx: number) => (
                  <Card
                    key={version.id}
                    data-testid={`card-version-${version.id}`}
                    className={props.selectedVersionsForDiff.includes(version.id) ? "border-primary" : ""}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={props.selectedVersionsForDiff.includes(version.id)}
                            onChange={() => props.toggleVersionSelection(version.id)}
                            className="h-4 w-4"
                            data-testid={`checkbox-version-${version.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant={idx === 0 ? "default" : "outline"} data-testid={`badge-version-number-${version.id}`}>
                              v{version.versionNumber}
                            </Badge>
                            <Badge variant="secondary" data-testid={`badge-version-source-${version.id}`}>
                              {version.source}
                            </Badge>
                            {idx === 0 && (
                              <Badge variant="default" data-testid="badge-current-version">
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground" data-testid={`text-version-date-${version.id}`}>
                            {new Date(version.createdAt).toLocaleString()}
                          </span>
                          {idx !== 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                props.rollbackMutation.mutate({
                                  fileId: props.selectedFileId!,
                                  versionId: version.id,
                                })
                              }
                              disabled={props.rollbackMutation.isPending}
                              data-testid={`button-rollback-${version.id}`}
                            >
                              {props.rollbackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rollback"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground" data-testid={`text-version-creator-${version.id}`}>
                        Created by: {version.createdBy}
                      </p>
                      <div
                        className="mt-2 p-3 bg-muted/50 rounded text-sm font-mono max-h-32 overflow-auto cursor-pointer hover-elevate active-elevate-2"
                        data-testid={`text-version-content-${version.id}`}
                        onClick={() => props.viewVersionContent(version)}
                      >
                        {version.content.substring(0, 200)}
                        {version.content.length > 200 && "..."}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => props.viewVersionContent(version)}
                          data-testid={`button-view-full-${version.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Full Content
                        </Button>
                        {idx !== 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => props.loadVersionToEditor(version)}
                            data-testid={`button-load-version-${version.id}`}
                          >
                            <FileEdit className="h-4 w-4 mr-2" />
                            Load to Editor
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!props.splitScreenMode && props.isDiffDialogOpen} onOpenChange={props.setIsDiffDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh]" data-testid="dialog-proposal-diff">
          <DialogHeader>
            <DialogTitle data-testid="text-diff-dialog-title">Review Proposed Changes</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[80vh]">
            {props.selectedProposal && props.selectedFile && (
              <ProposalDiffViewer
                proposal={props.selectedProposal}
                currentContent={props.selectedFile.currentContent || ""}
                proposedContent={props.selectedProposal.proposedContent}
                filename={props.selectedFile.filename}
                onApprove={() => props.approveMutation.mutate(props.selectedProposal.id)}
                onReject={() => props.rejectMutation.mutate(props.selectedProposal.id)}
                isApproving={props.approveMutation.isPending}
                isRejecting={props.rejectMutation.isPending}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={props.isVersionViewerOpen} onOpenChange={props.setIsVersionViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-version-viewer">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle data-testid="text-version-viewer-title">
                View Version Content
                {props.viewingVersion && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    v{props.viewingVersion.versionNumber} - {props.viewingVersion.source}
                  </span>
                )}
              </DialogTitle>
              {props.viewingVersion && props.viewingVersion.versionNumber !== props.versions[0]?.versionNumber && (
                <Button size="sm" onClick={() => props.loadVersionToEditor(props.viewingVersion)} data-testid="button-load-to-editor">
                  <FileEdit className="h-4 w-4 mr-2" />
                  Load to Editor
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[70vh]" data-testid="scroll-version-content">
            {props.viewingVersion && (
              <div className="space-y-4">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Created: {new Date(props.viewingVersion.createdAt).toLocaleString()}</span>
                  <span>By: {props.viewingVersion.createdBy}</span>
                </div>
                <div className="p-4 bg-muted/30 rounded-md">
                  <pre className="text-sm font-mono whitespace-pre-wrap" data-testid="text-full-version-content">
                    {props.viewingVersion.content}
                  </pre>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={props.isVersionDiffDialogOpen} onOpenChange={props.setIsVersionDiffDialogOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh]" data-testid="dialog-version-diff">
          <DialogHeader>
            <DialogTitle data-testid="text-version-diff-title">
              Compare Versions
              {props.version1 && props.version2 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  v{props.version1.versionNumber} vs v{props.version2.versionNumber}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[80vh]">
            {props.version1 && props.version2 && (
              <ProposalDiffViewer
                proposal={{
                  id: "version-comparison",
                  kbFileId: props.selectedFileId || "",
                  rationale: `Comparing version ${props.version1.versionNumber} (${props.version1.source}) with version ${props.version2.versionNumber} (${props.version2.source})`,
                  status: "comparison",
                  createdAt: new Date().toISOString(),
                }}
                currentContent={props.version1.content}
                proposedContent={props.version2.content}
                filename={props.kbFiles.find((f: any) => f.id === props.selectedFileId)?.filename || "Unknown"}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
