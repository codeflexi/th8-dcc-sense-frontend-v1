import { http } from '@/lib/http'
import type {
  AuditLog,
  AuditContextItem,
  CaseViewResponse,
  CaseViewItem,
} from './types'

function safeNumber(n: any, fallback = 0) {
  const x = Number(n)
  return Number.isFinite(x) ? x : fallback
}

function fmtTHB(n: any) {
  const x = safeNumber(n, 0)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(x) + ' THB'
}

function fmtPct(n: any) {
  const x = safeNumber(n, 0)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(x) + '%'
}

function id(prefix: string, parts: Array<string | number | undefined | null>) {
  const s = parts.filter(Boolean).join('-')
  return `${prefix}-${s}`
}

function mkContext(items: Array<AuditContextItem | null | undefined>) {
  return items.filter(Boolean) as AuditContextItem[]
}

/* ===============================
   derive exposure per item
   =============================== */
function deriveItemExposure(item: CaseViewItem) {
  const price: any = item.price || {}
  const qty = item.quantity || {}

  // ===============================
  // PROCUREMENT MODE
  // variance_abs จาก backend = TOTAL อยู่แล้ว
  // ===============================
  if (price?.variance_abs != null) {
    return safeNumber(price.variance_abs)
  }

  // ===============================
  // FINANCE AP MODE
  // diff_abs อาจเป็น per unit
  // ===============================
  if (price?.diff_abs != null) {
    const invQty = Number(qty.inv ?? qty.gr ?? qty.po ?? 0)

    // ถ้า diff_abs ใหญ่มากอยู่แล้ว → น่าจะ total
    if (safeNumber(price.diff_abs) > 10000) {
      return safeNumber(price.diff_abs)
    }

    // ถ้าเล็ก → per unit
    return safeNumber(price.diff_abs) * invQty
  }

  return 0
}

/* =============================== */

function deriveRunEvents(view: CaseViewResponse): AuditLog[] {
  const createdAt = view.created_at || new Date().toISOString()
  const policy = view.policy
  const summary = view.summary
  const exposure = summary?.exposure

  const logs: AuditLog[] = []

  logs.push({
    id: id('run', [view.case_id, view.run_id, createdAt]),
    action: 'RUN_CREATED',
    actor: { name: 'SYSTEM', role: 'Auto' },
    timestamp: createdAt,
    message: 'Decision run created',
    status: 'COMPLETED',
    context: mkContext([
      { label: 'Case ID', value: view.case_id, type: 'mono', fullWidth: true },
      { label: 'Run ID', value: String(view.run_id || '-'), type: 'mono', fullWidth: true },
      { label: 'Technique', value: String(view.technique || '-'), type: 'badge', badgeColor: 'slate' },
      { label: 'Policy', value: policy ? `${policy.policy_id} ${policy.policy_version}` : '-', type: 'badge', badgeColor: 'slate' },
      { label: 'Overall Decision', value: String(summary?.overall_decision || '-'), type: 'badge', badgeColor: summary?.overall_decision === 'APPROVE' ? 'green' : summary?.overall_decision === 'REVIEW' ? 'amber' : 'red' },
      { label: 'Risk Level', value: String(summary?.risk_level || '-'), type: 'badge', badgeColor: summary?.risk_level === 'LOW' ? 'green' : summary?.risk_level === 'MED' ? 'amber' : 'red' },
      { label: 'Confidence Avg', value: `${Math.round(safeNumber(summary?.confidence_avg, 0) * 100)}%`, type: 'text' },
      { label: 'Item Count', value: String(summary?.item_count ?? (view.items?.length ?? 0)), type: 'text' },
      exposure ? { label: 'Exposure', value: fmtTHB(exposure.unit_variance_sum), type: 'currency', highlight: true } : null,
    ]),
    meta: {},
  })

  return logs
}

/* ===============================
   Item-level events
   =============================== */
function deriveItemEvents(item: CaseViewItem, caseId: string, runId?: string | null): AuditLog[] {
  const ts = item.created_at || new Date().toISOString()
  const sku = item.item?.sku || '-'
  const itemName = item.item?.name || '-'

  const decision = item.status?.decision || '-'
  const risk = item.status?.risk || '-'
  const conf = item.status?.confidence

  const qty = item.quantity
  const price: any = item.price || {}
  const contextType = String(price?.context || '').toUpperCase()

  const itemExposure = deriveItemExposure(item)

  const logs: AuditLog[] = []

  logs.push({
    id: id('item', [caseId, runId, item.group_id]),
    action: 'ITEM_EVALUATED',
    actor: { name: 'SYSTEM', role: 'Auto' },
    timestamp: ts,
    message: `${sku} evaluated: ${decision} (${risk})`,
    status: 'COMPLETED',
    context: mkContext([
      { label: 'Item', value: itemName, type: 'text', highlight: true, fullWidth: true },
      { label: 'SKU', value: sku, type: 'mono' },
      { label: 'Decision', value: decision, type: 'badge', badgeColor: decision === 'APPROVE' ? 'green' : decision === 'REVIEW' ? 'amber' : 'red' },
      { label: 'Risk', value: risk, type: 'badge', badgeColor: risk === 'LOW' ? 'green' : risk === 'MED' ? 'amber' : 'red' },
      { label: 'Confidence', value: `${Math.round(safeNumber(conf, 0) * 100)}%`, type: 'text' },

      qty ? { label: 'Qty (PO)', value: String(qty.po ?? 0), type: 'text' } : null,
      qty ? { label: 'Qty (GR)', value: String(qty.gr ?? 0), type: 'text' } : null,
      qty ? { label: 'Qty (INV)', value: String(qty.inv ?? 0), type: 'text' } : null,

      contextType ? { label: 'Price Context', value: contextType, type: 'badge', badgeColor: 'slate' } : null,

      price?.has_baseline ? { label: 'Baseline Unit', value: fmtTHB(price.baseline_unit), type: 'currency' } : null,
      price?.po_unit != null ? { label: 'PO Unit', value: fmtTHB(price.po_unit), type: 'currency' } : null,

      /* ===== FIX: SHOW INVOICE UNIT ===== */
      price?.inv_unit != null ? { label: 'Invoice Unit', value: fmtTHB(price.inv_unit), type: 'currency', highlight: true } : null,

      price?.variance_pct != null ? { label: 'Variance %', value: fmtPct(price.variance_pct), type: 'badge', badgeColor: price.within_tolerance ? 'green' : 'red' } : null,
      price?.variance_abs != null ? { label: 'Variance Abs', value: fmtTHB(price.variance_abs), type: 'currency', highlight: !price.within_tolerance } : null,

      /* Finance diff (3-way) */
      price?.diff_pct != null ? { label: 'Diff %', value: fmtPct(price.diff_pct), type: 'badge', badgeColor: price.within_tolerance ? 'green' : 'red' } : null,
      price?.diff_abs != null ? { label: 'Diff Abs', value: fmtTHB(price.diff_abs), type: 'currency', highlight: !price.within_tolerance } : null,

      itemExposure > 0
        ? { label: 'Item Exposure', value: fmtTHB(itemExposure), type: 'currency', highlight: true }
        : null,
    ]),
    meta: {
      sku,
      item_name: itemName,
      item_exposure: itemExposure,
    } as any,
  })

  /* ===== RULE LOOP (unchanged) ===== */
  const rules = item.rules || []
  for (const r of rules) {
    const isFail = String(r.result).toUpperCase() === 'FAIL'
    const action = isFail ? 'RULE_FAILED' : 'RULE_PASSED'

    logs.push({
  id: id('rule', [caseId, runId, item.group_id, r.rule_id]),
  action,
  actor: { name: 'RULE_ENGINE', role: 'System' },
  timestamp: ts,
  message: `${r.rule_id}: ${r.exec_message || r.audit_message || 'Rule evaluated'}`,
  status: isFail ? 'PENDING' : 'COMPLETED',
  context: mkContext([
    { label: 'Item', value: itemName, type: 'text', fullWidth: true },
    { label: 'SKU', value: sku, type: 'mono' },
    { label: 'Rule ID', value: r.rule_id, type: 'mono' },
    { label: 'Group', value: r.group, type: 'badge', badgeColor: 'slate' },
    { label: 'Severity', value: r.severity, type: 'badge', badgeColor: r.severity === 'LOW' ? 'green' : r.severity === 'MED' ? 'amber' : 'red' },
    { label: 'Result', value: r.result, type: 'badge', badgeColor: isFail ? 'red' : 'green' },

    /* ===== calculation ===== */
    r.calculation?.field != null
      ? { label: 'Field', value: String(r.calculation.field), type: 'mono' }
      : null,

    r.calculation?.actual != null
      ? { label: 'Actual', value: String(r.calculation.actual), type: 'mono', highlight: true }
      : null,

    r.calculation?.operator != null
      ? { label: 'Operator', value: String(r.calculation.operator), type: 'mono' }
      : null,

    r.calculation?.expected != null
      ? { label: 'Expected', value: String(r.calculation.expected), type: 'mono' }
      : null,

    /* =========================================================
   QUANTITY RULE → show qty only
   ========================================================= */
r.group === 'QUANTITY' && item.quantity
  ? { label: 'PO Qty', value: String(item.quantity.po ?? 0), type: 'mono' }
  : null,

r.group === 'QUANTITY' && item.quantity
  ? { label: 'GR Qty', value: String(item.quantity.gr ?? 0), type: 'mono', highlight: true }
  : null,

r.group === 'QUANTITY' && item.quantity
  ? { label: 'INV Qty', value: String(item.quantity.inv ?? 0), type: 'mono' }
  : null,

/* =========================================================
   PROCUREMENT PRICE RULE (baseline compare)
   ========================================================= */
r.group === 'PRICE' && price?.has_baseline
  ? { label: 'Baseline Unit', value: fmtTHB(price.baseline_unit), type: 'currency' }
  : null,

r.group === 'PRICE' && price?.has_baseline && price?.po_unit != null
  ? { label: 'PO Unit', value: fmtTHB(price.po_unit), type: 'currency', highlight: true }
  : null,

r.group === 'PRICE' && price?.has_baseline && price?.variance_pct != null
  ? {
      label: 'Variance %',
      value: fmtPct(price.variance_pct),
      type: 'badge',
      badgeColor: price.within_tolerance ? 'green' : 'red'
    }
  : null,

r.group === 'PRICE' && price?.has_baseline && price?.variance_abs != null
  ? {
      label: 'Variance Abs',
      value: fmtTHB(price.variance_abs),
      type: 'currency',
      highlight: true
    }
  : null,

/* =========================================================
   FINANCE 3-WAY PRICE RULE (no baseline)
   ========================================================= */
r.group === 'PRICE' && !price?.has_baseline && price?.po_unit != null
  ? { label: 'PO Unit', value: fmtTHB(price.po_unit), type: 'currency' }
  : null,

r.group === 'PRICE' && !price?.has_baseline && price?.inv_unit != null
  ? { label: 'Invoice Unit', value: fmtTHB(price.inv_unit), type: 'currency', highlight: true }
  : null,

r.group === 'PRICE' && !price?.has_baseline && price?.diff_pct != null
  ? {
      label: 'Diff %',
      value: fmtPct(price.diff_pct),
      type: 'badge',
      badgeColor: price.within_tolerance ? 'green' : 'red'
    }
  : null,

r.group === 'PRICE' && !price?.has_baseline && price?.diff_abs != null
  ? {
      label: 'Diff Abs',
      value: fmtTHB(price.diff_abs),
      type: 'currency',
      highlight: true
    }
  : null,


  ]),
  meta: {
    sku,
    item_name: itemName,
    item_exposure: itemExposure,
    group: r.group,
    rule_id: r.rule_id,
    domain: r.domain,
    severity: r.severity,
    result: r.result,
  } as any,
})

  }

  return logs
}

/* =============================== */

function deriveTimeline(view: CaseViewResponse): AuditLog[] {
  const logs: AuditLog[] = []
  logs.push(...deriveRunEvents(view))

  const items = view.items || []
  for (const it of items) {
    logs.push(...deriveItemEvents(it, view.case_id, view.run_id))
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return logs
}

export const auditApi = {
  async getLogs(caseId: string): Promise<AuditLog[]> {
    try {
      const view = await http.get<CaseViewResponse>(`/api/v1/cases/${caseId}/view`)
      return deriveTimeline(view)
    } catch (e) {
      console.error('Load Audit Timeline Failed', e)
      return []
    }
  },
}