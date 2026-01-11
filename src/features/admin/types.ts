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

export interface RAGDocument {
  id: string;
  filename: string;
  size: string;
  uploadDate: string;
  chunkCount: number; // จำนวนชิ้นข้อมูลที่ AI อ่าน
  vectorStatus: 'INDEXED' | 'PROCESSING' | 'FAILED';
  policyVersion: string;
}