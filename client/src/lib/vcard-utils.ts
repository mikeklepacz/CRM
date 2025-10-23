// Utility functions for generating vCard files for contact export

interface VCardExportFields {
  phone: boolean;
  email: boolean;
  website: boolean;
  address: boolean;
  salesSummary: boolean;
  storeHours: boolean;
}

interface StoreData {
  [key: string]: any;
}

/**
 * Extract POC (Point of Contact) information from the notes field
 * Looks for patterns like "POC: John Doe", "POC Name: Jane Smith", etc.
 */
function extractPOCFromNotes(notes: string): { name?: string; phone?: string; email?: string } {
  if (!notes) return {};
  
  const poc: { name?: string; phone?: string; email?: string } = {};
  
  // Extract POC Name - capture only the value after the label
  const namePatterns = [
    /POC(?:\s+Name)?[:\-\s]+([^\n,;]+)/i,
    /Point of Contact[:\-\s]+([^\n,;]+)/i,
    /Contact(?:\s+Name)?[:\-\s]+([^\n,;]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const match = notes.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Filter out common label words that might have been captured
      if (!name.match(/^(name|phone|email|address)/i)) {
        poc.name = name;
        break;
      }
    }
  }
  
  // Extract POC Phone - capture only the value after the label
  const phonePatterns = [
    /POC\s+Phone[:\-\s]+([\d\s\-\(\)\.+]+)/i,
    /Contact\s+Phone[:\-\s]+([\d\s\-\(\)\.+]+)/i,
    /(?:^|\n)Phone[:\-\s]+([\d\s\-\(\)\.+]+)/im,
  ];
  
  for (const pattern of phonePatterns) {
    const match = notes.match(pattern);
    if (match) {
      poc.phone = match[1].trim();
      break;
    }
  }
  
  // Extract POC Email
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = notes.match(emailPattern);
  if (emailMatch) {
    poc.email = emailMatch[1];
  }
  
  return poc;
}

/**
 * Extract phone number from notes field if present
 */
function extractPhoneFromNotes(notes: string): string | null {
  if (!notes) return null;
  
  // Look for phone patterns
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,  // (555) 123-4567 or 555-123-4567
    /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // +1 555 123 4567
  ];
  
  for (const pattern of phonePatterns) {
    const match = notes.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

/**
 * Escape special characters for vCard format
 */
function escapeVCardValue(value: string): string {
  if (!value) return '';
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate a single vCard entry for a store
 */
function generateVCardEntry(
  store: StoreData,
  fields: VCardExportFields,
  listName: string,
  platform: 'ios' | 'android'
): string {
  const lines: string[] = [];
  
  // vCard version
  if (platform === 'ios') {
    lines.push('BEGIN:VCARD');
    lines.push('VERSION:3.0');
  } else {
    lines.push('BEGIN:VCARD');
    lines.push('VERSION:2.1');
  }
  
  // Extract POC data from notes
  const notes = store['Notes'] || store['notes'] || '';
  const poc = extractPOCFromNotes(notes);
  
  // Name - use POC name if available, otherwise store name
  const contactName = poc.name || store['Name'] || store['Company'] || 'Unknown Store';
  const storeName = store['Name'] || store['Company'] || '';
  
  // FN (Formatted Name) - required field
  lines.push(`FN:${escapeVCardValue(contactName)}`);
  
  // N (Name) - required field (Last;First;Middle;Prefix;Suffix)
  const nameParts = contactName.split(' ');
  if (nameParts.length > 1) {
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`);
  } else {
    lines.push(`N:${escapeVCardValue(contactName)};;;;`);
  }
  
  // ORG (Organization) - use store name
  if (storeName) {
    lines.push(`ORG:${escapeVCardValue(storeName)}`);
  }
  
  // Phone
  if (fields.phone) {
    const phone = poc.phone || 
                  extractPhoneFromNotes(notes) || 
                  store['Phone'] || 
                  store['phone'];
    if (phone) {
      if (platform === 'ios') {
        lines.push(`TEL;TYPE=WORK,VOICE:${phone}`);
      } else {
        lines.push(`TEL;WORK;VOICE:${phone}`);
      }
    }
  }
  
  // Email
  if (fields.email) {
    const email = poc.email || store['Email'] || store['email'];
    if (email) {
      if (platform === 'ios') {
        lines.push(`EMAIL;TYPE=WORK:${email}`);
      } else {
        lines.push(`EMAIL;WORK:${email}`);
      }
    }
  }
  
  // Website
  if (fields.website) {
    const website = store['Website'] || store['website'] || store['Link'] || store['link'];
    if (website) {
      lines.push(`URL:${website}`);
    }
  }
  
  // Address
  if (fields.address) {
    const address = store['Address'] || store['address'];
    const city = store['City'] || store['city'];
    const state = store['State'] || store['state'];
    const zip = store['Zip'] || store['zip'] || store['Postal Code'] || store['postal_code'];
    
    if (address || city || state) {
      // ADR format: ;;street;city;state;zip;country
      const street = address || '';
      const cityVal = city || '';
      const stateVal = state || '';
      const zipVal = zip || '';
      
      if (platform === 'ios') {
        lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(street)};${escapeVCardValue(cityVal)};${escapeVCardValue(stateVal)};${escapeVCardValue(zipVal)};`);
      } else {
        lines.push(`ADR;WORK:;;${escapeVCardValue(street)};${escapeVCardValue(cityVal)};${escapeVCardValue(stateVal)};${escapeVCardValue(zipVal)};`);
      }
    }
  }
  
  // NOTE - combine selected fields in order: Notes, Hours, Sales Summary
  const noteFields: string[] = [];
  
  if (notes && !fields.salesSummary && !fields.storeHours) {
    // If only notes selected or notes exist without other NOTE fields
    noteFields.push(notes);
  } else {
    // Combine multiple fields with real newlines (will be escaped by escapeVCardValue)
    if (notes) {
      noteFields.push(`Notes: ${notes}`);
    }
    
    if (fields.storeHours) {
      const storeHours = store['Store Hours'] || store['store_hours'] || store['Hours'] || store['hours'];
      if (storeHours) {
        noteFields.push(`Store Hours: ${storeHours}`);
      }
    }
    
    if (fields.salesSummary) {
      const salesSummary = store['Sales-ready Summary'] || store['sales_summary'] || store['Sales Summary'];
      if (salesSummary) {
        noteFields.push(`Sales Summary: ${salesSummary}`);
      }
    }
  }
  
  if (noteFields.length > 0) {
    // Use real newlines - escapeVCardValue will convert them to \n
    const combinedNotes = noteFields.join('\n\n');
    lines.push(`NOTE:${escapeVCardValue(combinedNotes)}`);
  }
  
  // Categories - creates Lists on iOS or Groups on Android
  if (listName) {
    lines.push(`CATEGORIES:${escapeVCardValue(listName)}`);
  }
  
  lines.push('END:VCARD');
  
  return lines.join('\r\n');
}

/**
 * Generate and download vCard file for multiple stores
 */
export function generateAndDownloadVCard(
  stores: StoreData[],
  fields: VCardExportFields,
  listName: string,
  platform: 'ios' | 'android'
): void {
  if (stores.length === 0) {
    console.warn('No stores to export');
    return;
  }
  
  // Generate vCard entries for all stores
  const vCardEntries = stores.map(store => 
    generateVCardEntry(store, fields, listName, platform)
  );
  
  // Combine all entries
  const vCardContent = vCardEntries.join('\r\n');
  
  // Create blob and download
  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = `${listName.replace(/[^a-z0-9]/gi, '_')}_contacts.vcf`;
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
