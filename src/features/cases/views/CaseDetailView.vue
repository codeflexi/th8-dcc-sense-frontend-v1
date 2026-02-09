<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCaseDetail } from '@/features/cases/api'

const route = useRoute()
const router = useRouter()

const caseHeader = ref<any>(null)
const loading = ref(false)

const caseId = computed(() => route.params.caseId as string)

async function loadCase() {
  if (!caseId.value) return
  loading.value = true

  try {
    const res = await getCaseDetail(caseId.value)
    caseHeader.value = res
  } catch (e) {
    console.error('load case header error', e)
  } finally {
    loading.value = false
  }
}

/**
 * โหลดเฉพาะตอน caseId เปลี่ยนจริง
 * tab switch จะไม่ยิงซ้ำ
 */
watch(caseId, loadCase, { immediate: true })

const goBack = () => router.push('/cases')
</script>

<template>
  <div class="w-full">

    <!-- ================= HEADER ================= -->
    <div class="px-8 pt-6 pb-4 border-b bg-white">

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
            {{ caseHeader?.entity_name || caseId }}
          </div>

          <div class="text-sm text-slate-500">
            {{ caseHeader?.reference_id || '-' }}
            · {{ caseHeader?.domain || '-' }}
          </div>
        </div>

        <!-- RIGHT -->
        <div class="text-right">
          <div class="text-xs text-slate-400">Total Amount</div>
          <div class="text-xl font-mono font-bold">
            {{ caseHeader?.amount_total?.toLocaleString() || 0 }}
            {{ caseHeader?.currency || 'THB' }}
          </div>
        </div>

      </div>

      <!-- ================= TABS ================= -->
      <div class="flex gap-2 mt-5">

        <!-- DECISION -->
        <RouterLink
          :to="`/cases/${caseId}`"
          v-slot="{ isActive }"
        >
          <button
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold border transition',
              isActive
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            ]"
          >
            Decision Run
          </button>
        </RouterLink>

        <!-- EVIDENCE -->
        <RouterLink
          :to="`/cases/${caseId}/evidence`"
          v-slot="{ isActive }"
        >
          <button
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold border transition',
              isActive
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            ]"
          >
            Evidence
          </button>
        </RouterLink>

        <!-- AUDIT -->
        <RouterLink
          :to="`/cases/${caseId}/audit`"
          v-slot="{ isActive }"
        >
          <button
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold border transition',
              isActive
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            ]"
          >
            Audit Timeline
          </button>
        </RouterLink>

      </div>
    </div>

    <!-- ================= CHILD VIEW ================= -->
    <div class="min-h-[calc(100vh-160px)]">
      <RouterView />
    </div>

  </div>
</template>
