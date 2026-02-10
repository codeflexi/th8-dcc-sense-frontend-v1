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

/**
 * Blocking rule = rule.result === FAIL
 * (severity ไม่ใช่ตัวตัด blocking)
 */
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

function ruleCardClass(result?: string) {
  const x = String(result || '').toUpperCase()
  if (x === 'FAIL') return 'border-rose-300 bg-rose-50/40'
  if (x === 'PASS') return 'border-emerald-200 bg-emerald-50/40'
  return 'border-slate-200 bg-white'
}

function severityBadge(sev?: string) {
  const x = String(sev || '').toUpperCase()
  if (x === 'HIGH') return 'bg-rose-50 text-rose-700 border-rose-200'
  if (x === 'MED' || x === 'MEDIUM') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-slate-50 text-slate-600 border-slate-200'
}
</script>

<template>
  <div class="space-y-4">

    <!-- ================= Executive Summary ================= -->
    <div
      class="rounded-xl border p-4"
      :class="hasBlockingIssues
        ? 'bg-rose-50 border-rose-200'
        : 'bg-emerald-50 border-emerald-200'"
    >
      <div class="font-extrabold text-slate-900">
        {{ hasBlockingIssues ? 'Blocking issues detected' : 'All checks passed' }}
      </div>

      <div class="text-sm mt-1 text-slate-700">
        {{ hasBlockingIssues
          ? 'Manual review required before approval'
          : 'No blocking issues found'
        }}
      </div>
    </div>

    <!-- ================= Blocking Issues ================= -->
    <div v-if="hasBlockingIssues" class="space-y-3">
      <div class="text-xs font-extrabold uppercase text-slate-400">
        Blocking issues
      </div>

      <div
        v-for="r in failedRules"
        :key="r.rule_id"
        class="rounded-xl border p-4"
        :class="ruleCardClass(r.result)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-extrabold text-slate-900">
              {{ r.rule_id }}
            </div>
            <div class="text-sm text-slate-700 mt-1">
              {{ r.explanation }}
            </div>
          </div>

          <span
            class="px-2 py-0.5 rounded text-xs font-bold border"
            :class="severityBadge(r.severity)"
          >
            {{ String(r.severity || '—').toUpperCase() }}
          </span>
        </div>

        <!-- calculation (optional) -->
        <div
          v-if="r.calculation"
          class="mt-3 grid grid-cols-3 gap-3 text-xs"
        >
          <div class="bg-white border border-slate-200 rounded-lg p-2">
            <div class="text-slate-400 font-bold uppercase">Actual</div>
            <div class="font-mono font-bold text-slate-900">
              {{ r.calculation.actual ?? '—' }}
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-lg p-2">
            <div class="text-slate-400 font-bold uppercase">Expected</div>
            <div class="font-mono font-bold text-slate-900">
              {{ r.calculation.expected ?? '—' }}
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-lg p-2">
            <div class="text-slate-400 font-bold uppercase">Operator</div>
            <div class="font-mono font-bold text-slate-900">
              {{ r.calculation.operator ?? '—' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= Passed Rules (collapsed) ================= -->
    <details v-if="passedRules.length" class="group">
      <summary
        class="cursor-pointer text-xs font-extrabold text-slate-500 hover:text-slate-700"
      >
        ✓ Passed checks ({{ passedRules.length }})
      </summary>

      <div class="mt-3 space-y-2">
        <div
          v-for="r in passedRules"
          :key="r.rule_id"
          class="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <div class="font-bold text-slate-900">
            {{ r.rule_id }}
          </div>
          <div class="text-sm text-slate-600">
            {{ r.explanation }}
          </div>
        </div>
      </div>
    </details>

    <!-- ================= Empty State ================= -->
    <div
      v-if="!rules.length && !store.loadingWhy"
      class="p-6 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 text-center"
    >
      No rule evaluation for this item.
    </div>

  </div>
</template>
