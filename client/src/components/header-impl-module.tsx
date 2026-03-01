import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Mail, MoreVertical, Settings } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures } from "@/lib/authUtils";
import { useOptionalProject } from "@/contexts/project-context";
import { useModuleAccess, isNavItemEnabled } from "@/hooks/useModuleAccess";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ColorCustomizer } from "./color-customizer";
import { DesktopNav } from "./header/desktop-nav";
import { MobileNav } from "./header/mobile-nav";
import { ProjectBar } from "./header/project-bar";
import { ThemeToggle } from "./theme-toggle";
import { TicketDialog } from "./ticket-dialog";
import type { HeaderProps, VisibleModules } from "./header/types";

export function Header({ colorPresets = [], setColorPresets = () => {}, deleteColorPreset = () => {} }: HeaderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const projectContext = useOptionalProject();

  const { allowedModules, isLoading: moduleAccessLoading } = useModuleAccess();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/tickets/unread-count"],
    enabled: canAccessAdminFeatures(user),
  });

  const { data: userPreferences } = useQuery<{ visibleModules?: VisibleModules }>({
    queryKey: ["/api/user/preferences"],
  });

  const visibleModules = useMemo<VisibleModules>(() => {
    const defaults: VisibleModules = {
      admin: true,
      dashboard: true,
      clients: true,
      followUp: true,
      mapSearch: true,
      sales: true,
      assistant: true,
      docs: true,
      labelDesigner: true,
      callManager: true,
      ehub: true,
      apollo: true,
      qualification: true,
    };
    return { ...defaults, ...userPreferences?.visibleModules };
  }, [userPreferences?.visibleModules]);

  const shouldShowNavItem = (navKey: string, userPrefKey?: keyof VisibleModules): boolean => {
    if (userPrefKey && visibleModules[userPrefKey] === false) return false;
    return isNavItemEnabled(navKey, allowedModules, moduleAccessLoading);
  };

  const unreadCount = unreadData?.count || 0;
  if (!user) return null;

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  const displayName = user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || "User";

  const currentProject = projectContext?.currentProject;
  const projects = projectContext?.projects || [];

  return (
    <header className="sticky top-0 z-50">
      <ProjectBar currentProject={currentProject} projects={projects} projectContext={projectContext} />

      <div className="border-b bg-card px-2 py-2 md:px-3 flex items-center gap-2">
        <h1 className="text-xs md:text-sm font-semibold text-foreground whitespace-nowrap" data-testid="text-tenant-name">
          {user.tenantName || "CRM"}
        </h1>

        <DesktopNav user={user} visibleModules={visibleModules} shouldShowNavItem={shouldShowNavItem} />

        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <MobileNav
            user={user}
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            onNavigate={(path) => {
              setLocation(path);
              setMobileMenuOpen(false);
            }}
            visibleModules={visibleModules}
            shouldShowNavItem={shouldShowNavItem}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-utilities">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setTicketDialogOpen(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Support
                {unreadCount > 0 && <Badge variant="destructive" className="ml-auto">{unreadCount}</Badge>}
              </DropdownMenuItem>
              {canAccessAdminFeatures(user) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Admin Tools</DropdownMenuLabel>
                  <div className="px-2 py-2">
                    <ColorCustomizer colorPresets={colorPresets} setColorPresets={setColorPresets} deleteColorPreset={deleteColorPreset} />
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground hidden sm:inline" data-testid="text-user-name">
                  {displayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/settings")} data-testid="menu-settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => (window.location.href = "/api/logout")} data-testid="menu-logout">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TicketDialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen} />
    </header>
  );
}
