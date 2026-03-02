import * as googleMaps from "../../googleMaps";

export function buildStoreGoogleSearchHandler() {
  return async (req: any, res: any) => {
    try {
      const { name, address, city, state, category, brandName } = req.body;

      if (!name && !brandName) {
        return res.status(400).json({ message: "Store name or brand name is required" });
      }

      let query = "";
      let location = "";

      if (address) {
        const storeName = brandName || name;
        query = `${storeName} ${address}`.trim();
        location = `${city || ""} ${state || ""}`.trim();
      } else if (brandName && city && state) {
        query = `${brandName} ${category || "dispensary"} ${city} ${state}`.trim();
      } else {
        query = name;
        if (city && state) {
          location = `${city}, ${state}`;
        }
      }

      const searchResults = await googleMaps.searchPlaces(query, location);

      if (!searchResults.results || searchResults.results.length === 0) {
        return res.json({ results: [] });
      }

      const detailedResults = await Promise.all(
        searchResults.results.slice(0, 3).map(async (place) => {
          try {
            const details = await googleMaps.getPlaceDetails(place.place_id);
            if (!details) return null;

            const addressComponents = googleMaps.extractAddressFromComponents(
              details.address_components,
              details.formatted_address
            );

            return {
              place_id: details.place_id,
              name: details.name,
              fullAddress: details.formatted_address,
              address: addressComponents.street,
              city: addressComponents.city,
              state: addressComponents.state,
              zip: addressComponents.zip,
              phone: details.formatted_phone_number || "",
              website: details.website || "",
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
            };
          } catch (error) {
            console.error(`Error fetching details for place ${place.place_id}:`, error);
            return null;
          }
        })
      );

      let validResults = detailedResults.filter((r) => r !== null);

      if (state && validResults.length > 0) {
        const inputStateNormalized = state.toLowerCase().trim();
        const stateFiltered = validResults.filter((result) => {
          if (!result || !result.state) return false;
          const resultStateNormalized = result.state.toLowerCase().trim();
          return (
            resultStateNormalized === inputStateNormalized ||
            resultStateNormalized.startsWith(inputStateNormalized) ||
            inputStateNormalized.startsWith(resultStateNormalized)
          );
        });

        if (stateFiltered.length > 0) {
          validResults = stateFiltered;
        }
      }

      if (city && validResults.length > 1) {
        const inputCityNormalized = city.toLowerCase().trim();
        const cityFiltered = validResults.filter((result) => {
          if (!result || !result.city) return false;
          const resultCityNormalized = result.city.toLowerCase().trim();
          return (
            resultCityNormalized === inputCityNormalized ||
            resultCityNormalized.includes(inputCityNormalized) ||
            inputCityNormalized.includes(resultCityNormalized)
          );
        });

        if (cityFiltered.length > 0) {
          validResults = cityFiltered;
        }
      }

      if (name || brandName || address) {
        const stringSimilarity = await import("string-similarity");
        const minConfidence = 0.8;

        const fuzzyFiltered = validResults.filter((result) => {
          if (!result) return false;

          let confidence = 0;
          let matchCount = 0;

          if (name || brandName) {
            const inputName = (brandName || name).toLowerCase().trim();
            const resultName = result.name.toLowerCase().trim();
            const nameSimilarity = stringSimilarity.compareTwoStrings(inputName, resultName);
            confidence += nameSimilarity;
            matchCount++;
          }

          if (address) {
            const inputAddress = address.toLowerCase().trim();
            const resultAddress = (result.fullAddress || result.address || "").toLowerCase().trim();
            const addressSimilarity = stringSimilarity.compareTwoStrings(inputAddress, resultAddress);
            confidence += addressSimilarity;
            matchCount++;
          }

          const avgConfidence = matchCount > 0 ? confidence / matchCount : 0;
          return avgConfidence >= minConfidence;
        });

        if (fuzzyFiltered.length > 0) {
          validResults = fuzzyFiltered;
        }
      }

      res.json({ results: validResults });
    } catch (error: any) {
      console.error("Error searching Google Places:", error);
      res.status(500).json({ message: error.message || "Failed to search Google Places" });
    }
  };
}
