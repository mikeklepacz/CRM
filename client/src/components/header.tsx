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
import { LogOut, Settings, BarChart3, Home, ShieldCheck, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { ColorCustomizer } from "./color-customizer";

interface HeaderProps {
  colorPresets?: Array<{name: string, color: string}>;
  setColorPresets?: (presets: Array<{name: string, color: string}>) => void;
  deleteColorPreset?: (index: number) => void;
}

export function Header({ colorPresets = [], setColorPresets = () => {}, deleteColorPreset = () => {} }: HeaderProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user.email || 'User';

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold text-foreground">Hemp Wick CRM</h1>
            
            <nav className="flex items-center gap-1">
              <Link href={user.role === 'admin' ? '/admin' : '/agent'}>
                <Button variant="ghost" size="sm" data-testid="nav-dashboard">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="ghost" size="sm" data-testid="nav-clients">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Clients
                </Button>
              </Link>
              <Link href="/sales">
                <Button variant="ghost" size="sm" data-testid="nav-sales">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Sales Analytics
                </Button>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <ColorCustomizer colorPresets={colorPresets} setColorPresets={setColorPresets} deleteColorPreset={deleteColorPreset} />
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
    </header>
  );
}
