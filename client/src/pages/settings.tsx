import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { User, ShoppingCart, FileSpreadsheet, ArrowLeft, Plug, Mail } from "lucide-react";
import { Link } from "wouter";
import { Integrations } from "@/components/integrations";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  agentName: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const wooCommerceSchema = z.object({
  url: z.string().url("Invalid URL").min(1, "WooCommerce URL is required"),
  consumerKey: z.string().min(1, "Consumer key is required"),
  consumerSecret: z.string().min(1, "Consumer secret is required"),
});

const googleOAuthSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
});

type WooCommerceSettings = {
  url: string;
  consumerKey: string;
  consumerSecret: string;
};

type GoogleOAuthSettings = {
  clientId: string;
  clientSecret: string;
  googleEmail?: string | null;
  gmailEmail?: string | null;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Fetch WooCommerce settings
  const { data: wooSettings } = useQuery<WooCommerceSettings>({
    queryKey: ["/api/woocommerce/settings"],
  });

  // Fetch Google OAuth settings
  const { data: googleSettings } = useQuery<GoogleOAuthSettings>({
    queryKey: ["/api/google/settings"],
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      agentName: user?.agentName || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const wooForm = useForm({
    resolver: zodResolver(wooCommerceSchema),
    defaultValues: {
      url: "",
      consumerKey: "",
      consumerSecret: "",
    },
    values: wooSettings ? {
      url: wooSettings.url || "",
      consumerKey: wooSettings.consumerKey || "",
      consumerSecret: wooSettings.consumerSecret || "",
    } : undefined,
  });

  const googleForm = useForm({
    resolver: zodResolver(googleOAuthSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
    },
    values: googleSettings ? {
      clientId: googleSettings.clientId || "",
      clientSecret: googleSettings.clientSecret || "",
    } : undefined,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      return await apiRequest("PUT", "/api/user/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      return await apiRequest("PUT", "/api/user/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      setShowPasswordForm(false);
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateWooMutation = useMutation({
    mutationFn: async (data: z.infer<typeof wooCommerceSchema>) => {
      return await apiRequest("PUT", "/api/woocommerce/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "WooCommerce settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateGoogleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof googleOAuthSchema>) => {
      return await apiRequest("PUT", "/api/google/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google/settings"] });
      toast({
        title: "Success",
        description: "Google OAuth settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connectGoogleOAuthMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("GET", "/api/google/oauth-url");
    },
    onSuccess: (data: { url: string }) => {
      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      window.open(
        data.url,
        "Google OAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      toast({
        title: "Opening Google Authentication",
        description: "Please complete the authorization in the popup window",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const dashboardPath = user.role === 'admin' ? '/admin' : '/agent';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <Link href={dashboardPath}>
          <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and integrations
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="gmail" data-testid="tab-gmail">
            <Mail className="mr-2 h-4 w-4" />
            Gmail
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          {user.role === 'admin' && (
            <>
              <TabsTrigger value="woocommerce" data-testid="tab-woocommerce">
                <ShoppingCart className="mr-2 h-4 w-4" />
                WooCommerce
              </TabsTrigger>
              <TabsTrigger value="google-sheets" data-testid="tab-google">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Google Sheets
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} data-testid="input-profile-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="agentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Michael Klepacz" data-testid="input-agent-name" />
                        </FormControl>
                        <FormDescription>
                          This name must match exactly with WooCommerce and Google Sheets
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your account password</CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowPasswordForm(true)}
                  data-testid="button-change-password"
                >
                  Change Password
                </Button>
              ) : (
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-current-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        data-testid="button-save-password"
                      >
                        {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowPasswordForm(false);
                          passwordForm.reset();
                        }}
                        data-testid="button-cancel-password"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gmail">
          <Card>
            <CardHeader>
              <CardTitle>Gmail Integration</CardTitle>
              <CardDescription>
                Connect your Gmail account to create email drafts directly from the Sales Assistant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted/50 p-4">
                <h4 className="text-sm font-medium mb-2">How it works:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>The AI Sales Assistant can draft personalized emails based on store context</li>
                  <li>Click "Create Gmail Draft" to save the email as a draft in your Gmail</li>
                  <li>Open Gmail to review, edit, and send the draft</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Connection Status</h3>
                
                {googleSettings?.gmailEmail ? (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-gmail-status">
                        Connected
                      </span>
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Gmail account: {googleSettings.gmailEmail}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Gmail account to enable AI-powered email drafting
                  </p>
                )}
                
                <Button
                  variant={googleSettings?.gmailEmail ? "outline" : "default"}
                  onClick={() => connectGoogleOAuthMutation.mutate()}
                  disabled={connectGoogleOAuthMutation.isPending}
                  data-testid="button-connect-gmail"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {connectGoogleOAuthMutation.isPending ? "Opening..." : googleSettings?.gmailEmail ? "Reconnect Gmail" : "Connect Gmail"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Integrations />
        </TabsContent>

        {user.role === 'admin' && (
          <>
            <TabsContent value="woocommerce">
              <Card>
                <CardHeader>
                  <CardTitle>WooCommerce Integration</CardTitle>
                  <CardDescription>
                    Configure your WooCommerce store connection for order syncing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...wooForm}>
                    <form onSubmit={wooForm.handleSubmit((data) => updateWooMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={wooForm.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Store URL</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://yourstore.com"
                                {...field}
                                data-testid="input-woo-url"
                              />
                            </FormControl>
                            <FormDescription>Your WooCommerce store URL</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={wooForm.control}
                        name="consumerKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Consumer Key</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="ck_..."
                                {...field}
                                data-testid="input-woo-key"
                              />
                            </FormControl>
                            <FormDescription>WooCommerce REST API consumer key</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={wooForm.control}
                        name="consumerSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Consumer Secret</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="cs_..."
                                {...field}
                                data-testid="input-woo-secret"
                              />
                            </FormControl>
                            <FormDescription>WooCommerce REST API consumer secret</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={updateWooMutation.isPending}
                        data-testid="button-save-woo"
                      >
                        {updateWooMutation.isPending ? "Saving..." : "Save WooCommerce Settings"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="google-sheets">
              <Card>
                <CardHeader>
                  <CardTitle>Google Sheets Integration</CardTitle>
                  <CardDescription>
                    Configure your Google OAuth credentials and connect to Google Sheets
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...googleForm}>
                    <form onSubmit={googleForm.handleSubmit((data) => updateGoogleMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={googleForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Your Google OAuth Client ID"
                                {...field}
                                data-testid="input-google-client-id"
                              />
                            </FormControl>
                            <FormDescription>
                              Get this from Google Cloud Console → APIs & Services → Credentials
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={googleForm.control}
                        name="clientSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Your Google OAuth Client Secret"
                                {...field}
                                data-testid="input-google-client-secret"
                              />
                            </FormControl>
                            <FormDescription>
                              Your Google OAuth 2.0 client secret
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        disabled={updateGoogleMutation.isPending}
                        data-testid="button-save-google"
                      >
                        {updateGoogleMutation.isPending ? "Saving..." : "Save Credentials"}
                      </Button>
                    </form>
                  </Form>

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-medium mb-3">Connection Status</h3>
                    
                    {googleSettings?.googleEmail ? (
                      <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700 dark:text-green-400" data-testid="text-google-status">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          Connected as: {googleSettings.googleEmail}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-4">
                        After saving your credentials above, click Connect to authorize Google Sheets access
                      </p>
                    )}
                    
                    {googleSettings?.clientId ? (
                      <Button
                        variant={googleSettings?.googleEmail ? "outline" : "default"}
                        onClick={() => connectGoogleOAuthMutation.mutate()}
                        disabled={connectGoogleOAuthMutation.isPending}
                        data-testid="button-connect-google-oauth"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {connectGoogleOAuthMutation.isPending ? "Opening..." : googleSettings?.googleEmail ? "Reconnect Google Sheets" : "Connect Google Sheets"}
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Please save your Client ID and Secret first
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
