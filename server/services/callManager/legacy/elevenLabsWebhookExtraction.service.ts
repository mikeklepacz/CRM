type Deps = {
  columnIndexToLetter: (index: number) => string;
  googleSheets: {
    readSheetData: (spreadsheetId: string, range: string) => Promise<any[][]>;
    writeSheetData: (spreadsheetId: string, range: string, values: any[][]) => Promise<any>;
  };
  storage: any;
};

function buildExtractedUpdate(extractedData: any): any {
  const update: any = {};

  if (extractedData.interest_level) update.interestLevel = extractedData.interest_level;
  if (extractedData.objections) update.objections = extractedData.objections;
  if (extractedData.follow_up_needed !== undefined) {
    update.followUpNeeded = extractedData.follow_up_needed === "yes";
  }
  if (extractedData.follow_up_date && extractedData.follow_up_date !== "not specified") {
    update.followUpDate = new Date(extractedData.follow_up_date);
  }

  if (extractedData.poc_name && extractedData.poc_name !== "not provided") update.pocName = extractedData.poc_name;
  if (extractedData.poc_email && extractedData.poc_email !== "not provided") update.pocEmail = extractedData.poc_email;
  if (extractedData.poc_phone && extractedData.poc_phone !== "not provided") update.pocPhone = extractedData.poc_phone;
  if (extractedData.poc_title && extractedData.poc_title !== "not provided") update.pocTitle = extractedData.poc_title;

  if (extractedData.shipping_name && extractedData.shipping_name !== "not provided") {
    update.shippingName = extractedData.shipping_name;
  }
  if (extractedData.shipping_address && extractedData.shipping_address !== "not provided") {
    update.shippingAddress = extractedData.shipping_address;
  }
  if (extractedData.shipping_city && extractedData.shipping_city !== "not provided") {
    update.shippingCity = extractedData.shipping_city;
  }
  if (extractedData.shipping_state && extractedData.shipping_state !== "not provided") {
    update.shippingState = extractedData.shipping_state;
  }

  if (extractedData.current_supplier && extractedData.current_supplier !== "none mentioned") {
    update.currentSupplier = extractedData.current_supplier;
  }
  if (extractedData.monthly_volume && extractedData.monthly_volume !== "not discussed") {
    update.monthlyVolume = extractedData.monthly_volume;
  }
  if (extractedData.decision_maker) update.decisionMaker = extractedData.decision_maker;
  if (extractedData.business_type && extractedData.business_type !== "not identified") {
    update.businessType = extractedData.business_type;
  }
  if (extractedData.pain_points && extractedData.pain_points !== "none mentioned") {
    update.painPoints = extractedData.pain_points;
  }
  if (extractedData.next_action && extractedData.next_action !== "none agreed") {
    update.nextAction = extractedData.next_action;
  }
  if (extractedData.notes && extractedData.notes !== "none") update.extractedNotes = extractedData.notes;

  return update;
}

async function updateStoreDatabasePocFields(
  deps: Deps,
  extractedData: any,
  storeSnapshot: any,
  tenantId: string
): Promise<void> {
  const storeDbUpdates: { columnName: string; value: string }[] = [];

  if (extractedData.poc_name && extractedData.poc_name !== "not provided") {
    storeDbUpdates.push({ columnName: "Point of Contact", value: extractedData.poc_name });
  }
  if (extractedData.poc_email && extractedData.poc_email !== "not provided") {
    storeDbUpdates.push({ columnName: "POC EMAIL", value: extractedData.poc_email });
  }
  if (extractedData.poc_phone && extractedData.poc_phone !== "not provided") {
    storeDbUpdates.push({ columnName: "POC Phone", value: extractedData.poc_phone });
  }

  if (storeDbUpdates.length === 0 || !storeSnapshot?.sheetId || !storeSnapshot?.rowIndex) {
    return;
  }

  const sheet = await deps.storage.getGoogleSheetById(storeSnapshot.sheetId, tenantId);
  if (!sheet) return;

  const { spreadsheetId, sheetName } = sheet;
  const headers = (await deps.googleSheets.readSheetData(spreadsheetId, `${sheetName}!1:1`))[0] || [];

  for (const update of storeDbUpdates) {
    const columnIndex = headers.findIndex((h: string) => h.toLowerCase() === update.columnName.toLowerCase());
    if (columnIndex === -1) continue;

    const columnLetter = deps.columnIndexToLetter(columnIndex);
    await deps.googleSheets.writeSheetData(
      spreadsheetId,
      `${sheetName}!${columnLetter}${storeSnapshot.rowIndex}`,
      [[update.value]]
    );
  }
}

async function updateCommissionTrackerFields(
  deps: Deps,
  extractedData: any,
  data: any,
  clientData: any
): Promise<void> {
  const sheets = await deps.storage.getAllActiveGoogleSheets(clientData.tenantId);
  const trackerSheet = sheets.find((s: any) => s.sheetPurpose === "commissions");
  if (!trackerSheet || !clientData.clientId) return;

  const { spreadsheetId, sheetName } = trackerSheet;
  const headers = (await deps.googleSheets.readSheetData(spreadsheetId, `${sheetName}!1:1`))[0] || [];

  const pocTitleIndex = headers.findIndex((h: string) => h.toLowerCase() === "poc title");
  const followUpDateIndex = headers.findIndex(
    (h: string) => h.toLowerCase() === "follow-up date" || h.toLowerCase() === "follow up date"
  );
  const notesIndex = headers.findIndex((h: string) => h.toLowerCase() === "notes");
  const linkIndex = headers.findIndex((h: string) => h.toLowerCase() === "link");
  if (linkIndex === -1) return;

  const trackerRows = await deps.googleSheets.readSheetData(spreadsheetId, `${sheetName}!A:T`);
  const storeLink = clientData.storeSnapshot?.link || clientData.clientId;
  let trackerRowIndex = -1;

  for (let i = 1; i < trackerRows.length; i++) {
    const rowLink = trackerRows[i][linkIndex];
    if (rowLink && rowLink.toLowerCase().includes(storeLink.toLowerCase())) {
      trackerRowIndex = i + 1;
      break;
    }
  }

  if (trackerRowIndex <= 0) return;

  if (pocTitleIndex !== -1 && extractedData.poc_title && extractedData.poc_title !== "not provided") {
    await deps.googleSheets.writeSheetData(
      spreadsheetId,
      `${sheetName}!${deps.columnIndexToLetter(pocTitleIndex)}${trackerRowIndex}`,
      [[extractedData.poc_title]]
    );
  }

  if (followUpDateIndex !== -1 && extractedData.follow_up_date && extractedData.follow_up_date !== "not specified") {
    await deps.googleSheets.writeSheetData(
      spreadsheetId,
      `${sheetName}!${deps.columnIndexToLetter(followUpDateIndex)}${trackerRowIndex}`,
      [[extractedData.follow_up_date]]
    );
  }

  if (notesIndex !== -1) {
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const noteParts = [`[${timestamp}]`];
    if (extractedData.interest_level) noteParts.push(`Interest: ${extractedData.interest_level}`);
    if (extractedData.objections && extractedData.objections !== "none mentioned") {
      noteParts.push(`Objections: ${extractedData.objections}`);
    }
    if (data.analysis && data.analysis.summary) noteParts.push(`Summary: ${data.analysis.summary}`);
    if (extractedData.notes && extractedData.notes !== "none") noteParts.push(`Notes: ${extractedData.notes}`);

    const cellRange = `${sheetName}!${deps.columnIndexToLetter(notesIndex)}${trackerRowIndex}`;
    const existingNotes = (await deps.googleSheets.readSheetData(spreadsheetId, cellRange))[0]?.[0] || "";
    const updatedNotes = existingNotes ? `${existingNotes}\n${noteParts.join(" | ")}` : noteParts.join(" | ");
    await deps.googleSheets.writeSheetData(spreadsheetId, cellRange, [[updatedNotes]]);
  }
}

export async function applyExtractedDataAndSheetsSync(
  deps: Deps,
  params: { conversationId: string; data: any; clientData: any }
): Promise<void> {
  const { conversationId, data, clientData } = params;

  if (!(data.status === "done" && data.analysis && data.analysis.extracted_data)) {
    return;
  }

  try {
    const extractedData = data.analysis.extracted_data;
    const extractedUpdate = buildExtractedUpdate(extractedData);

    if (Object.keys(extractedUpdate).length > 0) {
      await deps.storage.updateCallSessionByConversationId(conversationId, extractedUpdate);
    }

    if (!clientData.clientId || !clientData.storeSnapshot) {
      return;
    }

    try {
      await updateStoreDatabasePocFields(deps, extractedData, clientData.storeSnapshot, clientData.tenantId);
      await updateCommissionTrackerFields(deps, extractedData, data, clientData);
    } catch (sheetsError: any) {
      console.error("[Data Extraction] Error updating POC data in Google Sheets:", sheetsError.message);
    }
  } catch (extractionError: any) {
    console.error("[Data Extraction] Error processing extracted data:", extractionError.message);
  }
}
