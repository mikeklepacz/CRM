export function convertToDirectImageUrl(url: string): string {
  let fileId: string | null = null;

  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    fileId = fileMatch[1];
  }

  if (!fileId) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      fileId = idMatch[1];
    }
  }

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return url;
}

export function replaceImagePlaceholders(content: string): string {
  return content.replace(/\{\{image:(.*?)\}\}/g, (match, url) => {
    const directUrl = convertToDirectImageUrl(url.trim());
    return `<img src="${directUrl}" alt="" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />`;
  });
}
