import { Loader2, Users } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReferralCommissionsResponse } from "./types";

interface ReferralWidgetProps {
  data: ReferralCommissionsResponse | undefined;
  isLoading: boolean;
}

export function ReferralWidget({ data, isLoading }: ReferralWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Referral Commissions
        </CardTitle>
        <CardDescription>Agents earning commissions from referrals</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data?.referralCommissions || data.referralCommissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
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
