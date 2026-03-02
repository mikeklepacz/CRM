export function getRowValueFromRecord(row: any, fieldNames: string[]): string {
  if (!row) return "";

  for (const fieldName of fieldNames) {
    const normalizedFieldName = fieldName.trim().toLowerCase();

    if (row[fieldName] !== undefined && row[fieldName] !== null) return String(row[fieldName]);

    const key = Object.keys(row).find((k) => k.trim().toLowerCase() === normalizedFieldName);
    if (key && row[key] !== undefined && row[key] !== null) return String(row[key]);

    if (row.data && row.data[fieldName] !== undefined && row.data[fieldName] !== null) {
      return String(row.data[fieldName]);
    }

    if (row.data) {
      const dataKey = Object.keys(row.data).find((k) => k.trim().toLowerCase() === normalizedFieldName);
      if (dataKey && row.data[dataKey] !== undefined && row.data[dataKey] !== null) {
        return String(row.data[dataKey]);
      }
    }
  }
  return "";
}

export function getStoreNameFromRecord(store: any): string {
  if (!store) return "";
  return store.Name || store.name || store["Store Name"] || store["store name"] || "Unknown";
}

export function formatUsPhone(raw: string): string {
  const rawPhone = raw.replace(/\D/g, "");
  if (rawPhone.length === 10) {
    return `+1 (${rawPhone.slice(0, 3)}) ${rawPhone.slice(3, 6)}-${rawPhone.slice(6)}`;
  }
  if (rawPhone.length === 11 && rawPhone.startsWith("1")) {
    return `+1 (${rawPhone.slice(1, 4)}) ${rawPhone.slice(4, 7)}-${rawPhone.slice(7)}`;
  }
  return rawPhone;
}

export function extractFirstEmailAndPhone(notes: string): { email?: string; phone?: string } {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const phoneRegex = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

  const emails = notes.match(emailRegex);
  const phones = notes.match(phoneRegex);

  return {
    email: emails && emails.length > 0 ? emails[0] : undefined,
    phone: phones && phones.length > 0 ? formatUsPhone(phones[0]) : undefined,
  };
}
