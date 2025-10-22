import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY not configured - Map Search will not work');
}

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  business_status?: string;
  types: string[];
}

export async function searchPlaces(
  query: string, 
  location?: string, 
  excludedTypes?: string[],
  radiusMeters?: number
): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const textQuery = location ? `${query} in ${location}` : query;
    
    const requestBody: any = {
      textQuery,
      maxResultCount: 20
    };

    if (excludedTypes && excludedTypes.length > 0) {
      requestBody.excludedTypes = excludedTypes;
    }

    // Note: radius parameter is accepted for future implementation
    // To properly use locationBias with a radius, we would need to:
    // 1. Geocode the location string to get lat/lng coordinates
    // 2. Add locationBias: { circle: { center: { latitude, longitude }, radius: radiusMeters } }
    // For now, the textQuery (which includes location) provides natural location biasing

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.rating,places.userRatingCount'
      },
      body: JSON.stringify(requestBody)
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    if (!data.places || data.places.length === 0) {
      return [];
    }

    return data.places.map((place: any) => ({
      place_id: place.id.replace('places/', ''),
      name: place.displayName?.text || '',
      formatted_address: place.formattedAddress || '',
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        }
      },
      types: place.types || [],
      business_status: place.businessStatus || 'OPERATIONAL',
      rating: place.rating,
      user_ratings_total: place.userRatingCount
    }));
  } catch (error: any) {
    console.error('Error searching places:', error);
    throw error;
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,location,currentOpeningHours,businessStatus,types'
      }
    });

    const data: any = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Google Places API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    return {
      place_id: data.id?.replace('places/', '') || placeId,
      name: data.displayName?.text || '',
      formatted_address: data.formattedAddress || '',
      formatted_phone_number: data.nationalPhoneNumber,
      international_phone_number: data.internationalPhoneNumber,
      website: data.websiteUri,
      url: data.googleMapsUri || '',
      geometry: {
        location: {
          lat: data.location?.latitude || 0,
          lng: data.location?.longitude || 0
        }
      },
      opening_hours: data.currentOpeningHours ? {
        open_now: data.currentOpeningHours.openNow,
        weekday_text: data.currentOpeningHours.weekdayDescriptions
      } : undefined,
      business_status: data.businessStatus || 'OPERATIONAL',
      types: data.types || []
    };
  } catch (error: any) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

export function parseCityStateFromAddress(formattedAddress: string): { city: string; state: string } {
  const parts = formattedAddress.split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || '';
    const stateZip = parts[parts.length - 2] || '';
    const stateParts = stateZip.split(' ');
    const state = stateParts[0] || '';
    
    return { city, state };
  }
  
  return { city: '', state: '' };
}
