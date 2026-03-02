import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  canAccessAdmin: boolean;
  shouldShowModuleOption: (moduleKey: string) => boolean;
  userHasVoiceAccess?: boolean;
  visibleModules: Record<string, boolean>;
  onToggle: (moduleKey: string, checked: boolean) => void;
};

export function SettingsModulesTab({ canAccessAdmin, onToggle, shouldShowModuleOption, userHasVoiceAccess, visibleModules }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Visibility</CardTitle>
        <CardDescription>
          Choose which navigation modules are visible in your header. Hidden modules can still be accessed via direct URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {canAccessAdmin ? (
            <div className="flex items-center space-x-3">
              <Checkbox id="module-admin" checked={visibleModules.admin} onCheckedChange={(checked) => onToggle('admin', !!checked)} data-testid="checkbox-module-admin" />
              <Label htmlFor="module-admin" className="font-normal cursor-pointer">Admin</Label>
            </div>
          ) : null}
          <div className="flex items-center space-x-3">
            <Checkbox id="module-dashboard" checked={visibleModules.dashboard} onCheckedChange={(checked) => onToggle('dashboard', !!checked)} data-testid="checkbox-module-dashboard" />
            <Label htmlFor="module-dashboard" className="font-normal cursor-pointer">Dashboard</Label>
          </div>
          {shouldShowModuleOption('clients') ? <ModuleRow id="clients" label="Clients" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('followUp') ? <ModuleRow id="followUp" label="Follow-Up" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('mapSearch') ? <ModuleRow id="mapSearch" label="Map Search" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('sales') ? <ModuleRow id="sales" label="Sales" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('assistant') ? <ModuleRow id="assistant" label="Assistant" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('docs') ? <ModuleRow id="docs" label="Docs" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('labelDesigner') ? <ModuleRow id="labelDesigner" label="Label Designer" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {(canAccessAdmin || userHasVoiceAccess) && shouldShowModuleOption('callManager') ? <ModuleRow id="callManager" label="Call Manager" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {canAccessAdmin && shouldShowModuleOption('ehub') ? <ModuleRow id="ehub" label="E-Hub" visibleModules={visibleModules} onToggle={onToggle} /> : null}
          {shouldShowModuleOption('qualification') ? <ModuleRow id="qualification" label="Qualification" visibleModules={visibleModules} onToggle={onToggle} /> : null}
        </div>
        <p className="text-sm text-muted-foreground mt-4">Changes are saved automatically.</p>
      </CardContent>
    </Card>
  );
}

type ModuleRowProps = {
  id: string;
  label: string;
  visibleModules: Record<string, boolean>;
  onToggle: (moduleKey: string, checked: boolean) => void;
};

function ModuleRow({ id, label, onToggle, visibleModules }: ModuleRowProps) {
  return (
    <div className="flex items-center space-x-3">
      <Checkbox id={`module-${id}`} checked={visibleModules[id]} onCheckedChange={(checked) => onToggle(id, !!checked)} data-testid={`checkbox-module-${id}`} />
      <Label htmlFor={`module-${id}`} className="font-normal cursor-pointer">{label}</Label>
    </div>
  );
}
