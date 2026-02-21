<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { auditApi } from '../api'
import type { AuditLog } from '../types'

const route = useRoute()

const logs = ref<AuditLog[]>([])
const isLoading = ref(true)
const expandedLogs = ref<Set<string>>(new Set())

const onlyExceptions = ref(true)
const skuFilter = ref<string>('ALL')
const groupFilter = ref<string>('ALL')
const q = ref('')

onMounted(async () => {
  try {
    isLoading.value = true
    logs.value = await auditApi.getLogs(route.params.caseId as string)
  } finally {
    isLoading.value = false
  }
})

const toggleLog = (id: string) => {
  if (expandedLogs.value.has(id)) expandedLogs.value.delete(id)
  else expandedLogs.value.add(id)
}
const isExpanded = (id: string) => expandedLogs.value.has(id)
const hasContext = (log: AuditLog) => !!(log.context && log.context.length > 0)

const isExceptionLog = (log: AuditLog) => {
  const action = String(log.action)
  return action === 'RULE_FAILED' || action === 'ACTION_REQUIRED'
}

const availableSkus = computed(() => {
  const set = new Set<string>()
  for (const l of logs.value) if (l.meta?.sku) set.add(l.meta.sku)
  return ['ALL', ...Array.from(set).sort()]
})

const availableGroups = computed(() => {
  const set = new Set<string>()
  for (const l of logs.value) if (l.meta?.group) set.add(l.meta.group)
  return ['ALL', ...Array.from(set).sort()]
})

const filteredFlatLogs = computed(() => {
  const needle = q.value.trim().toLowerCase()

  return (logs.value || []).filter(l => {
    if (onlyExceptions.value && !isExceptionLog(l)) return false
    if (skuFilter.value !== 'ALL' && l.meta?.sku !== skuFilter.value) return false
    if (groupFilter.value !== 'ALL' && l.meta?.group !== groupFilter.value) return false

    if (!needle) return true
    const hay = [
      l.action,
      l.message,
      l.details,
      l.meta?.sku,
      l.meta?.item_name,
      l.meta?.rule_id,
      l.meta?.group,
      l.meta?.domain,
      ...(l.context || []).map(x => `${x.label}:${x.value}`),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return hay.includes(needle)
  })
})

const actionPriority = (action: string) => {
  switch (String(action || '').toUpperCase()) {
    case 'ITEM_EVALUATED': return 10
    case 'ARTIFACT_STATUS': return 20
    case 'ACTION_REQUIRED': return 30
    case 'RULE_FAILED': return 40
    case 'RULE_PASSED': return 50
    case 'RUN_CREATED': return 5
    case 'POLICY_APPLIED': return 6
    default: return 60
  }
}

const formatDate = (ts: string) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const getEventConfig = (type: string) => {
  const t = String(type || '').toUpperCase()
  if (t === 'RUN_CREATED') return { icon: 'flag', bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-700', badge: 'bg-slate-100 text-slate-700' }
  if (t === 'POLICY_APPLIED') return { icon: 'verified', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700' }
  if (t === 'ITEM_EVALUATED') return { icon: 'inventory_2', bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700' }
  if (t === 'RULE_FAILED') return { icon: 'error_outline', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700' }
  if (t === 'RULE_PASSED') return { icon: 'task_alt', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' }
  if (t === 'ACTION_REQUIRED') return { icon: 'assignment_late', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' }
  if (t === 'ARTIFACT_STATUS') return { icon: 'attach_file', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', badge: 'bg-sky-100 text-sky-700' }
  return { icon: 'info', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600' }
}

type GroupBlock = {
  key: string
  sku?: string
  itemName?: string
  exposure?: number
  logs: AuditLog[]
  header?: {
    decision?: string
    risk?: string
    confidence?: string
  }
}

const groupedBlocks = computed<GroupBlock[]>(() => {
  const list = filteredFlatLogs.value || []
  const bySku = new Map<string, AuditLog[]>()

  for (const l of list) {
    const key = l.meta?.sku ? `SKU:${l.meta.sku}` : 'CASE:RUN'
    if (!bySku.has(key)) bySku.set(key, [])
    bySku.get(key)!.push(l)
  }

  const blocks: GroupBlock[] = []

  for (const [key, arr] of bySku.entries()) {
    const sorted = [...arr].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    let decision: string | undefined
    let risk: string | undefined
    let confidence: string | undefined
    let exposure = 0

    const itemEval = sorted.find(x => String(x.action) === 'ITEM_EVALUATED')
    if (itemEval?.context?.length) {
      const pick = (label: string) => itemEval.context?.find(c => c.label === label)?.value
      decision = pick('Decision')
      risk = pick('Risk')
      confidence = pick('Confidence')
    }

    // 🔴 derive exposure จาก meta
    exposure =
      sorted.find(x => (x.meta as any)?.item_exposure)?.meta?.item_exposure || 0

    const sku = key === 'CASE:RUN' ? undefined : key.replace('SKU:', '')
    const itemName =
      sku
        ? (sorted.find(x => x.meta?.item_name)?.meta?.item_name || undefined)
        : undefined

    blocks.push({
      key,
      sku,
      itemName,
      exposure,
      logs: sorted,
      header: { decision, risk, confidence },
    })
  }

  // 🔴 sort by exposure DESC
  blocks.sort((a, b) => {
    if (a.key === 'CASE:RUN') return -1
    if (b.key === 'CASE:RUN') return 1
    return (b.exposure || 0) - (a.exposure || 0)
  })

  return blocks
})


const badgeForDecision = (d?: string) => {
  const x = String(d || '').toUpperCase()
  if (x === 'APPROVE') return 'bg-emerald-100 text-emerald-700'
  if (x === 'REVIEW') return 'bg-amber-100 text-amber-700'
  if (x === 'REJECT') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}
const badgeForRisk = (r?: string) => {
  const x = String(r || '').toUpperCase()
  if (x === 'LOW') return 'bg-emerald-100 text-emerald-700'
  if (x === 'MED') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}
</script>

<template>
  <div class="max-w-5xl mx-auto pb-20">
    <div class="bg-slate-900 text-slate-300 p-4 rounded-t-xl flex justify-between items-center shadow-lg sticky top-4 z-20">
      <div class="flex items-center gap-3">
        <span class="material-icons-outlined text-emerald-400">shield</span>
        <div>
          <h2 class="text-sm font-bold text-white uppercase tracking-wider">Audit Timeline</h2>
          <p class="text-[10px] text-slate-400">
            Case ID: {{ route.params.caseId }} · Source: /api/v1/cases/:caseId/view
          </p>
        </div>
      </div>
      <div class="text-xs text-slate-200 bg-slate-800 px-2 py-1 rounded">Grouped by Item</div>
    </div>

    <div class="bg-white border border-t-0 border-slate-200 rounded-b-xl px-8 pt-6 pb-32 min-h-[650px]">
      <!-- Filters -->
      <div class="mb-6 flex flex-col lg:flex-row lg:items-end gap-3">
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg border text-xs font-bold"
            :class="onlyExceptions ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-700'"
            @click="onlyExceptions = !onlyExceptions"
          >
            {{ onlyExceptions ? 'Showing: Exceptions only' : 'Showing: All events' }}
          </button>
          <div class="text-[11px] text-slate-500">
            {{ filteredFlatLogs.length }} events · {{ groupedBlocks.length }} groups
          </div>
        </div>

        <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">SKU</div>
            <select v-model="skuFilter" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option v-for="s in availableSkus" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Group</div>
            <select v-model="groupFilter" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option v-for="g in availableGroups" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>

          <div>
            <div class="text-[10px] font-bold text-slate-500 uppercase mb-1">Search</div>
            <input
              v-model="q"
              class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="rule_id, sku, item name, message..."
            />
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-8 pt-8">
        <div v-for="i in 4" :key="i" class="h-24 bg-slate-50 rounded-xl animate-pulse"></div>
      </div>

      <div v-else class="space-y-8">
        <div v-if="filteredFlatLogs.length === 0" class="py-10 text-sm text-slate-500">
          No events match current filters.
        </div>

        <!-- GROUP BLOCKS -->
        <div v-for="block in groupedBlocks" :key="block.key" class="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <!-- GROUP HEADER -->
          <div class="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
            <div>
              <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wide">
                {{ block.key === 'CASE:RUN' ? 'Case Level' : 'Item Group' }}
              </div>

              <div class="mt-1">
                <div v-if="block.key === 'CASE:RUN'" class="text-base font-bold text-slate-900">
                  Run Summary
                </div>

<div v-else class="flex flex-col gap-1">
  <div class="text-base font-bold text-slate-900">
    {{ block.itemName || 'Unknown item' }}
  </div>

  <div class="flex items-center gap-3 flex-wrap">
    <div class="text-xs text-slate-500 font-mono">
      SKU: {{ block.sku }}
    </div>

    <!-- 🔴 Exposure Badge -->
    <div
      v-if="block.exposure && block.exposure > 0"
      class="px-3 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-bold tracking-wide"
    >
      Exposure
      {{ new Intl.NumberFormat().format(block.exposure) }}
      THB
    </div>
  </div>
</div>


              </div>

              <div v-if="block.key !== 'CASE:RUN'" class="mt-2 flex flex-wrap items-center gap-2">
                <span v-if="block.header?.decision" class="text-[10px] font-bold px-2 py-0.5 rounded" :class="badgeForDecision(block.header.decision)">
                  {{ block.header.decision }}
                </span>
                <span v-if="block.header?.risk" class="text-[10px] font-bold px-2 py-0.5 rounded" :class="badgeForRisk(block.header.risk)">
                  RISK {{ block.header.risk }}
                </span>
                <span v-if="block.header?.confidence" class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  CONF {{ block.header.confidence }}
                </span>
                <span class="text-[10px] text-slate-500">
                  {{ block.logs.length }} events
                </span>
              </div>
            </div>

            <div class="text-[10px] text-slate-500 flex items-center gap-1">
              <span class="material-icons-outlined text-[12px]">sort</span>
              Ordered
            </div>
          </div>

          <!-- GROUP CONTENT -->
          <div class="px-5 py-4">
            <div class="relative">
              <div class="absolute left-3 top-0 bottom-0 w-px bg-slate-200"></div>

              <div class="space-y-4">
                <div v-for="log in block.logs" :key="log.id" class="relative pl-10">
                  <div
                    class="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center"
                    :class="[getEventConfig(log.action).bg, getEventConfig(log.action).text]"
                  >
                    <span class="material-icons-outlined text-[12px]">
                      {{ getEventConfig(log.action).icon }}
                    </span>
                  </div>

                  <div
                    class="bg-white border rounded-lg transition-all hover:shadow-sm overflow-hidden"
                    :class="[getEventConfig(log.action).border, hasContext(log) ? 'cursor-pointer' : '']"
                    @click="hasContext(log) && toggleLog(log.id)"
                  >
                    <div class="flex justify-between items-start p-4" :class="isExpanded(log.id) ? 'bg-slate-50' : 'bg-white'">
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide"
                                :class="getEventConfig(log.action).badge">
                            {{ String(log.action).replace(/_/g, ' ') }}
                          </span>

                          <span class="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <span class="material-icons-outlined text-[10px]">schedule</span>
                            {{ formatDate(log.timestamp) }}
                          </span>

                          <span v-if="log.meta?.group" class="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {{ log.meta.group }}
                          </span>

                          <span v-if="log.meta?.rule_id" class="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-mono">
                            {{ log.meta.rule_id }}
                          </span>
                        </div>

                        <h3 class="font-bold text-slate-800 text-sm">{{ log.message }}</h3>

                        <!-- FIX: proper v-if chain (no v-else-if after a plain h3) -->
                        <p v-if="!hasContext(log)" class="text-sm text-slate-500 italic mt-1">
                          {{ log.details || '' }}
                        </p>
                        <p v-else-if="hasContext(log) && !isExpanded(log.id)" class="text-[10px] text-slate-400 mt-1 select-none flex items-center gap-1">
                          <span class="material-icons-outlined text-[10px]">visibility</span> View details...
                        </p>
                      </div>

                      <div class="flex items-center gap-3">
                        <div class="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {{ log.actor.name }}
                        </div>

                        <span v-if="hasContext(log)"
                              class="material-icons-outlined text-slate-400 text-lg transition-transform duration-300"
                              :class="{ 'rotate-180': isExpanded(log.id) }">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div v-if="hasContext(log) && isExpanded(log.id)" class="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                      <div class="mt-2 grid grid-cols-2 gap-y-3 gap-x-4">
                        <div v-for="(item, idx) in log.context" :key="idx"
                             :class="{ 'col-span-2 border-t border-slate-200 pt-2 mt-1': item.fullWidth }">
                          <span class="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            {{ item.label }}
                          </span>

                          <span v-if="item.type === 'currency'" class="text-base font-bold text-emerald-600 font-mono">
                            {{ item.value }}
                          </span>

                          <span v-else-if="item.type === 'badge'"
                                class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                                :class="
                                  item.badgeColor === 'red'
                                    ? 'bg-red-100 text-red-700'
                                    : item.badgeColor === 'green'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : item.badgeColor === 'amber'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-200 text-slate-700'
                                ">
                            {{ item.value }}
                          </span>

                          <span v-else-if="item.type === 'mono'" class="text-xs font-mono text-slate-600 break-all bg-white px-1 rounded border border-slate-200">
                            {{ item.value }}
                          </span>

                          <span v-else class="text-sm text-slate-700 font-medium" :class="{ 'text-slate-900 font-bold': item.highlight }">
                            {{ item.value }}
                          </span>
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