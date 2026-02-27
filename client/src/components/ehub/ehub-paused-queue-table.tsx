import { Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PausedRecipient } from "@/components/ehub/ehub-queue.types";
import { formatTimestamp } from "@/components/ehub/ehub-queue-utils";

type Props = {
  pausedRecipients: PausedRecipient[];
  resumeMutation: any;
};

export function EhubPausedQueueTable({ pausedRecipients, resumeMutation }: Props) {
  return !pausedRecipients.length ? (
    <div className="text-center py-12 text-muted-foreground">No paused recipients</div>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
          <TableHead>Sequence</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Last Sent</TableHead>
          <TableHead>Messages</TableHead>
          <TableHead className="w-[60px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pausedRecipients.map((item) => (
          <TableRow key={item.recipientId} data-testid={`row-paused-${item.recipientId}`}>
            <TableCell data-testid={`text-paused-name-${item.recipientId}`}>
              <div>
                <div className="font-medium">{item.recipientName || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">{item.recipientEmail}</div>
              </div>
            </TableCell>
            <TableCell data-testid={`text-paused-sequence-${item.recipientId}`}>{item.sequenceName}</TableCell>
            <TableCell data-testid={`text-paused-progress-${item.recipientId}`}>
              <Badge variant="secondary">
                Step {item.currentStep} of {item.totalSteps}
              </Badge>
            </TableCell>
            <TableCell data-testid={`text-paused-last-sent-${item.recipientId}`}>{formatTimestamp(item.lastStepSentAt)}</TableCell>
            <TableCell data-testid={`text-paused-messages-${item.recipientId}`}>
              <Badge variant="outline">{item.messageHistory.length} sent</Badge>
            </TableCell>
            <TableCell data-testid={`actions-paused-${item.recipientId}`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resumeMutation.mutate(item.recipientId)}
                disabled={resumeMutation.isPending}
                data-testid={`button-resume-${item.recipientId}`}
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
