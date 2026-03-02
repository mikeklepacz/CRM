import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Building2, FileSpreadsheet, Mic, Tag, Ticket, Users, Webhook } from "lucide-react";

export function SuperAdminTabsList(props: any) {
  const p = props;

  return (
    <TabsList className="flex flex-wrap h-auto gap-1">
      <TabsTrigger value="tenants" data-testid="tab-tenants">
        <Building2 className="mr-2 h-4 w-4" />
        Tenants
      </TabsTrigger>
      <TabsTrigger value="users" data-testid="tab-users">
        <Users className="mr-2 h-4 w-4" />
        Users
      </TabsTrigger>
      <TabsTrigger value="metrics" data-testid="tab-metrics">
        <BarChart3 className="mr-2 h-4 w-4" />
        Metrics
      </TabsTrigger>
      <TabsTrigger value="tickets" data-testid="tab-tickets">
        <Ticket className="mr-2 h-4 w-4" />
        Tickets
        {p.unreadTicketCount > 0 && (
          <Badge variant="destructive" className="ml-2 text-xs">{p.unreadTicketCount}</Badge>
        )}
      </TabsTrigger>
      <TabsTrigger value="webhooks" data-testid="tab-webhooks">
        <Webhook className="mr-2 h-4 w-4" />
        Webhooks
      </TabsTrigger>
      <TabsTrigger value="voice" data-testid="tab-voice">
        <Mic className="mr-2 h-4 w-4" />
        Voice
      </TabsTrigger>
      <TabsTrigger value="sheets" data-testid="tab-sheets">
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Google Sheets
      </TabsTrigger>
      <TabsTrigger value="categories" data-testid="tab-categories">
        <Tag className="mr-2 h-4 w-4" />
        Categories
      </TabsTrigger>
    </TabsList>
  );
}
