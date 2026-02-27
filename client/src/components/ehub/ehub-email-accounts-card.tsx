import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EmailAccount } from "@/components/ehub/ehub.types";
import { AlertCircle, Loader2, Mail, Plus, Trash2 } from "lucide-react";

type EhubEmailAccountsCardProps = {
  emailAccounts: EmailAccount[] | undefined;
  isLoadingEmailAccounts: boolean;
  isPendingDelete: boolean;
  onConnectEmail: () => void;
  onDeleteEmailAccount: (id: string) => void;
};

export function EhubEmailAccountsCard({
  emailAccounts,
  isLoadingEmailAccounts,
  isPendingDelete,
  onConnectEmail,
  onDeleteEmailAccount,
}: EhubEmailAccountsCardProps) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Accounts Pool
        </CardTitle>
        <CardDescription>
          Connect Gmail accounts to send emails from. Emails are distributed across active accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingEmailAccounts ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading email accounts...
          </div>
        ) : emailAccounts && emailAccounts.length > 0 ? (
          <div className="space-y-2">
            {emailAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-md"
                data-testid={`row-email-account-${account.id}`}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{account.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.dailySendCount} sent today
                      {account.lastUsedAt &&
                        ` · Last used ${formatDistanceToNow(new Date(account.lastUsedAt), { addSuffix: true })}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={account.status === "active" ? "default" : "secondary"}>
                    {account.status}
                  </Badge>
                  {account.errorMessage && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>{account.errorMessage}</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteEmailAccount(account.id)}
                    disabled={isPendingDelete}
                    data-testid={`button-delete-email-${account.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No email accounts connected. Connect a Gmail account to start sending.
          </div>
        )}
        <Button onClick={onConnectEmail} data-testid="button-connect-email">
          <Plus className="w-4 h-4 mr-2" />
          Connect Gmail Account
        </Button>
      </CardContent>
    </Card>
  );
}
