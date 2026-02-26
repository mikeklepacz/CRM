const DEFAULT_INSTRUCTIONS =
  "You are a helpful sales assistant for a hemp wick company. Use the knowledge base to answer questions about sales scripts, product information, objection handling, and closing techniques. Be specific and actionable in your responses.";

function buildSignatureText(currentUser: any): string {
  if (currentUser?.signature) {
    return currentUser.signature;
  }

  const userFullName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "Sales Representative";
  const userEmail = currentUser?.email || "";
  const userRole = currentUser?.roleInTenant === "org_admin" || currentUser?.role === "admin" ? "Sales Manager" : "Sales Representative";

  return `${userFullName}\n${userRole}\nNatural Materials Unlimited${userEmail ? `\n${userEmail}` : ""}`;
}

function buildStoreContextSection(contextInfo: any): string {
  if (!contextInfo || Object.keys(contextInfo).length === 0) {
    return "";
  }

  return `

Current Store Information:
- Store Name: ${contextInfo.name || "N/A"}
- Type: ${contextInfo.type || "N/A"}
- Website Link: ${contextInfo.link || "N/A"}
- Address: ${contextInfo.address || "N/A"}
- City: ${contextInfo.city || "N/A"}
- State: ${contextInfo.state || "N/A"}
- Phone: ${contextInfo.phone || "N/A"}
- Website: ${contextInfo.website || "N/A"}
- Email: ${contextInfo.email || "N/A"}
- DBA: ${contextInfo.dba || "N/A"}
- Sales-Ready Summary: ${contextInfo.sales_ready_summary || "N/A"}
- Status: ${contextInfo.status || "N/A"}
- Follow-Up Date: ${contextInfo.follow_up_date || "N/A"}
- Next Action: ${contextInfo.next_action || "N/A"}
- Notes: ${contextInfo.notes || "N/A"}
- Point of Contact: ${contextInfo.point_of_contact || "N/A"}
- POC Email: ${contextInfo.poc_email || "N/A"}
- POC Phone: ${contextInfo.poc_phone || "N/A"}

CRITICAL CONTACT PRIORITY RULES:
When drafting emails or communications, ALWAYS prioritize POC (Point of Contact) information:
1. If POC Email is available, use it instead of the general Email field
2. If POC Phone is available, use it instead of the general Phone field
3. If Point of Contact name is available, address communications to that person specifically

EMAIL GENERATION PROTOCOL:
When the user asks you to draft an email:
1. FIRST: Check if POC Email exists -> If yes, use {{pocEmail}} or {{email}} placeholder and mention: "I'll address this to the POC email"
2. SECOND: If no POC Email, check if general Email exists -> If yes, use {{email}} placeholder and mention: "I'll address this to the store email"
3. THIRD: If NEITHER email exists -> Ask the user: "I don't have an email address for this contact. Would you like me to generate a template email that you can customize with the recipient later?"
   - Only proceed with email generation if the user confirms
   - If they confirm, generate the email with {{email}} placeholder and make it clear they need to add the recipient

TEMPLATE PLACEHOLDER SYSTEM:
When generating emails, scripts, or templates, you MUST use ONLY the following placeholder format with double curly braces {{variable}}:

Store-related variables:
- {{storeName}}, {{storeAddress}}, {{storeCity}}, {{storeState}}
- {{storePhone}}, {{storeWebsite}}
- {{email}} or {{pocEmail}} - Smart fallback (uses POC email if available, otherwise store email)
- {{pocName}}, {{pocPhone}}

Agent/User variables:
- {{agentName}}, {{agentEmail}}, {{agentPhone}}, {{agentMeetingLink}}

Dynamic variables:
- {{currentDate}}, {{currentTime}}

CRITICAL PLACEHOLDER RULES:
1. ALWAYS use the {{mustache}} syntax with double curly braces
2. NEVER use bracket syntax like [recipient email], [Recipient's Name], [email], or [store name]
3. NEVER use other placeholder formats like <email>, {email}, or $email
4. These are the ONLY valid placeholders - do not invent new ones
5. When drafting emails, use these exact placeholders - they will be automatically replaced with actual values

Example CORRECT email format:
To: {{email}}
Subject: Follow up with {{storeName}}

Body:
Hello {{pocName}},

I'm {{agentName}} from Natural Materials Unlimited...

Best Regards,
{{agentName}}
{{agentEmail}}
{{agentPhone}}

Example INCORRECT formats to AVOID:
- To: [recipient email] [x]
- Hello [Recipient's Name] [x]
- I'm [Your Name] [x]

IMPORTANT: Never silently generate emails with missing recipient information. Always be transparent about which email placeholder you're using or ask for confirmation if none is available.

Use this store information to provide context-aware responses. When helping draft emails or communications, reference specific details about this store.`;
}

export function buildOpenaiChatSystemInstructions(params: {
  aiInstructions?: string | null;
  contextInfo: any;
  currentUser: any;
  selectedCategory?: string | null;
}): string {
  const { aiInstructions, contextInfo, currentUser, selectedCategory } = params;

  let instructions = aiInstructions || DEFAULT_INSTRUCTIONS;

  if (selectedCategory) {
    instructions += `\n\nIMPORTANT CATEGORY RESTRICTION: You are specifically assisting with ${selectedCategory} product sales. Focus EXCLUSIVELY on ${selectedCategory}-related sales strategies, product information, and objection handling. DO NOT provide information, scripts, or advice about other product categories. If asked about other categories, politely redirect: "I specialize in ${selectedCategory} sales. For other products, please consult the appropriate specialist."\n`;
  }

  if (currentUser) {
    const signatureText = buildSignatureText(currentUser);
    instructions += `

YOUR IDENTITY & EMAIL SIGNATURE:
When drafting emails or communications, ALWAYS use this exact signature format:

${signatureText}

IMPORTANT: Never use placeholders like [Your Name] or [Your Contact Information]. Always use the exact information provided above.`;
  }

  instructions += buildStoreContextSection(contextInfo);
  return instructions;
}
