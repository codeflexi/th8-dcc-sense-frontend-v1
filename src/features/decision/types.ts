// ================= Case =================

export interface CaseHeader {
  case_id: string
  domain: string
  reference_id: string
  entity_name: string
  amount_total: number
  currency: string
  status: string
  created_at: string
}

// ================= Decision =================

export interface DecisionReason {
  rule_id: string
  severity: 'LOW' | 'MED' | 'HIGH'
  exec: string
}

export interface DecisionGroup {
  group_id: string
  decision: 'PASS' | 'REVIEW' | 'REJECT'
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH'
  confidence: number
  reasons: DecisionReason[]
}

export interface CaseDecisionRun {
  case_id: string
  run_id: string
  groups: DecisionGroup[]
}
