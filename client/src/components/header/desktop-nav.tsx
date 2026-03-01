import { Link } from "wouter";
import { BarChart3, Bot, Building2, ClipboardList, FileText, Globe, Home, Mail, MapPin, Palette, Phone, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canAccessAdminFeatures, isSuperAdmin } from "@/lib/authUtils";
import type { VisibleModules } from "./types";

interface DesktopNavProps {
  user: any;
  visibleModules: VisibleModules;
  shouldShowNavItem: (navKey: string, userPrefKey?: keyof VisibleModules) => boolean;
}

export function DesktopNav({ user, visibleModules, shouldShowNavItem }: DesktopNavProps) {
  return (
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
      {shouldShowNavItem("clients", "clients") && (
        <Link href="/clients">
          <Button variant="ghost" size="sm" data-testid="nav-clients">
            <BarChart3 className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Clients
          </Button>
        </Link>
      )}
      {shouldShowNavItem("follow-up-center", "followUp") && (
        <Link href="/follow-up-center">
          <Button variant="ghost" size="sm" data-testid="nav-follow-up-center">
            <Target className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Follow-Up
          </Button>
        </Link>
      )}
      {shouldShowNavItem("map-search", "mapSearch") && (
        <Link href="/map-search">
          <Button variant="ghost" size="sm" data-testid="nav-map-search">
            <MapPin className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Map Search
          </Button>
        </Link>
      )}
      {shouldShowNavItem("sales", "sales") && (
        <Link href="/sales">
          <Button variant="ghost" size="sm" data-testid="nav-sales">
            <TrendingUp className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Sales
          </Button>
        </Link>
      )}
      {shouldShowNavItem("assistant", "assistant") && (
        <Link href="/assistant">
          <Button variant="ghost" size="sm" data-testid="nav-assistant">
            <Bot className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Assistant
          </Button>
        </Link>
      )}
      {shouldShowNavItem("documents", "docs") && (
        <Link href="/documents">
          <Button variant="ghost" size="sm" data-testid="nav-documents">
            <FileText className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Docs
          </Button>
        </Link>
      )}
      {shouldShowNavItem("product-mockup", "labelDesigner") && (
        <Link href="/product-mockup">
          <Button variant="ghost" size="sm" data-testid="nav-product-mockup">
            <Palette className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Label Designer
          </Button>
        </Link>
      )}
      {shouldShowNavItem("qualification", "qualification") && (
        <Link href="/qualification">
          <Button variant="ghost" size="sm" data-testid="nav-qualification">
            <ClipboardList className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Qualification
          </Button>
        </Link>
      )}
      {(canAccessAdminFeatures(user) || user.hasVoiceAccess) && shouldShowNavItem("call-manager", "callManager") && (
        <Link href="/call-manager">
          <Button variant="ghost" size="sm" data-testid="nav-call-manager">
            <Phone className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Call Manager
          </Button>
        </Link>
      )}
      {canAccessAdminFeatures(user) && shouldShowNavItem("ehub", "ehub") && (
        <Link href="/ehub">
          <Button variant="ghost" size="sm" data-testid="nav-ehub">
            <Mail className="hidden xl:mr-2 xl:inline h-4 w-4" />
            E-Hub
          </Button>
        </Link>
      )}
      {canAccessAdminFeatures(user) && shouldShowNavItem("apollo", "apollo") && (
        <Link href="/apollo">
          <Button variant="ghost" size="sm" data-testid="nav-apollo">
            <Sparkles className="hidden xl:mr-2 xl:inline h-4 w-4" />
            Apollo
          </Button>
        </Link>
      )}
    </nav>
  );
}
