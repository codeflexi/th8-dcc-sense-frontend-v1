<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import DecisionWhyPanel from './components/DecisionWhyPanel.vue'
import DecisionEvidencePanel from './components/EvidenceCard.vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ caseId: string }>()

const route = useRoute()
const store = useDecisionRunStore()

const caseId = computed(() => String(route.params.caseId || ''))
// watch(
//   () => props.caseId,
//   (id) => {
//     if (!id) return
//     store.loadCase(id)
//   },
//   { immediate: true }
// )

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
  if (!list.length) return 'LOW'

  // score-based (stable): CRITICAL > HIGH > MEDIUM > LOW
  const score = (x: string) => (x === 'CRITICAL' ? 4 : x === 'HIGH' ? 3 : x === 'MEDIUM' || x === 'MED' ? 2 : x === 'LOW' ? 1 : 0)
  const max = Math.max(...list.map(g => score(String(g.risk_level || '').toUpperCase())))
  return max === 4 ? 'CRITICAL' : max === 3 ? 'HIGH' : max === 2 ? 'MEDIUM' : 'LOW'
})

const overallDecision = computed(() => {
  const list = store.groups || []
  if (!list.length) return '—'

  // CFO view: if any REVIEW => REVIEW else PASS
  const hasReview = list.some(g => String(g.decision).toUpperCase() === 'REVIEW')
  return hasReview ? 'REVIEW' : 'PASS'
})

const overallConfidence = computed(() => {
  // Use active group confidence if available, else avg
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
    autoApprovable: risk === 'LOW' && reviewCount === 0,
    message:
      reviewCount > 0
        ? `${reviewCount} line item requires manual review`
        : 'No exception detected'
  }
})

const firstGroup = computed(() => store.groups?.[0] || null)

const vendorName = computed(() => {
  const g:any = firstGroup.value
  return g?.raw_trace?.inputs?.vendor_name
    || g?.raw_trace?.explainability?.vendor
    || 'Unknown vendor'
})

const poNumber = computed(() => {
  const g:any = firstGroup.value
  return g?.raw_trace?.inputs?.po_number
    || g?.raw_trace?.inputs?.po_no
    || null
})

const invoiceNumber = computed(() => {
  const g:any = firstGroup.value
  return g?.raw_trace?.inputs?.invoice_number
    || g?.raw_trace?.inputs?.inv_no
    || null
})

const displayDoc = computed(()=>{
  if(invoiceNumber.value) return `Invoice ${invoiceNumber.value}`
  if(poNumber.value) return `PO ${poNumber.value}`
  return `Case ${caseId.value}`
})

/* ===============================
 * UI Helpers
 * =============================== */
const fmt = (n: number) => new Intl.NumberFormat('th-TH').format(n || 0)

function riskBadge(level?: string) {
  const x = String(level || '').toUpperCase()
  if (x === 'CRITICAL') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (x === 'HIGH') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (x === 'MEDIUM' || x === 'MED') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (x === 'LOW') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function decisionBadge(decision?: string) {
  const x = String(decision || '').toUpperCase()
  if (x === 'REVIEW') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (x === 'PASS') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function severityBadge(sev?: string) {
  const x = String(sev || '').toUpperCase()
  if (x === 'HIGH') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (x === 'MED' || x === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function ruleCardClass(result?: string) {
  const x = String(result || '').toUpperCase()

  if (x === 'FAIL') {
    return 'border-rose-300 bg-rose-50/40'
  }

  if (x === 'PASS') {
    return 'border-emerald-200 bg-emerald-50/40'
  }

  return 'border-slate-200 bg-white'
}

function variancePct(po?: number, baseline?: number) {
  const a = Number(po || 0)
  const b = Number(baseline || 0)
  if (!b) return null
  return ((a - b) / b) * 100
}

const failedRules = computed(() =>
  (store.activeRules || []).filter(r => String(r.result).toUpperCase() === 'FAIL')
)

const passedRules = computed(() =>
  (store.activeRules || []).filter(r => String(r.result).toUpperCase() === 'PASS')
)

const hasBlockingIssues = computed(() => failedRules.value.length > 0)
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
        <!-- ⭐ document number -->
        <div class="text-2xl font-extrabold text-slate-900">
          {{ displayDoc }}
        </div>

        <!-- ⭐ vendor -->
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
                :class="riskBadge(caseHeader.risk)"
              >
                {{ String(caseHeader.risk).toUpperCase() }} RISK
              </span>

              <span class="text-slate-400">•</span>

              <span class="text-slate-600">
                {{ caseHeader.message }} 
              </span>

              <span class="text-slate-400">•</span>

              <span class="text-slate-600">
                Total {{ fmt(totalAmount) }} {{ currency }}
              </span>

              <span class="text-slate-400">•</span>

              <span class="text-slate-600">
                Confidence {{ overallConfidence }}%
              </span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold hover:bg-slate-50"
              @click="store.openEvidenceModal()"
            >
              Open Evidence ({{ store.activeEvidences.length }})
            </button>

            <button
              class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
              :class="hasBlockingIssues ? 'bg-amber-600 hover:bg-amber-500' : ''"
              @click="store.submitDecision('APPROVE')"
            >
              Approve
            </button>

            <button
              class="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold hover:bg-slate-50"
              @click="store.submitDecision('REJECT')"
            >
              Reject
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ================= MAIN ================= -->
    <div class="max-w-7xl mx-auto px-6 py-6 pb-28">

      <div class="grid grid-cols-12 gap-6">

        <!-- =========================================================
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
                <div class="col-span-2 text-right">Order Unit</div>
                <div class="col-span-2 text-right">Baseline</div>
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
                    <div
                      class="mt-1 h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
                      :class="String(g.decision || '').toUpperCase() === 'PASS'
                        ? 'bg-emerald-600'
                        : ['HIGH','CRITICAL'].includes(String(g.risk_level || '').toUpperCase())
                          ? 'bg-rose-600'
                          : 'bg-amber-500'"
                      aria-hidden="true"
                    >
                      <span v-if="String(g.decision || '').toUpperCase() === 'PASS'">✓</span>
                      <span v-else>!</span>
                    </div>

                    <div class="min-w-0 flex-1">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div class="font-semibold text-slate-900 truncate">
                            {{ g?.sku?.item_name || g?.sku?.name || '—' }}
                          </div>

                          <div class="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                            <span class="font-mono">SKU {{ g?.sku?.sku || '—' }}</span>
                            <span class="text-slate-300">•</span>
                            <span>Qty {{ g?.sku?.quantity ?? '—' }}</span>

                            <span v-if="g?.sku?.source_line_ref">
                              <span class="text-slate-300">•</span>
                              line {{ g.sku.source_line_ref }}
                            </span>

                            <span
                              class="ml-1 px-2 py-0.5 rounded border text-[10px] font-bold"
                              :class="riskBadge(g.risk_level)"
                            >
                              {{ String(g.risk_level || '—').toUpperCase() }}
                            </span>

                            <span
                              v-if="g?.confidence != null"
                              class="px-2 py-0.5 rounded border text-[10px] font-bold bg-white text-slate-600 border-slate-200"
                              title="Model confidence"
                            >
                              {{ Math.round((g.confidence || 0) * 100) }}%
                            </span>
                          </div>

                          <!-- micro compare bar (visual PO vs baseline delta) -->
                          <div v-if="g?.sku && g?.baseline" class="mt-2 h-1.5 w-44 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              class="h-1.5"
                              :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 3
                                ? 'bg-rose-400'
                                : 'bg-slate-300'"
                              :style="{
                                width:
                                  Math.min(
                                    Math.abs(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0),
                                    100
                                  ) + '%'
                              }"
                            />
                          </div>
                        </div>

                        <!-- keep behavior: quick open WHY (not required) -->
                        <button
                          class="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-extrabold border transition"
                          :class="store.activeGroupId === g.group_id
                            ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
                          @click.stop="store.selectGroup(g.group_id); store.setRightTab('WHY')"
                        >
                          WHY
                        </button>
                      </div>

                      <!-- subtle hint when exception -->
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

                  <!-- PO UNIT -->
                  <div class="col-span-2 text-right">
                    <div class="font-mono font-semibold text-slate-900">
                      {{ fmt(g?.sku ? (g?.sku?.unit_price?.value || 0) : 0) }}
                    </div>
                    <div class="text-[10px] text-slate-400">
                      {{ (g?.sku?.unit_price?.currency || currency) }}
                    </div>
                  </div>

                  <!-- BASELINE -->
                  <div class="col-span-2 text-right">
                    <div class="font-mono font-semibold text-slate-900">
                      {{ fmt(g?.baseline?.value || 0) }}
                    </div>
                    <div class="text-[10px] text-slate-400">
                      {{ g?.baseline?.currency || currency }}
                    </div>
                  </div>

                  <!-- VARIANCE (primary signal) -->
                  <div class="col-span-2 text-right">
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
                      <div class="text-[10px] text-slate-300 mt-0.5">n/a</div>
                    </template>
                  </div>

                  <!-- WHY shortcut (kept for behavior) -->
                  <div class="col-span-1 text-right flex items-center justify-end">
                    <span
                      class="px-2 py-1 rounded-lg border text-[11px] font-extrabold"
                      :class="decisionBadge(g.decision)"
                    >
                      {{ String(g.decision || '—').toUpperCase() }}
                    </span>
                  </div>

                </div>
              </div>

            </div>

            <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div class="text-xs text-slate-500">CFO view: focus on exception first</div>
              <button class="text-xs font-bold text-slate-600 hover:text-slate-900">
                Export summary
              </button>
            </div>

          </div>
        </div>

        <!-- =========================================================
            RIGHT: WHY + EVIDENCE (tabs)
        ========================================================== -->
        <div class="col-span-12 lg:col-span-5 space-y-4">

          <!-- ================= DRILLDOWN PANEL ================= -->
          <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white">

            <!-- ================= TAB STRIP ================= -->
            <div class="flex items-center gap-1 px-2 pt-2 bg-slate-50 border-b border-slate-200">
              <button
                @click="store.setRightTab('WHY')"
                class="px-4 py-2 text-xs font-extrabold rounded-t-lg transition"
                :class="store.rightTab === 'WHY'
                  ? 'bg-white text-slate-900 border border-slate-200 border-b-white'
                  : 'text-slate-500 hover:text-slate-800'"
              >
                WHY
              </button>

              <button
                @click="store.setRightTab('EVIDENCE')"
                class="px-4 py-2 text-xs font-extrabold rounded-t-lg flex items-center gap-2 transition"
                :class="store.rightTab === 'EVIDENCE'
                  ? 'bg-white text-slate-900 border border-slate-200 border-b-white'
                  : 'text-slate-500 hover:text-slate-800'"
              >
                Evidence
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                  {{ store.activeEvidences.length }}
                </span>
              </button>
            </div>

            <!-- ================= CONTENT ================= -->
            <div class="p-5 space-y-4">

              <!-- ================= WHY TAB ================= -->
              <template v-if="store.rightTab === 'WHY'">
                <DecisionWhyPanel />
              </template>

              <!-- ================= EVIDENCE TAB ================= -->
              <template v-else>
                <!-- ไม่มี evidence -->
                <div
                  v-if="!store.activeEvidences.length"
                  class="p-6 text-center text-sm text-slate-500"
                >
                  No evidence for this group.
                </div>

                <!-- มี evidence -->
                <DecisionEvidencePanel
                  v-for="ev in store.activeEvidences"
                  :key="ev.evidence_id"
                  :evidence="ev"
                  :document="store.activeDocuments.find(d => d.document_id === ev.document_id)"
                />
              </template>

            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- ================= CFO DECISION BAR (sticky) ================= -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
      <div class="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="text-sm text-slate-600">
          <span class="font-bold text-slate-900">Decision</span>
          <span class="text-slate-400">·</span>
          ต้องมีเหตุผลประกอบสำหรับเคสที่เป็น
          <span class="font-bold text-rose-600">REVIEW</span>
        </div>

        <div class="flex items-center gap-3 justify-end">
          <input
            v-model="store.decisionNote"
            class="w-80 max-w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
            placeholder="Enter approval / rejection note..."
          />

          <button
            class="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
            @click="store.submitDecision('APPROVE')"
          >
            Approve
          </button>

          <button
            class="px-5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold hover:bg-slate-50"
            @click="store.submitDecision('REJECT')"
          >
            Reject
          </button>
        </div>
      </div>
    </div>

    <!-- ================= EVIDENCE MODAL ================= -->
    <div
      v-if="store.evidenceModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      @click.self="store.closeEvidenceModal()"
    >
      <div class="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-extrabold text-slate-900 truncate">Evidence Pack</div>
            <div class="text-xs text-slate-500 font-mono mt-0.5 truncate">
              group {{ store.activeGroupId }} · evidences {{ store.activeEvidences.length }}
            </div>
          </div>

          <button class="text-sm text-slate-500 hover:text-slate-900" @click="store.closeEvidenceModal()">✕</button>
        </div>

        <div class="p-6 max-h-[70vh] overflow-y-auto">
          <div class="space-y-4">
            <div
              v-for="ev in store.activeEvidences"
              :key="ev.evidence_id"
              class="border border-slate-200 rounded-2xl p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-sm font-extrabold text-slate-900">
                    {{ store.activeDocuments.find(d => d.document_id === ev.document_id)?.file_name || ev.document_id }}
                  </div>
                  <div class="text-xs text-slate-500 font-mono mt-1">
                    anchor {{ ev.anchor_type }} · {{ ev.extraction_method || '—' }}
                    · confidence {{ ev.confidence ?? '—' }}
                  </div>
                </div>

                <button
                  class="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  @click="store.openPdf(ev.document_id, ev.source_page ?? (ev.price_items?.[0]?.page_number ?? 1))"
                >
                  View PDF
                </button>
              </div>

              <div v-if="ev.source_snippet" class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-xs text-slate-700">
                {{ ev.source_snippet }}
              </div>

              <div v-if="ev.price_items?.length" class="mt-3">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Matched price items</div>

                <div class="space-y-2">
                  <div
                    v-for="pi in ev.price_items"
                    :key="pi.price_item_id"
                    class="border border-slate-200 rounded-xl p-3"
                  >
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="text-sm font-bold text-slate-900 truncate">
                          {{ pi.sku || '—' }} · {{ pi.item_name || '—' }}
                        </div>
                        <div class="text-xs text-slate-500 font-mono mt-1">
                          page {{ pi.page_number ?? '—' }} · {{ pi.currency || 'THB' }}
                        </div>
                      </div>

                      <button
                        class="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50"
                        @click="store.openPdf(pi.document_id, pi.page_number ?? 1)"
                      >
                        Open page
                      </button>
                    </div>

                    <div v-if="pi.snippet" class="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-xs text-slate-700">
                      {{ pi.snippet }}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div v-if="!store.activeEvidences.length" class="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
              No evidences
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button class="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold hover:bg-slate-50" @click="store.closeEvidenceModal()">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- ================= PDF Modal Viewer ================= -->
    <div
      v-if="store.pdfModalOpen"
      class="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
      @click.self="store.closePdf()"
    >
      <div class="w-full max-w-6xl h-[85vh] bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="min-w-0">
            <div class="text-sm font-extrabold text-slate-900 truncate">PDF Viewer</div>
            <div class="text-xs text-slate-500 font-mono mt-0.5 truncate">
              doc {{ store.pdfDocumentId }} · page {{ store.pdfPage }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50"
              @click="store.gotoPdfPage(Math.max(1, store.pdfPage - 1))"
            >
              Prev
            </button>

            <button
              class="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold hover:bg-slate-50"
              @click="store.gotoPdfPage(store.pdfPage + 1)"
            >
              Next
            </button>

            <button class="text-sm text-slate-500 hover:text-slate-900 ml-2" @click="store.closePdf()">✕</button>
          </div>
        </div>

        <div class="flex-1 bg-slate-50">
          <iframe
            v-if="store.pdfUrl"
            :src="store.pdfUrl"
            class="w-full h-full"
            frameborder="0"
          />
          <div v-else class="h-full flex items-center justify-center text-sm text-slate-500">
            No PDF URL
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
