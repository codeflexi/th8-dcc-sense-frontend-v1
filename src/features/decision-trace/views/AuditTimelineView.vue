<!-- src/features/audit/views/AuditTimelineView.vue -->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuditTimelineStore } from '@/features/decision-trace/store'

const route = useRoute()
const store = useAuditTimelineStore()

const caseId = computed(() => String(route.params.caseId || ''))

onMounted(() => {
  if (caseId.value) store.load(caseId.value)
})

watch(caseId, (id) => {
  if (id) store.load(id)
})

function severityPillClass(sev: string) {
  const s = String(sev || '').toUpperCase()
  if (s === 'CRITICAL' || s === 'ERROR') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (s === 'WARN') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
</script>

<template>
  <div class="w-full">
    <!-- Header card -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="px-6 py-5 bg-slate-900 text-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="material-icons-outlined text-emerald-400">shield</span>
          <div>
            <div class="text-xs tracking-wider uppercase text-slate-400">Audit Trail</div>
            <div class="text-sm font-semibold text-white">
              Case {{ caseId }}
            </div>
            <div class="text-[11px] text-slate-400">
              Source: /api/v1/cases/:caseId/audit-timeline
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden md:flex items-center gap-2 text-[11px] text-slate-300">
            <span class="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              Events: <span class="font-semibold text-white">{{ store.kpi.total }}</span>
            </span>
            <span class="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              WARN: <span class="font-semibold text-white">{{ store.kpi.warn }}</span>
            </span>
            <span class="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              ERROR: <span class="font-semibold text-white">{{ store.kpi.error }}</span>
            </span>
            <span class="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
              CRITICAL: <span class="font-semibold text-white">{{ store.kpi.critical }}</span>
            </span>
          </div>

          <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-200 text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Immutable log stream
          </span>
        </div>
      </div>

      <!-- Filters -->
      <div class="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div class="lg:col-span-4">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Search</label>
            <div class="relative">
              <span class="material-icons-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                v-model="store.q"
                class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="type, title, actor, run_id, group_id, meta..."
              />
            </div>
          </div>

          <div class="lg:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Severity</label>
            <select
              v-model="store.severity"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">ALL</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div class="lg:col-span-3">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Type</label>
            <select
              v-model="store.type"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="t in store.typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div class="lg:col-span-2">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Actor</label>
            <select
              v-model="store.actor"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="a in store.actorOptions" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>

          <div class="lg:col-span-1">
            <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Run</label>
            <select
              v-model="store.runId"
              class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option v-for="r in store.runOptions" :key="r" :value="r">{{ r }}</option>
            </select>
          </div>
        </div>

        <div v-if="store.error" class="mt-3 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm">
          {{ store.error }}
        </div>
      </div>
    </div>

    <!-- Timeline -->
    <div class="mt-5">
      <div v-if="store.loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 rounded-2xl border border-slate-200 bg-white animate-pulse"></div>
      </div>

      <div v-else>
        <div v-if="store.filtered.length === 0" class="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div class="text-sm font-semibold text-slate-800">No events</div>
          <div class="text-xs text-slate-500 mt-1">Adjust filters or verify the backend emitted audit events.</div>
        </div>

        <div v-else class="space-y-6">
          <div v-for="g in store.groupedByDate" :key="g.dateKey" class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-icons-outlined text-slate-500 text-[18px]">calendar_month</span>
                <div class="text-sm font-semibold text-slate-900">{{ g.dateKey }}</div>
                <div class="text-xs text-slate-500">({{ g.events.length }} events)</div>
              </div>
            </div>

            <div class="px-6 py-4">
              <div class="relative">
                <div class="absolute left-[12px] top-0 bottom-0 w-px bg-slate-200"></div>

                <div class="space-y-4">
                  <div v-for="e in g.events" :key="e.id" class="relative pl-10">
                    <div
                      class="absolute left-0 top-3 w-6 h-6 rounded-full border-4 border-white shadow flex items-center justify-center"
                      :class="[e.bgClass, 'text-slate-700']"
                    >
                      <span class="material-icons-outlined text-[14px]">{{ e.icon }}</span>
                    </div>

                    <div class="rounded-2xl border bg-white overflow-hidden" :class="[e.borderClass]">
                      <button
                        class="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50"
                        @click="store.toggleExpanded(e.id)"
                      >
                        <div class="min-w-0">
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border" :class="severityPillClass(e.severity)">
                              {{ String(e.severity || 'INFO').toUpperCase() }}
                            </span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold" :class="e.badgeClass">
                              {{ e.type }}
                            </span>
                            <span class="text-[11px] text-slate-500 inline-flex items-center gap-1">
                              <span class="material-icons-outlined text-[14px]">schedule</span>
                              {{ store.formatTs(e.timestamp) }}
                            </span>
                          </div>

                          <div class="mt-1 text-sm font-semibold text-slate-900 truncate">
                            {{ e.titleText }}
                          </div>

                          <div v-if="e.subtitleText" class="mt-0.5 text-[12px] text-slate-500 truncate">
                            {{ e.subtitleText }}
                          </div>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                          <span class="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            {{ e.actor || 'SYSTEM' }}
                          </span>
                          <span
                            class="material-icons-outlined text-slate-400 transition-transform"
                            :class="store.isExpanded(e.id) ? 'rotate-180' : ''"
                          >expand_more</span>
                        </div>
                      </button>

                      <div v-if="store.isExpanded(e.id)" class="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/40">
                        <!-- Meta key/values -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div v-if="e.run_id" class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">run_id</div>
                            <div class="text-xs font-mono text-slate-700 break-all">{{ e.run_id }}</div>
                          </div>

                          <div v-if="e.group_id" class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">group_id</div>
                            <div class="text-xs font-mono text-slate-700 break-all">{{ e.group_id }}</div>
                          </div>

                          <div v-for="kv in e.meta_kv" :key="kv.key" class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{{ kv.key }}</div>
                            <div
                              class="text-sm text-slate-800 break-words"
                              :class="[kv.mono ? 'font-mono text-xs text-slate-700' : '', kv.highlight ? 'font-semibold text-slate-900' : '']"
                            >
                              {{ kv.value }}
                            </div>
                          </div>
                        </div>

                        <!-- Raw JSON toggle -->
                        <div class="mt-3 flex items-center justify-between">
                          <div class="text-[11px] text-slate-500">
                            Meta size: {{ e.meta_is_large ? 'large' : 'normal' }}
                          </div>

                          <button
                            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            @click.stop="store.toggleRaw(e.id)"
                          >
                            <span class="material-icons-outlined text-[16px]">code</span>
                            {{ store.isRawShown(e.id) ? 'Hide raw JSON' : 'Show raw JSON' }}
                          </button>
                        </div>

                        <div v-if="store.isRawShown(e.id)" class="mt-2 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 overflow-auto">
                          <pre class="text-[11px] leading-5 p-3 font-mono">{{ e.meta_json_pretty }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>