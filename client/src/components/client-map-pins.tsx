import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Marker, InfoWindow } from '@react-google-maps/api';
import { apiRequest } from "@/lib/queryClient";
import { useTheme } from "@/components/theme-provider";
import { Loader2, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientPin {
  name: string;
  address: string;
  city: string;
  state: string;
  status: string;
  lat: number;
  lng: number;
  row: any;
}

interface StatusColors {
  [status: string]: { background: string; text: string };
}

interface ClientMapPinsProps {
  storeSheetId: string;
  trackerSheetId: string;
  joinColumn: string;
  state: string;
  city: string;
  country: string;
  projectId?: string;
  statusColors: StatusColors;
  onPinClick: (row: any) => void;
}

function hexToGooglePinUrl(bgColor: string): string {
  const color = bgColor.replace('#', '');
  return `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|${color}`;
}

function createSvgPinUrl(bgColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${bgColor}" stroke="#333" stroke-width="1"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.8"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function ClientMapPins({
  storeSheetId,
  trackerSheetId,
  joinColumn,
  state,
  city,
  country,
  projectId,
  statusColors,
  onPinClick,
}: ClientMapPinsProps) {
  const { actualTheme } = useTheme();
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const { data: pinsData, isLoading, error } = useQuery<{ pins: ClientPin[]; totalMatched?: number; truncated?: boolean }>({
    queryKey: ['/api/maps/client-pins', storeSheetId, trackerSheetId, state, city, projectId],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/maps/client-pins", {
        storeSheetId,
        trackerSheetId,
        joinColumn,
        state,
        city: city || undefined,
        projectId: projectId || undefined,
      });
      return response;
    },
    enabled: !!storeSheetId && !!trackerSheetId && !!state,
    staleTime: 5 * 60 * 1000,
  });

  const pins = pinsData?.pins || [];
  const truncated = pinsData?.truncated || false;
  const totalMatched = pinsData?.totalMatched || pins.length;

  const getStatusColor = useCallback((status: string): string => {
    const normalizedStatus = status?.toLowerCase().trim() || '';
    
    for (const [key, colors] of Object.entries(statusColors)) {
      if (key.toLowerCase().trim() === normalizedStatus) {
        return actualTheme === 'dark' ? colors.background : colors.background;
      }
    }

    switch (normalizedStatus) {
      case 'unassigned':
      case 'unclaimed':
      case '':
        return '#9CA3AF';
      case 'claimed':
        return '#3B82F6';
      case 'active':
        return '#10B981';
      case 'inactive':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  }, [statusColors, actualTheme]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pins.forEach(pin => {
      const status = pin.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [pins]);

  if (!state) return null;

  return (
    <>
      {isLoading && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="backdrop-blur-md bg-background/80 rounded-md p-3 flex items-center gap-2 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading {state} businesses...</span>
          </div>
        </div>
      )}

      {!isLoading && pins.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20" data-testid="pin-legend">
          <div className="backdrop-blur-md bg-background/80 rounded-md p-3 shadow-lg space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {truncated 
                ? `Showing ${pins.length} of ${totalMatched} locations in ${state}${city ? `, ${city}` : ''}`
                : `${pins.length} locations in ${state}${city ? `, ${city}` : ''}`
              }
            </div>
            {truncated && (
              <div className="text-[10px] text-orange-500">
                Use the city filter to narrow results
              </div>
            )}
            {Object.entries(statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: getStatusColor(status), borderColor: 'rgba(0,0,0,0.2)' }}
                  />
                  <span>{status || 'Unknown'}</span>
                  <Badge variant="secondary" className="text-[10px] leading-none">
                    {count}
                  </Badge>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {!isLoading && pins.length === 0 && state && (
        <div className="absolute bottom-4 left-4 z-20">
          <div className="backdrop-blur-md bg-background/80 rounded-md p-3 flex items-center gap-2 shadow-lg">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No businesses found in {state}{city ? `, ${city}` : ''}</span>
          </div>
        </div>
      )}

      {pins.map((pin, index) => {
        const pinKey = `${pin.lat}-${pin.lng}-${index}`;
        const color = getStatusColor(pin.status);

        return (
          <Marker
            key={pinKey}
            position={{ lat: pin.lat, lng: pin.lng }}
            icon={{
              url: createSvgPinUrl(color),
              scaledSize: new google.maps.Size(28, 42),
              anchor: new google.maps.Point(14, 42),
            }}
            onClick={() => {
              setSelectedPin(pinKey);
              onPinClick(pin.row);
            }}
            onMouseOver={() => setHoveredPin(pinKey)}
            onMouseOut={() => setHoveredPin(null)}
            data-testid={`pin-client-${index}`}
          >
            {hoveredPin === pinKey && (
              <InfoWindow
                position={{ lat: pin.lat, lng: pin.lng }}
                onCloseClick={() => setHoveredPin(null)}
              >
                <div style={{ padding: '4px 8px', minWidth: '150px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: '#111' }}>
                    {pin.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>
                    {pin.address}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>
                    {pin.city}, {pin.state}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '10px',
                    fontWeight: 500,
                    backgroundColor: color,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}>
                    {pin.status || 'Unknown'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                    Click to view details
                  </div>
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </>
  );
}
