<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useDecisionStore } from '../store';

const route = useRoute();
const store = useDecisionStore();
const reason = ref('');

const caseId = route.params.caseId as string;

onMounted(() => {
  store.loadContext(caseId);
});

// Helper for Rule Colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PASS': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    case 'FAIL': return 'text-red-600 bg-red-50 border-red-100';
    case 'WARNING': return 'text-amber-600 bg-amber-50 border-amber-100';
    default: return 'text-slate-500 bg-slate-50';
  }
};

const getIcon = (status: string) => {
   switch (status) {
    case 'PASS': return 'check_circle';
    case 'FAIL': return 'cancel';
    case 'WARNING': return 'warning';
    default: return 'help';
  }
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
    
    <div class="lg:col-span-8 space-y-6">
      
      <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group transition-all duration-300 hover:shadow-md animate-enter">
        
        <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 transition-all duration-300 group-hover:w-2"></div>
        
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-50/30 to-transparent -translate-x-full group-hover:animate-shimmer z-0 pointer-events-none"></div>
        
        <div class="relative z-10">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-lg font-bold flex items-center gap-2 text-slate-800">
              <span class="material-icons-outlined text-emerald-600 transition-transform duration-500 group-hover:rotate-12">psychology</span>
              AI Analysis Result
            </h2>
            <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-mono border border-slate-200">
              Model: v3.4.2 (Llama-3-Financed)
            </span>
          </div>

          <div class="flex items-baseline gap-4 mb-2">
             <div class="text-5xl font-extrabold text-emerald-600 tracking-tight">APPROVE</div>
             <div class="text-lg font-medium text-slate-500">
               Confidence: <span class="text-slate-900 font-bold">{{ store.state.confidenceScore }}%</span>
             </div>
          </div>
          
          <p class="text-sm text-slate-500 mt-2">
            Based on <strong>Policy Procurement-001</strong> and historical vendor data. 
            No critical compliance blockers found, although one warning requires attention.
          </p>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-enter" style="animation-delay: 100ms;">
        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 class="font-bold text-slate-800 flex items-center gap-2">
            <span class="material-icons-outlined text-slate-400">format_list_bulleted</span>
            Logic Execution Trace
          </h3>
          <span class="text-xs text-slate-400 font-mono">Trace ID: {{ caseId.split('-')[3] || '88291' }}</span>
        </div>

        <div v-if="store.state.isProcessing && store.state.rules.length === 0" class="p-8 space-y-4">
           <div class="h-12 bg-slate-50 rounded animate-pulse"></div>
           <div class="h-12 bg-slate-50 rounded animate-pulse"></div>
           <div class="h-12 bg-slate-50 rounded animate-pulse"></div>
        </div>

        <div v-else class="divide-y divide-slate-100">
          <div v-for="rule in store.state.rules" :key="rule.id" class="p-5 hover:bg-slate-50/50 transition-colors">
            <div class="flex items-start gap-4">
              <div class="shrink-0 mt-1">
                <div :class="`w-8 h-8 rounded-full flex items-center justify-center border ${getStatusColor(rule.status)}`">
                   <span class="material-icons-outlined text-sm">{{ getIcon(rule.status) }}</span>
                </div>
              </div>

              <div class="flex-1">
                <div class="flex justify-between items-start mb-1">
                  <h4 class="text-sm font-bold text-slate-900">{{ rule.name }}</h4>
                  <span class="font-mono text-[10px] text-slate-400 uppercase">{{ rule.code }}</span>
                </div>
                <p class="text-sm text-slate-600 mb-2">{{ rule.description }}</p>
                
                <div class="bg-slate-50 p-2 rounded border border-slate-100 text-xs font-mono text-slate-700 flex items-start gap-2">
                   <span class="material-icons-outlined text-[14px] text-slate-400 mt-[1px]">terminal</span>
                   {{ rule.message }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="lg:col-span-4 space-y-6 animate-enter" style="animation-delay: 200ms;">
      
      <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm sticky top-6">
         
         <div v-if="store.state.userDecision" class="text-center py-8 animate-enter">
            <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="material-icons-outlined text-3xl">check</span>
            </div>
            <h3 class="text-lg font-bold text-slate-900 mb-1">Decision Recorded</h3>
            <p class="text-sm text-slate-500">
              You have <span class="font-bold">{{ store.state.userDecision }}</span> this case.
            </p>
            <div class="mt-6 p-3 bg-slate-50 rounded text-xs text-slate-400 font-mono">
              Audit Hash: 0x7f...3a2b
            </div>
         </div>

         <div v-else>
           <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
             <span class="material-icons-outlined text-slate-400">gavel</span>
             Final Decision
           </h3>
           
           <div class="mb-4">
             <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Decision Reason / Note</label>
             <textarea 
               v-model="reason"
               class="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition resize-none placeholder-slate-300" 
               rows="5"
               placeholder="Required for Rejection. Optional for Approval."
             ></textarea>
           </div>
           
           <div class="space-y-3">
             <button 
               @click="store.submit('APPROVE', reason)"
               :disabled="store.state.isProcessing"
               class="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold shadow-md shadow-emerald-900/10 
                      transition-all duration-200
                      hover:bg-emerald-500 hover:shadow-lg hover:-translate-y-0.5
                      active:translate-y-0 active:bg-emerald-700
                      disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                      flex justify-center items-center gap-2 group"
             >
               <span v-if="store.state.isProcessing" class="material-icons-outlined animate-spin text-sm">refresh</span>
               <span v-else class="material-icons-outlined text-sm group-hover:scale-110 transition">check_circle</span>
               Approve Case
             </button>
             
             <button 
               @click="store.submit('REJECT', reason)"
               :disabled="store.state.isProcessing"
               class="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold 
                      transition-all duration-200
                      hover:bg-red-50 hover:text-red-700 hover:border-red-200 hover:-translate-y-0.5
                      active:translate-y-0
                      disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none
                      flex justify-center items-center gap-2"
             >
               <span class="material-icons-outlined text-sm">block</span>
               Reject & Request Revision
             </button>
           </div>
           
           <p class="text-[10px] text-slate-400 text-center mt-4">
             Your action will be cryptographically signed and logged.
           </p>
         </div>
      </div>

    </div>
  </div>
</template>