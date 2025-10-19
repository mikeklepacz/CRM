import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/header";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import AgentDashboard from "@/pages/agent-dashboard";
import Settings from "@/pages/settings";
import ClientDashboard from "@/pages/client-dashboard";
import StoreDetails from "@/pages/store-details";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

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
    <>
      <Header />
      <Switch>
        <Route path="/settings" component={Settings} />
        <Route path="/clients" component={ClientDashboard} />
        <Route path="/store/:storeId" component={StoreDetails} />
        <Route path="/admin">
          {user?.role === 'admin' ? <AdminDashboard /> : <NotFound />}
        </Route>
        <Route path="/agent" component={AgentDashboard} />
        <Route path="/">
          {user?.role === 'admin' ? <AdminDashboard /> : <AgentDashboard />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="auto">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;