import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { DEFAULT_TITLES, SENIORITY_OPTIONS } from "../constants";
import type { ApolloSettings } from "../types";

export function SettingsForm({
  settings,
  onSave,
  isLoading,
}: {
  settings: ApolloSettings | undefined;
  onSave: (updates: Partial<ApolloSettings>) => void;
  isLoading: boolean;
}) {
  const [targetTitles, setTargetTitles] = useState<string[]>(settings?.targetTitles || DEFAULT_TITLES);
  const [targetSeniorities, setTargetSeniorities] = useState<string[]>(
    settings?.targetSeniorities || ["owner", "founder", "director", "manager"]
  );
  const [maxContacts, setMaxContacts] = useState(settings?.maxContactsPerCompany || 3);
  const [autoEnrich, setAutoEnrich] = useState(settings?.autoEnrichOnAdd || false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (settings) {
      setTargetTitles(settings.targetTitles || DEFAULT_TITLES);
      setTargetSeniorities(settings.targetSeniorities || ["owner", "founder", "director", "manager"]);
      setMaxContacts(settings.maxContactsPerCompany || 3);
      setAutoEnrich(settings.autoEnrichOnAdd || false);
    }
  }, [settings]);

  const handleAddTitle = () => {
    if (newTitle && !targetTitles.includes(newTitle)) {
      setTargetTitles([...targetTitles, newTitle]);
      setNewTitle("");
    }
  };

  const handleRemoveTitle = (title: string) => {
    setTargetTitles(targetTitles.filter((t) => t !== title));
  };

  const toggleSeniority = (value: string) => {
    if (targetSeniorities.includes(value)) {
      setTargetSeniorities(targetSeniorities.filter((s) => s !== value));
    } else {
      setTargetSeniorities([...targetSeniorities, value]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Target Job Titles</Label>
        <p className="text-xs text-muted-foreground">Apollo will look for contacts with these job titles</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {targetTitles.map((title) => (
            <Badge key={title} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTitle(title)}>
              {title} x
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a job title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTitle()}
            data-testid="input-new-title"
          />
          <Button type="button" variant="outline" onClick={handleAddTitle} data-testid="button-add-title">
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target Seniorities</Label>
        <p className="text-xs text-muted-foreground">Filter contacts by their seniority level</p>
        <div className="flex flex-wrap gap-2">
          {SENIORITY_OPTIONS.map((option) => (
            <Badge
              key={option.value}
              variant={targetSeniorities.includes(option.value) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleSeniority(option.value)}
              data-testid={`badge-seniority-${option.value}`}
            >
              {option.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxContacts">Max Contacts Per Company</Label>
        <Input
          id="maxContacts"
          type="number"
          min={1}
          max={10}
          value={maxContacts}
          onChange={(e) => setMaxContacts(parseInt(e.target.value, 10) || 3)}
          data-testid="input-max-contacts"
        />
        <p className="text-xs text-muted-foreground">Limit how many contacts to enrich per company (saves credits)</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="autoEnrich">Auto-enrich on add</Label>
          <p className="text-xs text-muted-foreground">Automatically enrich when adding to CRM</p>
        </div>
        <Switch
          id="autoEnrich"
          checked={autoEnrich}
          onCheckedChange={setAutoEnrich}
          data-testid="switch-auto-enrich"
        />
      </div>

      <Button
        onClick={() =>
          onSave({
            targetTitles,
            targetSeniorities,
            maxContactsPerCompany: maxContacts,
            autoEnrichOnAdd: autoEnrich,
          })
        }
        disabled={isLoading}
        className="w-full"
        data-testid="button-save-settings"
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}

