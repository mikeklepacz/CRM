import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type Props = {
  profileForm: any;
  onSubmit: (data: any) => void;
  pending: boolean;
};

export function SettingsProfileInfoCard({ onSubmit, pending, profileForm }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your profile details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={profileForm.control} name="firstName" render={({ field }: any) => (
              <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} data-testid="input-first-name" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={profileForm.control} name="lastName" render={({ field }: any) => (
              <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} data-testid="input-last-name" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={profileForm.control} name="email" render={({ field }: any) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} data-testid="input-profile-email" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={profileForm.control} name="username" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl><Input {...field} data-testid="input-username" /></FormControl>
                <FormDescription>Your login username</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={profileForm.control} name="agentName" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Agent Name</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., Michael Klepacz" data-testid="input-agent-name" /></FormControl>
                <FormDescription>This name must match exactly with WooCommerce and Google Sheets</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={profileForm.control} name="phone" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., (555) 123-4567" data-testid="input-agent-phone" /></FormControl>
                <FormDescription>Your phone number for email templates</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={profileForm.control} name="meetingLink" render={({ field }: any) => (
              <FormItem>
                <FormLabel>Meeting Link</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., https://calendly.com/yourname" data-testid="input-meeting-link" /></FormControl>
                <FormDescription>Your calendar/meeting link (Calendly, Google Meet, etc.)</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={pending} data-testid="button-save-profile">{pending ? 'Saving...' : 'Save Changes'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
