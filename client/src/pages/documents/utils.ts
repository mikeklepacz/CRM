import type { DriveFile, SortOption } from "./types";

export function sortFiles(files: DriveFile[] | undefined, sortOption: SortOption) {
  if (!files) return [];

  const sorted = [...files];

  switch (sortOption) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "size-asc":
      return sorted.sort((a, b) => parseInt(a.size || "0") - parseInt(b.size || "0"));
    case "size-desc":
      return sorted.sort((a, b) => parseInt(b.size || "0") - parseInt(a.size || "0"));
    case "date-asc":
      return sorted.sort((a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime());
    case "date-desc":
      return sorted.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
    default:
      return sorted;
  }
}

export function formatFileSize(bytes: string) {
  const size = parseInt(bytes);
  if (isNaN(size)) return "Unknown";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
