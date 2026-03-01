import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, RefreshCw, Loader2, Brain } from "lucide-react";
import { KBEditor } from "@/components/kb-editor";
import { ProposalDiffViewer } from "@/components/proposal-diff-viewer";

export function KBLibrarySplitScreenView(props: any) {
  return (
    <div className="flex gap-4 h-full">
      <div className="w-1/2">
        <Card data-testid="card-kb-library">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Knowledge Base Library
                </CardTitle>
                <CardDescription className="mt-2">
                  Manage ElevenLabs knowledge base files
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div>
                  <input
                    id="kb-file-upload-split"
                    type="file"
                    multiple
                    accept=".txt"
                    onChange={props.handleFileSelect}
                    className="hidden"
                    data-testid="input-upload-files-split"
                  />
                  <Button
                    size="sm"
                    onClick={() => document.getElementById("kb-file-upload-split")?.click()}
                    disabled={props.uploadMutation.isPending}
                    data-testid="button-upload-kb-split"
                  >
                    {props.uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => props.syncMutation.mutate()}
                  disabled={props.syncMutation.isPending}
                  data-testid="button-sync-kb-split"
                >
                  {props.syncMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <KBEditor />
          </CardContent>
        </Card>
      </div>

      <div className="w-1/2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Review Proposed Changes</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="split-screen-toggle-header"
                    checked={props.splitScreenMode}
                    onCheckedChange={props.toggleSplitScreen}
                    data-testid="checkbox-split-screen-header"
                  />
                  <Label htmlFor="split-screen-toggle-header" className="cursor-pointer text-sm">
                    Editor/Proposal View
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {props.selectedProposal ? (
              <ProposalDiffViewer
                proposal={props.selectedProposal}
                currentContent={props.selectedFile?.currentContent || ""}
                proposedContent={props.selectedProposal.proposedContent}
                filename={props.selectedFile?.filename || "Unknown"}
                onApprove={() => {
                  props.approveMutation.mutate(props.selectedProposal.id);
                }}
                onReject={() => {
                  props.rejectMutation.mutate(props.selectedProposal.id);
                }}
                isApproving={props.approveMutation.isPending}
                isRejecting={props.rejectMutation.isPending}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">Select a proposal to review:</p>
                {props.proposalsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-4">Loading proposals...</p>
                  </div>
                ) : props.pendingProposals.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      No pending proposals yet. Run an AI analysis to generate improvement suggestions.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Rationale</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {props.pendingProposals.map((proposal: any) => (
                        <TableRow key={proposal.id} data-testid={`row-proposal-split-${proposal.id}`}>
                          <TableCell className="font-medium" data-testid={`text-proposal-file-split-${proposal.id}`}>
                            {props.kbFiles.find((f: any) => f.id === proposal.kbFileId)?.filename || "Unknown"}
                          </TableCell>
                          <TableCell className="max-w-md truncate" data-testid={`text-proposal-rationale-split-${proposal.id}`}>
                            {proposal.rationale}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" data-testid={`text-proposal-date-split-${proposal.id}`}>
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => props.setSelectedProposal(proposal)}
                              data-testid={`button-view-diff-split-${proposal.id}`}
                            >
                              View Diff
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
