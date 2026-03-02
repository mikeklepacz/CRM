import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapSearchBusinessCategoryFields } from "@/components/map-search/map-search-business-category-fields";
import { MapSearchFiltersPanel } from "@/components/map-search/map-search-filters-panel";
import { MapSearchLocationFields } from "@/components/map-search/map-search-location-fields";
import { MapSearchShowBusinessesPanel } from "@/components/map-search/map-search-show-businesses-panel";

export function MapSearchControlCard(props: any) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 max-w-xl space-y-4">
      <Card className="backdrop-blur-md bg-background/80 flex flex-col max-h-[65vh] overflow-hidden">
        <CardHeader className="flex-shrink-0 p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">
              {props.showBusinessesMode ? "Show Businesses" : props.isQualificationMode ? "Find Qualification Leads" : "Search Businesses"}
            </CardTitle>
            <div className="flex items-center gap-2">
              {props.hasStoreDatabase && !props.isQualificationMode && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="show-businesses-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    {props.showBusinessesMode ? "Map View" : "Map View"}
                  </Label>
                  <Switch
                    id="show-businesses-toggle"
                    checked={props.showBusinessesMode}
                    onCheckedChange={props.setShowBusinessesMode}
                    data-testid="switch-show-businesses"
                  />
                </div>
              )}
              {props.isQualificationMode && (
                <Link href="/qualification">
                  <Button variant="outline" size="sm" data-testid="button-back-qualification">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <CardDescription className="text-sm">
            {props.showBusinessesMode
              ? "View your existing businesses on the map with color-coded status pins"
              : props.isQualificationMode
                ? "Search Google Maps for businesses to add as qualification leads"
                : "Find local businesses using Google Maps and add them to your database"}
          </CardDescription>
          {!props.showBusinessesMode && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={props.hasStoreDatabase ? "default" : "secondary"} className="text-xs" data-testid="badge-save-destination">
                {props.sheetsLoading ? "Checking destination..." : props.hasStoreDatabase ? "Saving to: Google Sheet" : "Saving to: SQL Database"}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 p-4 pt-2">
          {props.showBusinessesMode ? (
            <MapSearchShowBusinessesPanel
              city={props.city}
              country={props.country}
              setCity={props.setCity}
              setCountry={props.setCountry}
              setState={props.setState}
              setStateOpen={props.setStateOpen}
              state={props.state}
              stateOpen={props.stateOpen}
              storeSheetId={props.storeSheetId}
              trackerSheetId={props.trackerSheetId}
            />
          ) : (
            <form onSubmit={props.handleSearch} className="space-y-3">
              <MapSearchBusinessCategoryFields
                businessType={props.businessType}
                businessTypeOpen={props.businessTypeOpen}
                category={props.category}
                categoryOpen={props.categoryOpen}
                categoriesData={props.categoriesData}
                customCategory={props.customCategory}
                hasProject={!!props.currentProject}
                isQualificationMode={props.isQualificationMode}
                searchHistoryData={props.searchHistoryData}
                setBusinessType={props.setBusinessType}
                setBusinessTypeOpen={props.setBusinessTypeOpen}
                setCategory={props.setCategory}
                setCategoryOpen={props.setCategoryOpen}
                setCustomCategory={props.setCustomCategory}
              />

              <MapSearchLocationFields
                city={props.city}
                country={props.country}
                countryOptions={props.countryOptions}
                isDefaultCountryChecked={props.isDefaultCountryChecked}
                isDefaultViewChecked={props.isDefaultViewChecked}
                onToggleDefaultCountry={props.handleToggleDefaultCountry}
                onToggleDefaultView={props.handleToggleDefaultView}
                setCity={props.setCity}
                setCountry={props.setCountry}
                setState={props.setState}
                setStateOpen={props.setStateOpen}
                state={props.state}
                stateOpen={props.stateOpen}
              />

              <MapSearchFiltersPanel
                activeKeywords={props.activeKeywords}
                activeTypes={props.activeTypes}
                addExclusionMutation={props.addExclusionMutation}
                clearAllKeywords={props.clearAllKeywords}
                clearAllTypes={props.clearAllTypes}
                filtersOpen={props.filtersOpen}
                keywords={props.keywords}
                newKeyword={props.newKeyword}
                newPlaceType={props.newPlaceType}
                placeTypes={props.placeTypes}
                setFiltersOpen={props.setFiltersOpen}
                setNewKeyword={props.setNewKeyword}
                setNewPlaceType={props.setNewPlaceType}
                toggleKeyword={props.toggleKeyword}
                togglePlaceType={props.togglePlaceType}
              />

              <Button type="submit" disabled={props.searchMutation.isPending} className="w-full md:w-auto" data-testid="button-search">
                {props.searchMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching area... (this may take a moment)
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
