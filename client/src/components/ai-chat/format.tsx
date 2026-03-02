// Helper function to clean and format AI output
function formatAIContent(content: string): string {
  // Remove ALL source citations - match any pattern like [number:number{ANY_CHAR}source]
  let cleaned = content.replace(/\s*\[\d+:\d+[^\]]*source\]\s*/gi, "");

  // Remove any remaining bracketed number references
  cleaned = cleaned.replace(/\s*\[\d+:\d+\]\s*/g, "");

  // Clean up any extra whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Helper function to render formatted text with comprehensive markdown support
export function renderFormattedText(content: string): JSX.Element[] {
  const formattedContent = formatAIContent(content);
  const lines = formattedContent.split("\n");
  const result: JSX.Element[] = [];

  lines.forEach((line, lineIndex) => {
    // Check for headers first
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

    // Process inline markdown (bold, italic, code)
    const parts: (string | JSX.Element)[] = [];
    let partIndex = 0;

    // Process bold **text**, italic *text*, and inline code `text`
    const inlineRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }

      // Determine what type of match this is
      if (match[0].startsWith("**")) {
        // Bold
        parts.push(<strong key={`part-${lineIndex}-${partIndex++}`}>{match[2]}</strong>);
      } else if (match[0].startsWith("`")) {
        // Inline code
        parts.push(
          <code key={`part-${lineIndex}-${partIndex++}`} className="bg-muted px-1 rounded text-xs">
            {match[4]}
          </code>,
        );
      } else if (match[0].startsWith("*")) {
        // Italic
        parts.push(<em key={`part-${lineIndex}-${partIndex++}`}>{match[3]}</em>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    // If no parts were added, add the whole line
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
