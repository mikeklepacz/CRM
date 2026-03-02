import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type Props = {
  wooForm: any;
  onSubmit: (data: any) => void;
  pending: boolean;
};

export function SettingsWooCommerceTab({ onSubmit, pending, wooForm }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WooCommerce Integration</CardTitle>
        <CardDescription>Configure your WooCommerce store connection for order syncing</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...wooForm}>
          <form onSubmit={wooForm.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={wooForm.control} name="url" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Store URL</FormLabel>
                <FormControl><Input placeholder="https://yourstore.com" {...field} data-testid="input-woo-url" /></FormControl>
                <FormDescription>Your WooCommerce store URL</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={wooForm.control} name="consumerKey" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Consumer Key</FormLabel>
                <FormControl><Input placeholder="ck_..." {...field} data-testid="input-woo-key" /></FormControl>
                <FormDescription>WooCommerce REST API consumer key</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={wooForm.control} name="consumerSecret" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Consumer Secret</FormLabel>
                <FormControl><Input type="password" placeholder="cs_..." {...field} data-testid="input-woo-secret" /></FormControl>
                <FormDescription>WooCommerce REST API consumer secret</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={pending} data-testid="button-save-woo">{pending ? 'Saving...' : 'Save WooCommerce Settings'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
