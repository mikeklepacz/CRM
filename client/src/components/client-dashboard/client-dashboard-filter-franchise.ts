type FilterFranchiseRowsParams = {
  data: any[];
  headers: string[];
  searchTerm: string;
  selectedFranchise: any;
  sortColumn: string | null;
  sortDirection: "asc" | "desc";
};

export function filterFranchiseRows({
  data,
  headers,
  searchTerm,
  selectedFranchise,
  sortColumn,
  sortDirection,
}: FilterFranchiseRowsParams) {
  const franchiseLinks = new Set(selectedFranchise.locations.map((loc: any) => loc.Link));
  let filtered = data.filter((row: any) => franchiseLinks.has(row.Link));

  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter((row: any) => {
      return headers.some((header: string) => {
        const value = row[header]?.toString().toLowerCase() || "";
        return value.includes(searchLower);
      });
    });
  }

  if (sortColumn) {
    filtered = [...filtered].sort((a: any, b: any) => {
      const aVal = String(a[sortColumn] || "");
      const bVal = String(b[sortColumn] || "");

      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }

  return filtered;
}
