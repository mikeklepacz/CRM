export interface Message {
  role: "user" | "assistant";
  content: string;
}

export const STORAGE_KEY = "aligner-selected-conversation";
