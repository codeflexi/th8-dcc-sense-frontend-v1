<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useDecisionStore } from '../store'

/* =========================================================
 * Setup
 * =======================================================*/

const route = useRoute()
const store = useDecisionStore()

const {
  caseHeader,
  rules,
  groups,
  recommendation,
  confidenceScore,
  isProcessing,
} = storeToRefs(store)

/**
 * IMPORTANT
 * caseId must be computed (no snapshot)
 */
const caseId = computed(() => route.params.caseId as string | undefined)

/* =========================================================
 * Local State
 * =======================================================*/

const reason = ref('')
const expandedRuleIds = ref<Set<string>>(new Set())

/* =========================================================
 * Load Context — STORE OWNER ONLY
 * =======================================================*/

watch(
  caseId,
  (id, prev) => {
    if (!id) return
    if (id === prev) return

    // 🔴 เรียก store เท่านั้น ห้ามยิง API จาก view
    store.loadContext(id)
  },
  { immediate: true }
)

/* =========================================================
 * Computed
 * =======================================================*/

const header = computed(() => caseHeader.value ?? null)

const hitRules = computed(() =>
  (rules.value || []).filter((r:any) => r.hit)
)

const passedRules = computed(() =>
  (rules.value || []).filter((r:any) => !r.hit)
)

const riskLevel = computed(() => {
  if (!Array.isArray(groups.value) || !groups.value.length) return 'LOW'
  if (groups.value.some((g:any) => g.risk_level === 'HIGH')) return 'HIGH'
  if (groups.value.some((g:any) => g.risk_level === 'MEDIUM')) return 'MEDIUM'
  return 'LOW'
})

/* =========================================================
 * Helpers
 * =======================================================*/

const toggleRule = (id: string) => {
  expandedRuleIds.value.has(id)
    ? expandedRuleIds.value.delete(id)
    : expandedRuleIds.value.add(id)
}

const isRuleExpanded = (id: string) =>
  expandedRuleIds.value.has(id)

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('th-TH') : '-'

const formatAmount = (val?: number) => {
  if (val == null) return '0'
  return Number(val).toLocaleString('th-TH')
}

const getRecColor = (rec?: string | null) => {
  if (rec === 'APPROVE') return 'emerald'
  if (rec === 'REJECT') return 'rose'
  if (rec === 'ESCALATE') return 'amber'
  return 'indigo'
}

/* =========================================================
 * Actions
 * =======================================================*/

const handleRun = () => {
  store.runAnalysis()
}
</script>

<template>
  <div class="w-full bg-slate-50">
    <div class="max-w-7xl mx-auto px-6 py-8 pb-24 space-y-6">

      <!-- ================= Processing ================= -->
      <div
        v-if="isProcessing"
        class="flex flex-col items-center justify-center animate-pulse"
      >
        <div
          class="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4"
        />
        <p class="text-slate-500 font-medium">
          Running Decision Engine…
        </p>
      </div>

      <!-- ================= MAIN ================= -->
      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 animate-enter"
      >

        <!-- LEFT -->
        <div class="lg:col-span-8 space-y-6">

          <!-- Recommendation -->
          <div
            class="bg-white rounded-xl border p-6 shadow-sm relative overflow-hidden"
            :class="`border-${getRecColor(recommendation)}-100`"
          >
            <div
              class="absolute left-0 top-0 bottom-0 w-2"
              :class="`bg-${getRecColor(recommendation)}-500`"
            />

            <div class="flex justify-between items-start pl-2">
              <div>
                <h2
                  class="text-xs font-bold uppercase tracking-wider mb-1"
                  :class="`text-${getRecColor(recommendation)}-700`"
                >
                  AI Recommendation
                </h2>

                <div class="text-5xl font-extrabold mb-2">
                  {{ recommendation || '—' }}
                </div>

                <div class="flex items-center gap-4 mt-2">
                  <div class="text-xs px-2 py-1 rounded bg-slate-100 border font-mono">
                    Confidence: {{ confidenceScore ?? 0 }}%
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">
                  Risk Level
                </div>

                <div
                  class="text-2xl font-bold"
                  :class="
                    riskLevel === 'HIGH'
                      ? 'text-rose-600'
                      : riskLevel === 'MEDIUM'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  "
                >
                  {{ riskLevel }}
                </div>

                <button
                  @click="handleRun"
                  class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs font-bold"
                >
                  Re-run
                </button>
              </div>
            </div>
          </div>

          <!-- Case Snapshot -->
          <div class="bg-white rounded-xl border p-6 shadow-sm">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="font-bold text-slate-900">
                  {{ header?.entity_name || '—' }}
                </h3>

                <p class="text-sm text-slate-500 mt-1">
                  {{ header?.reference_id || caseId }} · {{ header?.domain || '—' }}
                </p>

                <p class="text-xs text-slate-400 mt-1">
                  Created {{ formatDate(header?.created_at) }}
                </p>
              </div>

              <div class="text-right">
                <p class="text-xs text-slate-400">Total Amount</p>
                <p class="text-2xl font-mono font-bold">
                  {{ formatAmount(header?.amount_total) }}
                  <span class="text-xs text-slate-400 ml-1">
                    {{ header?.currency || 'THB' }}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <!-- Rule Result -->
          <div class="bg-white rounded-xl border shadow-sm">
            <div class="px-6 py-4 border-b flex justify-between items-center">
              <h3 class="font-bold text-slate-900">Rule Evaluation</h3>
              <div class="text-xs text-slate-500">
                {{ hitRules.length }} risk · {{ passedRules.length }} passed
              </div>
            </div>

            <div class="divide-y">
              <div
                v-for="r in rules"
                :key="r.rule_id"
                class="p-5 hover:bg-slate-50"
              >
                <div
                  class="flex justify-between cursor-pointer"
                  @click="toggleRule(r.rule_id)"
                >
                  <div>
                    <div class="font-semibold text-sm text-slate-900">
                      {{ r.rule_name }}
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                      {{ r.description }}
                    </div>
                  </div>

                  <span
                    class="text-xs font-bold px-2 py-1 rounded border"
                    :class="
                      r.hit
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    "
                  >
                    {{ r.hit ? 'RISK' : 'PASS' }}
                  </span>
                </div>

                <div
                  v-if="isRuleExpanded(r.rule_id)"
                  class="mt-3 text-xs bg-slate-50 border rounded-lg p-3"
                >
                  <pre class="whitespace-pre-wrap">{{ r }}</pre>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT -->
        <div class="lg:col-span-4 space-y-6">
          <div class="bg-white rounded-xl border p-6 shadow-sm sticky top-6">
            <h3 class="font-bold mb-4">Final Decision</h3>

            <textarea
              v-model="reason"
              class="w-full p-3 border rounded-lg text-sm h-32"
              placeholder="Enter approval / rejection note..."
            />

            <div class="grid grid-cols-2 gap-3 mt-4">
              <button
                @click="store.submit('REJECT', reason)"
                class="py-2.5 border rounded-lg text-sm font-bold"
              >
                Reject
              </button>

              <button
                @click="store.submit('APPROVE', reason)"
                class="py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold"
              >
                Approve
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
