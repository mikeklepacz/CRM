/**
 * Utilities for detecting duplicate store listings
 */

export type { DuplicateGroup, StatusHierarchy, StoreRecord } from './duplicateUtils/types';
export { compareStatuses, countNonEmptyFields, extractCanonicalStem, extractHouseNumber, normalizeAddress, normalizeStoreName } from './duplicateUtils/helpers';
export { detectDuplicates } from './duplicateUtils/detection';
export { mergeStoreData, selectKeeper, smartSelectDuplicates } from './duplicateUtils/merge';
