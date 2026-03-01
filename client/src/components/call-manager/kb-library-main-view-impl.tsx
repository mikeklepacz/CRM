import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, RefreshCw, Loader2, Brain } from "lucide-react";
import { KBEditor } from "@/components/kb-editor";

export function KBLibraryMainView(props: any) {
  return (
    <Card data-testid="card-kb-library">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Knowledge Base Library
            </CardTitle>
            <CardDescription className="mt-2">
              Manage ElevenLabs knowledge base files with version control and AI-powered improvements
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div>
              <input
                id="kb-file-upload"
                type="file"
                multiple
                accept=".txt"
                onChange={props.handleFileSelect}
                className="hidden"
                data-testid="input-upload-files"
              />
              <Button
                onClick={() => document.getElementById("kb-file-upload")?.click()}
                disabled={props.uploadMutation.isPending}
                data-testid="button-upload-kb"
              >
                {props.uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </Button>
            </div>
            <Button
              onClick={() => props.syncMutation.mutate()}
              disabled={props.syncMutation.isPending}
              data-testid="button-sync-kb"
            >
              {props.syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync KB Files
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="files" data-testid="tabs-kb-sections">
          <TabsList className="mb-4">
            <TabsTrigger value="files" data-testid="tab-files">
              Files ({props.kbFiles.length})
            </TabsTrigger>
            <TabsTrigger value="editor" data-testid="tab-editor">
              Editor
            </TabsTrigger>
            <TabsTrigger value="proposals" data-testid="tab-proposals">
              Proposals ({props.pendingProposals.length} pending)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files">
            {props.kbLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Loading KB files...</p>
              </div>
            ) : props.kbFiles.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No knowledge base files found. Click "Upload Files" to import your local KB files.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Last Synced</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {props.kbFiles.map((file: any) => (
                    <TableRow key={file.id} data-testid={`row-kb-file-${file.id}`}>
                      <TableCell className="font-medium" data-testid={`text-filename-${file.id}`}>
                        {file.filename}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-filetype-${file.id}`}>
                          {file.fileType || "file"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-lastsynced-${file.id}`}>
                        {file.lastSyncedAt ? new Date(file.lastSyncedAt).toLocaleDateString() : "Never"}
                      </TableCell>
                      <TableCell>
                        {file.locked ? (
                          <Badge variant="destructive" data-testid={`badge-locked-${file.id}`}>
                            Locked
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-unlocked-${file.id}`}>
                            Unlocked
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            props.setSelectedFileId(file.id);
                            props.setIsVersionDialogOpen(true);
                          }}
                          data-testid={`button-view-versions-${file.id}`}
                        >
                          View Versions
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="editor">
            <KBEditor />
          </TabsContent>

          <TabsContent value="proposals">
            {props.isDesktop && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
                <Checkbox
                  id="split-screen-toggle"
                  checked={props.splitScreenMode}
                  onCheckedChange={props.toggleSplitScreen}
                  data-testid="checkbox-split-screen"
                />
                <Label htmlFor="split-screen-toggle" className="cursor-pointer text-sm">
                  Editor/Proposal View
                </Label>
              </div>
            )}
            {props.proposalsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-4">Loading proposals...</p>
              </div>
            ) : props.proposals.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No AI-generated proposals yet. Run an AI analysis to generate improvement suggestions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {props.selectedProposalIds.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">{props.selectedProposalIds.length} proposal(s) selected</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={props.handleDeleteSelected}
                      disabled={props.deleteProposalsMutation.isPending}
                      data-testid="button-delete-selected"
                    >
                      {props.deleteProposalsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        "Delete Selected"
                      )}
                    </Button>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={props.proposals.length > 0 && props.proposals.every((p: any) => props.selectedProposalIds.includes(p.id))}
                          onChange={props.toggleAllProposals}
                          className="h-4 w-4"
                          data-testid="checkbox-select-all-proposals"
                        />
                      </TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Rationale</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {props.proposals.map((proposal: any) => (
                      <TableRow key={proposal.id} data-testid={`row-proposal-${proposal.id}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={props.selectedProposalIds.includes(proposal.id)}
                            onChange={() => props.toggleProposalSelection(proposal.id)}
                            className="h-4 w-4"
                            data-testid={`checkbox-proposal-${proposal.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-proposal-file-${proposal.id}`}>
                          {props.kbFiles.find((f: any) => f.id === proposal.kbFileId)?.filename || "Unknown"}
                        </TableCell>
                        <TableCell className="max-w-md truncate" data-testid={`text-proposal-rationale-${proposal.id}`}>
                          {proposal.rationale}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              proposal.status === "pending" ? "default" : proposal.status === "approved" ? "secondary" : "destructive"
                            }
                            data-testid={`badge-proposal-status-${proposal.id}`}
                          >
                            {proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-proposal-date-${proposal.id}`}>
                          {new Date(proposal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              props.setSelectedProposal(proposal);
                              props.setIsDiffDialogOpen(true);
                            }}
                            data-testid={`button-view-diff-${proposal.id}`}
                          >
                            View Diff
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
