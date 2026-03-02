import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2, MapPin } from "lucide-react";
import { detectBrowserTimezone } from "@/components/org-admin/org-admin-utils";
import { TIMEZONE_DATA } from "@shared/timezoneUtils";

export function OrgAdminSettingsTab(props: any) {
  const p = props;

  return (
    <TabsContent value="settings">
      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Configure your organization's settings</CardDescription>
        </CardHeader>
        <CardContent>
          {p.settingsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Form {...p.settingsForm}>
              <form onSubmit={p.settingsForm.handleSubmit(p.handleSettingsSubmit)} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization Name</label>
                    <Input
                      value={p.settingsData?.tenant?.name || ""}
                      disabled
                      className="bg-muted"
                      data-testid="input-org-name"
                    />
                    <p className="text-xs text-muted-foreground">Contact support to change organization name</p>
                  </div>

                  <FormField
                    control={p.settingsForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Branding)</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Name" {...field} data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={p.settingsForm.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Timezone</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-timezone" className="flex-1">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIMEZONE_DATA.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label} ({tz.country})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const detected = detectBrowserTimezone();
                            field.onChange(detected);
                            const tzData = TIMEZONE_DATA.find((tz) => tz.value === detected);
                            p.toast({
                              title: "Timezone Detected",
                              description: `Set to ${tzData?.label || detected}`,
                            });
                          }}
                          title="Detect timezone from browser"
                          data-testid="button-detect-timezone"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={p.updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {p.updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
