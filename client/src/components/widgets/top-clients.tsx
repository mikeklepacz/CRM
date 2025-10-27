import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentFilter } from '@/contexts/agent-filter-context';

interface TopClient {
  id: string;
  name: string;
  totalRevenue: string;
  totalCommission: string;
  orderCount: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
}

export function TopClientsWidget() {
  const { selectedAgentIds } = useAgentFilter();

  const { data, isLoading, error } = useQuery<{ topClients: TopClient[] }>({
    queryKey: ['/api/analytics/top-clients', selectedAgentIds],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '10' });
      if (selectedAgentIds.length > 0) {
        selectedAgentIds.forEach(id => params.append('agentIds', id));
      }
      const response = await fetch(`/api/analytics/top-clients?${params}`);
      if (!response.ok) throw new Error('Failed to fetch top clients');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Top Clients</CardTitle>
          <CardDescription>Revenue leaders and order history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="drag-handle cursor-move">
          <CardTitle>Top Clients</CardTitle>
          <CardDescription>Revenue leaders and order history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" data-testid="error-top-clients">
            Failed to load top clients
          </p>
        </CardContent>
      </Card>
    );
  }

  const topClients = data.topClients.slice(0, 10);

  return (
    <Card className="h-full">
      <CardHeader className="drag-handle cursor-move">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top Clients
        </CardTitle>
        <CardDescription>Revenue leaders and order history</CardDescription>
      </CardHeader>
      <CardContent>
        {topClients.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No client data available
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {topClients.map((client, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted/30 hover-elevate rounded-md transition-colors"
                  data-testid={`top-client-${index}`}
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <Badge 
                      variant={index === 0 ? "default" : "secondary"}
                      className="w-8 h-8 flex items-center justify-center rounded-full"
                    >
                      {index + 1}
                    </Badge>
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" data-testid={`client-name-${index}`}>
                      {client.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {client.orderCount} {client.orderCount === 1 ? 'order' : 'orders'}
                      </span>
                      {client.lastOrderDate && (
                        <span className="text-xs text-muted-foreground">
                          Last: {new Date(client.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="text-right">
                    <p className="text-lg font-semibold" data-testid={`client-commission-${index}`}>
                      ${parseFloat(client.totalCommission).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total commission
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
