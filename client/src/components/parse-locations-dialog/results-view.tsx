import { GoogleVerifiedStoresList } from "./google-verified-stores-list";
import { MatchedStoresList } from "./matched-stores-list";
import { ResultsActions } from "./results-actions";
import { SummaryBar } from "./summary-bar";
import { UnmatchedStoresList } from "./unmatched-stores-list";
import { GoogleVerifiedStore, MatchedStore, ParsedStore } from "./types";

interface Summary {
  total: number;
  matched: number;
  unmatched: number;
  googleVerified: number;
}

interface ResultsViewProps {
  summary: Summary;
  isSearchingGoogle: boolean;
  matchedStores: MatchedStore[];
  selectedMatches: Set<string>;
  onToggleMatch: (link: string) => void;
  googleVerifiedStores: GoogleVerifiedStore[];
  selectedGoogleStores: Set<string>;
  onToggleGoogleStore: (placeId: string) => void;
  unmatchedStores: ParsedStore[];
  searchingIndex: number | null;
  searchQuery: string;
  searchResults: any[];
  searchPending: boolean;
  importPending: boolean;
  linkPending: boolean;
  onToggleSearch: (idx: number) => void;
  onSearchQueryChange: (idx: number, query: string) => void;
  onImportAsNew: (idx: number) => void;
  onManualLink: (unmatchedIndex: number, storeLink: string) => void;
  onCancel: () => void;
  onStartOver: () => void;
  onAddSelected: () => void;
}

export const ResultsView = ({
  summary,
  isSearchingGoogle,
  matchedStores,
  selectedMatches,
  onToggleMatch,
  googleVerifiedStores,
  selectedGoogleStores,
  onToggleGoogleStore,
  unmatchedStores,
  searchingIndex,
  searchQuery,
  searchResults,
  searchPending,
  importPending,
  linkPending,
  onToggleSearch,
  onSearchQueryChange,
  onImportAsNew,
  onManualLink,
  onCancel,
  onStartOver,
  onAddSelected,
}: ResultsViewProps) => {
  return (
    <div className="flex flex-col gap-4 flex-1 overflow-hidden">
      <SummaryBar summary={summary} isSearchingGoogle={isSearchingGoogle} />
      <MatchedStoresList stores={matchedStores} selectedMatches={selectedMatches} onToggleMatch={onToggleMatch} />
      <GoogleVerifiedStoresList
        stores={googleVerifiedStores}
        selectedGoogleStores={selectedGoogleStores}
        onToggleGoogleStore={onToggleGoogleStore}
      />
      <UnmatchedStoresList
        stores={unmatchedStores}
        searchingIndex={searchingIndex}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchPending={searchPending}
        importPending={importPending}
        linkPending={linkPending}
        onToggleSearch={onToggleSearch}
        onSearchQueryChange={onSearchQueryChange}
        onImportAsNew={onImportAsNew}
        onManualLink={onManualLink}
      />
      <ResultsActions
        selectedCount={selectedMatches.size + selectedGoogleStores.size}
        onCancel={onCancel}
        onStartOver={onStartOver}
        onAddSelected={onAddSelected}
      />
    </div>
  );
};
