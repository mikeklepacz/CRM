import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;


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
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
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
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,location,currentOpeningHours,businessStatus,types,addressComponents.longText,addressComponents.shortText,addressComponents.types'
      }
    });

    const data: any = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Google Places API error: ${response.status} - ${data.error?.message || 'Unknown error'}`);
    }

    // Transform v1 addressComponents to legacy format
    const addressComponents = data.addressComponents?.map((comp: any) => ({
      long_name: comp.longText || '',
      short_name: comp.shortText || '',
      types: comp.types || []
    })) || [];

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
      types: data.types || [],
      address_components: addressComponents.length > 0 ? addressComponents : undefined
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
    const stateAbbr = stateParts[0] || '';
    
    // Convert state abbreviation to full name, fallback to abbreviation if not found
    const state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || stateAbbr;
    
    return { city, state };
  }
  
  return { city: '', state: '' };
}

// Parse full address into street, city, state, zip components for CRM columns
// DEPRECATED: Use extractAddressFromComponents for international support
export function parseAddressComponents(formattedAddress: string): { 
  street: string; 
  city: string; 
  state: string;
  zip: string;
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
    const zip = stateParts[1] || '';
    
    // Convert state abbreviation to full name
    const state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || stateAbbr;
    
    return { street, city, state, zip };
  }
  
  return { street: '', city: '', state: '', zip: '' };
}

// Extract address components from Google's structured address_components array
// Works globally for all countries - no parsing needed
export function extractAddressFromComponents(
  addressComponents: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
  formattedAddress: string
): { 
  street: string; 
  city: string; 
  state: string;
  zip: string;
  country: string;
} {
  if (!addressComponents || addressComponents.length === 0) {
    // Fallback to legacy parsing if no components available
    const legacy = parseAddressComponents(formattedAddress);
    return { ...legacy, country: '' };
  }

  let streetNumber = '';
  let route = '';
  let city = '';
  let state = '';
  let zip = '';
  let country = '';

  for (const component of addressComponents) {
    const types = component.types || [];
    
    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality') || types.includes('postal_town')) {
      city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      // Use full state name for US, otherwise use what's provided
      const stateAbbr = component.short_name;
      state = STATE_ABBREVIATIONS[stateAbbr.toUpperCase()] || component.long_name;
    } else if (types.includes('postal_code')) {
      zip = component.long_name;
    } else if (types.includes('country')) {
      country = component.long_name;
    }
  }

  // If no city found, try sublocality or neighborhood
  if (!city) {
    for (const component of addressComponents) {
      const types = component.types || [];
      if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        city = component.long_name;
        break;
      }
    }
  }

  // Build street address - handle both US (number first) and European (number last) formats
  let street = '';
  if (streetNumber && route) {
    // Check if this might be a European address by looking at the country
    const euroCountries = ['Germany', 'France', 'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'Poland', 'Czech Republic', 'Spain', 'Italy'];
    if (euroCountries.includes(country)) {
      street = `${route} ${streetNumber}`;
    } else {
      street = `${streetNumber} ${route}`;
    }
  } else if (route) {
    street = route;
  } else if (streetNumber) {
    street = streetNumber;
  }

  return { street, city, state, zip, country };
}

export interface ReverseGeocodeResult {
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

export interface GeoBounds {
  northeast: { lat: number; lng: number };
  southwest: { lat: number; lng: number };
}

export interface GeocodeBoundsResult {
  bounds: GeoBounds;
  center: { lat: number; lng: number };
  formattedAddress: string;
  locationType: string;
}

export interface GridZone {
  center: { lat: number; lng: number };
  index: number;
}

export interface GridSearchProgress {
  currentZone: number;
  totalZones: number;
  resultsFound: number;
}

export interface GridSearchResponse {
  results: PlaceSearchResult[];
  totalZones: number;
  duplicatesRemoved: number;
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

export async function geocodeBounds(location: string): Promise<GeocodeBoundsResult | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const geometry = result.geometry;
    
    // Use viewport (recommended viewing area) or bounds if available
    const bounds = geometry.viewport || geometry.bounds;
    
    if (!bounds) {
      // If no bounds, create a small area around the center point
      const center = geometry.location;
      const offset = 0.05; // roughly 5km
      return {
        bounds: {
          northeast: { lat: center.lat + offset, lng: center.lng + offset },
          southwest: { lat: center.lat - offset, lng: center.lng - offset }
        },
        center: { lat: center.lat, lng: center.lng },
        formattedAddress: result.formatted_address,
        locationType: geometry.location_type || 'APPROXIMATE'
      };
    }

    return {
      bounds: {
        northeast: { lat: bounds.northeast.lat, lng: bounds.northeast.lng },
        southwest: { lat: bounds.southwest.lat, lng: bounds.southwest.lng }
      },
      center: { lat: geometry.location.lat, lng: geometry.location.lng },
      formattedAddress: result.formatted_address,
      locationType: geometry.location_type || 'APPROXIMATE'
    };
  } catch (error: any) {
    console.error('Error geocoding bounds:', error);
    throw error;
  }
}

export function createGridZones(bounds: GeoBounds, gridSize: number = 3): GridZone[] {
  const { northeast, southwest } = bounds;
  
  const latRange = northeast.lat - southwest.lat;
  const lngRange = northeast.lng - southwest.lng;
  
  const latStep = latRange / gridSize;
  const lngStep = lngRange / gridSize;
  
  const zones: GridZone[] = [];
  let index = 0;
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const centerLat = southwest.lat + (row + 0.5) * latStep;
      const centerLng = southwest.lng + (col + 0.5) * lngStep;
      
      zones.push({
        center: { lat: centerLat, lng: centerLng },
        index: index++
      });
    }
  }
  
  return zones;
}

export function calculateGridSize(bounds: GeoBounds): number {
  const { northeast, southwest } = bounds;
  
  // Calculate approximate area in km^2
  const latDiff = Math.abs(northeast.lat - southwest.lat);
  const lngDiff = Math.abs(northeast.lng - southwest.lng);
  
  // Approximate conversion (1 degree lat ≈ 111km, lng varies by latitude)
  const avgLat = (northeast.lat + southwest.lat) / 2;
  const kmPerDegreeLng = 111 * Math.cos(avgLat * Math.PI / 180);
  
  const heightKm = latDiff * 111;
  const widthKm = lngDiff * kmPerDegreeLng;
  const areaKm2 = heightKm * widthKm;
  
  // Determine grid size based on area
  if (areaKm2 > 5000) return 4;      // Very large metro (>5000 km²) -> 16 zones
  if (areaKm2 > 1000) return 3;      // Large city (>1000 km²) -> 9 zones
  if (areaKm2 > 200) return 2;       // Medium city (>200 km²) -> 4 zones
  return 1;                           // Small area -> 1 zone (no grid needed)
}

async function searchZoneWithPagination(
  query: string,
  zoneCenter: { lat: number; lng: number },
  excludedTypes?: string[]
): Promise<PlaceSearchResult[]> {
  const allResults: PlaceSearchResult[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 3; // Google limits to 3 pages max
  
  do {
    try {
      const requestBody: any = {
        textQuery: query,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: {
              latitude: zoneCenter.lat,
              longitude: zoneCenter.lng
            },
            radius: 15000 // 15km radius per zone
          }
        }
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
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY!,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.businessStatus,places.rating,places.userRatingCount,nextPageToken'
        },
        body: JSON.stringify(requestBody)
      });

      const data: any = await response.json();

      if (!response.ok) {
        console.error(`Zone search error: ${response.status} - ${data.error?.message}`);
        break;
      }

      if (data.places && data.places.length > 0) {
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
        allResults.push(...results);
      }

      pageToken = data.nextPageToken;
      pageCount++;
      
      // Small delay between pagination requests
      if (pageToken && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error in zone search:', error);
      break;
    }
  } while (pageToken && pageCount < maxPages);
  
  return allResults;
}

export async function gridSearch(
  query: string,
  location: string,
  excludedTypes?: string[],
  onProgress?: (progress: GridSearchProgress) => void
): Promise<GridSearchResponse> {
  // Get bounds for the location
  const geocodeResult = await geocodeBounds(location);
  
  if (!geocodeResult) {
    // Fallback to regular search if geocoding fails
    const regularSearch = await searchPlaces(query, location, excludedTypes);
    return {
      results: regularSearch.results,
      totalZones: 1,
      duplicatesRemoved: 0
    };
  }
  
  // Calculate appropriate grid size based on area
  const gridSize = calculateGridSize(geocodeResult.bounds);
  
  // If area is small, just do a regular search
  if (gridSize === 1) {
    const regularSearch = await searchPlaces(query, location, excludedTypes);
    return {
      results: regularSearch.results,
      totalZones: 1,
      duplicatesRemoved: 0
    };
  }
  
  // Create grid zones
  const zones = createGridZones(geocodeResult.bounds, gridSize);
  const totalZones = zones.length;
  
  console.log(`[GridSearch] Searching ${location} with ${totalZones} zones (${gridSize}x${gridSize} grid)`);
  
  // Search each zone and collect all results
  const allResults: PlaceSearchResult[] = [];
  const seenPlaceIds = new Set<string>();
  let duplicatesRemoved = 0;
  
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    
    // Report progress
    if (onProgress) {
      onProgress({
        currentZone: i + 1,
        totalZones,
        resultsFound: allResults.length
      });
    }
    
    console.log(`[GridSearch] Searching zone ${i + 1}/${totalZones} at (${zone.center.lat.toFixed(4)}, ${zone.center.lng.toFixed(4)})`);
    
    try {
      const zoneResults = await searchZoneWithPagination(query, zone.center, excludedTypes);
      
      // Deduplicate by place_id
      for (const result of zoneResults) {
        if (!seenPlaceIds.has(result.place_id)) {
          seenPlaceIds.add(result.place_id);
          allResults.push(result);
        } else {
          duplicatesRemoved++;
        }
      }
      
      console.log(`[GridSearch] Zone ${i + 1}: found ${zoneResults.length} results (${allResults.length} unique total)`);
      
      // Small delay between zone searches to avoid rate limiting
      if (i < zones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.error(`[GridSearch] Error searching zone ${i + 1}:`, error);
    }
  }
  
  console.log(`[GridSearch] Complete: ${allResults.length} unique results, ${duplicatesRemoved} duplicates removed`);
  
  return {
    results: allResults,
    totalZones,
    duplicatesRemoved
  };
}
