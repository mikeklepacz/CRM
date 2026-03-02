import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LEAD_FIELD_OPTIONS } from '@/components/qualification/qualification-utils';

type Props = {
  isImportOpen: boolean;
  setIsImportOpen: (open: boolean) => void;
  resetImport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importStep: 'upload' | 'map' | 'preview';
  setImportStep: (step: 'upload' | 'map' | 'preview') => void;
  csvData: { headers: string[]; rows: string[][] } | null;
  columnMapping: Record<number, string>;
  setColumnMapping: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setCsvData: React.Dispatch<React.SetStateAction<{ headers: string[]; rows: string[][] } | null>>;
  getPreviewLeads: () => any[];
  handleImport: () => void;
  isImportPending: boolean;
};

export function QualificationImportDialog({
  isImportOpen,
  setIsImportOpen,
  resetImport,
  fileInputRef,
  handleFileUpload,
  importStep,
  setImportStep,
  csvData,
  columnMapping,
  setColumnMapping,
  setCsvData,
  getPreviewLeads,
  handleImport,
  isImportPending,
}: Props) {
  return (
    <Dialog
      open={isImportOpen}
      onOpenChange={(open) => {
        if (!open) resetImport();
        else setIsImportOpen(true);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Leads from CSV
            </div>
          </DialogTitle>
          <DialogDescription>
            {importStep === 'upload' && 'Upload a CSV file with your lead data'}
            {importStep === 'map' && 'Map CSV columns to lead fields'}
            {importStep === 'preview' && 'Review the data before importing'}
          </DialogDescription>
        </DialogHeader>

        {importStep === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-file"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Click to upload CSV file</p>
                <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
              </label>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV should have headers in the first row. Supported fields: Company, Contact Name, Email, Phone, Address, City, State, Country, Website, Notes.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {importStep === 'map' && csvData && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Found {csvData.rows.length} rows in your CSV. Map each column to a lead field.</AlertDescription>
            </Alert>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {csvData.headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-1/3">
                      <p className="font-medium text-sm">{header}</p>
                      <p className="text-xs text-muted-foreground truncate">Sample: {csvData.rows[0]?.[index] || '(empty)'}</p>
                    </div>
                    <div className="w-1/3">
                      <Select value={columnMapping[index] || 'skip'} onValueChange={(value) => setColumnMapping((prev) => ({ ...prev, [index]: value }))}>
                        <SelectTrigger data-testid={`select-mapping-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_FIELD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setImportStep('upload');
                  setCsvData(null);
                }}
                data-testid="button-back-upload"
              >
                Back
              </Button>
              <Button onClick={() => setImportStep('preview')} data-testid="button-preview">
                Preview Import
              </Button>
            </DialogFooter>
          </div>
        )}

        {importStep === 'preview' && csvData && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Preview of first 5 leads. Total:{' '}
                {
                  csvData.rows.filter((row) => {
                    const lead: any = {};
                    Object.entries(columnMapping).forEach(([index, field]) => {
                      if (field && field !== 'skip') lead[field] = row[parseInt(index)];
                    });
                    return lead.company || lead.pocName || lead.pocEmail;
                  }).length
                }{' '}
                valid leads will be imported.
              </AlertDescription>
            </Alert>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPreviewLeads().map((lead, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{lead.company || '-'}</TableCell>
                      <TableCell>{lead.pocName || '-'}</TableCell>
                      <TableCell>{lead.pocEmail || '-'}</TableCell>
                      <TableCell>{lead.pocPhone || '-'}</TableCell>
                      <TableCell>{[lead.city, lead.state].filter(Boolean).join(', ') || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportStep('map')} data-testid="button-back-map">
                Back to Mapping
              </Button>
              <Button onClick={handleImport} disabled={isImportPending} data-testid="button-import-confirm">
                {isImportPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Import {csvData.rows.length} Leads
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
