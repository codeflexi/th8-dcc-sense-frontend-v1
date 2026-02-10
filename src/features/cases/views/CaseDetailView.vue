<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCaseDetail , getCaseDecisionSummary } from '@/features/cases/api'
import type { CaseDetailHeader } from '@/features/cases/types'

import { useCaseDetailStore } from '@/features/cases/store'



const store = useCaseDetailStore()
const route = useRoute()
const router = useRouter()

const caseHD = ref<CaseDetailHeader | null>(null)
const caseSummary = ref<any>(null)
const loading = ref(false)

// ใช้ source เดียวให้ชัด
const caseId = computed(() => route.params.caseId as string)

// guard กัน response เก่า
let currentRequestId = 0

async function loadCase(id: string) {
  if (!id) return

  const requestId = ++currentRequestId
  loading.value = true

  try {
    const res = await getCaseDetail(id)

    // ถ้ามี request ใหม่กว่า → ทิ้ง response เก่า
    if (requestId !== currentRequestId) return

    caseHD.value = res
  } catch (e) {
    console.error('load case header error', e)
  } finally {
    if (requestId === currentRequestId) {
      loading.value = false
    }
  }
}

async function loadCaseSummary(id: string) {
  if (!id) return

  const requestId = ++currentRequestId
  loading.value = true

  try {
    const res = await getCaseDecisionSummary(id)

    // ถ้ามี request ใหม่กว่า → ทิ้ง response เก่า
    if (requestId !== currentRequestId) return

    caseSummary.value = res
  } catch (e) {
    console.error('load case summary error', e)
  } finally {
    if (requestId === currentRequestId) {
      loading.value = false
    }
  }
}


// // ✅ จุดเดียวพอ
// watch(caseId, (id) => {
//   caseHeader.value = null
//   loadCase(id)
// }, { immediate: true })

watch(caseId, async (id) => {
  await loadCase(id)
  await loadCaseSummary(id)
  console.log('caseHD:', caseHD.value)
  console.log('caseSummary:', caseSummary.value)
}, { immediate: true })


const goBack = () => router.push('/cases')
</script>

<template>
  <div class="w-full h-full">

     <!-- 🔴 ROOT ต้องเป็น flex column เต็ม -->
  <div class="flex flex-col h-full w-full">

       <!-- ================= HEADER ================= -->
    <div class="px-8 pt-6 pb-4 border-b bg-white shrink-0">

      <button
        @click="goBack"
        class="text-sm text-slate-500 hover:text-slate-900 mb-3"
      >
        ← Back to Case Portfolio
      </button>

      <div class="flex justify-between items-center">

        <!-- LEFT -->
        <div>
          <div class="text-xs text-slate-400">Case</div>
          <div class="text-lg font-bold">
            {{ caseHD?.entity_name || caseId }}  {{ caseHD?.vendor ? '· ' + caseHD.vendor : '' }} 
          </div>

          <div class="text-sm text-slate-500">
            {{ caseHD?.reference_id || '-' }} {{ caseHD?.po_number ? '· ' + caseHD.po_number : '' }}
            · {{ caseHD?.domain || '-' }}   {{ caseHD?.created_at ? '· ' + new Date(caseHD.created_at).toLocaleDateString() : '' }}
          </div>
        </div>

        <!-- RIGHT -->
        <div class="text-right">
          <div class="text-xs text-slate-400">Total Amount</div>
          <div class="text-xl font-mono font-bold">
            {{ caseHD?.amount_total?.toLocaleString() || 0 }}
            {{ caseHD?.currency || 'THB' }} 
          </div>
        </div>

      </div>

      <!-- ================= TABS ================= -->
      <div class="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">

    <!-- DECISION -->
    <RouterLink :to="`/cases/${caseId}`" v-slot="{ isExactActive }">
      <div
        :class="[
          'px-5 py-2 text-sm font-semibold rounded-lg transition',
          isExactActive
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        Decision Run
      </div>
    </RouterLink>

    <!-- EVIDENCE -->
    <RouterLink :to="`/cases/${caseId}/evidence`" v-slot="{ isExactActive }">
      <div
        :class="[
          'px-5 py-2 text-sm font-semibold rounded-lg transition',
          isExactActive
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        Evidence
      </div>
    </RouterLink>

    <!-- AUDIT -->
    <RouterLink :to="`/cases/${caseId}/audit`" v-slot="{ isExactActive }">
      <div
        :class="[
          'px-5 py-2 text-sm font-semibold rounded-lg transition',
          isExactActive
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-800'
        ]"
      >
        Audit Timeline
      </div>
    </RouterLink>

  </div>
</div>
</div>
<!-- ================= CONTENT AREA ================= -->
    <!-- 🔥 จุดสำคัญ: scroll อยู่ตรงนี้ -->
    <div class="flex-1 overflow-y-auto bg-slate-50">
      <div class="w-[92%] max-w-[1600px] mx-auto py-6">
        <RouterView />
      </div>
    </div>

  </div>
</template>
