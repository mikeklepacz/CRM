import { BarChart3, Bot, Building2, ClipboardList, FileText, Globe, Home, Mail, MapPin, Menu, Palette, Phone, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { canAccessAdminFeatures, isSuperAdmin } from "@/lib/authUtils";
import type { VisibleModules } from "./types";

interface MobileNavProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
  visibleModules: VisibleModules;
  shouldShowNavItem: (navKey: string, userPrefKey?: keyof VisibleModules) => boolean;
}

export function MobileNav({ user, open, onOpenChange, onNavigate, visibleModules, shouldShowNavItem }: MobileNavProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {isSuperAdmin(user) && (
          <DropdownMenuItem onClick={() => onNavigate("/super-admin")}>
            <Globe className="mr-2 h-4 w-4" />
            Platform Admin
          </DropdownMenuItem>
        )}
        {canAccessAdminFeatures(user) && (
          <DropdownMenuItem onClick={() => onNavigate("/org-admin")}>
            <Building2 className="mr-2 h-4 w-4" />
            Organization
          </DropdownMenuItem>
        )}
        {canAccessAdminFeatures(user) && visibleModules.admin && (
          <DropdownMenuItem onClick={() => onNavigate("/admin")}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Admin
          </DropdownMenuItem>
        )}
        {visibleModules.dashboard && (
          <DropdownMenuItem onClick={() => onNavigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("clients", "clients") && (
          <DropdownMenuItem onClick={() => onNavigate("/clients")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Clients
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("follow-up-center", "followUp") && (
          <DropdownMenuItem onClick={() => onNavigate("/follow-up-center")}>
            <Target className="mr-2 h-4 w-4" />
            Follow-Up Center
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("map-search", "mapSearch") && (
          <DropdownMenuItem onClick={() => onNavigate("/map-search")}>
            <MapPin className="mr-2 h-4 w-4" />
            Map Search
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("sales", "sales") && (
          <DropdownMenuItem onClick={() => onNavigate("/sales")}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Sales
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("assistant", "assistant") && (
          <DropdownMenuItem onClick={() => onNavigate("/assistant")}>
            <Bot className="mr-2 h-4 w-4" />
            Assistant
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("documents", "docs") && (
          <DropdownMenuItem onClick={() => onNavigate("/documents")}>
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("product-mockup", "labelDesigner") && (
          <DropdownMenuItem onClick={() => onNavigate("/product-mockup")}>
            <Palette className="mr-2 h-4 w-4" />
            Label Designer
          </DropdownMenuItem>
        )}
        {shouldShowNavItem("qualification", "qualification") && (
          <DropdownMenuItem onClick={() => onNavigate("/qualification")}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Qualification
          </DropdownMenuItem>
        )}
        {(canAccessAdminFeatures(user) || user.hasVoiceAccess) && shouldShowNavItem("call-manager", "callManager") && (
          <DropdownMenuItem onClick={() => onNavigate("/call-manager")}>
            <Phone className="mr-2 h-4 w-4" />
            Call Manager
          </DropdownMenuItem>
        )}
        {canAccessAdminFeatures(user) && shouldShowNavItem("ehub", "ehub") && (
          <DropdownMenuItem onClick={() => onNavigate("/ehub")}>
            <Mail className="mr-2 h-4 w-4" />
            E-Hub
          </DropdownMenuItem>
        )}
        {canAccessAdminFeatures(user) && shouldShowNavItem("apollo", "apollo") && (
          <DropdownMenuItem onClick={() => onNavigate("/apollo")}>
            <Sparkles className="mr-2 h-4 w-4" />
            Apollo
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
