import { useMemo } from 'react';
import type { QualificationLead } from '@shared/schema';
import type { SortDirection, SortField } from '@/components/qualification/qualification-utils';

type Props = {
  leads: QualificationLead[];
  searchQuery: string;
  selectedLeads: Set<string>;
  setSelectedLeads: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  sortDirection: SortDirection;
  sortField: SortField;
};

export function useQualificationTableLogic(props: Props) {
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = props.leads;

    if (props.searchQuery) {
      const query = props.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.company?.toLowerCase().includes(query) ||
          lead.pocName?.toLowerCase().includes(query) ||
          lead.pocEmail?.toLowerCase().includes(query) ||
          lead.pocPhone?.includes(query) ||
          lead.city?.toLowerCase().includes(query) ||
          lead.state?.toLowerCase().includes(query),
      );
    }

    return filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (props.sortField) {
        case 'company':
          aVal = a.company || '';
          bVal = b.company || '';
          break;
        case 'pocName':
          aVal = a.pocName || '';
          bVal = b.pocName || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'callStatus':
          aVal = a.callStatus || '';
          bVal = b.callStatus || '';
          break;
        case 'score':
          aVal = a.score ?? -1;
          bVal = b.score ?? -1;
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return props.sortDirection === 'asc' ? comparison : -comparison;
      }

      return props.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [props.leads, props.searchQuery, props.sortDirection, props.sortField]);

  const handleSort = (field: SortField) => {
    if (props.sortField === field) {
      props.setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      props.setSortField(field);
      props.setSortDirection('asc');
    }
  };

  const toggleSelectLead = (leadId: string) => {
    props.setSelectedLeads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (props.selectedLeads.size === filteredAndSortedLeads.length) {
      props.setSelectedLeads(new Set());
    } else {
      props.setSelectedLeads(new Set(filteredAndSortedLeads.map((l) => l.id)));
    }
  };

  return {
    filteredAndSortedLeads,
    handleSort,
    toggleSelectAll,
    toggleSelectLead,
  };
}
