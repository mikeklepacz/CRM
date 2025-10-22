import { format } from 'date-fns';
import { formatInTimeZone, getTimezoneOffset } from 'date-fns-tz';

export interface TimezoneData {
  value: string; // IANA timezone identifier
  label: string; // Display name
  country: string;
  searchTerms: string[]; // Additional search terms
}

export const TIMEZONE_DATA: TimezoneData[] = [
  // US Timezones
  {
    value: 'America/New_York',
    label: 'Eastern Time (ET)',
    country: 'United States',
    searchTerms: ['EST', 'EDT', 'New York', 'NY', 'Eastern', 'Miami', 'Boston', 'Philadelphia', 'Washington DC', 'Atlanta']
  },
  {
    value: 'America/Chicago',
    label: 'Central Time (CT)',
    country: 'United States',
    searchTerms: ['CST', 'CDT', 'Chicago', 'IL', 'Central', 'Dallas', 'Houston', 'Austin', 'Minneapolis', 'San Antonio']
  },
  {
    value: 'America/Denver',
    label: 'Mountain Time (MT)',
    country: 'United States',
    searchTerms: ['MST', 'MDT', 'Denver', 'CO', 'Mountain', 'Phoenix', 'Salt Lake City', 'Albuquerque', 'Colorado']
  },
  {
    value: 'America/Phoenix',
    label: 'Mountain Time - Arizona (no DST)',
    country: 'United States',
    searchTerms: ['MST', 'Phoenix', 'AZ', 'Arizona', 'Tucson', 'Mesa', 'Scottsdale']
  },
  {
    value: 'America/Los_Angeles',
    label: 'Pacific Time (PT)',
    country: 'United States',
    searchTerms: ['PST', 'PDT', 'Los Angeles', 'CA', 'Pacific', 'San Francisco', 'Seattle', 'San Diego', 'Portland', 'Las Vegas']
  },
  {
    value: 'America/Anchorage',
    label: 'Alaska Time (AKT)',
    country: 'United States',
    searchTerms: ['AKST', 'AKDT', 'Alaska', 'AK', 'Anchorage', 'Juneau']
  },
  {
    value: 'Pacific/Honolulu',
    label: 'Hawaii-Aleutian Time (HST)',
    country: 'United States',
    searchTerms: ['HST', 'Hawaii', 'HI', 'Honolulu', 'Maui', 'Kauai']
  },
  
  // Europe
  {
    value: 'Europe/London',
    label: 'British Time (GMT/BST)',
    country: 'United Kingdom',
    searchTerms: ['GMT', 'BST', 'London', 'UK', 'Britain', 'England', 'Scotland', 'Wales']
  },
  {
    value: 'Europe/Paris',
    label: 'Central European Time',
    country: 'France',
    searchTerms: ['CET', 'CEST', 'Paris', 'France', 'Berlin', 'Madrid', 'Rome', 'Brussels']
  },
  {
    value: 'Europe/Berlin',
    label: 'Central European Time',
    country: 'Germany',
    searchTerms: ['CET', 'CEST', 'Berlin', 'Germany', 'Munich', 'Frankfurt', 'Hamburg']
  },
  {
    value: 'Europe/Warsaw',
    label: 'Central European Time',
    country: 'Poland',
    searchTerms: ['CET', 'CEST', 'Warsaw', 'Poland', 'Krakow', 'Gdansk', 'Wroclaw']
  },
  {
    value: 'Europe/Rome',
    label: 'Central European Time',
    country: 'Italy',
    searchTerms: ['CET', 'CEST', 'Rome', 'Italy', 'Milan', 'Naples', 'Venice', 'Florence']
  },
  {
    value: 'Europe/Madrid',
    label: 'Central European Time',
    country: 'Spain',
    searchTerms: ['CET', 'CEST', 'Madrid', 'Spain', 'Barcelona', 'Valencia', 'Seville']
  },
  {
    value: 'Europe/Amsterdam',
    label: 'Central European Time',
    country: 'Netherlands',
    searchTerms: ['CET', 'CEST', 'Amsterdam', 'Netherlands', 'Rotterdam', 'The Hague']
  },
  {
    value: 'Europe/Brussels',
    label: 'Central European Time',
    country: 'Belgium',
    searchTerms: ['CET', 'CEST', 'Brussels', 'Belgium', 'Antwerp', 'Bruges']
  },
  {
    value: 'Europe/Athens',
    label: 'Eastern European Time',
    country: 'Greece',
    searchTerms: ['EET', 'EEST', 'Athens', 'Greece']
  },
  {
    value: 'Europe/Istanbul',
    label: 'Turkey Time',
    country: 'Turkey',
    searchTerms: ['TRT', 'Istanbul', 'Turkey', 'Ankara']
  },
  {
    value: 'Europe/Moscow',
    label: 'Moscow Standard Time',
    country: 'Russia',
    searchTerms: ['MSK', 'Moscow', 'Russia']
  },
  
  // Asia
  {
    value: 'Asia/Dubai',
    label: 'Gulf Standard Time',
    country: 'UAE',
    searchTerms: ['GST', 'Dubai', 'UAE', 'Abu Dhabi']
  },
  {
    value: 'Asia/Kolkata',
    label: 'India Standard Time',
    country: 'India',
    searchTerms: ['IST', 'India', 'Mumbai', 'Delhi', 'Bangalore', 'Kolkata', 'Chennai']
  },
  {
    value: 'Asia/Shanghai',
    label: 'China Standard Time',
    country: 'China',
    searchTerms: ['CST', 'China', 'Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou']
  },
  {
    value: 'Asia/Tokyo',
    label: 'Japan Standard Time',
    country: 'Japan',
    searchTerms: ['JST', 'Japan', 'Tokyo', 'Osaka', 'Kyoto']
  },
  {
    value: 'Asia/Seoul',
    label: 'Korea Standard Time',
    country: 'South Korea',
    searchTerms: ['KST', 'Korea', 'Seoul', 'Busan']
  },
  {
    value: 'Asia/Singapore',
    label: 'Singapore Time',
    country: 'Singapore',
    searchTerms: ['SGT', 'Singapore']
  },
  {
    value: 'Asia/Hong_Kong',
    label: 'Hong Kong Time',
    country: 'Hong Kong',
    searchTerms: ['HKT', 'Hong Kong']
  },
  
  // Australia & Pacific
  {
    value: 'Australia/Sydney',
    label: 'Australian Eastern Time',
    country: 'Australia',
    searchTerms: ['AEST', 'AEDT', 'Sydney', 'Australia', 'Melbourne', 'Brisbane']
  },
  {
    value: 'Australia/Perth',
    label: 'Australian Western Time',
    country: 'Australia',
    searchTerms: ['AWST', 'Perth', 'Western Australia']
  },
  {
    value: 'Pacific/Auckland',
    label: 'New Zealand Time',
    country: 'New Zealand',
    searchTerms: ['NZST', 'NZDT', 'Auckland', 'New Zealand', 'Wellington']
  },
  
  // Americas (Other)
  {
    value: 'America/Toronto',
    label: 'Eastern Time (Canada)',
    country: 'Canada',
    searchTerms: ['EST', 'EDT', 'Toronto', 'Canada', 'Ottawa', 'Montreal']
  },
  {
    value: 'America/Vancouver',
    label: 'Pacific Time (Canada)',
    country: 'Canada',
    searchTerms: ['PST', 'PDT', 'Vancouver', 'Canada', 'British Columbia']
  },
  {
    value: 'America/Mexico_City',
    label: 'Central Time (Mexico)',
    country: 'Mexico',
    searchTerms: ['CST', 'CDT', 'Mexico City', 'Mexico']
  },
  {
    value: 'America/Sao_Paulo',
    label: 'Brasilia Time',
    country: 'Brazil',
    searchTerms: ['BRT', 'BRST', 'Sao Paulo', 'Brazil', 'Rio de Janeiro']
  },
  {
    value: 'America/Buenos_Aires',
    label: 'Argentina Time',
    country: 'Argentina',
    searchTerms: ['ART', 'Buenos Aires', 'Argentina']
  }
];

// US State to Timezone mapping
const US_STATE_TO_TIMEZONE: Record<string, string> = {
  'AL': 'America/Chicago', 'Alabama': 'America/Chicago',
  'AK': 'America/Anchorage', 'Alaska': 'America/Anchorage',
  'AZ': 'America/Phoenix', 'Arizona': 'America/Phoenix',
  'AR': 'America/Chicago', 'Arkansas': 'America/Chicago',
  'CA': 'America/Los_Angeles', 'California': 'America/Los_Angeles',
  'CO': 'America/Denver', 'Colorado': 'America/Denver',
  'CT': 'America/New_York', 'Connecticut': 'America/New_York',
  'DE': 'America/New_York', 'Delaware': 'America/New_York',
  'FL': 'America/New_York', 'Florida': 'America/New_York',
  'GA': 'America/New_York', 'Georgia': 'America/New_York',
  'HI': 'Pacific/Honolulu', 'Hawaii': 'Pacific/Honolulu',
  'ID': 'America/Denver', 'Idaho': 'America/Denver',
  'IL': 'America/Chicago', 'Illinois': 'America/Chicago',
  'IN': 'America/New_York', 'Indiana': 'America/New_York',
  'IA': 'America/Chicago', 'Iowa': 'America/Chicago',
  'KS': 'America/Chicago', 'Kansas': 'America/Chicago',
  'KY': 'America/New_York', 'Kentucky': 'America/New_York',
  'LA': 'America/Chicago', 'Louisiana': 'America/Chicago',
  'ME': 'America/New_York', 'Maine': 'America/New_York',
  'MD': 'America/New_York', 'Maryland': 'America/New_York',
  'MA': 'America/New_York', 'Massachusetts': 'America/New_York',
  'MI': 'America/New_York', 'Michigan': 'America/New_York',
  'MN': 'America/Chicago', 'Minnesota': 'America/Chicago',
  'MS': 'America/Chicago', 'Mississippi': 'America/Chicago',
  'MO': 'America/Chicago', 'Missouri': 'America/Chicago',
  'MT': 'America/Denver', 'Montana': 'America/Denver',
  'NE': 'America/Chicago', 'Nebraska': 'America/Chicago',
  'NV': 'America/Los_Angeles', 'Nevada': 'America/Los_Angeles',
  'NH': 'America/New_York', 'New Hampshire': 'America/New_York',
  'NJ': 'America/New_York', 'New Jersey': 'America/New_York',
  'NM': 'America/Denver', 'New Mexico': 'America/Denver',
  'NY': 'America/New_York', 'New York': 'America/New_York',
  'NC': 'America/New_York', 'North Carolina': 'America/New_York',
  'ND': 'America/Chicago', 'North Dakota': 'America/Chicago',
  'OH': 'America/New_York', 'Ohio': 'America/New_York',
  'OK': 'America/Chicago', 'Oklahoma': 'America/Chicago',
  'OR': 'America/Los_Angeles', 'Oregon': 'America/Los_Angeles',
  'PA': 'America/New_York', 'Pennsylvania': 'America/New_York',
  'RI': 'America/New_York', 'Rhode Island': 'America/New_York',
  'SC': 'America/New_York', 'South Carolina': 'America/New_York',
  'SD': 'America/Chicago', 'South Dakota': 'America/Chicago',
  'TN': 'America/Chicago', 'Tennessee': 'America/Chicago',
  'TX': 'America/Chicago', 'Texas': 'America/Chicago',
  'UT': 'America/Denver', 'Utah': 'America/Denver',
  'VT': 'America/New_York', 'Vermont': 'America/New_York',
  'VA': 'America/New_York', 'Virginia': 'America/New_York',
  'WA': 'America/Los_Angeles', 'Washington': 'America/Los_Angeles',
  'WV': 'America/New_York', 'West Virginia': 'America/New_York',
  'WI': 'America/Chicago', 'Wisconsin': 'America/Chicago',
  'WY': 'America/Denver', 'Wyoming': 'America/Denver',
};

// Major cities to timezone mapping (global)
const CITY_TO_TIMEZONE: Record<string, string> = {
  // US Cities
  'New York': 'America/New_York',
  'Los Angeles': 'America/Los_Angeles',
  'Chicago': 'America/Chicago',
  'Houston': 'America/Chicago',
  'Phoenix': 'America/Phoenix',
  'Philadelphia': 'America/New_York',
  'San Antonio': 'America/Chicago',
  'San Diego': 'America/Los_Angeles',
  'Dallas': 'America/Chicago',
  'San Jose': 'America/Los_Angeles',
  'Austin': 'America/Chicago',
  'Jacksonville': 'America/New_York',
  'San Francisco': 'America/Los_Angeles',
  'Columbus': 'America/New_York',
  'Fort Worth': 'America/Chicago',
  'Charlotte': 'America/New_York',
  'Seattle': 'America/Los_Angeles',
  'Denver': 'America/Denver',
  'Washington': 'America/New_York',
  'Boston': 'America/New_York',
  'Nashville': 'America/Chicago',
  'Detroit': 'America/New_York',
  'Portland': 'America/Los_Angeles',
  'Las Vegas': 'America/Los_Angeles',
  'Miami': 'America/New_York',
  'Atlanta': 'America/New_York',
  
  // European Cities
  'London': 'Europe/London',
  'Paris': 'Europe/Paris',
  'Berlin': 'Europe/Berlin',
  'Madrid': 'Europe/Madrid',
  'Rome': 'Europe/Rome',
  'Amsterdam': 'Europe/Amsterdam',
  'Brussels': 'Europe/Brussels',
  'Vienna': 'Europe/Vienna',
  'Warsaw': 'Europe/Warsaw',
  'Budapest': 'Europe/Budapest',
  'Prague': 'Europe/Prague',
  'Stockholm': 'Europe/Stockholm',
  'Oslo': 'Europe/Oslo',
  'Copenhagen': 'Europe/Copenhagen',
  'Dublin': 'Europe/Dublin',
  'Lisbon': 'Europe/Lisbon',
  'Athens': 'Europe/Athens',
  'Istanbul': 'Europe/Istanbul',
  'Moscow': 'Europe/Moscow',
  
  // Asian Cities
  'Tokyo': 'Asia/Tokyo',
  'Shanghai': 'Asia/Shanghai',
  'Beijing': 'Asia/Shanghai',
  'Singapore': 'Asia/Singapore',
  'Hong Kong': 'Asia/Hong_Kong',
  'Dubai': 'Asia/Dubai',
  'Mumbai': 'Asia/Kolkata',
  'Delhi': 'Asia/Kolkata',
  'Bangalore': 'Asia/Kolkata',
  'Seoul': 'Asia/Seoul',
  'Bangkok': 'Asia/Bangkok',
  'Manila': 'Asia/Manila',
  
  // Other
  'Toronto': 'America/Toronto',
  'Montreal': 'America/Toronto',
  'Vancouver': 'America/Vancouver',
  'Sydney': 'Australia/Sydney',
  'Melbourne': 'Australia/Sydney',
  'Auckland': 'Pacific/Auckland',
  'Mexico City': 'America/Mexico_City',
};

/**
 * Detect timezone from address components
 */
export function detectTimezoneFromAddress(
  address: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined
): string | null {
  // Try state first (most reliable for US)
  if (state) {
    const stateUpper = state.trim().toUpperCase();
    const stateTitleCase = state.trim();
    
    if (US_STATE_TO_TIMEZONE[stateUpper]) {
      return US_STATE_TO_TIMEZONE[stateUpper];
    }
    if (US_STATE_TO_TIMEZONE[stateTitleCase]) {
      return US_STATE_TO_TIMEZONE[stateTitleCase];
    }
  }
  
  // Try city
  if (city) {
    const cityTitleCase = city.trim();
    if (CITY_TO_TIMEZONE[cityTitleCase]) {
      return CITY_TO_TIMEZONE[cityTitleCase];
    }
    
    // Try case-insensitive match
    const cityLower = cityTitleCase.toLowerCase();
    const matchedCity = Object.keys(CITY_TO_TIMEZONE).find(
      key => key.toLowerCase() === cityLower
    );
    if (matchedCity) {
      return CITY_TO_TIMEZONE[matchedCity];
    }
  }
  
  // Try parsing address for state abbreviations
  if (address) {
    const addressUpper = address.toUpperCase();
    for (const [stateCode, timezone] of Object.entries(US_STATE_TO_TIMEZONE)) {
      if (stateCode.length === 2 && addressUpper.includes(` ${stateCode} `)) {
        return timezone;
      }
    }
  }
  
  return null;
}

/**
 * Format timezone display with current offset
 */
export function formatTimezoneDisplay(timezone: string): string {
  try {
    const now = new Date();
    const offset = getTimezoneOffset(timezone, now);
    const offsetHours = offset / (1000 * 60 * 60);
    const sign = offsetHours >= 0 ? '+' : '';
    const offsetStr = `UTC${sign}${offsetHours}`;
    
    const tzData = TIMEZONE_DATA.find(tz => tz.value === timezone);
    if (tzData) {
      return `${tzData.label} (${offsetStr})`;
    }
    
    return `${timezone} (${offsetStr})`;
  } catch (error) {
    return timezone;
  }
}

/**
 * Get timezone offset string (e.g., "UTC-5" or "UTC+1")
 */
export function getTimezoneOffsetString(timezone: string): string {
  try {
    const now = new Date();
    const offset = getTimezoneOffset(timezone, now);
    const offsetHours = offset / (1000 * 60 * 60);
    const sign = offsetHours >= 0 ? '+' : '';
    return `UTC${sign}${offsetHours}`;
  } catch (error) {
    return 'UTC';
  }
}

/**
 * Format time in a specific timezone
 */
export function formatTimeInTimezone(date: Date, timezone: string, formatStr: string = 'PPpp'): string {
  try {
    return formatInTimeZone(date, timezone, formatStr);
  } catch (error) {
    return format(date, formatStr);
  }
}
