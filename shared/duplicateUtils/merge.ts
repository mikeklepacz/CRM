import { compareStatuses, countNonEmptyFields } from './helpers';
import type { DuplicateGroup, StatusHierarchy, StoreRecord } from './types';

export function selectKeeper(
  stores: StoreRecord[],
  statusHierarchy: StatusHierarchy
): StoreRecord {
  if (stores.length === 0) throw new Error('Cannot select keeper from empty group');
  if (stores.length === 1) return stores[0];

  const claimed = stores.filter(s => s.Agent && s.Agent.trim() !== '');
  const unclaimed = stores.filter(s => !s.Agent || s.Agent.trim() === '');

  if (claimed.length > 0) {
    const sorted = [...claimed].sort((a, b) => {
      const statusCompare = compareStatuses(a.Status, b.Status, statusHierarchy);
      if (statusCompare !== 0) return -statusCompare;
      return countNonEmptyFields(b) - countNonEmptyFields(a);
    });
    return sorted[0];
  }

  const sorted = [...unclaimed].sort((a, b) => {
    return countNonEmptyFields(b) - countNonEmptyFields(a);
  });
  return sorted[0];
}

export function mergeStoreData(
  target: StoreRecord,
  source: StoreRecord,
  statusHierarchy: StatusHierarchy
): StoreRecord {
  const merged = { ...target };

  const POC_FIELDS = new Set([
    'point of contact',
    'poc email',
    'poc phone',
  ]);

  const NOTES_FIELDS = new Set(['notes']);

  const fieldsToCheck = Object.keys(source).filter(key => key !== 'Link');

  for (const field of fieldsToCheck) {
    const sourceValue = source[field];
    const targetValue = target[field];
    const fieldLower = field.toLowerCase();

    if (sourceValue === null || sourceValue === undefined || sourceValue === '') {
      continue;
    }

    if (field === 'Status') {
      const statusCompare = compareStatuses(sourceValue, targetValue, statusHierarchy);
      if (statusCompare > 0) {
        merged[field] = sourceValue;
      }
      continue;
    }

    if (NOTES_FIELDS.has(fieldLower)) {
      const sourceName = source['Name'] || source['Link'] || 'Merged Location';
      if (targetValue && typeof targetValue === 'string' && targetValue.trim() !== '') {
        merged[field] = `${targetValue}\n\n[Merged from ${sourceName}]: ${sourceValue}`;
      } else {
        merged[field] = sourceValue;
      }
      continue;
    }

    if (POC_FIELDS.has(fieldLower)) {
      merged[field] = sourceValue;
      continue;
    }

    if (targetValue === null || targetValue === undefined || targetValue === '') {
      merged[field] = sourceValue;
    }
  }

  return merged;
}

export function smartSelectDuplicates(
  duplicateGroups: DuplicateGroup[],
  statusHierarchy: StatusHierarchy
): Array<{ deleteLink: string; keepLink: string }> {
  const deletions: Array<{ deleteLink: string; keepLink: string }> = [];

  duplicateGroups.forEach(group => {
    const keeper = selectKeeper(group.stores, statusHierarchy);

    group.stores.forEach(store => {
      if (store.Link !== keeper.Link) {
        deletions.push({
          deleteLink: store.Link,
          keepLink: keeper.Link,
        });
      }
    });
  });

  return deletions;
}
