export interface Proposal {
  id: string;
  kbFileId: string;
  rationale: string;
  status: string;
  createdAt: string;
  humanEdited?: boolean;
  originalAiContent?: string;
}

export interface Edit {
  file: string;
  section?: string;
  old: string;
  new: string;
  reason: string;
  principle?: string;
  evidence: string;
}
