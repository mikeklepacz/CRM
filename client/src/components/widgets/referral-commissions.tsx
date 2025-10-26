import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";

interface ReferredAgent {
  agentId: string;
  agentName: string;
  totalEarnings: number;
}

interface ReferralCommissionData {
  referringAgentId: string;
  referringAgentName: string;
  totalReferralCommission: number;
  referredAgents: ReferredAgent[];
}

interface ReferralCommissionsResponse {
  referralCommissions: ReferralCommissionData[];
}

export function ReferralCommissionsWidget() {
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
              <CardDescription className="mt-1.5">Agents earning from referrals</CardDescription>
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
            No referral commissions yet. When agents you referred make sales, your referral earnings will appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {data.referralCommissions.map((referral) => (
              <div key={referral.referringAgentId}>
                {referral.referredAgents && referral.referredAgents.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referred Agent</TableHead>
                          <TableHead className="text-right">Your Earnings from Referral</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {referral.referredAgents.map((agent) => (
                          <TableRow key={agent.agentId} data-testid={`row-referred-agent-${agent.agentId}`}>
                            <TableCell className="font-medium" data-testid={`text-referred-agent-${agent.agentId}`}>
                              {agent.agentName}
                            </TableCell>
                            <TableCell className="text-right font-medium" data-testid={`text-earnings-${agent.agentId}`}>
                              ${agent.totalEarnings.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right" data-testid="text-total-earnings">
                            ${referral.totalReferralCommission.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
