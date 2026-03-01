import type { Message } from "./types";

export function formatAIContent(content: string): string {
  let cleaned = content.replace(/\s*\[\d+:\d+[^\]]*source\]\s*/gi, "");
  cleaned = cleaned.replace(/\s*\[\d+:\d+\]\s*/g, "");
  cleaned = cleaned.trim();
  return cleaned;
}

export function hasJSONProposals(content: string): boolean {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*(\{[\s\S]*?\})\s*```/);
  if (!jsonMatch) return false;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return parsed.edits && Array.isArray(parsed.edits) && parsed.edits.length > 0;
  } catch {
    return false;
  }
}

export function renderFormattedText(content: string): JSX.Element[] {
  const formattedContent = formatAIContent(content);
  const lines = formattedContent.split("\n");
  const result: JSX.Element[] = [];

  lines.forEach((line, lineIndex) => {
    const h3Match = line.match(/^###\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h1Match = line.match(/^#\s+(.+)$/);

    if (h3Match) {
      result.push(
        <h3 key={`line-${lineIndex}`} className="text-base font-semibold mt-3 mb-2">
          {h3Match[1]}
        </h3>,
      );
      return;
    }
    if (h2Match) {
      result.push(
        <h2 key={`line-${lineIndex}`} className="text-lg font-semibold mt-4 mb-2">
          {h2Match[1]}
        </h2>,
      );
      return;
    }
    if (h1Match) {
      result.push(
        <h1 key={`line-${lineIndex}`} className="text-xl font-bold mt-4 mb-3">
          {h1Match[1]}
        </h1>,
      );
      return;
    }

    const parts: (string | JSX.Element)[] = [];
    let partIndex = 0;

    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      if (match[0].startsWith("**")) {
        parts.push(<strong key={`part-${lineIndex}-${partIndex++}`}>{match[2]}</strong>);
      } else if (match[0].startsWith("`")) {
        parts.push(
          <code key={`part-${lineIndex}-${partIndex++}`} className="bg-muted px-1 rounded text-xs">
            {match[4]}
          </code>,
        );
      } else if (match[0].startsWith("*")) {
        parts.push(<em key={`part-${lineIndex}-${partIndex++}`}>{match[3]}</em>);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    if (parts.length === 0) {
      parts.push(line);
    }

    result.push(
      <span key={`line-${lineIndex}`}>
        {parts}
        {lineIndex < lines.length - 1 && <br />}
      </span>,
    );
  });

  return result;
}

export function mapConversationMessages(conversationMessages: any[]): Message[] {
  return conversationMessages.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }));
}
