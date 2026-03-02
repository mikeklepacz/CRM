import fetch from "node-fetch";
import { GOOGLE_MAPS_API_KEY } from "./constants";
import type { PlaceDetails, PlaceSearchResponse } from "./types";

export async function searchPlaces(
  query: string,
  location?: string,
  excludedTypes?: string[],
  pageToken?: string,
): Promise<PlaceSearchResponse> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not configured");
  }

  try {
    const textQuery = location ? `${query} in ${location}` : query;

    const requestBody: any = {
      textQuery,
      maxResultCount: 20,
    };

    if (excludedTypes && excludedTypes.length > 0) {
      requestBody.excludedTypes = excludedTypes;
    }

    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.rating,places.userRatingCount,nextPageToken",
      },
      body: JSON.stringify(requestBody),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} - ${data.error?.message || "Unknown error"}`);
    }

    if (!data.places || data.places.length === 0) {
      return { results: [], nextPageToken: undefined };
    }

    const results = data.places.map((place: any) => ({
      place_id: place.id.replace("places/", ""),
      name: place.displayName?.text || "",
      formatted_address: place.formattedAddress || "",
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
      },
      types: place.types || [],
      business_status: place.businessStatus || "OPERATIONAL",
      rating: place.rating,
      user_ratings_total: place.userRatingCount,
    }));

    return {
      results,
      nextPageToken: data.nextPageToken,
    };
  } catch (error: any) {
    console.error("Error searching places:", error);
    throw error;
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not configured");
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,location,currentOpeningHours,businessStatus,types,addressComponents.longText,addressComponents.shortText,addressComponents.types",
      },
    });

    const data: any = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Google Places API error: ${response.status} - ${data.error?.message || "Unknown error"}`);
    }

    const addressComponents =
      data.addressComponents?.map((comp: any) => ({
        long_name: comp.longText || "",
        short_name: comp.shortText || "",
        types: comp.types || [],
      })) || [];

    return {
      place_id: data.id?.replace("places/", "") || placeId,
      name: data.displayName?.text || "",
      formatted_address: data.formattedAddress || "",
      formatted_phone_number: data.nationalPhoneNumber,
      international_phone_number: data.internationalPhoneNumber,
      website: data.websiteUri,
      url: data.googleMapsUri || "",
      geometry: {
        location: {
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0,
        },
      },
      opening_hours: data.currentOpeningHours
        ? {
            open_now: data.currentOpeningHours.openNow,
            weekday_text: data.currentOpeningHours.weekdayDescriptions,
          }
        : undefined,
      business_status: data.businessStatus || "OPERATIONAL",
      types: data.types || [],
      address_components: addressComponents.length > 0 ? addressComponents : undefined,
    };
  } catch (error: any) {
    console.error("Error fetching place details:", error);
    throw error;
  }
}
