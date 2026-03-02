import { ArrowLeft, Clock, FileSpreadsheet, Filter, LayoutGrid, Plug, ShoppingCart, User } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Integrations } from '@/components/integrations';
import { SettingsCrmFilterTab } from '@/components/settings/settings-crm-filter-tab';
import { SettingsGoogleSheetsTab } from '@/components/settings/settings-google-sheets-tab';
import { SettingsLoadingLogoCard } from '@/components/settings/settings-loading-logo-card';
import { SettingsModulesTab } from '@/components/settings/settings-modules-tab';
import { SettingsPasswordCard } from '@/components/settings/settings-password-card';
import { SettingsProfileInfoCard } from '@/components/settings/settings-profile-info-card';
import { SettingsTimezoneTab } from '@/components/settings/settings-timezone-tab';
import { SettingsWooCommerceTab } from '@/components/settings/settings-woocommerce-tab';
import type { GoogleOAuthSettings } from '@/components/settings/settings-types';

type Props = {
  calendarReminderMethods: ('popup' | 'email')[];
  calendarReminderTimes: number[];
  canAccessAdmin: boolean;
  connectGoogleOAuthMutation: { isPending: boolean; mutate: () => void };
  defaultTimezoneMode: string;
  disconnectGoogleSheetsMutation: { isPending: boolean; mutate: () => void };
  googleForm: any;
  googleSettings?: GoogleOAuthSettings;
  handleLogoFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleModuleToggle: (moduleKey: string, checked: boolean) => void;
  handleSaveTimezone: () => void;
  loadingLogoPreview: string | null;
  passwordForm: any;
  profileForm: any;
  selectedCategory: string;
  setCalendarReminderMethods: React.Dispatch<React.SetStateAction<('popup' | 'email')[]>>;
  setCalendarReminderTimes: React.Dispatch<React.SetStateAction<number[]>>;
  setDefaultTimezoneMode: (value: string) => void;
  setSelectedCategory: (value: string) => void;
  setShowPasswordForm: (value: boolean) => void;
  setTimeFormat: (value: string) => void;
  setTimezone: (value: string) => void;
  shouldShowModuleOption: (moduleKey: string) => boolean;
  showPasswordForm: boolean;
  timeFormat: string;
  timezone: string;
  updateGoogleMutation: { isPending: boolean; mutate: (data: any) => void };
  updatePasswordMutation: { isPending: boolean; mutate: (data: any) => void };
  updateProfileMutation: { isPending: boolean; mutate: (data: any) => void };
  updateSelectedCategoryMutation: { isPending: boolean; mutate: (category: string) => void };
  updateTimezoneMutation: { isPending: boolean };
  updateWooMutation: { isPending: boolean; mutate: (data: any) => void };
  uploadLoadingLogoMutation: { isPending: boolean };
  user: any;
  userPreferencesLoadingLogoUrl?: string;
  visibleModules: Record<string, boolean>;
  wooForm: any;
  categories?: Array<{ id: string; name: string }>;
};

export function SettingsTabsView(props: Props) {
  const dashboardPath = props.canAccessAdmin ? '/admin' : '/agent';

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
        <p className="text-muted-foreground mt-2">Manage your account settings and integrations</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile"><User className="mr-2 h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations"><Plug className="mr-2 h-4 w-4" />Integrations</TabsTrigger>
          <TabsTrigger value="timezone" data-testid="tab-timezone"><Clock className="mr-2 h-4 w-4" />Timezone</TabsTrigger>
          <TabsTrigger value="crm-filter" data-testid="tab-crm-filter"><Filter className="mr-2 h-4 w-4" />CRM Filter</TabsTrigger>
          <TabsTrigger value="modules" data-testid="tab-modules"><LayoutGrid className="mr-2 h-4 w-4" />Modules</TabsTrigger>
          {props.canAccessAdmin ? (
            <>
              <TabsTrigger value="woocommerce" data-testid="tab-woocommerce"><ShoppingCart className="mr-2 h-4 w-4" />WooCommerce</TabsTrigger>
              <TabsTrigger value="google-sheets" data-testid="tab-google"><FileSpreadsheet className="mr-2 h-4 w-4" />Google Sheets</TabsTrigger>
            </>
          ) : null}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <SettingsProfileInfoCard profileForm={props.profileForm} onSubmit={(data) => props.updateProfileMutation.mutate(data)} pending={props.updateProfileMutation.isPending} />
          <SettingsPasswordCard
            onCancel={() => {
              props.setShowPasswordForm(false);
              props.passwordForm.reset();
            }}
            onShow={() => props.setShowPasswordForm(true)}
            onSubmit={(data) => props.updatePasswordMutation.mutate(data)}
            passwordForm={props.passwordForm}
            pending={props.updatePasswordMutation.isPending}
            showPasswordForm={props.showPasswordForm}
          />
          <SettingsLoadingLogoCard
            loadingLogoPreview={props.loadingLogoPreview}
            logoUrl={props.userPreferencesLoadingLogoUrl}
            onChangeFile={props.handleLogoFileChange}
            pending={props.uploadLoadingLogoMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="integrations"><Integrations /></TabsContent>

        <TabsContent value="timezone" className="space-y-6">
          <SettingsTimezoneTab
            calendarReminderMethods={props.calendarReminderMethods}
            calendarReminderTimes={props.calendarReminderTimes}
            defaultTimezoneMode={props.defaultTimezoneMode}
            onSaveTimezone={props.handleSaveTimezone}
            setCalendarReminderMethods={props.setCalendarReminderMethods}
            setCalendarReminderTimes={props.setCalendarReminderTimes}
            setDefaultTimezoneMode={props.setDefaultTimezoneMode}
            setTimeFormat={props.setTimeFormat}
            setTimezone={props.setTimezone}
            timeFormat={props.timeFormat}
            timezone={props.timezone}
            timezonePending={props.updateTimezoneMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="crm-filter" className="space-y-6">
          <SettingsCrmFilterTab
            categories={props.categories}
            selectedCategory={props.selectedCategory}
            setSelectedCategory={props.setSelectedCategory}
            onSave={() => props.updateSelectedCategoryMutation.mutate(props.selectedCategory)}
            savePending={props.updateSelectedCategoryMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <SettingsModulesTab
            canAccessAdmin={props.canAccessAdmin}
            shouldShowModuleOption={props.shouldShowModuleOption}
            userHasVoiceAccess={props.user.hasVoiceAccess}
            visibleModules={props.visibleModules}
            onToggle={props.handleModuleToggle}
          />
        </TabsContent>

        {props.canAccessAdmin ? (
          <>
            <TabsContent value="woocommerce">
              <SettingsWooCommerceTab wooForm={props.wooForm} onSubmit={(data) => props.updateWooMutation.mutate(data)} pending={props.updateWooMutation.isPending} />
            </TabsContent>
            <TabsContent value="google-sheets">
              <SettingsGoogleSheetsTab
                connectPending={props.connectGoogleOAuthMutation.isPending}
                disconnectPending={props.disconnectGoogleSheetsMutation.isPending}
                googleForm={props.googleForm}
                googleSettings={props.googleSettings}
                onConnect={() => props.connectGoogleOAuthMutation.mutate()}
                onDisconnect={() => props.disconnectGoogleSheetsMutation.mutate()}
                onSubmit={(data) => props.updateGoogleMutation.mutate(data)}
                savePending={props.updateGoogleMutation.isPending}
              />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
  );
}
