import type React from "react";

export const extractGoogleDriveFileId = (url: string): string | null => {
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
};

export const convertToDirectImageUrl = (url: string): string => {
  const fileId = extractGoogleDriveFileId(url);
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
  return url;
};

export const handleImageError = (
  e: React.SyntheticEvent<HTMLImageElement>,
  originalUrl: string,
) => {
  const img = e.target as HTMLImageElement;
  const fileId = extractGoogleDriveFileId(originalUrl);
  if (!fileId) {
    img.style.display = "none";
    return;
  }
  const currentSrc = img.src;
  if (currentSrc.includes("googleusercontent.com")) {
    img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
  } else if (currentSrc.includes("uc?export=view")) {
    img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  } else {
    img.style.display = "none";
  }
};
