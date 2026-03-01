export const DATA_COLLECTION_PLACEHOLDERS = [
  { key: "interest_level", label: "Interest Level", category: "Interest & Outcome" },
  { key: "objections", label: "Objections", category: "Interest & Outcome" },
  { key: "follow_up_needed", label: "Follow-up Needed", category: "Interest & Outcome" },
  { key: "follow_up_date", label: "Follow-up Date", category: "Interest & Outcome" },
  { key: "poc_name", label: "Contact Name", category: "Point of Contact" },
  { key: "poc_email", label: "Contact Email", category: "Point of Contact" },
  { key: "poc_phone", label: "Contact Phone", category: "Point of Contact" },
  { key: "poc_title", label: "Contact Title", category: "Point of Contact" },
  { key: "shipping_name", label: "Shipping Name", category: "Shipping" },
  { key: "shipping_address", label: "Shipping Address", category: "Shipping" },
  { key: "shipping_city", label: "Shipping City", category: "Shipping" },
  { key: "shipping_state", label: "Shipping State", category: "Shipping" },
  { key: "current_supplier", label: "Current Supplier", category: "Business Intelligence" },
  { key: "monthly_volume", label: "Monthly Volume", category: "Business Intelligence" },
  { key: "decision_maker", label: "Decision Maker", category: "Business Intelligence" },
  { key: "business_type", label: "Business Type", category: "Business Intelligence" },
  { key: "pain_points", label: "Pain Points", category: "Business Intelligence" },
  { key: "next_action", label: "Next Action", category: "Business Intelligence" },
  { key: "notes", label: "Notes", category: "Business Intelligence" },
];

export const PLACEHOLDER_CATEGORIES = DATA_COLLECTION_PLACEHOLDERS.reduce((acc, placeholder) => {
  if (!acc[placeholder.category]) {
    acc[placeholder.category] = [];
  }
  acc[placeholder.category].push(placeholder);
  return acc;
}, {} as Record<string, typeof DATA_COLLECTION_PLACEHOLDERS>);

export const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes/No" },
  { value: "choice", label: "Single Choice" },
  { value: "multichoice", label: "Multiple Choice" },
  { value: "date", label: "Date" },
];
