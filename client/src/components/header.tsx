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
import { LogOut, Settings, BarChart3, Home, ShieldCheck, TrendingUp, Bot, MapPin, Mail, FileText, Phone } from "lucide-react";
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

  // Get unread ticket count (admin only)
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/tickets/unread-count'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCount = unreadData?.count || 0;

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email || 'User';

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0 overflow-x-auto">
            <h1 className="text-base md:text-lg font-semibold text-foreground whitespace-nowrap flex-shrink-0">NMU CRM</h1>
            
            <nav className="flex items-center gap-1 flex-shrink-0">
              <Link href={user.role === 'admin' ? '/admin' : '/agent'}>
                <Button variant="ghost" size="sm" data-testid="nav-dashboard">
                  <Home className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="text-xs md:text-sm">Dashboard</span>
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="ghost" size="sm" data-testid="nav-clients">
                  <BarChart3 className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="text-xs md:text-sm">Clients</span>
                </Button>
              </Link>
              <Link href="/map-search">
                <Button variant="ghost" size="sm" data-testid="nav-map-search">
                  <MapPin className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="text-xs md:text-sm">Map</span>
                </Button>
              </Link>
              <Link href="/sales">
                <Button variant="ghost" size="sm" data-testid="nav-sales">
                  <TrendingUp className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="text-xs md:text-sm">Sales</span>
                </Button>
              </Link>
              <Link href="/assistant">
                <Button variant="ghost" size="sm" data-testid="nav-assistant">
                  <Bot className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="text-xs md:text-sm">Assistant</span>
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="ghost" size="sm" data-testid="nav-documents">
                  <FileText className="mr-1 md:mr-2 h-4 w-4" />
                  <span className="text-xs md:text-sm">Docs</span>
                </Button>
              </Link>
              {(user.role === 'admin' || user.hasVoiceAccess) && (
                <Link href="/call-manager">
                  <Button variant="ghost" size="sm" data-testid="nav-call-manager">
                    <Phone className="mr-1 md:mr-2 h-4 w-4" />
                    <span className="text-xs md:text-sm">Calls</span>
                  </Button>
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* BACK BURNER: Color Customizer - Admin only feature, hiding from regular users to focus on core functionality */}
            {user.role === 'admin' && (
              <ColorCustomizer colorPresets={colorPresets} setColorPresets={setColorPresets} deleteColorPreset={deleteColorPreset} />
            )}
            
            {/* Support Ticket Icon */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTicketDialogOpen(true)}
                data-testid="button-support"
              >
                <Mail className="h-5 w-5" />
              </Button>
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
                  data-testid="badge-unread-count"
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
            
            <WebhookStatusBadge />
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
      </div>
      
      <TicketDialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen} />
    </header>
  );
}
