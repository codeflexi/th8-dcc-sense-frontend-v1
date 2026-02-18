// src/features/decision-run/store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { decisionRunApi } from './api'
import type {
  CaseGroup,
  CaseGroupsResponse,
  GroupEvidenceResponse,
  GroupRulesResponse,
  GroupRule,
  EvidenceDocument,
  EvidenceItem,
  FinanceDecisionResult,
} from './types'

type RightPanelTab = 'WHY' | 'EVIDENCE'

function riskScore(x: string) {
  const v = String(x || '').toUpperCase()
  return v === 'CRITICAL' ? 4 : v === 'HIGH' ? 3 : v === 'MEDIUM' || v === 'MED' ? 2 : v === 'LOW' ? 1 : 0
}

function fmtTH(n: any) {
  const v = Number(n || 0)
  return new Intl.NumberFormat('th-TH').format(v)
}

function fmtTHB(n: any) {
  return `${fmtTH(n)} บาท`
}

function fmtPct(n: any) {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return `${v.toFixed(2)}%`
}

/**
 * finance_ap: enterprise-grade, business-readable WHY (per rule)
 * - ไม่กระทบ procurement: ใช้เฉพาะตอน normalize decision-results → rulesCache
 * - อิง group + calculation.field + explainability (ไม่ผูกกับ rule_id)
 * - แสดงตัวเลขชัด: เกินอะไร เกินเท่าไหร่
 */
function financeExplainEnterprise(rule: any, trace: any): string {
  const exp = trace?.explainability || {}
  const qty = exp?.qty || {}
  const price = exp?.price || {}
  const item = exp?.item || {}
  const poItem = trace?.inputs?.po_item || {}

  const field = String(rule?.calculation?.field || '').trim()
  const group = String(rule?.group || '').toUpperCase()

  const uom = String(item?.uom || poItem?.uom || 'หน่วย')
  const sku = String(exp?.sku || poItem?.sku || '').trim()
  const skuSuffix = sku ? ` (SKU: ${sku})` : ''

  // numbers from explainability
  const poQty = qty?.po
  const grQty = qty?.gr
  const invQty = qty?.inv
  const overGr = qty?.over_gr_qty
  const overInv = qty?.over_inv_qty

  const poUnit = price?.po_unit_price
  const invUnit = price?.inv_unit_price ?? poItem?.unit_price?.value
  const diffAbs = price?.diff_abs
  const diffPct = price?.diff_pct

  if (group === 'QUANTITY' && field === 'gr_exceeds_po') {
    // GR > PO
    if (grQty != null && poQty != null) {
      const excess = overGr != null ? overGr : Number(grQty) - Number(poQty)
      return `3-way matching พบยอดรับของ (GR) เกินยอดสั่งซื้อ (PO): GR ${fmtTH(grQty)} ${uom} เทียบกับ PO ${fmtTH(
        poQty
      )} ${uom} (เกิน ${fmtTH(excess)} ${uom})${skuSuffix}`
    }
    return `3-way matching พบยอดรับของ (GR) เกินยอดสั่งซื้อ (PO)${skuSuffix}`
  }

  if (group === 'QUANTITY' && field === 'inv_exceeds_gr') {
    // INV > GR
    if (invQty != null && grQty != null) {
      const excess = overInv != null ? overInv : Number(invQty) - Number(grQty)
      return `3-way matching พบยอดในใบแจ้งหนี้ (Invoice) เกินยอดรับของ (GR): Invoice ${fmtTH(invQty)} ${uom} เทียบกับ GR ${fmtTH(
        grQty
      )} ${uom} (เกิน ${fmtTH(excess)} ${uom})${skuSuffix}`
    }
    return `3-way matching พบยอดในใบแจ้งหนี้ (Invoice) เกินยอดรับของ (GR)${skuSuffix}`
  }

  if (group === 'PROCESS' && field === 'inv_without_gr') {
    return `3-way matching ยังไม่พร้อม: มี Invoice แล้ว แต่ยังไม่มีใบรับของ (GRN) ในระบบ${skuSuffix}`
  }

  if (group === 'PRICE' && field === 'price_within_tolerance') {
    const invTxt = invUnit != null ? fmtTHB(invUnit) : '—'
    const poTxt = poUnit != null ? fmtTHB(poUnit) : '—'

    let diffTxt = ''
    const absOk = diffAbs != null && Number.isFinite(Number(diffAbs))
    const pctOk = diffPct != null && Number.isFinite(Number(diffPct))
    if (absOk || pctOk) {
      const absPart = absOk ? `${fmtTH(diffAbs)} บาท` : ''
      const pctPart = pctOk ? fmtPct(diffPct) : ''
      if (absPart && pctPart) diffTxt = ` (ส่วนต่าง ${absPart}, ${pctPart})`
      else if (absPart) diffTxt = ` (ส่วนต่าง ${absPart})`
      else if (pctPart) diffTxt = ` (ส่วนต่าง ${pctPart})`
    }

    return `ราคาต่อหน่วยใน Invoice ไม่ตรงกับ PO: Invoice ${invTxt}/หน่วย เทียบกับ PO ${poTxt}/หน่วย${diffTxt}${skuSuffix}`
  }

  if (group === 'FRAUD' && field === 'dup_invoice') {
    return `สัญญาณใบแจ้งหนี้ซ้ำ: ควรตรวจ Vendor / เลขที่ Invoice / รอบบิล และรายการที่เคยบันทึก${skuSuffix}`
  }

  // fallback: payload exec (ไทย) หรือสรุปกลาง
  const exec = rule?.explanation?.exec
  if (exec) return String(exec)
  return 'พบข้อยกเว้นที่ต้องตรวจสอบ'
}

// finance_ap: normalize /decision-results payload to procurement-like CaseGroup (inject sku/baseline)
function mapFinanceDecisionResultToGroup(r: FinanceDecisionResult): CaseGroup {
  const trace = (r as any)?.trace || {}
  const po = trace?.inputs?.po_item || {}
  const explain = trace?.explainability || {}
  const price = explain?.price || {}

  const invUnit = Number(po?.unit_price?.value || 0)
  const poUnit = Number(price?.po_unit_price || 0)

  return {
    group_id: String((r as any)?.group_id || ''),
    decision: String((r as any)?.decision_status || (r as any)?.decision || 'REVIEW'),
    risk_level: String((r as any)?.risk_level || 'LOW'),
    confidence: (r as any)?.confidence,

    // inject `sku` so DecisionRunView.vue ใช้ UI procurement เดิมได้
    sku: {
      item_id: String(po?.item_id || (r as any)?.group_id || ''),
      sku: String(po?.sku || explain?.sku || '—'),
      item_name: String(explain?.item?.item_name || po?.item_name || po?.sku || 'Finance AP Item'),
      description: explain?.item?.description || null,
      quantity: Number(po?.quantity || 0),
      uom: po?.uom || null,
      unit_price: po?.unit_price || { value: invUnit, currency: po?.unit_price?.currency || 'THB' },
      total_price: po?.total_price || {
        value: Number(po?.total_price?.value || 0),
        currency: po?.total_price?.currency || po?.unit_price?.currency || 'THB',
      },
      source_line_ref: po?.source_line_ref,
      created_at: po?.created_at,
      name: po?.name,
    },

    // baseline = PO unit price (สำหรับเทียบ Invoice vs PO)
    baseline: {
      value: poUnit,
      currency: po?.unit_price?.currency || 'THB',
    },

    raw_trace: trace,
    __domain: 'finance_ap',
  }
}

export const useDecisionRunStore = defineStore('decisionRun', () => {
  const currentCaseId = ref<string | null>(null)

  const groups = ref<CaseGroup[]>([])
  const activeGroupId = ref<string | null>(null)

  const loadingGroups = ref(false)
  const loadingWhy = ref(false)
  const loadingEvidence = ref(false)

  const rulesCache = ref<Record<string, GroupRulesResponse>>({})
  const evidenceCache = ref<Record<string, GroupEvidenceResponse>>({})

  const rightTab = ref<RightPanelTab>('WHY')

  const evidenceModalOpen = ref(false)

  // ✅ PDF state
  const pdfModalOpen = ref(false)
  const pdfDocumentId = ref<string>('')
  const pdfPage = ref<number>(1)
  const pdfUrl = ref<string>('') // ✅ ไม่ใช่ computed แล้ว
  const pdfPageText = ref<string>('') // (optional) เผื่ออยากโชว์ text

  const decisionNote = ref<string>('')

  const activeGroup = computed(() => {
    const id = activeGroupId.value
    if (!id) return null
    return groups.value.find(g => g.group_id === id) || null
  })

  const activeWhy = computed(() => {
    const id = activeGroupId.value
    if (!id) return null
    return rulesCache.value[id] || null
  })

  const activeEvidence = computed(() => {
    const id = activeGroupId.value
    if (!id) return null
    return evidenceCache.value[id] || null
  })

  const activeRules = computed<GroupRule[]>(() => activeWhy.value?.rules || [])
  const activeDocuments = computed<EvidenceDocument[]>(() => activeEvidence.value?.documents || [])
  const activeEvidences = computed<EvidenceItem[]>(() => activeEvidence.value?.evidences || [])

  function resetForNewCase(caseId: string) {
    currentCaseId.value = caseId
    groups.value = []
    activeGroupId.value = null

    rulesCache.value = {}
    evidenceCache.value = {}

    rightTab.value = 'WHY'
    evidenceModalOpen.value = false

    pdfModalOpen.value = false
    pdfDocumentId.value = ''
    pdfPage.value = 1
    pdfUrl.value = ''
    pdfPageText.value = ''

    decisionNote.value = ''
  }

  function pickDefaultGroup(list: CaseGroup[]) {
    const risky = list.find(g => String(g.risk_level).toUpperCase() !== 'LOW')
    return risky?.group_id || list?.[0]?.group_id || null
  }

  async function loadCase(caseId: string) {
    if (!caseId) return

    if (currentCaseId.value !== caseId) {
      resetForNewCase(caseId)
    } else {
      if (groups.value.length) return
    }

    loadingGroups.value = true
    try {
      const res: CaseGroupsResponse = await decisionRunApi.getCaseGroups(caseId)
      const list = Array.isArray(res?.groups) ? res.groups : []

      // procurement groups มี sku อยู่แล้ว (UI เดิมใช้งานได้)
      const hasSku = list.some(g => !!(g as any)?.sku)

      if (hasSku) {
        // ===== procurement (existing behavior, untouched) =====
        groups.value = [...list].sort((a, b) => riskScore(String(b.risk_level || '')) - riskScore(String(a.risk_level || '')))
      } else {
        // ===== finance_ap: call decision-results and normalize =====
        const runId = (res as any)?.run_id || (res as any)?.runId
        if (runId) {
          const dr = await decisionRunApi.getDecisionResults(caseId, String(runId))

          // ⚠️ backend บางครั้งส่งผลลัพธ์หลาย run_id ปะปนกัน (จาก retry/ประวัติ)
          // ทำให้ mapping/WHY panel ไม่ stable (อาจหยิบ payload เก่า ที่ calculation ยังไม่ครบ)
          // แนวทาง: เลือกผลลัพธ์ของ run_id ที่ร้องขอเป็นหลัก; ถ้าไม่มีค่อย fallback เป็น latest ต่อ group_id
          const wantedRunId = String(runId || '')
          const allResults = Array.isArray(dr?.results) ? dr.results : []
          const sameRun = wantedRunId ? allResults.filter(x => String((x as any)?.run_id || '') === wantedRunId) : []
          const candidates = sameRun.length ? sameRun : allResults

          // de-dup ต่อ group_id โดยเลือก "created_at ล่าสุด"
          const bestByGroup = new Map<string, FinanceDecisionResult>()
          for (const r of candidates) {
            const gid = String((r as any)?.group_id || '')
            if (!gid) continue
            const ts = Date.parse(String((r as any)?.created_at || '')) || 0
            const prev = bestByGroup.get(gid) as any
            const prevTs = prev ? (Date.parse(String(prev?.created_at || '')) || 0) : -1
            if (!prev || ts >= prevTs) bestByGroup.set(gid, r)
          }

          const mapped: CaseGroup[] = [...bestByGroup.values()].map(mapFinanceDecisionResultToGroup)

          groups.value = [...mapped].sort((a, b) => riskScore(String(b.risk_level || '')) - riskScore(String(a.risk_level || '')))

          // prefill WHY + Evidence caches (DecisionWhyPanel ใช้ r.explanation + calculation)
          const nextRules: Record<string, GroupRulesResponse> = {}
          const nextEvidence: Record<string, GroupEvidenceResponse> = {}

          for (const g of groups.value) {
            const gid = g.group_id
            if (!gid) continue

            const trace = (g as any)?.raw_trace || {}
            const rawRules = trace?.rules || []

            nextRules[gid] = {
              group_id: gid,
              decision: g.decision,
              risk_level: g.risk_level,
              confidence: g.confidence,
              rules: rawRules.map((x: any) => ({
                rule_id: String(x?.rule_id || ''),
                severity: String(x?.severity || ''),
                result: String(x?.result || ''),
                // ✅ จุดเดียวที่ rewrite ให้ enterprise และไม่กระทบ procurement
                explanation: financeExplainEnterprise(x, trace),
                calculation: x?.calculation,
              })),
            }

            // finance_ap: ยังไม่มี evidence refs → กัน UI crash ด้วย empty arrays
            nextEvidence[gid] = {
              group_id: gid,
              documents: [],
              evidences: [],
            }
          }

          rulesCache.value = nextRules
          evidenceCache.value = nextEvidence
        } else {
          // fallback: show raw groups (still sorted) even if incomplete
          groups.value = [...list].sort((a, b) => riskScore(String(b.risk_level || '')) - riskScore(String(a.risk_level || '')))
        }
      }

      const first = pickDefaultGroup(groups.value)
      if (first) await selectGroup(first, { openEvidence: false })
    } finally {
      loadingGroups.value = false
    }
  }

  async function loadWhy(groupId: string) {
    if (!groupId) return
    if (rulesCache.value[groupId]) return

    loadingWhy.value = true
    try {
      const res = await decisionRunApi.getGroupRules(groupId)
      rulesCache.value = { ...rulesCache.value, [groupId]: res }
    } finally {
      loadingWhy.value = false
    }
  }

  async function loadEvidence(groupId: string) {
    if (!groupId) return
    if (evidenceCache.value[groupId]) return

    loadingEvidence.value = true
    try {
      const res = await decisionRunApi.getGroupEvidence(groupId)
      evidenceCache.value = { ...evidenceCache.value, [groupId]: res }
    } finally {
      loadingEvidence.value = false
    }
  }

  async function selectGroup(groupId: string, opts?: { openEvidence?: boolean }) {
    if (!groupId) return
    if (activeGroupId.value === groupId && (rulesCache.value[groupId] || evidenceCache.value[groupId])) {
      if (opts?.openEvidence) evidenceModalOpen.value = true
      return
    }

    activeGroupId.value = groupId
    await Promise.all([loadWhy(groupId), loadEvidence(groupId)])

    if (opts?.openEvidence) evidenceModalOpen.value = true
  }

  function setRightTab(tab: RightPanelTab) {
    rightTab.value = tab
  }

  function openEvidenceModal() {
    evidenceModalOpen.value = true
    rightTab.value = 'EVIDENCE'
  }

  function closeEvidenceModal() {
    evidenceModalOpen.value = false
  }

  // ✅ จุดสำคัญ: เปิด PDF ต้อง fetch ก่อน แล้วค่อยเอา pdf_url ไปใส่ iframe
  async function openPdf(documentId: string, page = 1) {
    if (!documentId) return
    pdfDocumentId.value = documentId
    pdfPage.value = page || 1

    try {
      const res = await decisionRunApi.getDocumentPage(documentId, pdfPage.value)
      pdfUrl.value = (res.pdf_url || res.image_url || '') ?? ''
      pdfPageText.value = (res.page_text || '') ?? ''
      pdfModalOpen.value = true
    } catch (e) {
      pdfUrl.value = ''
      pdfPageText.value = ''
      pdfModalOpen.value = true
      console.error('openPdf error', e)
    }
  }

  function closePdf() {
    pdfModalOpen.value = false
  }

  async function gotoPdfPage(page: number) {
    const next = Math.max(1, Number(page) || 1)
    pdfPage.value = next
    if (!pdfDocumentId.value) return
    await openPdf(pdfDocumentId.value, pdfPage.value)
  }

  async function submitDecision(action: 'APPROVE' | 'REJECT') {
    console.log('submitDecision', { action, note: decisionNote.value, caseId: currentCaseId.value })
  }

  return {
    currentCaseId,
    groups,
    activeGroupId,
    rightTab,

    loadingGroups,
    loadingWhy,
    loadingEvidence,

    activeGroup,
    activeWhy,
    activeEvidence,
    activeRules,
    activeDocuments,
    activeEvidences,

    evidenceModalOpen,
    pdfModalOpen,
    pdfDocumentId,
    pdfPage,
    pdfUrl,
    pdfPageText,

    decisionNote,

    loadCase,
    selectGroup,

    setRightTab,
    openEvidenceModal,
    closeEvidenceModal,

    openPdf,
    closePdf,
    gotoPdfPage,

    submitDecision,
  }
})
