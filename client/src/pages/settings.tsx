import { useState, useEffect } from "react";
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
import { User, ShoppingCart, FileSpreadsheet, ArrowLeft, Plug, Mail, Clock, Tag, Filter } from "lucide-react";
import { Link } from "wouter";
import { Integrations } from "@/components/integrations";
import { TimezoneAutocomplete } from "@/components/timezone-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { CategoryManagement } from "@/components/category-management";

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

type IntegrationStatus = {
  googleSheetsConnected: boolean;
  googleCalendarConnected: boolean;
  googleSheetsEmail: string | null;
  googleCalendarEmail: string | null;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loadingLogoPreview, setLoadingLogoPreview] = useState<string | null>(null);

  // Fetch WooCommerce settings
  const { data: wooSettings } = useQuery<WooCommerceSettings>({
    queryKey: ["/api/woocommerce/settings"],
  });

  // Fetch Google OAuth settings (admin only)
  const { data: googleSettings } = useQuery<GoogleOAuthSettings>({
    queryKey: ["/api/google/settings"],
    enabled: user?.role === 'admin',
  });

  // Fetch integration status (all users)
  const { data: integrationStatus } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  // Fetch user preferences to get existing loading logo, timezone, and defaultTimezoneMode
  const { data: userPreferences } = useQuery<{ 
    loadingLogoUrl?: string;
    timezone?: string;
    defaultTimezoneMode?: string;
    timeFormat?: string;
    defaultCalendarReminders?: Array<{method: 'popup' | 'email', minutes: number}>;
  }>({
    queryKey: ['/api/user/preferences'],
  });

  // Fetch available categories
  const { data: categories } = useQuery<Array<{id: string, name: string}>>({
    queryKey: ['/api/categories'],
  });

  // Fetch user's selected category for CRM filtering
  const { data: selectedCategoryData } = useQuery<{ category: string | null }>({
    queryKey: ['/api/user/selected-category'],
  });

  // Timezone and time format state
  const [timezone, setTimezone] = useState<string>(userPreferences?.timezone || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [defaultTimezoneMode, setDefaultTimezoneMode] = useState<string>(
    userPreferences?.defaultTimezoneMode || "agent"
  );
  const [timeFormat, setTimeFormat] = useState<string>(
    userPreferences?.timeFormat || "12hr"
  );
  
  // Calendar reminders state
  const [calendarReminderTimes, setCalendarReminderTimes] = useState<number[]>([0]);
  const [calendarReminderMethods, setCalendarReminderMethods] = useState<('popup' | 'email')[]>(['popup']);

  // Update state when preferences load
  useEffect(() => {
    if (userPreferences?.timezone) {
      setTimezone(userPreferences.timezone);
    }
    if (userPreferences?.defaultTimezoneMode) {
      setDefaultTimezoneMode(userPreferences.defaultTimezoneMode);
    }
    if (userPreferences?.timeFormat) {
      setTimeFormat(userPreferences.timeFormat);
    }
    if (userPreferences?.defaultCalendarReminders) {
      // Extract unique times and methods from preferences
      const times = Array.from(new Set(userPreferences.defaultCalendarReminders.map(r => r.minutes)));
      const methods = Array.from(new Set(userPreferences.defaultCalendarReminders.map(r => r.method))) as ('popup' | 'email')[];
      setCalendarReminderTimes(times);
      setCalendarReminderMethods(methods);
    }
  }, [userPreferences]);

  // Update selected category state when data loads
  useEffect(() => {
    if (selectedCategoryData?.category) {
      setSelectedCategory(selectedCategoryData.category);
    }
  }, [selectedCategoryData]);

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

  const updateSelectedCategoryMutation = useMutation({
    mutationFn: async (category: string) => {
      return await apiRequest("POST", "/api/user/selected-category", { category });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/selected-category'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "Success",
        description: "CRM category filter updated successfully",
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

  const uploadLoadingLogoMutation = useMutation({
    mutationFn: async (imageData: string) => {
      return await apiRequest("POST", "/api/user/upload-loading-logo", { imageData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Success",
        description: "Loading logo uploaded successfully",
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

  const updateTimezoneMutation = useMutation({
    mutationFn: async (data: { 
      timezone: string; 
      defaultTimezoneMode: string; 
      timeFormat: string;
      defaultCalendarReminders: Array<{method: 'popup' | 'email', minutes: number}>;
    }) => {
      return await apiRequest("PUT", "/api/user/preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({
        title: "Success",
        description: "Timezone settings updated successfully",
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

  const handleSaveTimezone = () => {
    if (!timezone) {
      toast({
        title: "Error",
        description: "Please select a timezone",
        variant: "destructive",
      });
      return;
    }
    
    // Build calendar reminders array from selected times and methods
    const defaultCalendarReminders = calendarReminderTimes.flatMap(minutes =>
      calendarReminderMethods.map(method => ({ method, minutes }))
    );
    
    updateTimezoneMutation.mutate({ 
      timezone, 
      defaultTimezoneMode, 
      timeFormat,
      defaultCalendarReminders
    });
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image is too large. Maximum size is 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setLoadingLogoPreview(imageData);
      uploadLoadingLogoMutation.mutate(imageData);
    };
    reader.readAsDataURL(file);
  };

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
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Plug className="mr-2 h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="timezone" data-testid="tab-timezone">
            <Clock className="mr-2 h-4 w-4" />
            Timezone
          </TabsTrigger>
          <TabsTrigger value="crm-filter" data-testid="tab-crm-filter">
            <Filter className="mr-2 h-4 w-4" />
            CRM Filter
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
              <TabsTrigger value="categories" data-testid="tab-categories">
                <Tag className="mr-2 h-4 w-4" />
                Categories
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

          <Card>
            <CardHeader>
              <CardTitle>Loading Logo</CardTitle>
              <CardDescription>Customize the logo that appears on loading screens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                {(loadingLogoPreview || userPreferences?.loadingLogoUrl) && (
                  <div className="flex justify-center p-4 border rounded-md bg-muted/20">
                    <img
                      src={loadingLogoPreview || userPreferences?.loadingLogoUrl}
                      alt="Loading logo preview"
                      className="max-w-xs max-h-48 object-contain"
                      data-testid="img-loading-logo-preview"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="logo-upload" className="block mb-2">
                    Upload Logo Image
                  </Label>
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={uploadLoadingLogoMutation.isPending}
                    data-testid="input-upload-logo"
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    PNG, JPG, or GIF. Maximum size: 5MB
                  </p>
                </div>

                {uploadLoadingLogoMutation.isPending && (
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Integrations />
        </TabsContent>

        <TabsContent value="timezone" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timezone Settings</CardTitle>
              <CardDescription>
                Configure your timezone and default reminder settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Your Timezone</Label>
                <TimezoneAutocomplete
                  value={timezone}
                  onChange={setTimezone}
                  placeholder="Select your timezone..."
                />
                <p className="text-sm text-muted-foreground">
                  This will be used to display times correctly and schedule reminders
                </p>
              </div>

              <div className="space-y-2">
                <Label>Default Reminder Mode</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose whether new reminders should default to your timezone or the customer's timezone
                </p>
                <RadioGroup value={defaultTimezoneMode} onValueChange={setDefaultTimezoneMode}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="agent" id="agent" data-testid="radio-agent-timezone" />
                    <Label htmlFor="agent" className="font-normal cursor-pointer">
                      My timezone - Schedule reminders in my own timezone
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="customer" id="customer" data-testid="radio-customer-timezone" />
                    <Label htmlFor="customer" className="font-normal cursor-pointer">
                      Customer timezone - Auto-detect and use customer's timezone when available
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Time Display Format</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose how you want times displayed throughout the app
                </p>
                <RadioGroup value={timeFormat} onValueChange={setTimeFormat}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="12hr" id="12hr" data-testid="radio-12hr-format" />
                    <Label htmlFor="12hr" className="font-normal cursor-pointer">
                      12-hour format (9:00 AM, 3:30 PM)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="24hr" id="24hr" data-testid="radio-24hr-format" />
                    <Label htmlFor="24hr" className="font-normal cursor-pointer">
                      24-hour format (09:00, 15:30)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3 pt-2">
                <Label>Google Calendar Reminder Defaults</Label>
                <p className="text-sm text-muted-foreground">
                  When reminders are synced to Google Calendar, these alert times will be used by default
                </p>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reminder Times</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 0, label: 'At event time' },
                      { value: 5, label: '5 minutes before' },
                      { value: 10, label: '10 minutes before' },
                      { value: 15, label: '15 minutes before' },
                      { value: 30, label: '30 minutes before' },
                      { value: 60, label: '1 hour before' },
                    ].map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`reminder-time-${value}`}
                          checked={calendarReminderTimes.includes(value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCalendarReminderTimes([...calendarReminderTimes, value]);
                            } else {
                              setCalendarReminderTimes(calendarReminderTimes.filter(t => t !== value));
                            }
                          }}
                          data-testid={`checkbox-reminder-time-${value}`}
                        />
                        <Label 
                          htmlFor={`reminder-time-${value}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Reminder Type</Label>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reminder-method-popup"
                        checked={calendarReminderMethods.includes('popup')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCalendarReminderMethods([...calendarReminderMethods, 'popup']);
                          } else {
                            setCalendarReminderMethods(calendarReminderMethods.filter(m => m !== 'popup'));
                          }
                        }}
                        data-testid="checkbox-reminder-popup"
                      />
                      <Label 
                        htmlFor="reminder-method-popup"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Popup notification
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="reminder-method-email"
                        checked={calendarReminderMethods.includes('email')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCalendarReminderMethods([...calendarReminderMethods, 'email']);
                          } else {
                            setCalendarReminderMethods(calendarReminderMethods.filter(m => m !== 'email'));
                          }
                        }}
                        data-testid="checkbox-reminder-email"
                      />
                      <Label 
                        htmlFor="reminder-method-email"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Email reminder
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveTimezone}
                disabled={updateTimezoneMutation.isPending || !timezone}
                data-testid="button-save-timezone"
              >
                {updateTimezoneMutation.isPending ? "Saving..." : "Save Timezone Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm-filter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CRM Category Filter</CardTitle>
              <CardDescription>
                Select which category of stores to view in your CRM dashboard. You can only view one category at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Active Category</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Your CRM will only show stores from the selected category. This keeps different sales teams (e.g., Pets, Cannabis) completely separate.
                </p>
                <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                  {categories?.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={category.name} id={category.id} data-testid={`radio-category-${category.name.toLowerCase()}`} />
                      <Label htmlFor={category.id} className="font-normal cursor-pointer">
                        {category.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {!categories || categories.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No categories available. Ask your admin to create categories.
                  </p>
                )}
              </div>

              <Button
                onClick={() => updateSelectedCategoryMutation.mutate(selectedCategory)}
                disabled={updateSelectedCategoryMutation.isPending || !selectedCategory}
                data-testid="button-save-category-filter"
              >
                {updateSelectedCategoryMutation.isPending ? "Saving..." : "Save Category Filter"}
              </Button>
            </CardContent>
          </Card>
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

            <TabsContent value="categories">
              <CategoryManagement />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
