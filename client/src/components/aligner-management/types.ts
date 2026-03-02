export interface AlignerFile {
  id: string;
  filename: string;
  category?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface AlignerAssistant {
  id?: string;
  instructions?: string;
  taskPromptTemplate?: string;
  assistantId?: string;
  files?: AlignerFile[];
}
