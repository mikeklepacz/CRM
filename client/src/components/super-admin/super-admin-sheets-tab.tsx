import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { FileSpreadsheet } from "lucide-react";
import { GoogleSheetsSync } from "@/components/google-sheets-sync";

export function SuperAdminSheetsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="sheets">
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Integration</CardTitle>
          <CardDescription>Manage Google Sheets connections - Per tenant settings</CardDescription>
          <div className="pt-2">
            <Select value={p.configTenantId} onValueChange={p.setConfigTenantId}>
              <SelectTrigger className="w-[300px]" data-testid="select-sheets-tenant">
                <SelectValue placeholder="Select tenant to configure" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants (Overview)</SelectItem>
                {p.tenantsData?.tenants?.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {p.configTenantId === "all" ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Google Sheets Configuration</p>
              <p className="text-sm">Select a tenant to manage their Google Sheets connections</p>
            </div>
          ) : (
            <GoogleSheetsSync tenantId={p.configTenantId} />
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
