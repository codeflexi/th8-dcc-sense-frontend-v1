<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import DecisionWhyPanel from './components/DecisionWhyPanel.vue'
import DecisionEvidencePanel from './components/EvidenceCard.vue'


const props = defineProps<{ caseId: string }>()

const store = useDecisionRunStore()

watch(
  () => props.caseId,
  (id) => {
    if (!id) return
    store.loadCase(id)
  },
  { immediate: true }
)

/* ===============================
 * Derived KPIs (จาก groups)
 * =============================== */
const totalAmount = computed(() => {
  const list = store.groups || []
  return list.reduce((sum, g) => sum + (g?.sku?.total_price?.value || 0), 0)
})

const currency = computed(() => {
  const first = store.groups?.[0]
  return first?.sku?.total_price?.currency || first?.sku?.unit_price?.currency || 'THB'
})

const itemsToReview = computed(() => {
  return (store.groups || []).filter(g => String(g.decision).toUpperCase() === 'REVIEW').length
})

// const overallRisk = computed(() => {
//   const list = store.groups || []
//   const hasHigh = list.some(g => String(g.risk_level).toUpperCase() === 'HIGH' || String(g.risk_level).toUpperCase() === 'CRITICAL')
//   const hasMed = list.some(g => String(g.risk_level).toUpperCase() === 'MEDIUM')
//   return hasHigh ? 'HIGH' : hasMed ? 'MEDIUM' : 'LOW'
// })

const overallRisk = computed(() => {
  const levels = (store.groups || []).map(g =>
    String(g.risk_level || '').toUpperCase()
  )

  if (levels.some(l => l === 'CRITICAL' || l === 'HIGH')) return 'HIGH'
  if (levels.some(l => l === 'MEDIUM' || l === 'MED')) return 'MEDIUM'
  return 'LOW'
})


const recommendation = computed(() => {
  // CFO: ถ้ามี REVIEW อย่างน้อย 1 → REVIEW
  return itemsToReview.value > 0 ? 'REVIEW' : 'PASS'
})

const confidence = computed(() => {
  // ใช้ค่า confidence ของ activeGroup เป็นหลัก ถ้าไม่มีให้เฉลี่ยแบบง่าย
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

const failedRules = computed(() =>
  (store.activeRules || []).filter(r => String(r.result).toUpperCase() === 'FAIL')
)

const passedRules = computed(() =>
  (store.activeRules || []).filter(r => String(r.result).toUpperCase() === 'PASS')
)



const hasBlockingIssues = computed(() => failedRules.value.length > 0)



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

function variancePct(po?: number, baseline?: number) {
  const a = Number(po || 0)
  const b = Number(baseline || 0)
  if (!b) return null
  return ((a - b) / b) * 100
}
</script>

<template>
  <div class="min-h-[calc(100vh-160px)] bg-slate-50">
    <div class="max-w-7xl mx-auto px-6 py-6 pb-28">

      <!-- ================= KPI STRIP (CFO) ================= -->


      
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">

        <!-- OVERALL CASE RISK -->
<div
  class="md:col-span-2 rounded-xl p-4 shadow-sm border-2"
  :class="
    caseHeader.risk === 'HIGH'
      ? 'bg-rose-50 border-rose-200'
      : caseHeader.risk === 'MEDIUM'
      ? 'bg-amber-50 border-amber-200'
      : 'bg-emerald-50 border-emerald-200'
  "
>
  <div class="flex items-start justify-between">
    <div>
      <div class="text-[11px] font-bold uppercase tracking-wider"
        :class="
          caseHeader.risk === 'HIGH'
            ? 'text-rose-700'
            : caseHeader.risk === 'MEDIUM'
            ? 'text-amber-700'
            : 'text-emerald-700'
        "
      >
        Overall Case Risk
      </div>

      <div class="mt-2 flex items-center gap-2">
        <span
          class="px-3 py-1.5 rounded-full text-xs font-extrabold border"
          :class="riskBadge(caseHeader.risk)"
        >
          {{ caseHeader.risk }}
        </span>

        <span class="text-sm font-bold text-slate-800">
          {{ caseHeader.message }}
        </span>
      </div>

      <div class="mt-2 text-xs"
        :class="
          caseHeader.autoApprovable
            ? 'text-emerald-700'
            : 'text-rose-700'
        "
      >
        {{ caseHeader.autoApprovable
          ? 'This case can be auto-approved'
          : 'This case cannot be auto-approved'
        }}
      </div>
    </div>

    <div
      class="h-9 w-9 rounded-lg flex items-center justify-center font-black"
      :class="
        caseHeader.risk === 'HIGH'
          ? 'bg-rose-600 text-white'
          : caseHeader.risk === 'MEDIUM'
          ? 'bg-amber-500 text-white'
          : 'bg-emerald-600 text-white'
      "
    >
      !
    </div>
  </div>
</div>

        <div class=" md:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Amount</div>
          <div class="mt-1 text-2xl font-extrabold font-mono text-slate-900">{{ fmt(totalAmount) }}</div>
          <div class="text-xs text-slate-400 font-bold">{{ currency }}</div>
        </div>

        <div class=" md:col-span-1bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Recommendation</div>
          <div class="mt-1 text-2xl font-extrabold" :class="recommendation === 'REVIEW' ? 'text-rose-600' : 'text-emerald-700'">
            {{ recommendation }}
          </div>
          <div class="text-xs text-slate-500">CFO exception-first view</div>
        </div>

        <div class="md:col-span-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confidence</div>
          <div class="mt-1 text-2xl font-extrabold font-mono text-slate-900">{{ confidence }}%</div>
          <div class="text-xs text-slate-500">Evidence-backed</div>
        </div>

        <!-- <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Items to Review</div>
          <div class="mt-1 text-2xl font-extrabold font-mono text-slate-900">{{ itemsToReview }}</div>
          <div class="text-xs text-slate-500">out of {{ store.groups?.length || 0 }} line items</div>
        </div> -->
      </div>

      <!-- ================= MAIN GRID ================= -->
      <div class="grid grid-cols-12 gap-6">

        <!-- =========================================================
            LEFT: LINE ITEMS (CFO Table)
        ========================================================== -->
        <div class="col-span-12 lg:col-span-7">
          <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div class="text-sm font-extrabold text-slate-900">Line Items</div>
                <div class="text-xs text-slate-500 mt-0.5">Sorted by risk (highest first)</div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-500">Risk:</span>
                <span class="px-2.5 py-1 rounded-full text-xs font-bold border bg-white text-slate-600 border-slate-200">
                  {{ overallRisk }}
                </span>
              </div>
            </div>

            <div v-if="store.loadingGroups" class="p-10 text-center text-sm text-slate-500">
              Loading groups…
            </div>

           <!-- CARD LIST VERSION -->
<div v-else class="space-y-5 p-6">
  <div
    v-for="g in store.groups || []"
    :key="g.group_id"
    @click="store.selectGroup(g.group_id)"
    class="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer transition shadow-sm hover:shadow-md"
    :class="store.activeGroupId === g.group_id ? 'ring-8 ring-brand-500 border-brand-200' : ''"
  >
    <div class="flex items-start justify-between gap-4">

      <!-- LEFT -->
      <div class="min-w-0 flex-1">

        <!-- title -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-extrabold text-slate-900 truncate">
              {{ g?.sku?.item_name || g?.sku?.name || '—' }}
            </div>

            <div class="text-xs text-slate-500 mt-0.5">
              SKU <span class="font-mono">{{ g?.sku?.sku || '—' }}</span>
              <span class="mx-2 text-slate-300">•</span>
              Qty {{ g?.sku?.quantity ?? '—' }}
              <span v-if="g?.sku?.source_line_ref">
                <span class="mx-2 text-slate-300">•</span>
                line {{ g.sku.source_line_ref }}
              </span>
            </div>
          </div>

          <!-- selected badge -->
          <div
            v-if="store.activeGroupId === g.group_id"
            class="w-7 h-7 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center font-bold text-brand-700"
          >
            ✓
          </div>
        </div>

        <!-- badges -->
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="px-2 py-0.5 rounded border text-[11px] font-bold"
            :class="riskBadge(g.risk_level)">
            {{ String(g.risk_level || '—').toUpperCase() }}
          </span>

          <span class="px-2 py-0.5 rounded border text-[11px] font-bold"
            :class="decisionBadge(g.decision)">
            {{ String(g.decision || '—').toUpperCase() }}
          </span>
        </div>

        <!-- price row -->
        <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">

          <!-- po unit -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div class="text-[10px] font-bold uppercase text-slate-400">PO Unit</div>
            <div class="font-mono font-extrabold text-slate-900 mt-1">
              {{ fmt(g?.sku?.unit_price?.value || 0) }}
            </div>
          </div>

          <!-- baseline -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div class="text-[10px] font-bold uppercase text-slate-400">Baseline</div>
            <div class="font-mono font-extrabold text-slate-900 mt-1">
              {{ fmt(g?.baseline?.value || 0) }}
            </div>
          </div>

          <!-- variance -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div class="text-[10px] font-bold uppercase text-slate-400">Variance</div>

            <template v-if="variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) !== null">
              <div
                class="font-mono font-extrabold mt-1"
                :class="(variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'"
              >
                {{ (variancePct(g?.sku?.unit_price?.value, g?.baseline?.value) || 0).toFixed(2) }}%
              </div>
            </template>
            <template v-else>
              <div class="text-slate-400 font-bold mt-1">—</div>
            </template>

            <div class="text-[10px] text-slate-400 mt-0.5">baseline compare</div>
          </div>

          <!-- decision -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-center items-start">
            <div class="text-[10px] font-bold uppercase text-slate-400">Decision</div>
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold mt-1"
              :class="decisionBadge(g.decision)"
            >
              {{ String(g.decision || '—').toUpperCase() }}
            </span>
          </div>
        </div>
      </div>

      <!-- RIGHT ACTION -->
      <div class="flex flex-col justify-between items-end shrink-0 gap-3">
        <button
          class="px-4 py-2 rounded-lg text-xs font-bold transition"
          :class="store.activeGroupId === g.group_id
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'bg-white border border-slate-200 hover:bg-slate-50'"
          @click.stop="store.selectGroup(g.group_id); store.setRightTab('WHY')"
        >
          Open WHY
        </button>
      </div>
    </div>
  </div>

  <!-- empty -->
  <div v-if="!(store.groups || []).length" class="py-16 text-center text-sm text-slate-500">
    No groups found.
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
            class="px-5 py-2 rounded-lg border border-slate-200 text-sm font-bold hover:bg-slate-50"
            @click="store.submitDecision('REJECT')"
          >
            Reject
          </button>

          <button
            class="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
            @click="store.submitDecision('APPROVE')"
          >
            Approve
          </button>
        </div>
      </div>
    </div>

    <!-- ================= Evidence Modal ================= -->
    <div
      v-if="store.evidenceModalOpen"
      class="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-6"
      @click.self="store.closeEvidenceModal()"
    >
      <div class="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div class="text-sm font-extrabold text-slate-900">Evidence Pack</div>
            <div class="text-xs text-slate-500 mt-0.5">Group: <span class="font-mono">{{ store.activeGroupId }}</span></div>
          </div>
          <button class="text-sm text-slate-500 hover:text-slate-900" @click="store.closeEvidenceModal()">✕</button>
        </div>

        <div class="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Documents -->
          <div class="lg:col-span-4">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Documents</div>
            <div class="space-y-2">
              <button
                v-for="d in store.activeDocuments"
                :key="d.document_id"
                class="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50"
                @click="store.openPdf(d.document_id, 1)"
              >
                <div class="text-sm font-bold text-slate-900 truncate">{{ d.file_name }}</div>
                <div class="text-[11px] text-slate-500 font-mono mt-1">{{ d.document_id }}</div>
              </button>

              <div v-if="!store.activeDocuments.length" class="p-4 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                No documents
              </div>
            </div>
          </div>

          <!-- Evidences -->
          <div class="lg:col-span-8">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Evidences</div>
            <div class="space-y-3">
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
