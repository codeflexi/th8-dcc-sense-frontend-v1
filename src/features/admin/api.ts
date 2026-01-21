import type { SystemRule, RAGDocument } from './types';
// ✅ เพิ่ม export type ตรงนี้ เพื่อให้ไฟล์อื่น import RAGDocument ไปใช้ได้
export type { SystemRule, RAGDocument } from './types';

// Helper function: แปลงสถานะจาก Backend (lowercase) เป็น Frontend (UPPERCASE)
const mapVectorStatus = (status: string): 'INDEXED' | 'PROCESSING' | 'ERROR' | 'UNKNOWN' => {
  switch (status?.toLowerCase()) {
    case 'completed': return 'INDEXED';
    case 'processing': return 'PROCESSING';
    case 'failed': return 'ERROR';
    default: return 'UNKNOWN';
  }
};

export const adminApi = {
  // 1. getRules: ยังคงใช้ Mock Data ตามเดิม (หรือจะแก้เป็น Real API ในอนาคตก็ได้)
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

  // 2. getDocuments: แก้เป็น Real API Call
  async getDocuments(): Promise<RAGDocument[]> {
    try {
      // เรียก API ไปที่ Backend ของเรา
      const response = await fetch('/api/documents/');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();

      // Map ข้อมูลจาก Backend -> Frontend Interface (RAGDocument)
      return data.map((doc: any) => ({
        id: doc.id,
        filename: doc.file_name,
        domain: doc.domain || 'general',
        // Backend ยังไม่ได้ส่ง size มา ให้ใส่ Placeholder หรือคำนวณถ้ามีข้อมูล
        size: 'N/A', 
        // แปลงวันที่ created_at เป็น YYYY-MM-DD
        uploadDate: doc.created_at ? new Date(doc.created_at).toISOString().split('T')[0] : '-',
        chunkCount: doc.vector_count,
        vectorStatus: mapVectorStatus(doc.status),
        // ดึง Policy Version จาก Metadata (ถ้ามี)
        policyVersion: doc.metadata?.policy_version || doc.metadata?.version || '-',
        // ✅ ส่ง Metadata ทั้งก้อนไปด้วย (เผื่อปุ่ม View Meta ใช้งาน)
        metadata: doc.metadata
      }));

    } catch (error) {
      console.error("[AdminAPI] Error fetching documents:", error);
      return []; // คืนค่า array ว่างเพื่อไม่ให้หน้าจอพัง
    }
  },
  // ✅ เพิ่มฟังก์ชันนี้
  async getDocumentUrl(id: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/documents/${id}/url`);
      if (!response.ok) throw new Error("Failed to get URL");
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error fetching document URL:", error);
      return null;
    }
  }
};