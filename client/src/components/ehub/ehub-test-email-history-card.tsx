import type { TestEmailSend } from "@/components/ehub/ehub.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Reply } from "lucide-react";

type EhubTestEmailHistoryCardProps = {
  checkReplyPending: boolean;
  isLoading: boolean;
  onCheckReply: (id: string) => void;
  onFollowUp: (test: TestEmailSend) => void;
  testEmailHistory: TestEmailSend[] | undefined;
};

export function EhubTestEmailHistoryCard({
  checkReplyPending,
  isLoading,
  onCheckReply,
  onFollowUp,
  testEmailHistory,
}: EhubTestEmailHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Email History</CardTitle>
        <CardDescription>Recent test emails with reply status and follow-up actions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !testEmailHistory || testEmailHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No test emails sent yet. Use the composer above to send your first test email.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Reply</TableHead>
                <TableHead>Follow-ups</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testEmailHistory.map((test) => (
                <TableRow key={test.id} data-testid={`row-test-email-${test.id}`}>
                  <TableCell className="font-medium">{test.recipientEmail}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{test.subject}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        test.status === "replied"
                          ? "default"
                          : test.status === "sent"
                            ? "secondary"
                            : "outline"
                      }
                      data-testid={`badge-status-${test.id}`}
                    >
                      {test.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {test.sentAt ? new Date(test.sentAt).toLocaleString() : "-"}
                  </TableCell>
                  <TableCell>
                    {test.replyDetectedAt ? (
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {new Date(test.replyDetectedAt).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">No reply</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{test.followUpCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCheckReply(test.id)}
                        disabled={!test.gmailThreadId || checkReplyPending}
                        data-testid={`button-check-reply-${test.id}`}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Check
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onFollowUp(test)}
                        disabled={!test.gmailThreadId}
                        data-testid={`button-followup-${test.id}`}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Follow-up
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
