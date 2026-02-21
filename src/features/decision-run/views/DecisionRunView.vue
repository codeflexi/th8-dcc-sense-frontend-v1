<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import DecisionWhyPanel from './components/DecisionWhyPanel.vue'
import DecisionEvidencePanel from './components/EvidenceCard.vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ caseId: string }>()

const route = useRoute()
const store = useDecisionRunStore()

const caseId = computed(() => String(route.params.caseId || ''))

watch(caseId, (id) => {
  if (!id) return
  store.loadCase(id)
}, { immediate: true })


/* ===============================
 * Derived KPIs (จาก groups)
 * =============================== */
const totalAmount = computed(() => {
  const list = store.groups || []
  return list.reduce((sum, g) => sum + (g?.sku?.total_price?.value || 0), 0)
})

const currency = computed(() => {
  const first = store.groups?.[0]
  return first?.sku?.total_price?.currency || first?.sku?.unit_price?.currency || first?.baseline?.currency || 'THB'
})

const itemsToReview = computed(() => {
  return (store.groups || []).filter(g => String(g.decision).toUpperCase() === 'REVIEW').length
})

const overallRisk = computed(() => {
  const list = store.groups || []
  if (!list.length) return '—'
  const max = Math.max(...list.map(g => (
    String(g.risk_level).toUpperCase() === 'CRITICAL' ? 4 :
    String(g.risk_level).toUpperCase() === 'HIGH' ? 3 :
    (String(g.risk_level).toUpperCase() === 'MEDIUM' || String(g.risk_level).toUpperCase() === 'MED') ? 2 :
    String(g.risk_level).toUpperCase() === 'LOW' ? 1 : 0
  )))
  return max === 4 ? 'CRITICAL' : max === 3 ? 'HIGH' : max === 2 ? 'MEDIUM' : 'LOW'
})

const overallDecision = computed(() => {
  const list = store.groups || []
  if (!list.length) return '—'
  const hasReview = list.some(g => String(g.decision).toUpperCase() === 'REVIEW')
  return hasReview ? 'REVIEW' : 'PASS'
})

const overallConfidence = computed(() => {
  if (store.activeGroup?.confidence != null) return Math.round((store.activeGroup.confidence || 0) * 100)
  const list = store.groups || []
  if (!list.length) return 0
  const avg = list.reduce((s, g) => s + (g.confidence || 0), 0) / list.length
  return Math.round(avg * 100)
})

const caseHeader = computed(() => {
  const risk = overallRisk.value
  const reviewCount = itemsToReview.value

  return {
    risk,
    reviewCount,
    autoApprovable: risk === 'LOW' && reviewCount === 0
  }
})

const pdfViewer = computed(() => store.pdfViewer)

/* ===============================
 * Display helpers
 * =============================== */
const displayDoc = computed(() => {
  return `Case ${caseId.value}`
})

const vendorName = computed(() => {
  return 'Unknown vendor'
})

/* ===============================
 * UI Helpers
 * =============================== */
const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n || 0)
const fmtPct2 = (n: any) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return `${v.toFixed(2)}%`
}

function groupPriceContext(g: any): string {
  return String(g?.raw_trace?.price?.context || (g?.baseline ? 'BASELINE' : ''))
}

const is3WayMode = computed(() => {
  return (store.groups || []).some((g: any) => groupPriceContext(g) === '3WAY_MATCH')
})

function is3WayGroup(g: any) {
  return groupPriceContext(g) === '3WAY_MATCH'
}

function getQtyText(g: any) {
  if (!is3WayGroup(g)) return `Qty ${g?.sku?.quantity ?? '—'}`
  const q = g?.raw_trace?.quantity || {}
  const po = q?.po ?? '—'
  const gr = q?.gr ?? '—'
  const inv = q?.inv ?? '—'
  return `PO ${po} • GR ${gr} • INV ${inv}`
}

function getPoUnit(g: any) {
  return Number(g?.raw_trace?.price?.po_unit ?? 0)
}

function getInvUnit(g: any) {
  return Number(g?.raw_trace?.price?.inv_unit ?? 0)
}

function get3WayVariancePct(g: any) {
  return g?.raw_trace?.price?.variance_pct
}

function get3WayVarianceAbs(g: any) {
  return g?.raw_trace?.price?.variance_abs
}

function isWithinTolerance(g: any): boolean | null {
  const v = g?.raw_trace?.price?.within_tolerance
  return typeof v === 'boolean' ? v : null
}

function riskBadge(level?: string) {
  const x = String(level || '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (x === 'MEDIUM' || x === 'MED') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function decisionBadge(decision?: string) {
  const x = String(decision || '').toUpperCase()
  if (x === 'REJECT' || x === 'FAIL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'REVIEW') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function severityBadge(sev?: string) {
  const x = String(sev || '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (x === 'HIGH') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (x === 'MEDIUM' || x === 'MED') return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function ruleCardClass(result?: string) {
  const x = String(result || '').toUpperCase()
  if (x === 'FAIL') return 'border-rose-200 bg-rose-50/40'
  if (x === 'PASS') return 'border-emerald-200 bg-emerald-50/40'
  return 'border-slate-200 bg-white'
}

function variancePct(orderUnit?: number, baselineUnit?: number) {
  const o = Number(orderUnit)
  const b = Number(baselineUnit)
  if (!Number.isFinite(o) || !Number.isFinite(b) || b === 0) return null
  return ((o - b) / b) * 100
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">

    <!-- ================= HEADER ================= -->
    <div class="border-b border-slate-200 bg-white">
      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

          <div class="min-w-0">
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              TH8 Sense · Decision Run
            </div>

            <div class="mt-1 text-2xl font-black text-slate-900">
              <div>
                <div class="text-2xl font-extrabold text-slate-900">
                  {{ displayDoc }}
                </div>

                <div class="text-sm text-slate-600 mt-1">
                  {{ vendorName }}
                </div>
              </div>
            </div>

            <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                class="px-3 py-1 rounded-full border text-xs font-extrabold"
                :class="decisionBadge(overallDecision)"
              >
                {{ String(overallDecision).toUpperCase() }}
              </span>

              <span
                class="px-3 py-1 rounded-full border text-xs font-extrabold"
                :class="riskBadge(overallRisk)"
              >
                {{ String(overallRisk).toUpperCase() }} RISK
              </span>

              <span class="text-slate-400">•</span>
              <span class="text-slate-700">
                {{ itemsToReview }} line item requires manual review
              </span>

              <span class="text-slate-400">•</span>
              <span class="text-slate-700">
                Total {{ fmt(totalAmount) }} {{ currency }}
              </span>

              <span class="text-slate-400">•</span>
              <span class="text-slate-700">
                Confidence {{ overallConfidence }}%
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50"
              @click="store.activeGroupId && store.selectGroup(store.activeGroupId, { openEvidence: true })"
            >
              Open Evidence ({{ store.activeEvidenceItems.length }})
            </button>

            <button class="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800">
              Approve
            </button>
            <button class="px-5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50">
              Reject
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ================= BODY ================= -->
    <div class="max-w-7xl mx-auto px-6 py-6">
      <div class="grid grid-cols-12 gap-6">

        <!-- ==========================================================
            LEFT: LINE ITEMS
        ========================================================== -->
        <div class="col-span-12 lg:col-span-7 space-y-4">

          <!-- ================= LIST ================= -->
          <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white">

            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div class="text-sm font-extrabold text-slate-900">Line Items</div>
                <div class="text-xs text-slate-500 mt-1">
                  Click an item to see WHY + Evidence
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">Groups</span>
                <span class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                  {{ store.groups.length }}
                </span>
              </div>
            </div>

            <div v-if="store.loadingGroups" class="p-6 text-center text-sm text-slate-500">
              Loading groups...
            </div>

            <div v-else>
              <!-- header row -->
              <div class="grid grid-cols-12 px-6 py-3 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <div class="col-span-5">Item</div>
                <div class="col-span-2 text-right">{{ is3WayMode ? 'PO Unit' : 'Order Unit' }}</div>
                <div class="col-span-2 text-right">{{ is3WayMode ? 'Inv Unit' : 'Baseline' }}</div>
                <div class="col-span-2 text-right">Variance</div>
                <div class="col-span-1 text-right">WHY</div>
              </div>

              <div class="divide-y divide-slate-100">
                <div
                  v-for="g in store.groups || []"
                  :key="g.group_id"
                  @click="store.selectGroup(g.group_id)"
                  class="grid grid-cols-12 px-6 py-4 cursor-pointer transition"
                  :class="[
                    store.activeGroupId === g.group_id ? 'bg-slate-100' : 'hover:bg-slate-50'
                  ]"
                >
                  <!-- ITEM -->
                  <div class="col-span-5 flex items-start gap-3 min-w-0">
                    <!-- compact status -->
                    <div class="mt-1">
                      <div
                        class="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
                        :class="String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'
                          ? 'bg-emerald-600'
                          : String(g.decision).toUpperCase() === 'REVIEW'
                            ? 'bg-amber-500'
                            : 'bg-rose-600'"
                      >
                        <span v-if="String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'">✓</span>
                        <span v-else>!</span>
                      </div>
                    </div>

                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <div class="font-extrabold text-slate-900 truncate">
                          {{ g?.sku?.item_name || 'Unknown item' }}
                        </div>
                        <span
                          class="text-[11px] px-2 py-[2px] rounded border"
                          :class="severityBadge(g.risk_level)"
                        >
                          {{ String(g.risk_level).toUpperCase() }}
                        </span>
                      </div>

                      <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                        <span class="font-mono">SKU {{ g?.sku?.sku || '—' }}</span>
                        <span class="text-slate-300">•</span>
                        <span>{{ getQtyText(g) }}</span>

                        <span v-if="g?.sku?.source_line_ref">
                          <span class="text-slate-300">•</span>
                          line {{ g.sku.source_line_ref }}
                        </span>
                      </div>

                      <!-- micro compare bar (procurement only) -->
                      <div v-if="g?.sku && g?.baseline" class="mt-2 h-1.5 w-44 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          class="h-1.5"
                          :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                            ? 'bg-rose-400'
                            : 'bg-slate-300'"
                          :style="{
                            width: Math.min(
                              Math.abs(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0),
                              100
                            ) + '%'
                          }"
                        />
                      </div>

                      <div
                        v-if="g?.sku && g?.baseline && String(g?.decision || '').toUpperCase() === 'REVIEW'"
                        class="mt-2 text-[11px]"
                        :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                          ? 'text-rose-700'
                          : 'text-amber-700'"
                      >
                        Exception: variance exceeds policy threshold. Review evidence on the right.
                      </div>
                    </div>
                  </div>

                  <!-- ORDER UNIT (Procurement) / PO UNIT (3WAY) -->
                  <div class="col-span-2 text-right">
                    <template v-if="is3WayGroup(g)">
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(getPoUnit(g) || 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ currency }}
                      </div>
                    </template>

                    <template v-else>
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(g?.sku ? (g?.sku?.unit_price?.value || 0) : 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ (g?.sku?.unit_price?.currency || currency) }}
                      </div>
                    </template>
                  </div>

                  <!-- BASELINE (Procurement) / INV UNIT (3WAY) -->
                  <div class="col-span-2 text-right">
                    <template v-if="is3WayGroup(g)">
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(getInvUnit(g) || 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ currency }}
                      </div>
                    </template>

                    <template v-else>
                      <div class="font-mono font-semibold text-slate-900">
                        {{ fmt(g?.baseline?.value || 0) }}
                      </div>
                      <div class="text-[10px] text-slate-400">
                        {{ g?.baseline?.currency || currency }}
                      </div>
                    </template>
                  </div>

                  <!-- VARIANCE (primary signal) -->
                  <div class="col-span-2 text-right">
                    <template v-if="is3WayGroup(g)">
                      <div
                        class="font-mono font-semibold"
                        :class="isWithinTolerance(g) === false ? 'text-rose-700' : 'text-slate-900'"
                      >
                        {{ fmtPct2(get3WayVariancePct(g)) }}
                      </div>
                      <div
                        v-if="get3WayVarianceAbs(g) != null"
                        class="text-[10px] mt-0.5"
                        :class="isWithinTolerance(g) === false ? 'text-rose-600' : 'text-slate-400'"
                      >
                        {{ fmt(Number(get3WayVarianceAbs(g) || 0)) }} {{ currency }}
                      </div>
                      <div
                        class="text-[10px] mt-0.5"
                        :class="isWithinTolerance(g) === false ? 'text-rose-600' : 'text-emerald-700'"
                      >
                        {{ isWithinTolerance(g) === false ? 'Out of policy' : 'Within policy' }}
                      </div>
                    </template>

                    <template v-else>
                      <template v-if="g?.sku && g?.baseline && variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) !== null">
                        <div
                          class="font-mono font-semibold"
                          :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                            ? 'text-rose-700'
                            : 'text-slate-900'"
                        >
                          {{ (variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0).toFixed(2) }}%
                        </div>
                        <div
                          class="text-[10px] mt-0.5"
                          :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                            ? 'text-rose-600'
                            : 'text-slate-400'"
                        >
                          {{ (variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3 ? 'Out of policy' : 'Within policy' }}
                        </div>
                      </template>

                      <template v-else>
                        <div class="font-mono font-semibold text-slate-400">—</div>
                        <div class="text-[10px] text-slate-400">n/a</div>
                      </template>
                    </template>
                  </div>

                  <!-- WHY -->
                  <div class="col-span-1 text-right">
                    <button
                      class="px-3 py-1.5 rounded-xl text-xs font-extrabold border"
                      :class="store.activeGroupId === g.group_id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'"
                      @click.stop="store.selectGroup(g.group_id, { openEvidence: false })"
                    >
                      WHY
                    </button>

                    <div
                      class="mt-2 text-[11px] font-extrabold inline-flex px-2 py-1 rounded-lg border"
                      :class="String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'"
                    >
                      {{ String(g.decision).toUpperCase() === 'PASS' || String(g.decision).toUpperCase() === 'APPROVE' ? 'PASS' : 'REVIEW' }}
                    </div>
                  </div>

                </div>
              </div>

              <div class="px-6 py-4 text-xs text-slate-500 flex items-center justify-between border-t border-slate-100">
                <div>CFO view: focus on exception first</div>
                <button class="text-slate-700 font-semibold hover:underline">Export summary</button>
              </div>
            </div>

          </div>
        </div>

        <!-- ==========================================================
            RIGHT: WHY / EVIDENCE
        ========================================================== -->
        <div class="col-span-12 lg:col-span-5 space-y-4">
          <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div class="flex items-center gap-1 border-b border-slate-100 bg-slate-50">
              <button
                class="px-4 py-3 text-sm font-extrabold"
                :class="store.activeTab === 'WHY' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                @click="store.activeTab = 'WHY'"
              >
                WHY
              </button>
              <button
                class="px-4 py-3 text-sm font-extrabold"
                :class="store.activeTab === 'EVIDENCE' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'"
                @click="store.activeGroupId && store.selectGroup(store.activeGroupId, { openEvidence: true })"
              >
                Evidence
                <span class="ml-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-black">
                  {{ store.activeEvidenceItems.length }}
                </span>
              </button>
            </div>

            <div class="p-5">
              <DecisionWhyPanel v-if="store.activeTab === 'WHY'" />

              <template v-else>
                <div v-if="store.loadingEvidence" class="text-sm text-slate-500">
                  Loading evidence...
                </div>

                <div v-else-if="store.activeEvidenceItems.length === 0" class="text-sm text-slate-500">
                  No evidence available.
                </div>

                <div v-else class="space-y-3">
                  <DecisionEvidencePanel
                    v-for="ev in store.activeEvidenceItems"
                    :key="ev.evidence_id"
                    :evidence="ev"
                    :document="store.activeEvidenceDocs.find(d => d.document_id === ev.document_id)"
                   
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

      </div>
    </div>

 

  </div>
<!-- ================= PDF PREVIEW MODAL ================= -->
<div
  v-if="store.pdfViewerUrl"
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
  @click.self="store.closePdf()"
>
  <div class="bg-white w-[90vw] h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <div class="text-sm font-extrabold text-slate-800">
        Document Preview
      </div>
      <button
        class="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold hover:bg-slate-50"
        @click="store.closePdf()"
      >
        Close
      </button>
    </div>

    <div class="flex-1 bg-slate-100">
      <iframe
        :src="store.pdfViewerUrl"
        class="w-full h-full"
      />
    </div>
  </div>
</div>
</template>