import { useMemo } from "react";
import { normalizeLink } from "@shared/linkUtils";
import { getLinkValue } from "@/components/store-details/store-details-utils";

export function useStoreDetailsNavigation(allVisibleStores: any[] | undefined, row: any) {
  return useMemo(() => {
    if (!allVisibleStores || allVisibleStores.length <= 1) {
      return { prevStore: null, nextStore: null, currentStoreIndex: -1 };
    }
    const currentIndex = allVisibleStores.findIndex((s: any) => {
      const sLink = getLinkValue(s);
      const rowLink = getLinkValue(row);
      return sLink && rowLink && normalizeLink(sLink) === normalizeLink(rowLink);
    });
    return {
      prevStore: currentIndex > 0 ? allVisibleStores[currentIndex - 1] : null,
      nextStore: currentIndex < allVisibleStores.length - 1 ? allVisibleStores[currentIndex + 1] : null,
      currentStoreIndex: currentIndex,
    };
  }, [allVisibleStores, row]);
}
