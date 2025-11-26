import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/useAuth";
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
import { LogOut, Settings, BarChart3, Home, ShieldCheck, TrendingUp, Bot, MapPin, Mail, FileText, Phone, Menu, MoreVertical, Target, Palette } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ColorCustomizer } from "./color-customizer";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TicketDialog } from "./ticket-dialog";
import { WebhookStatusBadge } from "./WebhookStatusBadge";

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
    enabled: user?.role === 'admin',
  });

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
          {user.role === 'admin' && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" data-testid="nav-admin">
                <ShieldCheck className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="nav-dashboard">
              <Home className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/clients">
            <Button variant="ghost" size="sm" data-testid="nav-clients">
              <BarChart3 className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Clients
            </Button>
          </Link>
          <Link href="/follow-up-center">
            <Button variant="ghost" size="sm" data-testid="nav-follow-up-center">
              <Target className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Follow-Up
            </Button>
          </Link>
          <Link href="/map-search">
            <Button variant="ghost" size="sm" data-testid="nav-map-search">
              <MapPin className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Map Search
            </Button>
          </Link>
          <Link href="/sales">
            <Button variant="ghost" size="sm" data-testid="nav-sales">
              <TrendingUp className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Sales
            </Button>
          </Link>
          <Link href="/assistant">
            <Button variant="ghost" size="sm" data-testid="nav-assistant">
              <Bot className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Assistant
            </Button>
          </Link>
          <Link href="/documents">
            <Button variant="ghost" size="sm" data-testid="nav-documents">
              <FileText className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Docs
            </Button>
          </Link>
          <Link href="/product-mockup">
            <Button variant="ghost" size="sm" data-testid="nav-product-mockup">
              <Palette className="hidden xl:mr-2 xl:inline h-4 w-4" />
              Label Designer
            </Button>
          </Link>
          {(user.role === 'admin' || user.hasVoiceAccess) && (
            <Link href="/call-manager">
              <Button variant="ghost" size="sm" data-testid="nav-call-manager">
                <Phone className="hidden xl:mr-2 xl:inline h-4 w-4" />
                Call Manager
              </Button>
            </Link>
          )}
          {user.role === 'admin' && (
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
              {user.role === 'admin' && (
                <DropdownMenuItem onClick={() => { setLocation('/admin'); setMobileMenuOpen(false); }}>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { setLocation('/'); setMobileMenuOpen(false); }}>
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/clients'); setMobileMenuOpen(false); }}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Clients
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/follow-up-center'); setMobileMenuOpen(false); }}>
                <Target className="mr-2 h-4 w-4" />
                Follow-Up Center
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/map-search'); setMobileMenuOpen(false); }}>
                <MapPin className="mr-2 h-4 w-4" />
                Map Search
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/sales'); setMobileMenuOpen(false); }}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Sales
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/assistant'); setMobileMenuOpen(false); }}>
                <Bot className="mr-2 h-4 w-4" />
                Assistant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/documents'); setMobileMenuOpen(false); }}>
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setLocation('/product-mockup'); setMobileMenuOpen(false); }}>
                <Palette className="mr-2 h-4 w-4" />
                Label Designer
              </DropdownMenuItem>
              {(user.role === 'admin' || user.hasVoiceAccess) && (
                <DropdownMenuItem onClick={() => { setLocation('/call-manager'); setMobileMenuOpen(false); }}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call Manager
                </DropdownMenuItem>
              )}
              {user.role === 'admin' && (
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
              {user.role === 'admin' && (
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
