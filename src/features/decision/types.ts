// src/features/decision/types.ts

export type RuleStatus = 'PASS' | 'FAIL' | 'WARNING';


export interface RuleMatch {
  field: string;
  operator: string;
  expected: any;
  actual: any;
}

export interface RuleResult {
  id: string;
  code: string; // rule_id
  name: string; // description
  description?: string;
  status: RuleStatus;
  hit: boolean;
  matched: RuleMatch[]; // ✅ ข้อมูลสำคัญ: ทำไมถึงโดนจับ
  inputs?: Record<string, any>; // ✅ ข้อมูล Context ณ ตอนนั้น
}

// ✅ เพิ่ม Structure สำหรับ Line Item
export interface LineItem {
  sku: string;
  item_desc: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ✅ เพิ่ม Structure สำหรับ Case Info ที่ละเอียดขึ้น
export interface CaseFullDetail {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  poNumber: string;
  description: string;
  issueDate: string;
  status: string;
  riskLevel: string;
  created_at: string;
  lineItems: LineItem[]; // รับ Line Items มาโชว์
  policyId?: string;     // รองรับ Policy Binding
}

export interface DecisionState {
  caseId: string;
  caseDetail?: CaseFullDetail; // ✅ เก็บข้อมูลเคสเต็มๆ ไว้ที่นี่
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  confidenceScore: number;
  rules: RuleResult[];
  userDecision?: 'APPROVED' | 'REJECTED';
  reason?: string;
  isProcessing: boolean;
  error?: string;
}