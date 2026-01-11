<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { caseApi } from '../api';
// 1. Import
import { useToast } from '@/composables/useToast';

// 2. Setup
const { addToast } = useToast();

const router = useRouter();
const isSubmitting = ref(false);

// --- 1. Data Models ---
interface LineItem {
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
}

const lineItems = ref<LineItem[]>([
  { sku: 'IT-LAP-001', description: 'MacBook Pro 14"', qty: 5, unitPrice: 75000 },
  { sku: 'IT-ACC-002', description: 'Magic Mouse', qty: 5, unitPrice: 2500 }
]);

const formData = ref({
  vendorName: 'Siam Makro PCL',
  amount: 0, // Will auto-calc
  poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  description: 'IT Equipment Batch Procurement Q1',
  date: new Date().toISOString().split('T')[0]
});

// --- 2. Logic ---

// Auto-calculate Total Amount when items change
watch(lineItems, (newItems) => {
  const total = newItems.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  formData.value.amount = total;
}, { deep: true, immediate: true });

const addLineItem = () => {
  lineItems.value.push({ sku: '', description: '', qty: 1, unitPrice: 0 });
};

const removeLineItem = (index: number) => {
  if (lineItems.value.length > 1) {
    lineItems.value.splice(index, 1);
  }
};

const generatedCaseId = computed(() => `CASE-${formData.value.poNumber}`);

// Construct Payload structure matching Swagger
// ใน CaseIngestView.vue

const payloadPreview = computed(() => ({
  case_id: generatedCaseId.value,
  domain: "procurement",
  payload: {
    po_number: formData.value.poNumber,
    
    // 🔥 ส่งไปทุก Key ที่เป็นไปได้ เพื่อดักทาง Backend
    vendor_name: formData.value.vendorName, 
    vendor_id: formData.value.vendorName, 
    vendor: formData.value.vendorName, 
    supplier: formData.value.vendorName,
    
    amount_total: formData.value.amount,
    currency: "THB",
    description: formData.value.description,
    issue_date: formData.value.date,
    line_items: lineItems.value.map(item => ({
      sku: item.sku,
      item_desc: item.description,
      quantity: item.qty,
      unit_price: item.unitPrice,
      total_price: item.qty * item.unitPrice
    }))
  }
}));

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    console.log('Submitting Payload:', payloadPreview.value);
    await caseApi.ingest(payloadPreview.value);
    
    // ✅ เรียกใช้ Toast แบบสวยงาม
    addToast('success', 'Ingestion Successful', `Case ID: ${generatedCaseId.value} has been created.`);
    
    router.push('/cases'); 
  } catch (error: any) {
    console.error('Ingest Error Details:', error);
    
    // ❌ Error Toast
    addToast('error', 'Ingestion Failed', error.message || 'Please check backend connection.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto animate-enter pb-20">
    
    <div class="mb-8 flex items-center gap-4">
      <button @click="router.back()" class="p-2 hover:bg-slate-100 rounded-full transition">
        <span class="material-icons-outlined text-slate-500">arrow_back</span>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Ingest New Case</h1>
        <p class="text-slate-500 text-sm">Manually inject a procurement case for simulation (Bypass ERP)</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <div class="lg:col-span-7 space-y-6">
        
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 class="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span class="material-icons-outlined text-slate-400">receipt_long</span>
            Header Details
          </h3>
          
          <div class="grid grid-cols-2 gap-4">
             <div class="col-span-2">
               <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vendor Name</label>
               <input v-model="formData.vendorName" type="text" class="w-full p-2 text-sm border border-slate-300 rounded focus:border-primary focus:outline-none transition">
             </div>

             <div>
               <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">PO Number</label>
               <input v-model="formData.poNumber" type="text" class="w-full p-2 text-sm border border-slate-300 rounded focus:border-primary focus:outline-none transition font-mono">
             </div>
             
             <div>
               <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Issue Date</label>
               <input v-model="formData.date" type="date" class="w-full p-2 text-sm border border-slate-300 rounded focus:border-primary focus:outline-none transition font-mono">
             </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
           <div class="flex justify-between items-center border-b border-slate-100 pb-2">
             <h3 class="font-bold text-slate-800 flex items-center gap-2">
               <span class="material-icons-outlined text-slate-400">shopping_cart</span>
               Line Items
             </h3>
             <button @click="addLineItem" class="text-xs font-bold text-primary hover:text-red-700 flex items-center gap-1">
               <span class="material-icons-outlined text-sm">add</span> Add SKU
             </button>
           </div>

           <div class="space-y-3">
             <div v-for="(item, idx) in lineItems" :key="idx" class="flex gap-2 items-start bg-slate-50 p-2 rounded border border-slate-200">
               <div class="flex-1 space-y-2">
                 <div class="flex gap-2">
                   <input v-model="item.sku" placeholder="SKU Code" class="w-1/3 p-1.5 text-xs border border-slate-300 rounded font-mono">
                   <input v-model="item.description" placeholder="Item Description" class="flex-1 p-1.5 text-xs border border-slate-300 rounded">
                 </div>
                 <div class="flex gap-2 items-center">
                   <div class="flex items-center gap-1 w-1/3">
                     <span class="text-[10px] text-slate-400 font-bold uppercase">Qty</span>
                     <input v-model.number="item.qty" type="number" class="w-full p-1.5 text-xs border border-slate-300 rounded text-right">
                   </div>
                   <div class="flex items-center gap-1 w-1/3">
                     <span class="text-[10px] text-slate-400 font-bold uppercase">Price</span>
                     <input v-model.number="item.unitPrice" type="number" class="w-full p-1.5 text-xs border border-slate-300 rounded text-right">
                   </div>
                   <div class="flex-1 text-right text-xs font-bold text-slate-700">
                     {{ (item.qty * item.unitPrice).toLocaleString() }}
                   </div>
                 </div>
               </div>
               <button @click="removeLineItem(idx)" class="mt-1 text-slate-400 hover:text-red-500">
                 <span class="material-icons-outlined text-sm">delete</span>
               </button>
             </div>
           </div>
           
           <div class="flex justify-between items-center pt-2 border-t border-slate-100 mt-4">
             <span class="text-xs font-bold text-slate-500 uppercase">Total Amount (THB)</span>
             <input v-model.number="formData.amount" type="number" class="w-40 p-2 text-right font-bold text-lg border-b border-slate-300 focus:border-primary focus:outline-none bg-transparent">
           </div>
        </div>

        <button 
          @click="handleSubmit" 
          :disabled="isSubmitting"
          class="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 hover:from-red-700 hover:to-red-800 transition transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2"
        >
          <span v-if="isSubmitting" class="material-icons-outlined animate-spin">refresh</span>
          <span v-else class="material-icons-outlined">cloud_upload</span>
          Simulate Ingestion
        </button>
      </div>

      <div class="lg:col-span-5 flex flex-col h-full">
         <div class="bg-slate-900 p-6 rounded-xl shadow-2xl flex flex-col sticky top-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="font-bold text-slate-300 text-sm flex items-center gap-2">
                <span class="material-icons-outlined text-xs">code</span> Payload Preview
              </h3>
              <span class="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">POST /api/cases/ingest</span>
            </div>
            
            <div class="bg-black/40 rounded-lg p-4 font-mono text-[10px] leading-relaxed text-slate-300 overflow-auto max-h-[500px] border border-slate-700 relative">
              <pre>{{ JSON.stringify(payloadPreview, null, 2) }}</pre>
            </div>
            
            <div class="mt-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded text-xs text-blue-200 flex gap-2">
               <span class="material-icons-outlined text-sm shrink-0">info</span>
               <p>The <strong>AI Risk Engine</strong> will interpret these line items to detect split POs and price anomalies.</p>
            </div>
         </div>
      </div>

    </div>
  </div>
</template>