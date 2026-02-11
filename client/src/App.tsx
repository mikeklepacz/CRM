import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatPanelProvider } from "@/hooks/useChatPanel";
import { AgentFilterProvider } from "@/contexts/agent-filter-context";
import { ProjectProvider } from "@/contexts/project-context";
import { EventStreamProvider } from "@/lib/eventStream";
import { useAuth } from "@/hooks/useAuth";
import { useCustomTheme } from "@/hooks/use-custom-theme";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { Header } from "@/components/header";
import { TimezoneDetector } from "@/components/timezone-detector";
import { useQuery } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import ClientDashboard from "@/pages/client-dashboard";
import StoreDetails from "@/pages/store-details";
import SalesDashboard from "@/pages/sales-dashboard";
import SalesAssistant from "@/pages/sales-assistant";
import MapSearch from "@/pages/map-search";
import MapSearchSettings from "@/pages/map-search-settings";
import Documents from "@/pages/documents";
import Voice from "@/pages/voice";
import CallManager from "@/pages/call-manager";
import FollowUpCenter from "@/pages/follow-up-center";
import EHub from "@/pages/ehub";
import ProductMockup from "@/pages/product-mockup";
import SuperAdmin from "@/pages/super-admin";
import OrgAdmin from "@/pages/org-admin";
import Qualification from "@/pages/qualification";
import Apollo from "@/pages/apollo";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Fetch user preferences to check for timezone
  const { data: userPreferences, isLoading: prefsLoading } = useQuery<{ timezone?: string }>({
    queryKey: ['/api/user/preferences'],
    enabled: isAuthenticated,
  });
  
  // Apply global theme customization
  // Hook is always called (Rules of Hooks), but only applies colors when authenticated
  const { colorPresets, setColorPresets, deleteColorPreset } = useCustomTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <EventStreamProvider enabled={isAuthenticated}>
      <ProjectProvider>
        <ChatPanelProvider>
          <TimezoneDetector userTimezone={userPreferences?.timezone} isLoading={prefsLoading} />
          <div className="h-screen flex flex-col">
            <Header colorPresets={colorPresets} setColorPresets={setColorPresets} deleteColorPreset={deleteColorPreset} />
            <main className="flex-1 overflow-auto">
              <Switch>
              <Route path="/admin" component={Admin} />
              <Route path="/super-admin" component={SuperAdmin} />
              <Route path="/org-admin" component={OrgAdmin} />
              <Route path="/settings" component={Settings} />
              <Route path="/clients" component={ClientDashboard} />
              <Route path="/documents" component={Documents} />
              <Route path="/follow-up-center" component={FollowUpCenter} />
              <Route path="/map-search" component={MapSearch} />
              <Route path="/map-search-settings" component={MapSearchSettings} />
              <Route path="/sales" component={SalesDashboard} />
              <Route path="/assistant" component={SalesAssistant} />
              <Route path="/voice">
                {(canAccessAdminFeatures(user) || user?.hasVoiceAccess) ? <Voice /> : <NotFound />}
              </Route>
              <Route path="/call-manager">
                {(canAccessAdminFeatures(user) || user?.hasVoiceAccess) ? <CallManager /> : <NotFound />}
              </Route>
              <Route path="/ehub">
                {canAccessAdminFeatures(user) ? <EHub /> : <NotFound />}
              </Route>
              <Route path="/qualification" component={Qualification} />
              <Route path="/apollo">
                {canAccessAdminFeatures(user) ? <Apollo /> : <NotFound />}
              </Route>
              <Route path="/product-mockup" component={ProductMockup} />
              <Route path="/store/:storeId" component={StoreDetails} />
              <Route path="/" component={Dashboard} />
              <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </ChatPanelProvider>
      </ProjectProvider>
    </EventStreamProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="auto">
        <AgentFilterProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AgentFilterProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;