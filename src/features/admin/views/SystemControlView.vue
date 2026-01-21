<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  FileText, Database, Activity, 
  CheckCircle2, AlertCircle, Loader2, 
  Eye, X, Code, ExternalLink 
} from 'lucide-vue-next'

// Import จาก admin/api
import { adminApi, type RAGDocument } from '@/features/admin/api'

const documents = ref<RAGDocument[]>([])
const isLoading = ref(true)
const selectedDoc = ref<RAGDocument | null>(null)

const fetchDocs = async () => {
  try {
    isLoading.value = true
    console.log("Fetching documents...")
    documents.value = await adminApi.getDocuments()
    console.log("Documents received:", documents.value)
  } catch (error) {
    console.error("Error in view:", error)
  } finally {
    isLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr || dateStr === '-') return '-'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ✅ ฟังก์ชันเปิดไฟล์ (เรียก API ขอ Signed URL)
const openFile = async (doc: RAGDocument) => {
  try {
    document.body.style.cursor = 'wait';
    
    const url = await adminApi.getDocumentUrl(doc.id);
    
    if (url) {
      window.open(url, '_blank');
    } else {
      alert("ไม่สามารถเปิดไฟล์ได้ (File path not found)");
    }
  } catch (e) {
    console.error(e)
    alert("Error opening file");
  } finally {
    document.body.style.cursor = 'default';
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'INDEXED': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'PROCESSING': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'ERROR': return 'bg-rose-100 text-rose-700 border-rose-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

onMounted(() => {
  fetchDocs()
})
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 p-8 font-sans relative">
    
    <div class="flex justify-between items-end mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">System Control Center</h1>
        <p class="text-slate-500 mt-1">Manage AI Logic & Knowledge Base</p>
      </div>
      <div class="flex gap-3">
         <div class="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
            <Activity class="w-4 h-4 text-emerald-500" />
            <span>System Online</span>
         </div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
      <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <div class="col-span-4">Filename</div> 
        <div class="col-span-2">Domain</div>   
        <div class="col-span-2">Date</div>
        <div class="col-span-1 text-center">Vectors</div> 
        <div class="col-span-2 text-center">Status</div>
        <div class="col-span-1 text-right">Meta</div>
      </div>

      <div class="overflow-y-auto flex-1">
        <div v-if="isLoading" class="flex justify-center items-center h-40">
           <Loader2 class="w-8 h-8 animate-spin text-slate-300" />
        </div>

        <div v-else-if="!documents.length" class="text-center py-10 text-slate-400">
           <Database class="w-12 h-12 mx-auto mb-3 opacity-20" />
           <p>No documents found.</p>
           <p class="text-xs mt-2 text-red-400">Please check console log (F12) if you suspect an error.</p>
        </div>
        
        <div 
          v-else
          v-for="doc in documents" 
          :key="doc.id"
          class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center group"
        >
          <div class="col-span-4 flex items-center gap-3 group/file">
            <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover/file:bg-blue-50 group-hover/file:text-blue-600 transition-colors">
              <FileText class="w-4 h-4" />
            </div>
            
            <div class="min-w-0">
              <button 
                @click="openFile(doc)"
                class="text-sm font-medium text-slate-800 truncate hover:text-blue-600 hover:underline flex items-center gap-2 focus:outline-none"
                :title="doc.filename"
              >
                {{ doc.filename }}
                <ExternalLink class="w-3 h-3 opacity-0 group-hover/file:opacity-100 transition-opacity text-slate-400" />
              </button>
              
              <p class="text-[10px] text-slate-400 font-mono">ID: {{ doc.id.slice(0,8) }}...</p>
            </div>
          </div>

          <div class="col-span-2">
             <span class="px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-bold uppercase tracking-wide">
               {{ doc.domain || 'GENERAL' }}
             </span>
          </div>

          <div class="col-span-2 text-xs text-slate-600">{{ formatDate(doc.uploadDate) }}</div>
          
          <div class="col-span-1 text-center">
             <span class="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600">
               {{ doc.chunkCount?.toLocaleString() || 0 }}
             </span>
          </div>

          <div class="col-span-2 flex justify-center">
            <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border" 
              :class="getStatusBadge(doc.vectorStatus)"
            >
               <CheckCircle2 v-if="doc.vectorStatus === 'INDEXED'" class="w-3 h-3" />
               <Loader2 v-else-if="doc.vectorStatus === 'PROCESSING'" class="w-3 h-3 animate-spin" />
               <AlertCircle v-else class="w-3 h-3" />
               {{ doc.vectorStatus }}
            </span>
          </div>

          <div class="col-span-1 text-right">
             <button 
               @click="selectedDoc = doc"
               class="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
               title="View Metadata"
             >
               <Eye class="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedDoc" class="absolute inset-0 z-50 bg-black/20 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div class="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div class="flex items-center gap-2">
             <Code class="w-4 h-4 text-slate-500" />
             <h3 class="text-sm font-bold text-slate-700">Document Metadata</h3>
          </div>
          <button @click="selectedDoc = null" class="text-slate-400 hover:text-slate-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="p-0 bg-[#0d1117] overflow-auto max-h-[400px]">
          <pre class="text-xs font-mono text-slate-300 p-4">{{ JSON.stringify(selectedDoc.metadata, null, 2) }}</pre>
        </div>
        <div class="px-4 py-2 bg-slate-50 border-t border-slate-100 text-right">
           <span class="text-[10px] text-slate-400">File ID: {{ selectedDoc.id }}</span>
        </div>
      </div>
    </div>

  </div>
</template>