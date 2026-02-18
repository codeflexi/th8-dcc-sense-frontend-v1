<!-- src/features/decision-run/components/DecisionWhyPanel.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import type { GroupRule } from '@/features/decision-run/types'

const store = useDecisionRunStore()

const activeGroup: any = computed(() => store.activeGroup)
const rules = computed<GroupRule[]>(() => store.activeRules || [])

/* ===============================
 * Derived state
 * =============================== */

const failedRules = computed(() =>
  rules.value.filter(r => String(r.result).toUpperCase() === 'FAIL')
)

const passedRules = computed(() =>
  rules.value.filter(r => String(r.result).toUpperCase() === 'PASS')
)

const hasBlockingIssues = computed(() => failedRules.value.length > 0)

/* ===============================
 * Enterprise helpers
 * =============================== */

function severityColor(sev?: string) {
  const s = String(sev || '').toUpperCase()
  if (s === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (s === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (s === 'MEDIUM') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

function ruleCardClass(result?: string) {
  const x = String(result || '').toUpperCase()
  if (x === 'FAIL') return 'border-rose-200 bg-rose-50/40'
  if (x === 'PASS') return 'border-emerald-200 bg-emerald-50/40'
  return 'border-slate-200 bg-white'
}

function formatValue(v: any) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  if (v === null || v === undefined) return '-'
  if (typeof v === 'number') return v.toLocaleString()
  return String(v)
}

/* ===============================
 * 🔴 ENTERPRISE FINANCE EXPLAIN
 * =============================== */

function financeExplain(rule: any) {
  // procurement & other domains: use backend/store explanation as-is
  if (activeGroup.value?.__domain !== 'finance_ap') return rule.explanation

  const trace = activeGroup.value?.raw_trace || {}
  const exp = trace?.explainability || {}
  const qty = exp?.qty || {}
  const price = exp?.price || {}
  const item = exp?.item || {}
  const poItem = trace?.inputs?.po_item || {}

  const field = String(rule?.calculation?.field || '').trim()
  const group = String(rule?.group || '').toUpperCase()

  const uom = String(item?.uom || poItem?.uom || '')
  const sku = String(exp?.sku || poItem?.sku || '').trim()
  const skuSuffix = sku ? ` (SKU: ${sku})` : ''

  const fmtN = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '-'
    return n.toLocaleString('th-TH')
  }

  const fmtMoney = (v: any) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    return `${n.toLocaleString('th-TH')} บาท`
  }

  // QUANTITY: GR > PO
  if (group === 'QUANTITY' && field === 'gr_exceeds_po') {
    if (qty?.gr != null && qty?.po != null) {
      const excess = qty?.over_gr_qty ?? (Number(qty.gr) - Number(qty.po))
      return `ยอดรับของ (GR) เกินยอดสั่งซื้อ (PO): GR ${fmtN(qty.gr)} ${uom} เทียบกับ PO ${fmtN(qty.po)} ${uom} (เกิน ${fmtN(
        excess
      )} ${uom})${skuSuffix}`
    }
    return `ยอดรับของ (GR) เกินยอดสั่งซื้อ (PO)${skuSuffix}`
  }

  // QUANTITY: INV > GR
  if (group === 'QUANTITY' && field === 'inv_exceeds_gr') {
    if (qty?.inv != null && qty?.gr != null) {
      const excess = qty?.over_inv_qty ?? (Number(qty.inv) - Number(qty.gr))
      return `ยอดในใบแจ้งหนี้ (Invoice) เกินยอดรับของ (GR): Invoice ${fmtN(qty.inv)} ${uom} เทียบกับ GR ${fmtN(qty.gr)} ${uom} (เกิน ${fmtN(
        excess
      )} ${uom})${skuSuffix}`
    }
    return `ยอดในใบแจ้งหนี้ (Invoice) เกินยอดรับของ (GR)${skuSuffix}`
  }

  // PROCESS: INV without GR
  if (group === 'PROCESS' && field === 'inv_without_gr') {
    return `ยังไม่พร้อมสำหรับจ่ายเงิน: มี Invoice แล้ว แต่ยังไม่มีใบรับของ (GRN) ในระบบ${skuSuffix}`
  }

  // PRICE: Invoice vs PO
  if (group === 'PRICE' && field === 'price_within_tolerance') {
    const invUnit = price?.inv_unit_price ?? poItem?.unit_price?.value
    const poUnit = price?.po_unit_price
    const diffAbs = price?.diff_abs
    const diffPct = price?.diff_pct

    let diffTxt = ''
    const absOk = diffAbs != null && Number.isFinite(Number(diffAbs))
    const pctOk = diffPct != null && Number.isFinite(Number(diffPct))
    if (absOk || pctOk) {
      const absPart = absOk ? `${fmtN(diffAbs)} บาท` : ''
      const pctPart = pctOk ? `${Number(diffPct).toFixed(2)}%` : ''
      if (absPart && pctPart) diffTxt = ` (ต่าง ${absPart}, ${pctPart})`
      else if (absPart) diffTxt = ` (ต่าง ${absPart})`
      else if (pctPart) diffTxt = ` (ต่าง ${pctPart})`
    }

    return `ราคาต่อหน่วยใน Invoice ไม่ตรงกับ PO: Invoice ${fmtMoney(invUnit)}/หน่วย เทียบกับ PO ${fmtMoney(poUnit)}/หน่วย${diffTxt}${skuSuffix}`
  }

  // FRAUD: duplicate invoice
  if (group === 'FRAUD' && field === 'dup_invoice') {
    return `สัญญาณใบแจ้งหนี้ซ้ำ: ตรวจ Vendor / เลขที่ Invoice / รอบบิล และรายการที่เคยบันทึก${skuSuffix}`
  }

  // fallback: use existing explanation
  return rule.explanation
}

function calcLabel(calc: any) {
  if (!calc) return null

  const actual = formatValue(calc.actual)
  const expected = formatValue(calc.expected)
  const op = calc.operator || ''

  if (calc.field === 'price_within_tolerance') {
    return `ราคาต่อหน่วยใน Invoice ต้องตรงกับ PO (ตาม tolerance)`
  }

  if (calc.field === 'gr_exceeds_po') {
    return `ยอดรับของ (GR) ต้องไม่เกินยอดสั่งซื้อ (PO)`
  }

  if (calc.field === 'inv_exceeds_gr') {
    return `ยอดใน Invoice ต้องไม่เกินยอดรับของ (GR)`
  }

  if (calc.field === 'inv_without_gr') {
    return `ต้องมีใบรับของ (GRN) ก่อนการจ่ายเงิน`
  }

  if (calc.field === 'dup_invoice') {
    return `ตรวจใบแจ้งหนี้ซ้ำ`
  }

  return `${actual} ${op} ${expected}`
}

function buildNumericExplain(rule: any, group: any) {
  const trace = group?.raw_trace || {}
  const exp = trace?.explainability || {}
  const qty = exp?.qty || {}
  const price = exp?.price || {}
  const po = trace?.inputs?.po_item || {}

  const field = rule?.calculation?.field

  // GR > PO
  if (field === 'gr_exceeds_po') {
    if (qty?.gr != null && qty?.po != null) {
      const over = qty?.over_gr_qty ?? (qty.gr - qty.po)
      return `GR ${qty.gr} > PO ${qty.po} (เกิน ${over})`
    }
  }

  // INV > GR
  if (field === 'inv_exceeds_gr') {
    if (qty?.inv != null && qty?.gr != null) {
      const over = qty?.over_inv_qty ?? (qty.inv - qty.gr)
      return `Invoice ${qty.inv} > GR ${qty.gr} (เกิน ${over})`
    }
  }

  // PRICE
  if (field === 'price_within_tolerance') {
    const inv = price?.inv_unit_price ?? po?.unit_price?.value
    const poPrice = price?.po_unit_price
    const diff = price?.diff_abs
    const pct = price?.diff_pct

    if (inv != null && poPrice != null) {
      let txt = `Invoice ${inv} vs PO ${poPrice}`
      if (diff != null) txt += ` (ต่าง ${diff}`
      if (pct != null) txt += ` / ${Number(pct).toFixed(2)}%`
      if (diff != null) txt += `)`
      return txt
    }
  }

  return null
}
/* =========================================================
   🔴 ITEM HEADER (สำคัญ)
   ========================================================= */

const itemHeader = computed(() => {
  const g: any = activeGroup.value
  if (!g) return null

  const sku = g?.sku?.sku || '-'
  const name = g?.sku?.item_name || 'Unknown item'
  const qty = g?.sku?.quantity || 0
  const uom = g?.sku?.uom || ''
  const total = g?.sku?.total_price?.value || 0
  const cur = g?.sku?.total_price?.currency || 'THB'

  return {
    sku,
    name,
    qty,
    uom,
    total,
    cur
  }
})
</script>

<template>
  <div class="w-full">
    <!-- 🔴 ITEM HEADER -->
  <div
    v-if="itemHeader"
    class="mb-4 p-4 rounded-xl border bg-slate-50 border-slate-200"
  >
    <div class="text-xs text-slate-500 mb-1">ITEM</div>

    <div class="font-semibold text-slate-900">
      {{ itemHeader.name }}
    </div>

    <div class="text-sm text-slate-600 mt-1">
      SKU: {{ itemHeader.sku }}
      • Qty {{ itemHeader.qty }} {{ itemHeader.uom }}
      • Total {{ Number(itemHeader.total).toLocaleString() }} {{ itemHeader.cur }}
    </div>
  </div>

    <!-- SUMMARY -->
    <div
      class="rounded-xl border p-4 mb-4"
      :class="hasBlockingIssues ? 'border-rose-200 bg-rose-50/40' : 'border-emerald-200 bg-emerald-50/40'"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg font-bold"
          :class="hasBlockingIssues ? 'bg-rose-500' : 'bg-emerald-500'"
        >
          {{ hasBlockingIssues ? '!' : '✓' }}
        </div>

        <div class="flex-1">
          <div class="font-semibold text-slate-900 text-[15px]">
            {{ hasBlockingIssues ? 'Blocking issues detected' : 'All checks passed' }}
          </div>

          <div class="text-sm text-slate-600 mt-1">
            <template v-if="hasBlockingIssues">
              This item requires review before approval due to financial or control exceptions.
            </template>
            <template v-else>
              No financial or control exceptions detected. Item is safe to approve.
            </template>
          </div>
        </div>

        <div class="text-right">
          <div class="text-xs text-slate-500">Rules</div>
          <div class="font-semibold text-slate-900 text-lg">
            {{ rules.length }}
          </div>
        </div>
      </div>
    </div>

    <!-- BLOCKING -->
    <div v-if="failedRules.length">
      <div class="text-xs font-semibold text-rose-600 mb-2">
        Blocking issues (must resolve)
      </div>

      <div class="space-y-3">
        <div
          v-for="r in failedRules"
          :key="r.rule_id"
          class="rounded-xl border p-4"
          :class="ruleCardClass(r.result)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <div class="font-semibold text-slate-900">
                  {{ r.rule_id }}
                </div>

                <div
                  class="text-[11px] px-2 py-[2px] rounded border"
                  :class="severityColor(r.severity)"
                >
                  {{ r.severity }}
                </div>
              </div>

              <!-- 🔴 enterprise finance explain -->
              <div class="text-[14px] text-slate-700 leading-relaxed">
                {{ financeExplain(r) }}
              </div>

              <!-- calc -->
              <div
                v-if="r.calculation"
                class="mt-3 flex flex-wrap gap-2 text-xs"
              >
                <div class="px-2 py-1 rounded bg-white border text-slate-600">
                  Actual: <span class="font-semibold">{{ formatValue(r.calculation.actual) }}</span>
                </div>
                <div class="px-2 py-1 rounded bg-white border text-slate-600">
                  Expected: <span class="font-semibold">{{ formatValue(r.calculation.expected) }}</span>
                </div>
                <div class="px-2 py-1 rounded bg-white border text-slate-600">
                  Rule:
                  <span class="font-semibold">
                    {{
                      buildNumericExplain(r, activeGroup) ||
                      calcLabel(r.calculation)
                    }}
                  </span>
                </div>
              </div>
            </div>

            <div class="text-rose-500 font-bold text-lg">!</div>
          </div>
        </div>
      </div>
    </div>

    <!-- PASSED -->
    <div v-if="passedRules.length" class="mt-6">
      <div class="text-xs font-semibold text-slate-500 mb-2">
        Passed checks
      </div>

      <div class="space-y-2">
        <div
          v-for="r in passedRules"
          :key="r.rule_id"
          class="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="font-medium text-slate-800">
                {{ r.rule_id }}
              </div>

              <div
                class="text-[11px] px-2 py-[2px] rounded border"
                :class="severityColor(r.severity)"
              >
                {{ r.severity }}
              </div>
            </div>

            <div class="text-emerald-600 text-sm font-semibold">
              OK
            </div>
          </div>

          <div class="text-xs text-slate-600 mt-1">
            {{ r.explanation }}
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
