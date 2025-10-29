import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('GOOGLE_MAPS_API_KEY not configured - Map Search will not work');
}

// US State abbreviation to full name mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
};

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

export interface PlaceSearchResponse {
  results: PlaceSearchResult[];
  nextPageToken?: string;
}

export async function searchPlaces(
  query: string, 
  location?: string, 
  excludedTypes?: string[],
  pageToken?: string
): Promise<PlaceSearchResponse> {
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

    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.rating,places.userRatingCount,nextPageToken'
      },
      body: JSON.stringify(requestBody)
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    if (!data.places || data.places.length === 0) {
      return { results: [], nextPageToken: undefined };
    }

    const results = data.places.map((place: any) => ({
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

    return {
      results,
      nextPageToken: data.nextPageToken
    };
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

export interface ParsedAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export function parseFullAddress(formattedAddress: string): ParsedAddress {
  // Example: "3630 Gull Rd, Kalamazoo, MI 49048, USA"
  // Example: "1958 South Industrial Highway, Ann Arbor, MI 48104, USA"
  
  const parts = formattedAddress.split(',').map(p => p.trim());
  
  let address = '';
  let city = '';
  let state = '';
  let zip = '';
  
  if (parts.length >= 3) {
    // Street address is the first part
    address = parts[0] || '';
    
    // City is usually second-to-last or third-to-last
    city = parts[parts.length - 3] || '';
    
    // State and ZIP are in the second-to-last part
    const stateZipPart = parts[parts.length - 2] || '';
    const stateZipMatch = stateZipPart.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    
    if (stateZipMatch) {
      state = stateZipMatch[1]; // 2-letter state code
      zip = stateZipMatch[2]; // ZIP code
    } else {
      // Fallback: try to extract state code
      const stateMatch = stateZipPart.match(/([A-Z]{2})/);
      if (stateMatch) {
        state = stateMatch[1];
      }
      // Try to extract ZIP
      const zipMatch = stateZipPart.match(/(\d{5}(?:-\d{4})?)/);
      if (zipMatch) {
        zip = zipMatch[1];
      }
    }
  }
  
  return { address, city, state, zip };
}

export function parseCityStateFromAddress(formattedAddress: string): { city: string; state: string } {
  const parts = formattedAddress.split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || '';
    const stateZip = parts[parts.length - 2] || '';
    const stateParts = stateZip.split(' ');
    const stateAbbr = stateParts[0] || '';
    
    // Convert state abbreviation to full name, fallback to abbreviation if not found
    const state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || stateAbbr;
    
    return { city, state };
  }
  
  return { city: '', state: '' };
}

// Parse full address into street, city, state components for CRM columns
export function parseAddressComponents(formattedAddress: string): { 
  street: string; 
  city: string; 
  state: string; 
} {
  const parts = formattedAddress.split(',').map(p => p.trim());
  
  if (parts.length >= 3) {
    // Street address is the first part
    const street = parts[0] || '';
    
    // City is second-to-last before state
    const city = parts[parts.length - 3] || '';
    
    // State/ZIP is last part before country
    const stateZip = parts[parts.length - 2] || '';
    const stateParts = stateZip.split(' ');
    const stateAbbr = stateParts[0] || '';
    
    // Convert state abbreviation to full name
    const state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || stateAbbr;
    
    return { street, city, state };
  }
  
  return { street: '', city: '', state: '' };
}

export interface ReverseGeocodeResult {
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components || [];

    // Extract city, state, country from address components
    let city = '';
    let state = '';
    let country = '';

    for (const component of addressComponents) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        // Get full state name
        const stateAbbr = component.short_name;
        state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || component.long_name;
      } else if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    return {
      city,
      state,
      country,
      formattedAddress: result.formatted_address,
      lat,
      lng
    };
  } catch (error: any) {
    console.error('Error reverse geocoding:', error);
    throw error;
  }
}
