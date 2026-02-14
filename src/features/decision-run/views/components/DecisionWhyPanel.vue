<script setup lang="ts">
import { computed } from 'vue'
import { useDecisionRunStore } from '@/features/decision-run/store'
import type { GroupRule } from '@/features/decision-run/types'

const store = useDecisionRunStore()

/* ===============================
 * Core derived state
 * =============================== */

const activeGroup = computed(() => store.activeGroup)
const rules = computed<GroupRule[]>(() => store.activeRules || [])

const failedRules = computed(() =>
  rules.value.filter(r => String(r.result).toUpperCase() === 'FAIL')
)

const passedRules = computed(() =>
  rules.value.filter(r => String(r.result).toUpperCase() === 'PASS')
)

const hasBlockingIssues = computed(() => failedRules.value.length > 0)

/* ===============================
 * UI helpers
 * =============================== */

function severityBadge(sev?: string) {
  const x = String(sev || '').toUpperCase()
  if (x === 'HIGH') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (x === 'MED' || x === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}

function severityDot(sev?: string) {
  const x = String(sev || '').toUpperCase()
  if (x === 'HIGH') return 'bg-rose-600'
  if (x === 'MED' || x === 'MEDIUM') return 'bg-amber-500'
  return 'bg-slate-400'
}
</script>

<template>
  <div class="space-y-5">

    <!-- ================= DECISION BANNER ================= -->
    <div
      class="rounded-2xl border p-5"
      :class="hasBlockingIssues
        ? 'bg-rose-50 border-rose-200'
        : 'bg-emerald-50 border-emerald-200'"
    >
      <div class="flex items-start justify-between gap-4">

        <div class="flex items-start gap-3">
          <div
            class="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black"
            :class="hasBlockingIssues ? 'bg-rose-600' : 'bg-emerald-600'"
          >
            <span v-if="hasBlockingIssues">!</span>
            <span v-else>✓</span>
          </div>

          <div>
            <div class="text-xs font-bold uppercase tracking-wider"
              :class="hasBlockingIssues ? 'text-rose-700' : 'text-emerald-700'">
              Decision insight
            </div>

            <div class="text-lg font-extrabold text-slate-900 mt-0.5">
              {{ hasBlockingIssues ? 'Blocking issues detected' : 'All checks passed' }}
            </div>

            <div class="text-sm mt-1"
              :class="hasBlockingIssues ? 'text-rose-700' : 'text-emerald-700'">
              {{ hasBlockingIssues
                ? 'Manual review required before approval'
                : 'No blocking issues found. This item is safe to approve.'
              }}
            </div>
          </div>
        </div>

        <div class="text-right">
          <div class="text-xs text-slate-500">Rules</div>
          <div class="text-xl font-extrabold text-slate-900">
            {{ rules.length }}
          </div>
        </div>
      </div>
    </div>

    <!-- ================= BLOCKING ================= -->
    <div v-if="hasBlockingIssues" class="space-y-3">

      <div class="flex items-center justify-between">
        <div class="text-xs font-extrabold uppercase tracking-wider text-rose-600">
          Blocking issues (must resolve)
        </div>

        <div class="text-xs font-bold text-rose-600">
          {{ failedRules.length }} rule failed
        </div>
      </div>

      <!-- rule card -->
      <div
        v-for="r in failedRules"
        :key="r.rule_id"
        class="rounded-2xl border border-rose-200 bg-white shadow-sm overflow-hidden"
      >
        <div class="flex">
          <!-- left severity rail -->
          <div class="w-1.5 bg-rose-600"></div>

          <div class="p-5 flex-1">

            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <div class="font-extrabold text-slate-900">
                    {{ r.rule_id }}
                  </div>

                  <span
                    class="px-2 py-0.5 rounded border text-[11px] font-bold"
                    :class="severityBadge(r.severity)"
                  >
                    {{ String(r.severity || '—').toUpperCase() }}
                  </span>
                </div>

                <div class="text-sm text-slate-700 mt-1 leading-relaxed">
                  {{ r.explanation }}
                </div>
              </div>

              <div
                class="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black"
                :class="severityDot(r.severity)"
              >
                !
              </div>
            </div>

            <!-- calculation -->
            <div
              v-if="r.calculation"
              class="mt-4 grid grid-cols-3 gap-3"
            >
              <div class="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div class="text-[10px] font-bold uppercase text-slate-400">Actual</div>
                <div class="font-mono font-extrabold text-slate-900 mt-1">
                  {{ r.calculation.actual ?? '—' }}
                </div>
              </div>

              <div class="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div class="text-[10px] font-bold uppercase text-slate-400">Expected</div>
                <div class="font-mono font-extrabold text-slate-900 mt-1">
                  {{ r.calculation.expected ?? '—' }}
                </div>
              </div>

              <div class="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div class="text-[10px] font-bold uppercase text-slate-400">Operator</div>
                <div class="font-mono font-extrabold text-slate-900 mt-1">
                  {{ r.calculation.operator ?? '—' }}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- ================= PASSED ================= -->
    <details v-if="passedRules.length" class="group rounded-xl border border-slate-200 bg-white">
      <summary
        class="cursor-pointer px-4 py-3 text-xs font-extrabold text-slate-600 hover:text-slate-900 flex items-center justify-between"
      >
        <span>✓ Passed checks ({{ passedRules.length }})</span>
        <span class="text-slate-400 text-[11px]">click to expand</span>
      </summary>

      <div class="px-4 pb-4 space-y-2">
        <div
          v-for="r in passedRules"
          :key="r.rule_id"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div class="font-bold text-slate-900 text-sm">
            {{ r.rule_id }}
          </div>
          <div class="text-sm text-slate-600 mt-0.5">
            {{ r.explanation }}
          </div>
        </div>
      </div>
    </details>

    <!-- ================= EMPTY ================= -->
    <div
      v-if="!rules.length && !store.loadingWhy"
      class="p-8 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 text-center"
    >
      No rule evaluation for this item.
    </div>

  </div>
</template>
