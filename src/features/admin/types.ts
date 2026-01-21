export interface SystemRule {
  id: string;
  code: string;
  name: string;
  category: 'COMPLIANCE' | 'RISK' | 'FINANCE';
  logicType: 'RULE_BASED' | 'LLM_AGENT';
  status: 'ACTIVE' | 'INACTIVE';
  description: string;
  lastUpdated: string;
}

// types.ts
export interface RAGDocument {
  id: string;
  filename: string;
  domain: string;
  size: string;
  uploadDate: string;
  chunkCount: number;
  vectorStatus: string; // หรือ 'INDEXED' | 'PROCESSING' ...
  policyVersion: string;
  metadata?: any; // ✅ เพิ่มบรรทัดนี้
}