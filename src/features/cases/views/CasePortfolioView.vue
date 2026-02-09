<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import { useCaseListStore } from '@/features/cases/store'
import type { CaseListItem } from '@/features/cases/types'

const router = useRouter()
const store = useCaseListStore()

/* ---------- Store bindings ---------- */
const {
  items: storeItems,
  loading: isLoading,
  page,
  pageSize,
  total,
  search,
  risk,
} = storeToRefs(store)

/* ---------- Local adapter (UI model stays same) ---------- */
const items = computed(() =>
  (storeItems.value || []).map((item: CaseListItem) => ({
    id: item.case_id,
    case_id: item.case_id,

    vendor: item.entity_name || 'Unknown Vendor',
    po_number: item.reference_id,
    category: item.domain === 'PROCUREMENT' ? 'Procurement' : item.domain,

    amount: item.amount_total ?? 0,
    currency: item.currency || 'THB',

    decision: item.decision,
    risk_level: item.risk_level || 'LOW',
    confidence: item.confidence,

    status: item.status,

    created_at: item.created_at,
    updated_at: item.updated_at,

    sla_hours: Math.floor(Math.random() * 48) + 1,
  }))
)

/* ---------- Pagination ---------- */
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize.value))
)

/* ---------- Fetch ---------- */
const fetchData = async () => {
  await store.fetchCases()
}

/* ---------- Navigation ---------- */
const navigateToDetail = (caseId: string) => {
  router.push(`/cases/${caseId}`)
}

/* ---------- Watch ---------- */
watch(
  () => [page.value, pageSize.value, search.value, risk.value],
  () => fetchData()
)

onMounted(() => fetchData())

/* ---------- Utils ---------- */
const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '0'
  return new Intl.NumberFormat('th-TH').format(val)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getRiskBadgeStyle = (level: string) => {
  if (!level) return 'bg-slate-100 text-slate-500 border-slate-200'
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-rose-100 text-rose-800 border-rose-200 shadow-sm'
    case 'HIGH':
      return 'bg-red-50 text-red-700 border-red-100'
    case 'MED':
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-100'
    case 'LOW':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200'
  }
}

/* ---------- Stats ---------- */
const totalExposure = computed(() =>
  items.value.reduce((sum, i) => sum + (i.amount || 0), 0)
)

const highRiskCount = computed(() =>
  items.value.filter(i =>
    ['CRITICAL','HIGH'].includes((i.risk_level || '').toUpperCase())
  ).length
)
</script>

<template>
  <div class="h-full w-full overflow-y-auto bg-slate-50">
    <div class="max-w-7xl mx-auto px-6 py-8 pb-20 animate-enter space-y-6">

      <!-- ---------- Stats ---------- -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Exposure</p>
          <p class="text-2xl font-mono font-bold">
            THB {{ formatCurrency(totalExposure) }}
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-[10px] uppercase font-bold text-rose-500 mb-1">High Risk Cases</p>
          <p class="text-2xl font-mono font-bold">
            {{ highRiskCount }}
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Decision Inbox</p>
          <p class="text-2xl font-mono font-bold">{{ total }}</p>
        </div>
      </div>

      <!-- ---------- Filters ---------- -->
      <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
        <input
          v-model.lazy="search"
          placeholder="Search Case / Vendor / PO..."
          class="w-full md:w-96 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
        />

        <select
          v-model="risk"
          class="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <!-- ---------- Loading ---------- -->
      <div v-if="isLoading" class="space-y-3">
        <div
          v-for="i in 6"
          :key="i"
          class="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"
        >
          <div class="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
          <div class="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>

      <!-- ---------- Cards ---------- -->
      <div v-else class="space-y-4">
        <div
          v-for="item in items"
          :key="item.case_id"
          @click="navigateToDetail(item.case_id)"
          class="group bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition"
        >
          <div class="flex justify-between gap-6">
            <div class="flex-1 min-w-0">
              <span class="font-mono text-xs text-slate-500">{{ item.case_id }}</span>

              <h3 class="text-lg font-extrabold text-slate-900 truncate">
                {{ item.vendor }}
              </h3>

              <p class="text-sm text-slate-500 mt-1">
                {{ item.po_number }} · {{ item.category }} ·
                {{ formatDate(item.created_at) }}
              </p>

              <div class="mt-3 flex gap-2">
                <span
                  class="px-2.5 py-1 rounded text-[10px] font-bold border uppercase"
                  :class="getRiskBadgeStyle(item.risk_level)"
                >
                  {{ item.risk_level }}
                </span>

                <span class="px-2.5 py-1 rounded text-[10px] border">
                  Status: {{ item.status }}
                </span>
              </div>
            </div>

            <div class="text-right shrink-0">
              <p class="text-xs text-slate-400">Amount</p>
              <p class="text-2xl font-mono font-bold">
                {{ formatCurrency(item.amount) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="items.length === 0 && !isLoading"
          class="text-center text-slate-400 py-16"
        >
          No cases found
        </div>
      </div>

      <!-- ---------- Pagination ---------- -->
      <div class="flex justify-between items-center pt-4 border-t border-slate-100">
        <span class="text-xs text-slate-400">
          Page {{ page }} of {{ totalPages }} ({{ total }} cases)
        </span>

        <div class="flex gap-2">
          <button
            :disabled="page === 1"
            @click="page--"
            class="px-4 py-2 bg-white border rounded disabled:opacity-50"
          >
            Previous
          </button>

          <button
            :disabled="page === totalPages"
            @click="page++"
            class="px-4 py-2 bg-white border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

    </div>
  </div>
</template>
