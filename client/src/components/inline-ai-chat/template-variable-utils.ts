export const availableVariables = [
  { name: "storeName", description: "Store/business name" },
  { name: "storeAddress", description: "Store address" },
  { name: "storeCity", description: "City" },
  { name: "storeState", description: "State" },
  { name: "storePhone", description: "Store phone number" },
  { name: "storeWebsite", description: "Store website" },
  { name: "email", description: "Email (smart: POC email or store email)" },
  { name: "pocName", description: "Point of contact name" },
  { name: "pocEmail", description: "POC email (smart: POC email or store email)" },
  { name: "pocPhone", description: "POC phone number" },
  { name: "agentName", description: "Your name" },
  { name: "agentEmail", description: "Your email" },
  { name: "agentPhone", description: "Your phone number" },
  { name: "agentMeetingLink", description: "Your meeting/calendar link" },
  { name: "currentDate", description: "Current date" },
  { name: "currentTime", description: "Current time" },
];

export const autoDetectPlaceholders = (
  content: string,
  storeContext: any,
  user: any,
): string => {
  let result = content;

  const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  const replaceValue = (value: string | null | undefined, variable: string) => {
    if (!value || value.trim().length < 2) return;
    const trimmedValue = value.trim();
    const escaped = escapeRegex(trimmedValue);
    const boundary = `(?:^|[\\s\\n,.!?;:'\"<>\\[\\]{}()\\/\\\\]|$)`;
    const regex = new RegExp(`(${boundary})${escaped}(${boundary})`, "g");
    result = result.replace(regex, `$1{{${variable}}}$2`);
  };

  const agentName = user?.username || "";
  const agentEmail = user?.email || "";
  const agentPhone = user?.phone || "";
  const agentMeetingLink = user?.meetingLink || "";

  const replacements: Array<{ value: string; variable: string }> = [];

  if (storeContext) {
    if (storeContext.name) replacements.push({ value: storeContext.name, variable: "storeName" });
    if (storeContext.address) replacements.push({ value: storeContext.address, variable: "storeAddress" });
    if (storeContext.city) replacements.push({ value: storeContext.city, variable: "storeCity" });
    if (storeContext.state) replacements.push({ value: storeContext.state, variable: "storeState" });
    if (storeContext.phone) replacements.push({ value: storeContext.phone, variable: "storePhone" });
    if (storeContext.website) replacements.push({ value: storeContext.website, variable: "storeWebsite" });
    if (storeContext.point_of_contact) replacements.push({ value: storeContext.point_of_contact, variable: "pocName" });
    if (storeContext.poc_email) replacements.push({ value: storeContext.poc_email, variable: "pocEmail" });
    if (storeContext.poc_phone) replacements.push({ value: storeContext.poc_phone, variable: "pocPhone" });
  }

  if (agentName) replacements.push({ value: agentName, variable: "agentName" });
  if (agentEmail) replacements.push({ value: agentEmail, variable: "agentEmail" });
  if (agentPhone) replacements.push({ value: agentPhone, variable: "agentPhone" });
  if (agentMeetingLink) replacements.push({ value: agentMeetingLink, variable: "agentMeetingLink" });

  replacements.sort((a, b) => (b.value?.length || 0) - (a.value?.length || 0));
  replacements.forEach(({ value, variable }) => replaceValue(value, variable));

  const today = new Date();
  const todayTimeString = today.toLocaleTimeString();
  const dateFormats = [
    today.toLocaleDateString(),
    today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    today.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }),
  ];

  dateFormats.forEach((dateFormat) => {
    if (result.includes(dateFormat)) {
      const escaped = escapeRegex(dateFormat);
      result = result.replace(new RegExp(escaped, "g"), "{{currentDate}}");
    }
  });

  if (result.includes(todayTimeString)) {
    const escaped = escapeRegex(todayTimeString);
    result = result.replace(new RegExp(escaped, "g"), "{{currentTime}}");
  }

  return result;
};

export const replaceTemplateVariables = (
  content: string,
  storeData: any,
  currentUser: any,
) => {
  let result = content;

  const storeReplacements: Record<string, string> = {
    "{{store.name}}": storeData?.name || storeData?.Name || "",
    "{{store.city}}": storeData?.city || storeData?.City || "",
    "{{store.state}}": storeData?.state || storeData?.State || "",
    "{{store.address}}": storeData?.address || storeData?.Address || "",
    "{{store.phone}}": storeData?.phone || storeData?.Phone || "",
    "{{store.email}}": storeData?.email || storeData?.Email || "",
    "{{store.website}}": storeData?.website || storeData?.Website || "",
    "{{store.poc}}": storeData?.["Point of Contact"] || storeData?.pointOfContact || "",
    "{{store.poc_email}}": storeData?.["POC Email"] || storeData?.pocEmail || "",
    "{{store.poc_phone}}": storeData?.["POC Phone"] || storeData?.pocPhone || "",
  };

  Object.entries(storeReplacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key, "g"), value);
  });

  const userReplacements: Record<string, string> = {
    "{{user.name}}":
      currentUser?.firstName && currentUser?.lastName
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser?.email || "",
    "{{user.firstName}}": currentUser?.firstName || "",
    "{{user.lastName}}": currentUser?.lastName || "",
    "{{user.email}}": currentUser?.email || "",
    "{{user.phone}}": currentUser?.phone || "",
    "{{user.agentName}}": currentUser?.agentName || "",
    "{{user.meetingLink}}": currentUser?.meetingLink || "",
  };

  Object.entries(userReplacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key, "g"), value);
  });

  const signature = currentUser?.signature || "";
  if (signature && !result.includes(signature)) {
    result += `\n\n${signature}`;
  }

  return result;
};
