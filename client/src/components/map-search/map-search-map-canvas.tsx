import type { MutableRefObject } from "react";
import { GoogleMap, InfoWindow, LoadScript, Marker } from "@react-google-maps/api";
import { ClientMapPins } from "@/components/client-map-pins";
import { DARK_MAP_STYLES, LIGHT_MAP_STYLES } from "@/components/map-search/map-search.constants";
import type { PlaceResult } from "@/components/map-search/map-search.types";

interface MapSearchMapCanvasProps {
  actualTheme: string;
  city: string;
  country: string;
  currentProjectId?: string;
  filteredResults: PlaceResult[];
  googleMapsApiKey: string;
  handleMapClick: (e: google.maps.MapMouseEvent) => void;
  hoveredSearchPin: string | null;
  joinColumn: string;
  mapCenter: { lat: number; lng: number };
  mapRef: MutableRefObject<google.maps.Map | null>;
  mapViewLoaded: boolean;
  mapZoom: number;
  onStorePinClick: (row: any) => void;
  searchResults: PlaceResult[];
  selectedLocation: { lat: number; lng: number } | null;
  setHoveredSearchPin: (value: string | null) => void;
  setMapCenter: (value: { lat: number; lng: number }) => void;
  setMapZoom: (value: number) => void;
  showBusinessesMode: boolean;
  state: string;
  statusColors: any;
  storeSheetId: string;
  trackerSheetId: string;
  mapSessionKey: string;
}

export function MapSearchMapCanvas(props: MapSearchMapCanvasProps) {
  return (
    <LoadScript googleMapsApiKey={props.googleMapsApiKey}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={props.mapCenter}
        zoom={props.mapZoom}
        onClick={props.handleMapClick}
        onLoad={(map) => {
          props.mapRef.current = map;
        }}
        onIdle={() => {
          if (props.mapRef.current && props.mapViewLoaded) {
            const center = props.mapRef.current.getCenter();
            const zoom = props.mapRef.current.getZoom();
            if (center && zoom !== undefined) {
              const newCenter = { lat: center.lat(), lng: center.lng() };
              props.setMapCenter(newCenter);
              props.setMapZoom(zoom);
              sessionStorage.setItem(
                props.mapSessionKey,
                JSON.stringify({
                  lat: newCenter.lat,
                  lng: newCenter.lng,
                  zoom,
                }),
              );
            }
          }
        }}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          fullscreenControl: false,
          styles: props.actualTheme === "dark" ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
        }}
      >
        {props.selectedLocation && !props.showBusinessesMode && <Marker position={props.selectedLocation} />}
        {!props.showBusinessesMode &&
          props.searchResults.length > 0 &&
          props.filteredResults.map((place) => (
            <Marker
              key={place.place_id}
              position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
              icon={{
                url: `data:image/svg+xml,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="42" viewBox="0 0 28 42"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 28 14 28s14-17.5 14-28C28 6.268 21.732 0 14 0z" fill="${place.business_status === "CLOSED_TEMPORARILY" || place.business_status === "CLOSED_PERMANENTLY" ? "%23EF4444" : "%233B82F6"}"/><circle cx="14" cy="14" r="6" fill="white"/></svg>`,
                )}`,
                scaledSize: new google.maps.Size(28, 42),
                anchor: new google.maps.Point(14, 42),
              }}
              onMouseOver={() => props.setHoveredSearchPin(place.place_id)}
              onMouseOut={() => props.setHoveredSearchPin(null)}
              data-testid={`pin-search-${place.place_id}`}
            >
              {props.hoveredSearchPin === place.place_id && (
                <InfoWindow
                  position={{ lat: place.geometry.location.lat, lng: place.geometry.location.lng }}
                  onCloseClick={() => props.setHoveredSearchPin(null)}
                >
                  <div style={{ padding: "4px 8px", minWidth: "150px" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px", color: "#111" }}>{place.name}</div>
                    <div style={{ fontSize: "11px", color: "#555", marginBottom: "2px" }}>{place.formatted_address}</div>
                    {place.rating && (
                      <div style={{ fontSize: "11px", color: "#555" }}>
                        Rating: {place.rating} ({place.user_ratings_total} reviews)
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}
        {props.showBusinessesMode && props.storeSheetId && props.trackerSheetId && props.state && (
          <ClientMapPins
            storeSheetId={props.storeSheetId}
            trackerSheetId={props.trackerSheetId}
            joinColumn={props.joinColumn}
            state={props.state}
            city={props.city}
            country={props.country}
            projectId={props.currentProjectId}
            statusColors={props.statusColors}
            onPinClick={props.onStorePinClick}
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
}
