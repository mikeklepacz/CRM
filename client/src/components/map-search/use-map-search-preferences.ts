import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseMapSearchPreferencesProps {
  country: string;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  toast: (props: { description?: string; title: string; variant?: "default" | "destructive" }) => void;
}

export function useMapSearchPreferences(props: UseMapSearchPreferencesProps) {
  const handleToggleDefaultCountry = async (checked: boolean) => {
    try {
      await apiRequest("PUT", "/api/user/preferences", {
        defaultMapCountry: checked ? props.country : null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      props.toast({
        title: checked ? "Default saved" : "Default cleared",
        description: checked ? `${props.country} is now your default country` : "Default country has been cleared",
      });
    } catch (error) {
      console.error("Failed to save default country:", error);
      props.toast({
        title: "Error",
        description: "Failed to save preference",
        variant: "destructive",
      });
    }
  };

  const handleToggleDefaultView = async (checked: boolean) => {
    try {
      await apiRequest("PUT", "/api/user/preferences", {
        defaultMapView: checked ? { lat: props.mapCenter.lat, lng: props.mapCenter.lng, zoom: props.mapZoom } : null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      props.toast({
        title: checked ? "Default view saved" : "Default view cleared",
        description: checked ? "This map view is now your default" : "Default view has been cleared",
      });
    } catch (error) {
      console.error("Failed to save default view:", error);
      props.toast({
        title: "Error",
        description: "Failed to save default view",
        variant: "destructive",
      });
    }
  };

  return {
    handleToggleDefaultCountry,
    handleToggleDefaultView,
  };
}
