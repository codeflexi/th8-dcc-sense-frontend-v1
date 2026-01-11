// src/features/evidence/types.ts

export interface EvidenceItem {
  id: string;
  docId: string;
  docTitle: string;
  page: number;
  content: string; // ข้อความเต็ม หรือ Snippet
  score: number;   // 0.0 - 1.0
  matchType: 'EXACT' | 'SEMANTIC';
  // พิกัด Highlight (เป็น % เทียบกับขนาดหน้ากระดาษ)
  highlightBox?: { x: number; y: number; w: number; h: number }; 
}

export interface AttachedEvidence {
  id: string;
  evidenceId: string;
  ruleId?: string;
  timestamp: string;
  status: 'LINKED';
}