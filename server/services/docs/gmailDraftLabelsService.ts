export async function getOrCreateGmailLabels(accessToken: string, labelNames: string[]): Promise<string[]> {
  console.log("📧 [GMAIL LABELS] Starting label resolution for:", labelNames);

  if (!labelNames || labelNames.length === 0) {
    console.log("📧 [GMAIL LABELS] No labels requested, returning empty array");
    return [];
  }

  try {
    console.log("📧 [GMAIL LABELS] Fetching existing labels from Gmail API...");
    const listResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error("📧 [GMAIL LABELS] ❌ Failed to list Gmail labels. Status:", listResponse.status);
      console.error("📧 [GMAIL LABELS] Error details:", errorText);
      return [];
    }

    const { labels } = await listResponse.json();
    console.log(`📧 [GMAIL LABELS] ✅ Fetched ${labels.length} existing labels from Gmail`);

    const existingLabels = new Map<string, string>(labels.map((label: any) => [label.name, label.id]));
    const labelIds: string[] = [];

    for (const labelName of labelNames) {
      if (existingLabels.has(labelName)) {
        const labelId = existingLabels.get(labelName)!;
        labelIds.push(labelId);
        console.log(`📧 [GMAIL LABELS] ✅ Label "${labelName}" already exists (ID: ${labelId})`);
      } else {
        console.log(`📧 [GMAIL LABELS] 🔨 Creating new label: "${labelName}"`);
        const createResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: labelName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          }),
        });

        if (createResponse.ok) {
          const newLabel = await createResponse.json();
          labelIds.push(newLabel.id);
          console.log(`📧 [GMAIL LABELS] ✅ Successfully created label "${labelName}" (ID: ${newLabel.id})`);
        } else {
          const errorText = await createResponse.text();
          console.error(`📧 [GMAIL LABELS] ❌ Failed to create label "${labelName}". Status: ${createResponse.status}`);
          console.error("📧 [GMAIL LABELS] Error details:", errorText);
        }
      }
    }

    console.log(`📧 [GMAIL LABELS] ✅ Resolution complete. Returning ${labelIds.length} label IDs:`, labelIds);
    return labelIds;
  } catch (error) {
    console.error("📧 [GMAIL LABELS] ❌ Unexpected error in getOrCreateGmailLabels:", error);
    return [];
  }
}
