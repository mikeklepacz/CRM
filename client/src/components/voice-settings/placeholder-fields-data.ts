import type { PlaceholderFieldDef } from "./voice-settings-types";

export const interestOutcomeFields: PlaceholderFieldDef[] = [
  {
    name: "interest_level",
    description:
      "Extract the prospect's interest level. Return one of: high, medium, low, none. High = ready to buy/send samples, Medium = wants more info, Low = not right time, None = not interested.",
  },
  {
    name: "objections",
    description:
      "Extract any objections or concerns raised by the prospect. Include pricing concerns, timing issues, current supplier satisfaction, product doubts, or any hesitation. Return as comma-separated list or 'none'.",
  },
  {
    name: "follow_up_needed",
    description:
      "Determine if follow-up is needed. Return 'yes' if prospect requested callback, more info, or showed interest. Return 'no' if they declined or asked not to call back.",
  },
  {
    name: "follow_up_date",
    description:
      "Extract any specific date/time mentioned for follow-up. Return in format YYYY-MM-DD or 'not specified'.",
  },
];

export const pointOfContactFields: PlaceholderFieldDef[] = [
  {
    name: "poc_name",
    description:
      "Extract the full name of the person you spoke with or the main contact person mentioned. Return full name or 'not provided'.",
  },
  {
    name: "poc_email",
    description:
      "Extract email address of the contact person. Must be valid email format (user@domain.com) or 'not provided'.",
  },
  {
    name: "poc_phone",
    description:
      "Extract direct phone number of the contact person. Include country code if mentioned. Return formatted number or 'not provided'.",
  },
  {
    name: "poc_title",
    description:
      "Extract job title or role of the contact person (e.g., Owner, Manager, Buyer, Purchasing Director). Return title or 'not provided'.",
  },
];

export const shippingInfoFields: PlaceholderFieldDef[] = [
  {
    name: "shipping_name",
    description:
      "Extract the name for shipping/sample delivery if different from main contact. Return name or 'same as contact'.",
  },
  {
    name: "shipping_address",
    description:
      "Extract complete shipping address if prospect agreed to receive samples. Include street, suite/unit number. Return full address or 'not provided'.",
  },
  {
    name: "shipping_city",
    description:
      "Extract city for shipping address. Return city name or 'not provided'.",
  },
  {
    name: "shipping_state",
    description:
      "Extract state/province for shipping address. Return 2-letter code (e.g., CA, NY) or full name, or 'not provided'.",
  },
];

export const businessIntelligenceFields: PlaceholderFieldDef[] = [
  {
    name: "current_supplier",
    description:
      "Extract name of their current hemp wick or similar product supplier if mentioned. Return supplier name or 'none mentioned'.",
  },
  {
    name: "monthly_volume",
    description:
      "Extract approximate monthly purchase volume or quantity if discussed. Include units (cases, pieces, etc.) or 'not discussed'.",
  },
  {
    name: "decision_maker",
    description:
      "Determine if the person you spoke with is the final decision maker. Return 'yes', 'no', or 'unclear'. If no, note who makes decisions.",
  },
  {
    name: "business_type",
    description:
      "Extract or infer business type from conversation (e.g., dispensary, smoke shop, distributor, retailer, online store). Return type or 'not identified'.",
  },
  {
    name: "pain_points",
    description:
      "Extract any specific problems or needs mentioned related to their current hemp wick products (quality issues, pricing, availability, etc.). Return comma-separated list or 'none mentioned'.",
  },
  {
    name: "next_action",
    description:
      "Extract specific next action agreed upon (send samples, email info, schedule demo, call back on date, etc.). Return action or 'none agreed'.",
  },
  {
    name: "notes",
    description:
      "Extract any other relevant information, special requests, or important details mentioned during the call that don't fit other categories. Return concise summary or 'none'.",
  },
];
