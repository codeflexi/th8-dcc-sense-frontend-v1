import type { SystemRule, RAGDocument } from './types';

export const adminApi = {
  async getRules(): Promise<SystemRule[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'r1', code: 'SPLIT_PO_CHECK', name: 'Split PO Detection',
            category: 'COMPLIANCE', logicType: 'RULE_BASED', status: 'ACTIVE',
            description: 'Detects multiple POs to same vendor < 48h to bypass approval limit.',
            lastUpdated: '2025-12-10'
          },
          {
            id: 'r2', code: 'BUDGET_Q1_LIMIT', name: 'Quarterly Budget Check',
            category: 'FINANCE', logicType: 'RULE_BASED', status: 'ACTIVE',
            description: 'Verifies total spend against SAP Budget Module (API).',
            lastUpdated: '2026-01-01'
          },
          {
            id: 'r3', code: 'VENDOR_ANOMALY', name: 'Vendor Behavior Analysis',
            category: 'RISK', logicType: 'LLM_AGENT', status: 'ACTIVE',
            description: 'AI analyzes historical item prices vs market rate.',
            lastUpdated: '2026-01-05'
          }
        ]);
      }, 500);
    });
  },

  async getDocuments(): Promise<RAGDocument[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: 'd1', filename: 'Procurement_Policy_v3.pdf', size: '2.4 MB',
            uploadDate: '2025-12-01', chunkCount: 1450, vectorStatus: 'INDEXED', policyVersion: 'v3.0'
          },
          {
            id: 'd2', filename: 'Vendor_SLA_Agreement_2025.pdf', size: '1.1 MB',
            uploadDate: '2025-12-15', chunkCount: 890, vectorStatus: 'INDEXED', policyVersion: '2025-A'
          },
          {
            id: 'd3', filename: 'Internal_Audit_Guideline.docx', size: '500 KB',
            uploadDate: '2026-01-08', chunkCount: 320, vectorStatus: 'PROCESSING', policyVersion: 'Draft-1'
          }
        ]);
      }, 500);
    });
  }
};