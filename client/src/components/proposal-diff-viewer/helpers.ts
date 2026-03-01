import { Edit } from "./types";

export const parseEdits = (content: string): Edit[] => {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("Failed to parse edits JSON:", error);
    return [];
  }
};

export const isValidEdits = (edits: Edit[]): boolean => {
  return edits.length > 0 && edits.every((e) => "old" in e && "new" in e && "reason" in e && e.new && e.reason);
};

export const calculateRows = (text: string): number => {
  const lines = text.split("\n");
  const charsPerLine = 60;
  let totalRows = 0;
  lines.forEach((line) => {
    if (line.length === 0) totalRows += 1;
    else totalRows += Math.ceil(line.length / charsPerLine);
  });
  const minRows = 3;
  const maxRows = 50;
  return Math.min(Math.max(totalRows, minRows), maxRows);
};
