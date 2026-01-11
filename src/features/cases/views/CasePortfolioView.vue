<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { caseApi } from '../api';
import type { CaseDTO } from '@/types/case';

const cases = ref<CaseDTO[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const router = useRouter();

onMounted(async () => {
  try {
    isLoading.value = true;
    cases.value = await caseApi.getAll();
  } catch (error) {
    console.error('Failed to load cases', error);
  } finally {
    isLoading.value = false;
  }
});

const navigateToDetail = (id: string) => {
  router.push(`/cases/${id}`);
};

const filteredCases = computed(() => {
  if (!searchQuery.value) return cases.value;
  const q = searchQuery.value.toLowerCase();
  return cases.value.filter(c => 
    c.id.toLowerCase().includes(q) || 
    c.vendor.toLowerCase().includes(q)
  );
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', { 
    style: 'decimal', 
    minimumFractionDigits: 0 
  }).format(amount);
};

const getRiskClass = (level: string) => {
  switch(level) {
    case 'HIGH': return 'bg-red-50 text-red-700 border-red-100';
    case 'MEDIUM': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'LOW': return 'bg-slate-50 text-slate-600 border-slate-100';
    default: return 'bg-slate-50';
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Case Portfolio</h1>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">GET /api/cases</span>
          <span class="text-xs text-slate-500">• Backlog Overview</span>
        </div>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 bg-white border border-slate-200 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm">Filter</button>
        <button 
           @click="$router.push('/cases/new')"
           class="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-red-700 transition shadow-sm flex items-center gap-2"
        >
          <span class="material-icons-outlined text-sm">add</span>
          Ingest New Case
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p class="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Exposure</p>
          <p class="text-xl font-mono font-bold text-slate-900">THB 4.5M</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          <span class="material-icons-outlined">payments</span>
        </div>
      </div>
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between border-l-4 border-l-primary">
        <div>
          <p class="text-[10px] uppercase font-bold text-slate-500 mb-1">High Risk Cases</p>
          <p class="text-xl font-mono font-bold text-red-600">2</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
          <span class="material-icons-outlined">warning</span>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-5 border-b border-slate-100 bg-slate-50/50 flex gap-4">
        <div class="relative flex-1 max-w-md">
          <span class="absolute left-3 top-2.5 text-slate-400 material-icons-outlined text-[18px]">search</span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search case ID, vendor..." 
            class="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>
      </div>

      <div v-if="isLoading" class="p-8 space-y-4">
        <div v-for="i in 3" :key="i" class="h-16 bg-slate-50 rounded animate-pulse"></div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 font-bold">
              <th class="px-6 py-3">Case ID</th>
              <th class="px-6 py-3">Domain</th> <th class="px-6 py-3">Vendor</th>
              <th class="px-6 py-3 text-right">Amount (THB)</th>
              <th class="px-6 py-3 text-center">Status</th>
              <th class="px-6 py-3 text-center">Risk</th>
              <th class="px-6 py-3 text-center">Created</th>
              <th class="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr 
              v-for="(item, index) in filteredCases" 
              :key="item.id" 
              class="hover:bg-slate-50 transition-colors duration-200 group cursor-default animate-enter"
              :style="{ animationDelay: `${index * 50}ms` }" 
            >
              <td class="px-6 py-4">
                <div class="font-mono font-bold text-slate-900 text-xs">{{ item.id }}</div>
              </td>
              
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border"
                  :class="item.domain === 'procurement' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-100 text-slate-600 border-slate-200'">
                  {{ item.domain }}
                </span>
              </td>

              <td class="px-6 py-4 text-sm font-medium text-slate-700">
                {{ item.vendor }}
              </td>

              <td class="px-6 py-4 text-right">
                <div class="font-mono text-slate-900 font-medium text-sm">{{ formatCurrency(item.amount) }}</div>
              </td>

              <td class="px-6 py-4 text-center">
                <span 
                  class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border min-w-[60px]"
                  :class="{
                    'bg-blue-50 text-blue-700 border-blue-100': item.status === 'OPEN',
                    'bg-emerald-50 text-emerald-700 border-emerald-100': item.status === 'PASS',
                    'bg-rose-50 text-rose-700 border-rose-100': item.status === 'FAIL',
                    'bg-slate-100 text-slate-600 border-slate-200': item.status === 'PENDING'
                  }"
                >
                  {{ item.status }}
                </span>
              </td>

              <td class="px-6 py-4 text-center">
                <span 
                  class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold border min-w-[50px]"
                  :class="getRiskClass(item.risk_level)"
                >
                  {{ item.risk_level }}
                </span>
              </td>

              <td class="px-6 py-4 text-center">
                <div class="font-mono text-xs text-slate-400">
                  {{ new Date(item.created_at).toLocaleDateString() }}
                </div>
              </td>

              <td class="px-6 py-4 text-right">
                <button 
                  @click="navigateToDetail(item.id)"
                  class="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm 
                         hover:text-primary hover:border-primary hover:shadow-md hover:-translate-y-0.5 
                         active:translate-y-0 active:shadow-sm
                         transition-all duration-200"
                >
                  Manage
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!isLoading && filteredCases.length === 0" class="p-10 text-center text-slate-500">
        <span class="material-icons-outlined text-4xl mb-2 text-slate-300">search_off</span>
        <p class="text-sm">No cases found matching your search.</p>
      </div>
    </div>
  </div>
</template>