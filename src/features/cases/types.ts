// src/features/cases/stores/types.ts
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null

export interface CaseListItem {
  case_id: string
  domain: string
  reference_type: string
  reference_id: string

  entity_id: string
  entity_type: string | null
  entity_name: string | null

  amount_total: number
  currency: string

  status: string
  decision: string | null
  risk_level: RiskLevel
  confidence: number | null

  created_at: string
  updated_at: string
}

export interface CaseListResponse {
  items: CaseListItem[]
  page: number
  page_size: number
  total: number
}

export interface CaseDetailHeader {
  case_id: string
  domain: string
  reference_type: string
  reference_id: string

  entity_id: string
  entity_name: string

  amount_total: number
  currency: string

  status: string
  decision: string | null
  risk_level: string | null
  confidence: number | null

  created_at: string
  updated_at: string
}

/**
 * ✅ ไม่เดา field เพิ่ม: ให้เป็น opaque shape
 * ใช้แบบอ่านค่าแบบปลอดภัยใน view (JSON viewer / optional chaining)
 */
export type CaseDecisionSummary = Record<string, any>
export type CaseGroup = Record<string, any>
