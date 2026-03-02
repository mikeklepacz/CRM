import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { useModuleAccess, isNavItemEnabled } from "@/hooks/useModuleAccess";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SettingsTabsView } from "@/components/settings/settings-tabs-view";
import { googleOAuthSchema, passwordSchema, profileSchema, wooCommerceSchema } from "@/components/settings/settings-schemas";
import { defaultModules, visibilityToNavKey } from "@/components/settings/settings-constants";
import { useSettingsMutations } from "@/components/settings/use-settings-mutations";
import type { GoogleOAuthSettings, IntegrationStatus, UserPreferences, WooCommerceSettings } from "@/components/settings/settings-types";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { allowedModules, isLoading: moduleAccessLoading } = useModuleAccess();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [loadingLogoPreview, setLoadingLogoPreview] = useState<string | null>(null);

  // Fetch WooCommerce settings
  const { data: wooSettings } = useQuery<WooCommerceSettings>({
    queryKey: ["/api/woocommerce/settings"],
  });

  // Fetch Google OAuth settings (admin only)
  const { data: googleSettings } = useQuery<GoogleOAuthSettings>({
    queryKey: ["/api/auth/google/sheets/settings"],
    enabled: canAccessAdminFeatures(user),
  });

  // Fetch integration status (all users)
  const { data: integrationStatus } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  // Fetch user preferences to get existing loading logo, timezone, and defaultTimezoneMode
  const { data: userPreferences } = useQuery<UserPreferences>({
    queryKey: ['/api/user/preferences'],
  });

  // Fetch available categories
  const { data: categoriesData } = useQuery<{ categories: Array<{id: string, name: string}> }>({
    queryKey: ['/api/categories/active'],
  });
  const categories = categoriesData?.categories;

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
  
  const [visibleModules, setVisibleModules] = useState<Record<string, boolean>>(defaultModules);

  // Helper to check if a module should be shown in visibility settings (based on tenant access)
  const shouldShowModuleOption = (moduleKey: string): boolean => {
    const navKey = visibilityToNavKey[moduleKey];
    if (!navKey) return true; // Admin, Dashboard don't need tenant check
    return isNavItemEnabled(navKey, allowedModules, moduleAccessLoading);
  };

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
    if (userPreferences?.visibleModules) {
      setVisibleModules({ ...defaultModules, ...userPreferences.visibleModules });
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
      username: (user as any)?.username || "",
      agentName: user?.agentName || "",
      phone: (user as any)?.phone || "",
      meetingLink: (user as any)?.meetingLink || "",
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

  const {
    connectGoogleOAuthMutation,
    disconnectGoogleSheetsMutation,
    updateGoogleMutation,
    updateModulesMutation,
    updatePasswordMutation,
    updateProfileMutation,
    updateSelectedCategoryMutation,
    updateTimezoneMutation,
    updateWooMutation,
    uploadLoadingLogoMutation,
  } = useSettingsMutations({
    passwordForm,
    queryClient,
    setShowPasswordForm,
    toast,
  });

  const handleModuleToggle = (moduleKey: string, checked: boolean) => {
    const newModules = { ...visibleModules, [moduleKey]: checked };
    setVisibleModules(newModules);
    updateModulesMutation.mutate({ visibleModules: newModules });
  };

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

  const canAccessAdmin = canAccessAdminFeatures(user);

  return (
    <SettingsTabsView
      calendarReminderMethods={calendarReminderMethods}
      calendarReminderTimes={calendarReminderTimes}
      canAccessAdmin={canAccessAdmin}
      categories={categories}
      connectGoogleOAuthMutation={connectGoogleOAuthMutation}
      defaultTimezoneMode={defaultTimezoneMode}
      disconnectGoogleSheetsMutation={disconnectGoogleSheetsMutation}
      googleForm={googleForm}
      googleSettings={googleSettings}
      handleLogoFileChange={handleLogoFileChange}
      handleModuleToggle={handleModuleToggle}
      handleSaveTimezone={handleSaveTimezone}
      loadingLogoPreview={loadingLogoPreview}
      passwordForm={passwordForm}
      profileForm={profileForm}
      selectedCategory={selectedCategory}
      setCalendarReminderMethods={setCalendarReminderMethods}
      setCalendarReminderTimes={setCalendarReminderTimes}
      setDefaultTimezoneMode={setDefaultTimezoneMode}
      setSelectedCategory={setSelectedCategory}
      setShowPasswordForm={setShowPasswordForm}
      setTimeFormat={setTimeFormat}
      setTimezone={setTimezone}
      shouldShowModuleOption={shouldShowModuleOption}
      showPasswordForm={showPasswordForm}
      timeFormat={timeFormat}
      timezone={timezone}
      updateGoogleMutation={updateGoogleMutation}
      updatePasswordMutation={updatePasswordMutation}
      updateProfileMutation={updateProfileMutation}
      updateSelectedCategoryMutation={updateSelectedCategoryMutation}
      updateTimezoneMutation={updateTimezoneMutation}
      updateWooMutation={updateWooMutation}
      uploadLoadingLogoMutation={uploadLoadingLogoMutation}
      user={user}
      userPreferencesLoadingLogoUrl={userPreferences?.loadingLogoUrl}
      visibleModules={visibleModules}
      wooForm={wooForm}
    />
  );
}
