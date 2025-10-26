import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ReferralCommissionData {
  referringAgentId: string;
  referringAgentName: string;
  totalReferralCommission: number;
}

interface ReferralCommissionsResponse {
  referralCommissions: ReferralCommissionData[];
}

export function ReferralCommissionsWidget() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const { data, isLoading, error } = useQuery<ReferralCommissionsResponse>({
    queryKey: ['/api/reports/referral-commissions'],
    queryFn: async () => {
      const response = await fetch('/api/reports/referral-commissions');
      if (!response.ok) throw new Error('Failed to fetch referral commissions');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div className="flex-1 min-w-0">
              <CardTitle>Referral Commissions</CardTitle>
              <CardDescription className="mt-1.5">
                {isAdmin ? "Agents earning from referrals" : "Your referral earnings"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div className="flex-1 min-w-0">
              <CardTitle>Referral Commissions</CardTitle>
              <CardDescription className="mt-1.5">Agents earning from referrals</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-referral-commissions">
            Failed to load referral commission data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <div className="flex-1 min-w-0">
            <CardTitle>Referral Commissions</CardTitle>
            <CardDescription className="mt-1.5">Agents earning from referrals</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!data.referralCommissions || data.referralCommissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4" data-testid="text-no-referrals">
            No referral commissions yet. When agents refer other agents, their referral earnings will appear here.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referring Agent</TableHead>
                  <TableHead className="text-right">Total Referral Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.referralCommissions.map((referral) => (
                  <TableRow key={referral.referringAgentId} data-testid={`row-referral-${referral.referringAgentId}`}>
                    <TableCell className="font-medium" data-testid={`text-agent-${referral.referringAgentId}`}>
                      {referral.referringAgentName}
                    </TableCell>
                    <TableCell className="text-right font-medium" data-testid={`text-commission-${referral.referringAgentId}`}>
                      ${referral.totalReferralCommission.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
