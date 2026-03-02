export const LEAD_FIELD_OPTIONS = [
  { value: 'company', label: 'Company Name' },
  { value: 'pocName', label: 'Contact Name' },
  { value: 'pocEmail', label: 'Email' },
  { value: 'pocPhone', label: 'Phone' },
  { value: 'pocRole', label: 'Role/Title' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State/Region' },
  { value: 'postalCode', label: 'Postal Code' },
  { value: 'country', label: 'Country' },
  { value: 'website', label: 'Website' },
  { value: 'notes', label: 'Notes' },
  { value: 'skip', label: '-- Skip Column --' },
];

export function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

export type SortField = 'company' | 'pocName' | 'status' | 'callStatus' | 'score' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'not_qualified', 'followup', 'please_email', 'closed'];
export const CALL_STATUS_OPTIONS = ['pending', 'scheduled', 'in_progress', 'completed', 'failed', 'no_answer'];

export const getStatusBadgeVariant = (
  status?: string | null,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'qualified':
      return 'default';
    case 'not_qualified':
      return 'destructive';
    case 'new':
    case 'contacted':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const getCallStatusBadgeVariant = (
  status?: string | null,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'completed':
      return 'default';
    case 'failed':
    case 'no_answer':
      return 'destructive';
    case 'in_progress':
    case 'scheduled':
      return 'secondary';
    default:
      return 'outline';
  }
};
