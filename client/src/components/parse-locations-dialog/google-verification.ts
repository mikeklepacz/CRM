import { apiRequest } from "@/lib/queryClient";
import { GoogleVerifiedStore, ParsedStore } from "./types";

interface VerificationParams {
  unmatchedStores: ParsedStore[];
  category?: string;
  brandName?: string;
}

export const verifyUnmatchedWithGoogle = async ({
  unmatchedStores,
  category,
  brandName,
}: VerificationParams): Promise<{ googleResults: GoogleVerifiedStore[]; stillUnmatched: ParsedStore[] }> => {
  const googleResults: GoogleVerifiedStore[] = [];
  const stillUnmatched: ParsedStore[] = [];

  for (const unmatchedStore of unmatchedStores) {
    try {
      const googleSearchResult = await apiRequest("POST", "/api/stores/search-google", {
        name: unmatchedStore.name,
        address: unmatchedStore.address,
        city: unmatchedStore.city,
        state: unmatchedStore.state,
        category: category || "",
        brandName: brandName || "",
      });

      if (googleSearchResult.results && googleSearchResult.results.length > 0) {
        googleResults.push({ parsed: unmatchedStore, googleResult: googleSearchResult.results[0] });
      } else {
        stillUnmatched.push(unmatchedStore);
      }
    } catch (error) {
      console.error("Error searching Google for:", unmatchedStore.name, error);
      stillUnmatched.push(unmatchedStore);
    }
  }

  return { googleResults, stillUnmatched };
};
