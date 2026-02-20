import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings } from "lucide-react";
import { Sparkles } from "lucide-react";
import { SettingsForm } from "./settings-form";
import type { ApolloSettings } from "../types";

type ApolloPageHeaderProps = {
  settings?: ApolloSettings;
  currentProjectName?: string;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  onSaveSettings: (updates: Partial<ApolloSettings>) => void;
  isSavingSettings: boolean;
};

export function ApolloPageHeader({
  settings,
  currentProjectName,
  settingsOpen,
  onSettingsOpenChange,
  onSaveSettings,
  isSavingSettings,
}: ApolloPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Apollo Enrichment
        </h1>
        <p className="text-muted-foreground">
          Enrich your leads with contact data from Apollo.io
          {currentProjectName && <span className="text-primary"> - {currentProjectName}</span>}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {settings && (
          <Badge variant="outline" className="text-sm">
            {settings.creditsUsedThisMonth || 0} credits used this month
          </Badge>
        )}
        <Dialog open={settingsOpen} onOpenChange={onSettingsOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-apollo-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Apollo Enrichment Settings</DialogTitle>
              <DialogDescription>
                Configure which contacts to target during enrichment
              </DialogDescription>
            </DialogHeader>
            <SettingsForm
              settings={settings}
              onSave={onSaveSettings}
              isLoading={isSavingSettings}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
