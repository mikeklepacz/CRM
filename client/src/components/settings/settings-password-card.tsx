import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type Props = {
  onCancel: () => void;
  onShow: () => void;
  onSubmit: (data: any) => void;
  passwordForm: any;
  pending: boolean;
  showPasswordForm: boolean;
};

export function SettingsPasswordCard({ onCancel, onShow, onSubmit, passwordForm, pending, showPasswordForm }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password</CardDescription>
      </CardHeader>
      <CardContent>
        {!showPasswordForm ? (
          <Button variant="outline" onClick={onShow} data-testid="button-change-password">Change Password</Button>
        ) : (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={passwordForm.control} name="currentPassword" render={({ field }: any) => (
                <FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" {...field} data-testid="input-current-password" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="newPassword" render={({ field }: any) => (
                <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} data-testid="input-new-password" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={passwordForm.control} name="confirmPassword" render={({ field }: any) => (
                <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} data-testid="input-confirm-password" /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex gap-2">
                <Button type="submit" disabled={pending} data-testid="button-save-password">{pending ? 'Updating...' : 'Update Password'}</Button>
                <Button type="button" variant="ghost" onClick={onCancel} data-testid="button-cancel-password">Cancel</Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
