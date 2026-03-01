import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { GoogleOAuthSettings } from '@/components/settings/settings-types';

type Props = {
  connectPending: boolean;
  disconnectPending: boolean;
  googleForm: any;
  googleSettings?: GoogleOAuthSettings;
  onConnect: () => void;
  onDisconnect: () => void;
  onSubmit: (data: any) => void;
  savePending: boolean;
};

export function SettingsGoogleSheetsTab({
  connectPending,
  disconnectPending,
  googleForm,
  googleSettings,
  onConnect,
  onDisconnect,
  onSubmit,
  savePending,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Sheets Integration (System-Wide)</CardTitle>
        <CardDescription>
          Configure system-wide Google OAuth credentials. All agents will use these credentials to access Google Sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...googleForm}>
          <form onSubmit={googleForm.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={googleForm.control} name="clientId" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Client ID</FormLabel>
                <FormControl><Input placeholder="Your Google OAuth Client ID" {...field} data-testid="input-google-client-id" /></FormControl>
                <FormDescription>Get this from Google Cloud Console → APIs & Services → Credentials</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={googleForm.control} name="clientSecret" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Client Secret</FormLabel>
                <FormControl><Input type="password" placeholder="Your Google OAuth Client Secret" {...field} data-testid="input-google-client-secret" /></FormControl>
                <FormDescription>Your Google OAuth 2.0 client secret</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={savePending} data-testid="button-save-google">{savePending ? 'Saving...' : 'Save Credentials'}</Button>
          </form>
        </Form>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-3">Connection Status</h3>

          {googleSettings?.connected && googleSettings?.googleEmail ? (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-google-status">Active</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500">Connected as: {googleSettings.googleEmail}</p>
              {googleSettings.connectedByEmail ? <p className="text-sm text-green-600 dark:text-green-500 mt-1">Connected by: {googleSettings.connectedByEmail}</p> : null}
              {googleSettings.connectedAt ? <p className="text-xs text-green-500 dark:text-green-600 mt-1">Connected at: {new Date(googleSettings.connectedAt).toLocaleString()}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">After saving your credentials above, click Connect to authorize Google Sheets access</p>
          )}

          {googleSettings?.clientId ? (
            <div className="flex gap-2">
              <Button variant={googleSettings?.connected ? 'outline' : 'default'} onClick={onConnect} disabled={connectPending} data-testid="button-connect-google-oauth">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {connectPending ? 'Opening...' : googleSettings?.connected ? 'Reconnect Google Sheets' : 'Connect Google Sheets'}
              </Button>
              {googleSettings?.connected ? (
                <Button variant="destructive" onClick={onDisconnect} disabled={disconnectPending} data-testid="button-disconnect-google-sheets">
                  {disconnectPending ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Please save your Client ID and Secret first</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
