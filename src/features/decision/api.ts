// src/features/decision/api.ts
import { http } from '@/lib/http';
import type { RuleResult, CaseFullDetail } from './types';

// ============================================================
// Types for Backend Responses
// ============================================================

// Response from GET /api/cases/{id}
interface BackendCaseResponse {
  id: string;
  vendor_id?: string;
  amount_total: number;
  status: string;
  created_at: string;
  priority_score: number;
  decision_summary?: {
    recommended_action: string;
    risk_level: string;
  };
  violations?: any[];
  // ✅ Backend ส่ง raw มาด้วย (สำคัญมาก)
  raw?: {
    payload?: {
      vendor_name?: string;
      amount_total?: number;
      po_number?: string;
      description?: string;
      issue_date?: string;
      line_items?: Array<{
        sku: string;
        item_desc: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }>;
    };
    policy_id?: string;
  };
}

// Response from POST /api/decisions/cases/{id}/decisions/run
interface BackendRunResponse {
  status: string;
  case_id: string;
  run: {
    run_id: string;
    rule_results: Array<{
      rule_id: string;
      description: string;
      hit: boolean;
      // ✅ Evidence Data: สิ่งที่บอกว่าทำไมกฎถึงไม่ผ่าน (Actual vs Expected)
      matched: Array<{
        field: string;
        operator: string;
        expected: any;
        actual: any;
      }>;
    }>;
    recommendation: {
      decision: string;
      required_role: string;
      reason_codes: string[];
    };
    policy_id?: string;
  };
}

// ============================================================
// API Implementation
// ============================================================

export const decisionApi = {
  
  async getContext(caseId: string): Promise<{ 
    caseDetail: CaseFullDetail, 
    rules: RuleResult[], 
    score: number, 
    recommendation: string 
  }> {
    try {
      // 🚀 Step 1: Run Analysis (เรียก Engine คำนวณสด)
      // ใช้ POST เพื่อ trigger การตรวจกฎใหม่ล่าสุด
      const runRes = await http.post<BackendRunResponse>(
        `/api/decisions/cases/${caseId}/decisions/run`, 
        {}
      );
      const runData = runRes.run;

      // 📦 Step 2: Fetch Case Data (ข้อมูล Header/Payload)
      const caseRes = await http.get<BackendCaseResponse>(`/api/cases/${caseId}`);
      const payload = caseRes.raw?.payload || {};

      // 🛠️ Step 3: Map Rules & Evidence (Backend -> Frontend)
      const rules: RuleResult[] = (runData.rule_results || []).map(r => ({
        id: r.rule_id,
        code: r.rule_id,
        name: r.description || r.rule_id,
        description: r.description,
        status: r.hit ? 'FAIL' : 'PASS', // Hit = Risk Found
        hit: r.hit,
        matched: r.matched || [], // ✅ ส่งหลักฐานไปให้ UI วาดตาราง
      }));

      // 📊 Step 4: Map Recommendation
      const rec = runData.recommendation || {};
      const riskLevel = rec.decision === 'APPROVE' ? 'LOW' : 
                        rec.decision === 'REJECT' ? 'HIGH' : 'MEDIUM';

      // 📝 Step 5: Construct Full Detail Object
      const caseDetail: CaseFullDetail = {
        id: caseRes.id,
        // พยายามดึงชื่อ Vendor จากหลายๆ ที่กันเหนียว
        vendorName: payload.vendor_name || caseRes.vendor_id || 'Unknown Vendor',
        amount: payload.amount_total || caseRes.amount_total || 0,
        currency: 'THB',
        poNumber: payload.po_number || '-',
        description: payload.description || 'No description provided',
        issueDate: payload.issue_date || caseRes.created_at,
        status: caseRes.status,
        riskLevel: riskLevel,
        created_at: caseRes.created_at,
        policyId: caseRes.raw?.policy_id || 'PROCUREMENT-001',
        
        // Map Line Items
        lineItems: (payload.line_items || []).map(item => ({
          sku: item.sku,
          item_desc: item.item_desc,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }))
      };

      return {
        caseDetail,
        rules,
        score: rec.decision === 'APPROVE' ? 98.5 : 65.0, // Mock Score ตามผลลัพธ์
        recommendation: rec.decision || 'REVIEW'
      };

    } catch (e) {
      console.error('Fetch Context Failed', e);
      throw e;
    }
  },

  // ✅ Function สำหรับปุ่ม Re-run Analysis
  async runDecision(caseId: string): Promise<boolean> {
    await http.post(`/api/decisions/cases/${caseId}/decisions/run`, {}); 
    return true;
  },

  async submitDecision(caseId: string, action: string, reason: string) {
    console.log(`[MOCK] Submitting ${action} for ${caseId}: ${reason}`);
    // รอ Backend implement endpoint นี้ (POST /submit)
    return new Promise(r => setTimeout(r, 1000));
  }
};