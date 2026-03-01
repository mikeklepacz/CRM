import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User as UserIcon, TrendingUp, DollarSign } from "lucide-react";

export function UserManagementSummaryCards(props: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-users">{props.activeUsers.length}</div>
          <p className="text-xs text-muted-foreground">
            {props.activeUsers.filter((u: any) => u.role === "admin").length} admins, {props.activeUsers.filter((u: any) => u.role === "agent").length} agents
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-total-sales">{props.totalSales}</div>
          <p className="text-xs text-muted-foreground">Across all agents</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="text-gross-income">${props.totalGrossIncome.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Total revenue generated</p>
        </CardContent>
      </Card>
    </div>
  );
}
