import type { DuplicateGroup, StoreRecord } from './types';
import { extractHouseNumber, normalizeAddress, normalizeStoreName } from './helpers';

export function detectDuplicates(
  stores: StoreRecord[],
  similarityThreshold: number = 0.75,
  nonDuplicatePairs?: Array<{link1: string, link2: string}>
): DuplicateGroup[] {
  console.log(`[DuplicateFinder] Starting duplicate detection on ${stores.length} stores`);
  const duplicateGroups: DuplicateGroup[] = [];
  const processedPairs = new Set<string>();

  const makePairKey = (link1: string, link2: string): string => {
    return [link1, link2].sort().join('||');
  };

  const nonDuplicateSet = new Set<string>();
  if (nonDuplicatePairs && nonDuplicatePairs.length > 0) {
    nonDuplicatePairs.forEach(pair => {
      const key = makePairKey(pair.link1, pair.link2);
      nonDuplicateSet.add(key);
    });
    console.log(`[DuplicateFinder] Loaded ${nonDuplicateSet.size} non-duplicate pairs to exclude`);
  }

  const isNonDuplicatePair = (link1: string, link2: string): boolean => {
    const key = makePairKey(link1, link2);
    return nonDuplicateSet.has(key);
  };

  const exactAddressGroups = new Map<string, StoreRecord[]>();
  stores.forEach(store => {
    const normalized = normalizeAddress(store.Address || '');
    if (normalized && normalized.length >= 5) {
      if (!exactAddressGroups.has(normalized)) {
        exactAddressGroups.set(normalized, []);
      }
      exactAddressGroups.get(normalized)!.push(store);
    }
  });

  exactAddressGroups.forEach((group) => {
    if (group.length > 1) {
      const filteredGroup: StoreRecord[] = [];

      for (const store of group) {
        const hasNonDuplicateMark = filteredGroup.some(existing =>
          isNonDuplicatePair(store.Link, existing.Link)
        );

        if (!hasNonDuplicateMark) {
          filteredGroup.push(store);
        }
      }

      if (filteredGroup.length > 1) {
        duplicateGroups.push({
          stores: filteredGroup,
          reason: `Exact address: ${filteredGroup[0].Address || ''}`,
          similarity: 1.0,
        });
        for (let i = 0; i < filteredGroup.length; i++) {
          for (let j = i + 1; j < filteredGroup.length; j++) {
            processedPairs.add(makePairKey(filteredGroup[i].Link, filteredGroup[j].Link));
          }
        }
      }
    }
  });

  const houseNumberGroups = new Map<string, StoreRecord[]>();
  stores.forEach(store => {
    const houseNum = extractHouseNumber(store.Address || '');
    if (houseNum) {
      if (!houseNumberGroups.has(houseNum)) {
        houseNumberGroups.set(houseNum, []);
      }
      houseNumberGroups.get(houseNum)!.push(store);
    }
  });

  console.log(`[DuplicateFinder] Created ${houseNumberGroups.size} house number groups from ${stores.length} stores`);

  houseNumberGroups.forEach((group) => {
    if (group.length < 2) return;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const store1 = group[i];
        const store2 = group[j];

        const pairKey = makePairKey(store1.Link, store2.Link);
        if (processedPairs.has(pairKey)) continue;

        if (isNonDuplicatePair(store1.Link, store2.Link)) {
          console.log(`[DuplicateFinder] Skipping pair marked as non-duplicate: ${store1.Link} <-> ${store2.Link}`);
          continue;
        }

        const name1 = normalizeStoreName(store1.Name || '');
        const name2 = normalizeStoreName(store2.Name || '');
        if (!name1 || !name2) continue;

        const words1 = name1.split(/\s+/).filter(w => w.length > 2);
        const words2 = name2.split(/\s+/).filter(w => w.length > 2);
        if (words1.length === 0 || words2.length === 0) continue;

        const sharedNameWords = words1.filter(w => words2.includes(w));
        const nameSimilarity = sharedNameWords.length / Math.min(words1.length, words2.length);

        if (nameSimilarity < 0.67) continue;

        const addr1 = (store1.Address || '').toLowerCase().split(/\s+/);
        const addr2 = (store2.Address || '').toLowerCase().split(/\s+/);
        const sharedAddrWords = addr1.filter(w =>
          addr2.includes(w) && w.length >= 3 && !/^\d+$/.test(w)
        );

        if (sharedAddrWords.length > 0) {
          duplicateGroups.push({
            stores: [store1, store2],
            reason: `Similar names (${Math.round(nameSimilarity * 100)}%) + same address: ${store1.Address}`,
            similarity: nameSimilarity,
          });
          processedPairs.add(pairKey);
        }
      }
    }
  });

  console.log(`[DuplicateFinder] Found ${duplicateGroups.length} duplicate groups`);
  return duplicateGroups.sort((a, b) => b.stores.length - a.stores.length);
}
