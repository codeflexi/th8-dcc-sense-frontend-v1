// src/features/decision-run/types.ts

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
export type Decision = 'PASS' | 'REVIEW' | 'FAIL' | 'REJECT' | string

export interface Money {
  value: number
  currency: string
}

export interface CaseGroupSku {
  item_id: string
  sku: string
  name?: string
  description?: string
  item_name?: string
  created_at?: string
  quantity?: number
  uom?: string
  unit_price?: Money
  total_price?: Money
  source_line_ref?: string
}

export interface GroupReason {
  rule_id: string
  severity: string
  exec: string
}

export interface GroupBaseline {
  value: number
  currency: string
}

export interface GroupEvidenceRefs {
  fact_ids?: string[]
  evidence_ids?: string[]
}

export interface CaseGroup {
  group_id: string
  decision: Decision
  risk_level: RiskLevel
  confidence?: number
  sku?: CaseGroupSku
  reasons?: GroupReason[]
  baseline?: GroupBaseline
  evidence_refs?: GroupEvidenceRefs
}

export interface CaseGroupsResponse {
  case_id: string
  run_id?: string
  groups: CaseGroup[]
}

export interface RuleCalculation {
  field?: string
  actual?: any
  expected?: any
  operator?: string
  required_docs?: string[]
  has_any_document?: boolean
  [k: string]: any
}

export interface GroupRule {
  rule_id: string
  severity: string
  result: string
  explanation: string
  calculation?: RuleCalculation
}

export interface GroupRulesResponse {
  group_id: string
  decision: Decision
  risk_level: RiskLevel
  confidence?: number
  rules: GroupRule[]
}

export interface EvidenceDocument {
  document_id: string
  file_name: string
  document_type?: string | null
  created_at?: string
}

export interface PriceItem {
  price_item_id: string
  contract_id?: string
  document_id: string
  page_id?: string
  page_number?: number
  sku?: string
  item_name?: string
  unit_price?: number
  currency?: string
  uom?: string | null
  effective_from?: string | null
  effective_to?: string | null
  snippet?: string | null
  confidence_score?: number | null
  created_at?: string
  highlight_text?: string | null
}

export interface EvidenceItem {
  evidence_id: string
  evidence_type: string
  anchor_type: string
  anchor_id: string
  document_id: string
  source_page?: number | null
  source_snippet?: string | null
  confidence?: number | null
  extraction_method?: string | null
  evidence_payload?: Record<string, any>
  price_items?: PriceItem[]
  created_at?: string
}

export interface GroupEvidenceResponse {
  group_id: string
  documents: EvidenceDocument[]
  evidences: EvidenceItem[]
}
