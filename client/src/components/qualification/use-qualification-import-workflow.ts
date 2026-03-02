import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { parseCSV } from '@/components/qualification/qualification-utils';

type ToastFn = (args: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;

type Props = {
  currentProjectId?: string;
  invalidateStats: () => void;
  refetchLeads: () => void;
  toast: ToastFn;
};

export function useQualificationImportWorkflow(props: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview'>('upload');

  const resetImport = () => {
    setIsImportOpen(false);
    setCsvData(null);
    setColumnMapping({});
    setImportStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const bulkImportMutation = useMutation({
    mutationFn: async (leads: any[]) => {
      return apiRequest('POST', '/api/qualification/leads/bulk', { leads });
    },
    onSuccess: (data: any) => {
      props.toast({ title: `${data.count} leads imported successfully` });
      props.refetchLeads();
      props.invalidateStats();
      resetImport();
    },
    onError: (error: Error) => {
      props.toast({ title: 'Failed to import leads', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setCsvData(parsed);

      const autoMapping: Record<number, string> = {};
      parsed.headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerHeader.includes('company') || lowerHeader.includes('business') || lowerHeader.includes('name')) autoMapping[index] = 'company';
        else if (lowerHeader.includes('contact') || lowerHeader.includes('poc') || lowerHeader.includes('person')) autoMapping[index] = 'pocName';
        else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) autoMapping[index] = 'pocEmail';
        else if (lowerHeader.includes('phone') || lowerHeader.includes('tel') || lowerHeader.includes('mobile')) autoMapping[index] = 'pocPhone';
        else if (lowerHeader.includes('role') || lowerHeader.includes('title') || lowerHeader.includes('position')) autoMapping[index] = 'pocRole';
        else if (lowerHeader.includes('address') || lowerHeader.includes('street')) autoMapping[index] = 'address';
        else if (lowerHeader.includes('city') || lowerHeader.includes('town')) autoMapping[index] = 'city';
        else if (lowerHeader.includes('state') || lowerHeader.includes('region') || lowerHeader.includes('province')) autoMapping[index] = 'state';
        else if (lowerHeader.includes('zip') || lowerHeader.includes('postal') || lowerHeader.includes('post')) autoMapping[index] = 'postalCode';
        else if (lowerHeader.includes('country')) autoMapping[index] = 'country';
        else if (lowerHeader.includes('website') || lowerHeader.includes('url') || lowerHeader.includes('web')) autoMapping[index] = 'website';
        else if (lowerHeader.includes('note') || lowerHeader.includes('comment')) autoMapping[index] = 'notes';
      });
      setColumnMapping(autoMapping);
      setImportStep('map');
    };
    reader.readAsText(file);
  };

  const getPreviewLeads = (): any[] => {
    if (!csvData) return [];
    return csvData.rows.slice(0, 5).map((row) => {
      const lead: any = { source: 'csv_import' };
      Object.entries(columnMapping).forEach(([index, field]) => {
        if (field && field !== 'skip') {
          lead[field] = row[parseInt(index)] || '';
        }
      });
      return lead;
    });
  };

  const handleImport = () => {
    if (!csvData) return;
    const leads = csvData.rows
      .map((row) => {
        const lead: any = { source: 'csv_import', projectId: props.currentProjectId || null };
        Object.entries(columnMapping).forEach(([index, field]) => {
          if (field && field !== 'skip') {
            lead[field] = row[parseInt(index)] || '';
          }
        });
        return lead;
      })
      .filter((lead) => lead.company || lead.pocName || lead.pocEmail);

    if (leads.length === 0) {
      props.toast({
        title: 'No valid leads found',
        description: 'Please map at least company, contact name, or email column',
        variant: 'destructive',
      });
      return;
    }

    bulkImportMutation.mutate(leads);
  };

  return {
    bulkImportMutation,
    columnMapping,
    csvData,
    fileInputRef,
    getPreviewLeads,
    handleFileUpload,
    handleImport,
    importStep,
    isImportOpen,
    resetImport,
    setColumnMapping,
    setCsvData,
    setImportStep,
    setIsImportOpen,
  };
}
