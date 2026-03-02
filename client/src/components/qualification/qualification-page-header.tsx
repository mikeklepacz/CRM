import { Link } from 'wouter';
import { Map, Plus, RefreshCw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onAddLead: () => void;
  onImport: () => void;
  onRefresh: () => void;
};

export function QualificationPageHeader({ onAddLead, onImport, onRefresh }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Qualification Leads</h1>
        <p className="text-muted-foreground">Manage and qualify leads for your campaigns</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onRefresh} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Link href="/map-search?mode=qualification">
          <Button variant="outline" data-testid="button-map-search">
            <Map className="h-4 w-4 mr-2" />
            Map Search
          </Button>
        </Link>
        <Button variant="outline" onClick={onImport} data-testid="button-import">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
        <Button onClick={onAddLead} data-testid="button-add-lead">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>
    </div>
  );
}
