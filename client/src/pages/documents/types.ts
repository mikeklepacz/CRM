export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  webViewLink: string;
  iconLink?: string;
  thumbnailLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  folderId: string;
  createdBy: string;
}

export type SortOption = "name-asc" | "name-desc" | "size-asc" | "size-desc" | "date-asc" | "date-desc";
