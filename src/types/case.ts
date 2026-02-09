// src/types/case.ts

export type RiskLevel = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
export type CaseDecision = 'PASS' | 'REVIEW' | 'REJECT' | null

export interface CaseListItem {
  case_id: string
  domain: string

  reference_type: string
  reference_id: string

  entity_id: string
  entity_type: string | null
  entity_name: string

  amount_total: number
  currency: string

  status: 'OPEN' | 'CLOSED'

  decision: CaseDecision
  risk_level: RiskLevel | null
  confidence: number | null

  created_at: string
  updated_at: string
}

export interface PagedCaseListResponse {
  items: CaseListItem[]
  page: number
  page_size: number
  total: number
}
