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
 * PASS wording fix (UI-layer)
 * =============================== */

const PASS_LABEL_BY_RULE_ID: Record<string, string> = {
  // finance_ap
  'A-QTY-01': 'ยอดรับของไม่เกินยอด PO',
  'A-QTY-02': 'ยอดใบแจ้งหนี้ไม่เกินยอดรับของ (GRN)',
  'A-PROCESS-01': 'มี GRN รองรับใบแจ้งหนี้',
  'A-FRAUD-01': 'ไม่พบใบแจ้งหนี้ซ้ำ',

  // procurement (neutral fallback; procurement มักใช้ explanation เดิมอยู่แล้ว)
  'P-PRICE-01': 'ราคาอยู่ในเกณฑ์นโยบาย',
  'P-DOC-01': 'เอกสารจัดซื้อครบ',
}

function shortText(s: any, max = 140) {
  const x = String(s || '').trim()
  if (!x) return ''
  return x.length > max ? x.slice(0, max - 1) + '…' : x
}

function displayRuleMessage(r: any) {
  const result = String(r?.result || '').toUpperCase()
  const ruleId = String(r?.rule_id || '').trim()

  if (result === 'FAIL') {
    return shortText(r?.exec_message || r?.explanation || r?.audit_message || 'Issue detected')
  }

  // PASS: neutral wording
  const mapped = PASS_LABEL_BY_RULE_ID[ruleId]
  if (mapped) return mapped

  // fallback: use audit_message (less emotional than exec_message) or explanation
  return shortText(r?.audit_message || r?.explanation || 'OK')
}

/* ==========================================================
   ITEM HEADER (สำคัญ)
   ========================================================= */

const itemHeader = computed(() => {
  const g: any = activeGroup.value
  if (!g) return null

  const sku = g?.sku?.sku || '-'
  const name = g?.sku?.item_name || 'Unknown item'
  const uom = g?.sku?.uom || ''

  const is3Way = String(g?.raw_trace?.price?.context || '') === '3WAY_MATCH'
  const q = g?.raw_trace?.quantity || {}
  const qtyText = is3Way
    ? `PO ${q?.po ?? '-'} • GR ${q?.gr ?? '-'} • INV ${q?.inv ?? '-'}`
    : `Qty ${g?.sku?.quantity ?? 0} ${uom}`

  const total = g?.sku?.total_price?.value || 0
  const cur = g?.sku?.total_price?.currency || 'THB'

  return {
    sku,
    name,
    qtyText,
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
        • {{ itemHeader.qtyText }}
        • Total {{ Number(itemHeader.total).toLocaleString() }} {{ itemHeader.cur }}
      </div>
    </div>

    <!-- SUMMARY -->
    <div
      class="rounded-xl border p-4 mb-4"
      :class="hasBlockingIssues ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
            :class="hasBlockingIssues ? 'bg-rose-600' : 'bg-emerald-600'"
          >
            <span v-if="hasBlockingIssues">!</span>
            <span v-else>✓</span>
          </div>

          <div>
            <div class="font-extrabold text-slate-900">
              Blocking issues detected
            </div>
            <div class="text-sm text-slate-600 mt-1">
              This item requires review before approval due to financial or control exceptions.
            </div>
          </div>
        </div>

        <div class="text-right">
          <div class="text-xs text-slate-500">Rules</div>
          <div class="font-semibold text-slate-900 text-lg">
            {{ failedRules.length }}
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

              <div class="text-[14px] text-slate-700 leading-relaxed">
                {{ displayRuleMessage(r) }}
              </div>

              <!-- calc (FAIL เท่านั้น) -->
              <div
                v-if="String(r.result).toUpperCase() === 'FAIL' && r.calculation"
                class="mt-3 flex flex-wrap gap-2 text-xs"
              >
                <div class="px-2 py-1 rounded bg-white border text-slate-600">
                  Actual: <span class="font-semibold">{{ formatValue(r.calculation.actual) }}</span>
                </div>
                <div class="px-2 py-1 rounded bg-white border text-slate-600">
                  Expected: <span class="font-semibold">{{ formatValue(r.calculation.expected) }}</span>
                </div>
                <div class="px-2 py-1 rounded bg-white border text-slate-600">
                  Rule: <span class="font-semibold">{{ r.calculation.actual }} {{ r.calculation.operator }} {{ r.calculation.expected }}</span>
                </div>
              </div>
            </div>

            <div class="text-rose-600 font-black">!</div>
          </div>
        </div>
      </div>
    </div>

    <!-- PASSED -->
    <div v-if="passedRules.length" class="mt-6">
      <div class="text-xs font-semibold text-emerald-700 mb-2">
        Passed checks
      </div>

      <div class="space-y-3">
        <div
          v-for="r in passedRules"
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

              <div class="text-[14px] text-slate-700 leading-relaxed">
                {{ displayRuleMessage(r) }}
              </div>
            </div>

            <div class="text-emerald-700 font-black">OK</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>