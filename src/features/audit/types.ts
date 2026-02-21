export type Severity = 'LOW' | 'MED' | 'HIGH' | 'CRITICAL'
export type RuleResult = 'PASS' | 'FAIL'

export interface CaseViewPolicy {
  policy_id: string
  policy_version: string
}

export interface CaseViewSummary {
  overall_decision: string
  risk_level: string
  confidence_avg: number
  item_count: number
  exposure?: {
    currency: string
    unit_variance_sum: number
  }
  top_reason_codes?: Array<{ code: string; count: number }>
}

export interface CaseViewRule {
  rule_id: string
  group: string
  domain: string
  result: RuleResult
  severity: Severity
  exec_message?: string
  audit_message?: string
  calculation?: {
    field?: string
    actual?: any
    expected?: any
    operator?: string
  } | null
  fail_actions?: Array<{ type: string }>
}

export interface CaseViewItem {
  group_id: string
  status: {
    decision: string
    risk: string
    confidence: number
  }
  item: {
    sku: string
    name: string
    uom?: string
  }
  quantity?: {
    po: number
    gr: number
    inv: number
    over_gr_qty?: number
    over_inv_qty?: number
    flags?: Record<string, any>
  }
  price?: Record<string, any>
  drivers?: Array<{ rule_id: string; label: string; severity: Severity }>
  next_action?: string | null
  rules?: CaseViewRule[]
  artifacts?: {
    po?: boolean
    grn?: boolean
    invoice?: boolean
  }
  created_at?: string
}

export interface CaseViewResponse {
  case_id: string
  run_id?: string | null
  policy?: CaseViewPolicy
  technique?: string
  created_at?: string
  summary?: CaseViewSummary
  items?: CaseViewItem[]
}

/** UI Timeline model (derived from CaseViewResponse) */
export type AuditStatus = 'COMPLETED' | 'PENDING' | 'REJECTED'
export type AuditAction =
  | 'RUN_CREATED'
  | 'POLICY_APPLIED'
  | 'ITEM_EVALUATED'
  | 'RULE_FAILED'
  | 'RULE_PASSED'
  | 'ACTION_REQUIRED'
  | 'ARTIFACT_STATUS'

export interface AuditContextItem {
  label: string
  value: string
  type?: 'text' | 'mono' | 'badge' | 'currency'
  badgeColor?: 'red' | 'green' | 'slate' | 'amber'
  highlight?: boolean
  fullWidth?: boolean
}

export interface AuditLog {
  id: string
  action: AuditAction | string
  actor: {
    name: string
    role: string
    avatar?: string
  }
  timestamp: string
  message: string
  details?: string
  status: AuditStatus
  context?: AuditContextItem[]
  meta?: {
    sku?: string
    item_name?: string
    group?: string
    rule_id?: string
    domain?: string
    severity?: Severity
    result?: RuleResult
  }
}