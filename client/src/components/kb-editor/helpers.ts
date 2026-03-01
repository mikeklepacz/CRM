export const findMatchesInContent = (content: string, findQuery: string, caseSensitive: boolean): number[] => {
  if (!findQuery) return [];

  const matches: number[] = [];
  const searchText = caseSensitive ? content : content.toLowerCase();
  const query = caseSensitive ? findQuery : findQuery.toLowerCase();

  let index = searchText.indexOf(query);
  while (index !== -1) {
    matches.push(index);
    index = searchText.indexOf(query, index + 1);
  }

  return matches;
};

export const filterFilesBySearch = (kbFiles: any[], fileSearchQuery: string) => {
  return kbFiles
    .map((file: any) => {
      if (!fileSearchQuery.trim()) {
        return { ...file, matchCount: 0 };
      }

      const query = fileSearchQuery.toLowerCase();
      const content = (file.currentContent || "").toLowerCase();

      const wordPattern = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\w*`, "g");
      const matches = content.match(wordPattern) || [];

      return { ...file, matchCount: matches.length };
    })
    .filter((file: any) => !fileSearchQuery.trim() || file.matchCount > 0);
};
