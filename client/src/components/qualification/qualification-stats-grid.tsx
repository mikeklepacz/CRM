import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  averageScore: number | null | undefined;
  pendingCalls: number;
  qualifiedLeads: number;
  totalLeads: number;
};

export function QualificationStatsGrid({ averageScore, pendingCalls, qualifiedLeads, totalLeads }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-leads">{totalLeads}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600" data-testid="text-qualified-leads">{qualifiedLeads}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending-calls">{pendingCalls}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-avg-score">{averageScore ?? 'N/A'}</div>
        </CardContent>
      </Card>
    </div>
  );
}
