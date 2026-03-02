import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { googleOAuthSchema, passwordSchema, profileSchema, wooCommerceSchema } from '@/components/settings/settings-schemas';

type ToastFn = (args: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;

type Props = {
  queryClient: any;
  setShowPasswordForm: (value: boolean) => void;
  toast: ToastFn;
  passwordForm: { reset: () => void };
};

export function useSettingsMutations({ passwordForm, queryClient, setShowPasswordForm, toast }: Props) {
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileSchema._type) => {
      return apiRequest('PUT', '/api/user/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({ title: 'Success', description: 'Profile updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordSchema._type) => {
      return apiRequest('PUT', '/api/user/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      setShowPasswordForm(false);
      toast({ title: 'Success', description: 'Password updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateSelectedCategoryMutation = useMutation({
    mutationFn: async (category: string) => apiRequest('POST', '/api/user/selected-category', { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/selected-category'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({ title: 'Success', description: 'CRM category filter updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateWooMutation = useMutation({
    mutationFn: async (data: typeof wooCommerceSchema._type) => apiRequest('PUT', '/api/woocommerce/settings', data),
    onSuccess: () => {
      toast({ title: 'Success', description: 'WooCommerce settings updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateGoogleMutation = useMutation({
    mutationFn: async (data: typeof googleOAuthSchema._type) => apiRequest('PUT', '/api/auth/google/sheets/settings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/google/sheets/settings'] });
      toast({ title: 'Success', description: 'Google Sheets settings updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const connectGoogleOAuthMutation = useMutation({
    mutationFn: async () => apiRequest('GET', '/api/auth/google/sheets/oauth-url'),
    onSuccess: (data: { url: string }) => {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      window.open(data.url, 'Google Sheets OAuth', `width=${width},height=${height},left=${left},top=${top}`);
      toast({ title: 'Opening Google Sheets Authentication', description: 'Please complete the authorization in the popup window' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const disconnectGoogleSheetsMutation = useMutation({
    mutationFn: async () => apiRequest('DELETE', '/api/auth/google/sheets/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/google/sheets/settings'] });
      toast({ title: 'Success', description: 'Google Sheets disconnected successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const uploadLoadingLogoMutation = useMutation({
    mutationFn: async (imageData: string) => apiRequest('POST', '/api/user/upload-loading-logo', { imageData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({ title: 'Success', description: 'Loading logo uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTimezoneMutation = useMutation({
    mutationFn: async (data: {
      timezone: string;
      defaultTimezoneMode: string;
      timeFormat: string;
      defaultCalendarReminders: Array<{ method: 'popup' | 'email'; minutes: number }>;
    }) => apiRequest('PUT', '/api/user/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({ title: 'Success', description: 'Timezone settings updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateModulesMutation = useMutation({
    mutationFn: async (data: { visibleModules: Record<string, boolean> }) => apiRequest('PUT', '/api/user/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      toast({ title: 'Success', description: 'Module visibility updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
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
  };
}
