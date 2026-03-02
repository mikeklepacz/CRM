export const formatEmailTemplate = (
  to: string,
  subject: string,
  body: string,
): string => {
  return `To: ${to}\nSubject: ${subject}\n\nBody:\n${body}`;
};

export const parseEmailTemplate = (
  content: string,
): { to: string; subject: string; body: string } | null => {
  const toMatch = content.match(/^To:\s*(.+?)$/m);
  const subjectMatch = content.match(/^Subject:\s*(.+?)$/m);
  const bodyMatch = content.match(/^Body:\s*\n([\s\S]+)$/m);

  if (toMatch && subjectMatch && bodyMatch) {
    return {
      to: toMatch[1].trim(),
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }
  return null;
};
