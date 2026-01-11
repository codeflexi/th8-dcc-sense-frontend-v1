<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
const caseId = route.params.caseId;
</script>

<template>
  <div class="flex flex-col h-full space-y-6">
    <div>
       <RouterLink to="/cases" class="text-xs font-medium text-slate-400 hover:text-primary flex items-center gap-1 mb-2">
         <span class="material-icons-outlined text-sm">arrow_back</span> Back to Portfolio
       </RouterLink>
       <h1 class="text-2xl font-bold font-mono text-slate-900">{{ caseId }}</h1>
    </div>
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex space-x-6">
        <RouterLink :to="`/cases/${caseId}`" active-class="border-primary text-primary" exact-active-class="border-primary text-primary" class="whitespace-nowrap pb-3 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">Decision & Rules</RouterLink>
        <RouterLink :to="`/cases/${caseId}/evidence`" active-class="border-primary text-primary" class="whitespace-nowrap pb-3 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">Evidence Trace</RouterLink>
        <RouterLink :to="`/cases/${caseId}/audit`" active-class="border-primary text-primary" class="whitespace-nowrap pb-3 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">Audit Timeline</RouterLink>
      </nav>
    </div>
    <div class="flex-1">
      <RouterView />
    </div>
  </div>
</template>

