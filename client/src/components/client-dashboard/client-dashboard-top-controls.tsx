import { DisplaySettingsCard } from "@/components/client-dashboard/display-settings-card";
import { SearchRefreshControls } from "@/components/client-dashboard/search-refresh-controls";

type ClientDashboardTopControlsProps = {
  allStatesCount: number;
  colorPresets: any[];
  colorRowByStatus: boolean;
  currentColors: any;
  currentUser: any;
  customColors: any;
  deleteColorPreset: (index: number) => void;
  fontSize: number;
  freezeFirstColumn: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  rowHeight: number;
  saveAllStatusColors: (allColors: { [status: string]: { background: string; text: string } }) => Promise<any>;
  searchTerm: string;
  selectedStatesCount: number;
  setColorPresets: (presets: any[]) => void;
  setColorRowByStatus: (value: boolean) => void;
  showMyStoresOnly: boolean;
  showUnclaimedOnly: boolean;
  statusColors: any;
  statusOptions: string[];
  textAlign: "left" | "center" | "right" | "justify";
  verticalAlign: "top" | "middle" | "bottom";
  onFontSizeChange: (value: number) => void;
  onFreezeFirstColumnChange: (value: boolean) => void;
  onRefresh: () => void;
  onResetAlignment: () => void;
  onResetColumns: () => void;
  onResetDisplay: () => void;
  onResetFilters: () => void;
  onRowHeightChange: (value: number) => void;
  onSearchTermChange: (value: string) => void;
  onToggleMyStoresOnly: (checked: boolean) => void;
  onToggleUnclaimedOnly: (checked: boolean) => void;
  onTextAlignChange: (value: "left" | "center" | "right" | "justify") => void;
  onVerticalAlignChange: (value: "top" | "middle" | "bottom") => void;
};

export function ClientDashboardTopControls({
  allStatesCount,
  colorPresets,
  colorRowByStatus,
  currentColors,
  currentUser,
  customColors,
  deleteColorPreset,
  fontSize,
  freezeFirstColumn,
  isLoading,
  isRefreshing,
  rowHeight,
  saveAllStatusColors,
  searchTerm,
  selectedStatesCount,
  setColorPresets,
  setColorRowByStatus,
  showMyStoresOnly,
  showUnclaimedOnly,
  statusColors,
  statusOptions,
  textAlign,
  verticalAlign,
  onFontSizeChange,
  onFreezeFirstColumnChange,
  onRefresh,
  onResetAlignment,
  onResetColumns,
  onResetDisplay,
  onResetFilters,
  onRowHeightChange,
  onSearchTermChange,
  onToggleMyStoresOnly,
  onToggleUnclaimedOnly,
  onTextAlignChange,
  onVerticalAlignChange,
}: ClientDashboardTopControlsProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <SearchRefreshControls
        searchTerm={searchTerm}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        showMyStoresOnly={showMyStoresOnly}
        showUnclaimedOnly={showUnclaimedOnly}
        textColor={customColors.text}
        actionButtonColor={currentColors.actionButtons}
        onSearchTermChange={onSearchTermChange}
        onRefresh={onRefresh}
        onToggleMyStoresOnly={onToggleMyStoresOnly}
        onToggleUnclaimedOnly={onToggleUnclaimedOnly}
      />

      <DisplaySettingsCard
        fontSize={fontSize}
        rowHeight={rowHeight}
        textAlign={textAlign}
        verticalAlign={verticalAlign}
        freezeFirstColumn={freezeFirstColumn}
        selectedStatesCount={selectedStatesCount}
        allStatesCount={allStatesCount}
        searchTerm={searchTerm}
        statusOptions={statusOptions}
        statusColors={statusColors}
        colorRowByStatus={colorRowByStatus}
        colorPresets={colorPresets}
        currentUser={currentUser}
        onResetColumns={onResetColumns}
        onResetDisplay={onResetDisplay}
        onResetAlignment={onResetAlignment}
        onResetFilters={onResetFilters}
        onFontSizeChange={onFontSizeChange}
        onRowHeightChange={onRowHeightChange}
        onTextAlignChange={onTextAlignChange}
        onVerticalAlignChange={onVerticalAlignChange}
        onFreezeFirstColumnChange={onFreezeFirstColumnChange}
        setColorRowByStatus={setColorRowByStatus}
        saveAllStatusColors={saveAllStatusColors}
        setColorPresets={setColorPresets}
        deleteColorPreset={deleteColorPreset}
      />
    </div>
  );
}
