import { Clock, MoreVertical, Pause, Send, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EhubStatusBadge, EhubStepBadge } from "@/components/ehub-queue-badges";
import type { DelayDialogState, IndividualSend } from "@/components/ehub/ehub-queue.types";
import { formatTimestamp, getRowBgColor } from "@/components/ehub/ehub-queue-utils";

type Props = {
  activeQueue: IndividualSend[];
  delayDialog: DelayDialogState;
  pauseMutation: any;
  removeMutation: any;
  sendNowMutation: any;
  setDelayDialog: (state: DelayDialogState) => void;
  showJitter: boolean;
  skipStepMutation: any;
};

export function EhubActiveQueueTable({
  activeQueue,
  delayDialog,
  pauseMutation,
  removeMutation,
  sendNowMutation,
  setDelayDialog,
  showJitter,
  skipStepMutation,
}: Props) {
  return !activeQueue.length ? (
    <div className="text-center py-12 text-muted-foreground">No emails in queue</div>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recipient</TableHead>
          <TableHead>Sender</TableHead>
          <TableHead>Sequence</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>{showJitter ? "Jitter" : "Status"}</TableHead>
          <TableHead className="w-[60px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activeQueue.map((item, idx) => (
          <TableRow
            key={`${item.recipientId}-${item.stepNumber}-${idx}`}
            className={getRowBgColor(item.status)}
            data-testid={`row-queue-${item.recipientId}-${item.stepNumber}`}
          >
            <TableCell data-testid={`text-recipient-name-${item.recipientId}-${item.stepNumber}`}>
              <div>
                <div className="font-medium">{item.recipientName || "Unknown"}</div>
                <div className="text-sm text-muted-foreground">{item.recipientEmail}</div>
              </div>
            </TableCell>
            <TableCell data-testid={`text-queue-sender-${item.recipientId}-${item.stepNumber}`}>
              <span className="text-sm">{item.senderEmail || "(No sender)"}</span>
            </TableCell>
            <TableCell data-testid={`text-queue-sequence-${item.recipientId}-${item.stepNumber}`}>{item.sequenceName}</TableCell>
            <TableCell data-testid={`text-queue-step-${item.recipientId}-${item.stepNumber}`}>
              <EhubStepBadge stepNumber={item.stepNumber} />
            </TableCell>
            <TableCell data-testid={`text-queue-scheduled-${item.recipientId}-${item.stepNumber}`}>
              {item.status === "sent" ? formatTimestamp(item.sentAt) : formatTimestamp(item.scheduledAt)}
            </TableCell>
            <TableCell data-testid={`text-queue-status-${item.recipientId}-${item.stepNumber}`}>
              {showJitter ? (
                <span className="text-sm text-muted-foreground">
                  {(() => {
                    if (idx === 0) return "—";
                    const prevItem = activeQueue[idx - 1];
                    if (!prevItem.scheduledAt || !item.scheduledAt) return "—";

                    const prevTime = new Date(prevItem.scheduledAt).getTime();
                    const currTime = new Date(item.scheduledAt).getTime();
                    const diffMs = currTime - prevTime;
                    const diffMins = Math.floor(diffMs / 60000);

                    if (diffMins < 60) return `${diffMins}m`;
                    const hours = Math.floor(diffMins / 60);
                    const mins = diffMins % 60;
                    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                  })()}
                </span>
              ) : (
                <EhubStatusBadge status={item.status} />
              )}
            </TableCell>
            <TableCell data-testid={`actions-${item.recipientId}-${item.stepNumber}`}>
              {item.status !== "sent" && item.status !== "open" && item.recipientId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-actions-${item.recipientId}-${item.stepNumber}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => pauseMutation.mutate(item.recipientId)}
                      disabled={pauseMutation.isPending}
                      data-testid={`action-pause-${item.recipientId}`}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pause Recipient
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => skipStepMutation.mutate(item.recipientId)}
                      disabled={skipStepMutation.isPending}
                      data-testid={`action-skip-${item.recipientId}`}
                    >
                      <SkipForward className="mr-2 h-4 w-4" />
                      Skip This Step
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => sendNowMutation.mutate(item.recipientId)}
                      disabled={sendNowMutation.isPending}
                      data-testid={`action-send-now-${item.recipientId}`}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Now
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDelayDialog({ open: true, recipientId: item.recipientId, hours: delayDialog.hours })}
                      data-testid={`action-delay-${item.recipientId}`}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Delay by X hours
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => removeMutation.mutate(item.recipientId)}
                      disabled={removeMutation.isPending}
                      className="text-destructive"
                      data-testid={`action-remove-${item.recipientId}`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from Sequence
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
