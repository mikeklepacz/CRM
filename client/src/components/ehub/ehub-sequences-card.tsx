import { Pause, Play, Send, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Sequence } from "@/components/ehub/ehub.types";

interface EhubSequencesCardProps {
  sequences: Sequence[] | undefined;
  isUpdatingStatus: boolean;
  getStatusColor: (status: string) => "default" | "secondary" | "destructive" | "outline";
  onSelectSequence: (sequenceId: string) => void;
  onImport: (sequenceId: string) => void;
  onTest: (sequenceId: string) => void;
  onTogglePauseResume: (sequenceId: string, status: string) => void | Promise<void>;
  onDelete: (sequenceId: string) => void;
}

export function EhubSequencesCard({
  sequences,
  isUpdatingStatus,
  getStatusColor,
  onSelectSequence,
  onImport,
  onTest,
  onTogglePauseResume,
  onDelete,
}: EhubSequencesCardProps) {
  if (sequences && sequences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Sequences Yet</CardTitle>
          <CardDescription>
            Create your first email sequence to get started with automated outreach.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sequences</CardTitle>
        <CardDescription>Manage your email sequences</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Replies</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences?.map((sequence) => (
              <TableRow
                key={sequence.id}
                data-testid={`row-sequence-${sequence.id}`}
                className="cursor-pointer hover-elevate"
                onClick={() => onSelectSequence(sequence.id)}
              >
                <TableCell className="font-medium">{sequence.name}</TableCell>
                <TableCell>{sequence.stepDelays?.length || 0} steps</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(sequence.status)}>
                    {sequence.status}
                  </Badge>
                </TableCell>
                <TableCell>{sequence.totalRecipients || 0}</TableCell>
                <TableCell>{sequence.sentCount || 0}</TableCell>
                <TableCell>{sequence.repliedCount || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onImport(sequence.id)}
                      data-testid={`button-import-${sequence.id}`}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTest(sequence.id)}
                      data-testid={`button-test-${sequence.id}`}
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onTogglePauseResume(sequence.id, sequence.status)}
                      disabled={isUpdatingStatus}
                      data-testid={`button-pause-resume-${sequence.id}`}
                      title={sequence.status === "paused" ? "Resume sequence" : "Pause sequence"}
                    >
                      {sequence.status === "paused" ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onDelete(sequence.id)}
                      data-testid={`button-delete-${sequence.id}`}
                      title="Delete sequence"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
