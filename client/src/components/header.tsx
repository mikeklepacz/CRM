import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import { canAccessAdminFeatures, isSuperAdmin } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, BarChart3, Home, ShieldCheck, TrendingUp, Bot, MapPin, Mail, FileText, Phone, Menu, MoreVertical, Target, Palette, Globe, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ColorCustomizer } from "./color-customizer";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { TicketDialog } from "./ticket-dialog";
import { WebhookStatusBadge } from "./WebhookStatusBadge";

type VisibleModules = {
  admin?: boolean;
  dashboard?: boolean;
  clients?: boolean;
  followUp?: boolean;
  mapSearch?: boolean;
  sales?: boolean;
  assistant?: boolean;
  docs?: boolean;
  labelDesigner?: boolean;
  callManager?: boolean;
  ehub?: boolean;
};

interface HeaderProps {
  colorPresets?: Array<{name: string, color: string}>;
  setColorPresets?: (presets: Array<{name: string, color: string}>) => void;
  deleteColorPreset?: (index: number) => void;
}

export function Header({ colorPresets = [], setColorPresets = () => {}, deleteColorPreset = () => {} }: HeaderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get unread ticket count (admin only)
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/tickets/unread-count'],
    enabled: canAccessAdminFeatures(user),
  });

  // Fetch user preferences for module visibility
  const { data: userPreferences } = useQuery<{ visibleModules?: VisibleModules }>({
    queryKey: ['/api/user/preferences'],
  });

  // Default all modules visible if not set
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
    };
    return { ...defaults, ...userPreferences?.visibleModules };
  }, [userPreferences?.visibleModules]);

  const unreadCount = unreadData?.count || 0;

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email || 'User';

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="px-2 py-2 md:px-3 flex items-center gap-2">
        <h1 className="text-xs md:text-sm font-semibold text-foreground whitespace-nowrap">NMU CRM</h1>
        
        {/* Full Navigation - Shows on md+, wraps naturally */}
        <nav className="hidden md:flex items-center gap-0 flex-wrap flex-1">
          {isSuperAdmin(user) && (
            <Link href="/super-admin">
              <Button variant="ghost" size="sm" data-testid="nav-super-admin">
                <Globe className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Platform
              </Button>
            </Link>
          )}
          {canAccessAdminFeatures(user) && (
            <Link href="/org-admin">
              <Button variant="ghost" size="sm" data-testid="nav-org-admin">
                <Building2 className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Organization
              </Button>
            </Link>
          )}
          {canAccessAdminFeatures(user) && visibleModules.admin && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="nav-admin">
                <ShieldCheck className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
          {visibleModules.dashboard && (
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="nav-dashboard">
                <Home className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          )}
          {visibleModules.clients && (
            <Link href="/clients">
              <Button variant="ghost" size="sm" data-testid="nav-clients">
                <BarChart3 className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Clients
              </Button>
            </Link>
          )}
          {visibleModules.followUp && (
            <Link href="/follow-up-center">
              <Button variant="ghost" size="sm" data-testid="nav-follow-up-center">
                <Target className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Follow-Up
              </Button>
            </Link>
          )}
          {visibleModules.mapSearch && (
            <Link href="/map-search">
              <Button variant="ghost" size="sm" data-testid="nav-map-search">
                <MapPin className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Map Search
              </Button>
            </Link>
          )}
          {visibleModules.sales && (
            <Link href="/sales">
              <Button variant="ghost" size="sm" data-testid="nav-sales">
                <TrendingUp className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Sales
              </Button>
            </Link>
          )}
          {visibleModules.assistant && (
            <Link href="/assistant">
              <Button variant="ghost" size="sm" data-testid="nav-assistant">
                <Bot className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Assistant
              </Button>
            </Link>
          )}
          {visibleModules.docs && (
            <Link href="/documents">
              <Button variant="ghost" size="sm" data-testid="nav-documents">
                <FileText className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Docs
              </Button>
            </Link>
          )}
          {visibleModules.labelDesigner && (
            <Link href="/product-mockup">
              <Button variant="ghost" size="sm" data-testid="nav-product-mockup">
                <Palette className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Label Designer
              </Button>
            </Link>
          )}
          {(canAccessAdminFeatures(user) || user.hasVoiceAccess) && visibleModules.callManager && (
            <Link href="/call-manager">
              <Button variant="ghost" size="sm" data-testid="nav-call-manager">
                <Phone className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Call Manager
              </Button>
            </Link>
          )}
          {canAccessAdminFeatures(user) && visibleModules.ehub && (
            <Link href="/ehub">
              <Button variant="ghost" size="sm" data-testid="nav-ehub">
                <Mail className="hidden xl:mr-2 xl:inline h-4 w-4" />
                E-Hub
              </Button>
            </Link>
          )}
        </nav>

        {/* Utilities Section - Always right aligned */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          {/* Mobile Menu Button - Only on small screens */}
          <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <DropdownMenuTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {isSuperAdmin(user) && (
                <DropdownMenuItem onClick={() => { setLocation('/super-admin'); setMobileMenuOpen(false); }}>
                  <Globe className="mr-2 h-4 w-4" />
                  Platform Admin
                </DropdownMenuItem>
              )}
              {canAccessAdminFeatures(user) && (
                <DropdownMenuItem onClick={() => { setLocation('/org-admin'); setMobileMenuOpen(false); }}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Organization
                </DropdownMenuItem>
              )}
              {canAccessAdminFeatures(user) && visibleModules.admin && (
                <DropdownMenuItem onClick={() => { setLocation('/admin'); setMobileMenuOpen(false); }}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
              )}
              {visibleModules.dashboard && (
                <DropdownMenuItem onClick={() => { setLocation('/'); setMobileMenuOpen(false); }}>
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
              )}
              {visibleModules.clients && (
                <DropdownMenuItem onClick={() => { setLocation('/clients'); setMobileMenuOpen(false); }}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Clients
                </DropdownMenuItem>
              )}
              {visibleModules.followUp && (
                <DropdownMenuItem onClick={() => { setLocation('/follow-up-center'); setMobileMenuOpen(false); }}>
                  <Target className="mr-2 h-4 w-4" />
                  Follow-Up Center
                </DropdownMenuItem>
              )}
              {visibleModules.mapSearch && (
                <DropdownMenuItem onClick={() => { setLocation('/map-search'); setMobileMenuOpen(false); }}>
                  <MapPin className="mr-2 h-4 w-4" />
                  Map Search
                </DropdownMenuItem>
              )}
              {visibleModules.sales && (
                <DropdownMenuItem onClick={() => { setLocation('/sales'); setMobileMenuOpen(false); }}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Sales
                </DropdownMenuItem>
              )}
              {visibleModules.assistant && (
                <DropdownMenuItem onClick={() => { setLocation('/assistant'); setMobileMenuOpen(false); }}>
                  <Bot className="mr-2 h-4 w-4" />
                  Assistant
                </DropdownMenuItem>
              )}
              {visibleModules.docs && (
                <DropdownMenuItem onClick={() => { setLocation('/documents'); setMobileMenuOpen(false); }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </DropdownMenuItem>
              )}
              {visibleModules.labelDesigner && (
                <DropdownMenuItem onClick={() => { setLocation('/product-mockup'); setMobileMenuOpen(false); }}>
                  <Palette className="mr-2 h-4 w-4" />
                  Label Designer
                </DropdownMenuItem>
              )}
              {(canAccessAdminFeatures(user) || user.hasVoiceAccess) && visibleModules.callManager && (
                <DropdownMenuItem onClick={() => { setLocation('/call-manager'); setMobileMenuOpen(false); }}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Manager
                </DropdownMenuItem>
              )}
              {canAccessAdminFeatures(user) && visibleModules.ehub && (
                <DropdownMenuItem onClick={() => { setLocation('/ehub'); setMobileMenuOpen(false); }}>
                  <Mail className="mr-2 h-4 w-4" />
                  E-Hub
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Utilities Menu */}
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
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">{unreadCount}</Badge>
                )}
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
          
          {/* User Menu */}
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
              <DropdownMenuItem onClick={() => setLocation('/settings')} data-testid="menu-settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = "/api/logout"} data-testid="menu-logout">
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
