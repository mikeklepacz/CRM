import fetch from "node-fetch";
import { GOOGLE_MAPS_API_KEY, STATE_ABBREVIATIONS } from "./constants";
import type { GeocodeBoundsResult, ReverseGeocodeResult } from "./types";

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not configured");
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components || [];

    let city = "";
    let state = "";
    let country = "";

    for (const component of addressComponents) {
      if (component.types.includes("locality")) {
        city = component.long_name;
      } else if (component.types.includes("administrative_area_level_1")) {
        const stateAbbr = component.short_name;
        state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || component.long_name;
      } else if (component.types.includes("country")) {
        country = component.long_name;
      }
    }

    return {
      city,
      state,
      country,
      formattedAddress: result.formatted_address,
      lat,
      lng,
    };
  } catch (error: any) {
    console.error("Error reverse geocoding:", error);
    throw error;
  }
}

export async function geocodeBounds(location: string): Promise<GeocodeBoundsResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error("Google Maps API key not configured");
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const geometry = result.geometry;
    const bounds = geometry.viewport || geometry.bounds;

    if (!bounds) {
      const center = geometry.location;
      const offset = 0.05;
      return {
        bounds: {
          northeast: { lat: center.lat + offset, lng: center.lng + offset },
          southwest: { lat: center.lat - offset, lng: center.lng - offset },
        },
        center: { lat: center.lat, lng: center.lng },
        formattedAddress: result.formatted_address,
        locationType: geometry.location_type || "APPROXIMATE",
      };
    }

    return {
      bounds: {
        northeast: { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
        southwest: { lat: bounds.southwest.lat, lng: bounds.southwest.lng },
      },
      center: { lat: geometry.location.lat, lng: geometry.location.lng },
      formattedAddress: result.formatted_address,
      locationType: geometry.location_type || "APPROXIMATE",
    };
  } catch (error: any) {
    console.error("Error geocoding bounds:", error);
    throw error;
  }
}
