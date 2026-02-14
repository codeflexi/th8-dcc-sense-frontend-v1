<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { caseApi } from '../api'
import { useToast } from '@/composables/useToast'

const { addToast } = useToast()
const router = useRouter()
const isSubmitting = ref(false)

// =========================
// LINE MODEL
// =========================
interface LineItem {
  sku: string
  description: string
  qty: number
  unitPrice: number
}

const lineItems = ref<LineItem[]>([
  { sku: 'CHEM-IPA-20', description: 'Isopropyl Alcohol 99 20L Drum', qty: 10, unitPrice: 3000 },
  { sku: 'CHEM-DET-10', description: 'Industrial Detergent Liquid (10L)', qty: 20, unitPrice: 900 }
])

// =========================
// FORM
// =========================
const formData = ref({
  vendorId: 'th8',   // ⭐ entity_id ต้องเป็น vendor id (ไม่ใช่ชื่อ)
  poNumber: `PO-${new Date().getFullYear()}-${Math.floor(100000 + Math.random()*900000)}`,
  amount: 0
})

// =========================
// AUTO TOTAL
// =========================
watch(lineItems, (items)=>{
  const total = items.reduce((sum,i)=> sum + (i.qty * i.unitPrice),0)
  formData.value.amount = total
},{deep:true, immediate:true})

// =========================
const addLineItem = () => {
  lineItems.value.push({ sku:'', description:'', qty:1, unitPrice:0 })
}

const removeLineItem = (idx:number)=>{
  if(lineItems.value.length>1){
    lineItems.value.splice(idx,1)
  }
}

// =========================
// ⭐ PAYLOAD ตรง curl
// =========================
const payloadPreview = computed(()=>({

  reference_type: "ERP_PO",
  reference_id: formData.value.poNumber,

  entity_id: formData.value.vendorId,
  entity_type: "VENDOR",

  domain: "PROCUREMENT",
  currency: "THB",
  amount_total: formData.value.amount,

  line_items: lineItems.value.map((item,idx)=>({
    source_line_ref: String(idx+1),
    sku: item.sku,
    item_name: item.description,
    description: item.description,
    quantity: item.qty,
    uom: "set",
    unit_price: item.unitPrice,
    currency: "THB"
  }))
}))

// =========================
// SUBMIT
// =========================
async function handleSubmit(){
  isSubmitting.value = true

  try{
    console.log("POST ingest-from-po:", payloadPreview.value)

    const res = await caseApi.ingestFromPO(payloadPreview.value)

    const caseId = res?.case_id || res?.data?.case_id

    addToast('success','Case Created',`Case ${caseId}`)

    if(caseId){
      router.push(`/cases/${caseId}`)
    }else{
      router.push('/cases')
    }

  }catch(err:any){
    console.error(err)

    addToast(
      'error',
      'Ingestion Failed',
      err?.response?.data?.detail || err.message || 'backend error'
    )
  }
  finally{
    isSubmitting.value=false
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
               <input v-model="formData.vendorId" type="text" class="w-full p-2 text-sm border border-slate-300 rounded focus:border-primary focus:outline-none transition">
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