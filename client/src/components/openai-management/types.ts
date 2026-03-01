export interface OpenAISettings {
  hasApiKey?: boolean;
  apiKey?: string;
  aiInstructions?: string;
}

export interface OpenAIFile {
  id: string;
  originalName: string;
  category?: string;
  agentName?: string;
  agentId?: string;
  processingStatus?: string;
  fileSize: number;
  uploadedAt: string;
  productCategory?: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Agent {
  id: string;
  agentId: string;
  name: string;
}
