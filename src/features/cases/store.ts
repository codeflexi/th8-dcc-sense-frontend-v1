// src/features/cases/stores/store.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { caseApi, getCaseDetail } from './api'
import type { CaseDetailHeader, CaseListItem } from './types'

export const useCaseListStore = defineStore('caseList', {
  state: () => ({
    items: [] as CaseListItem[],
    loading: false,
    page: 1,
    pageSize: 10,
    total: 0,
    search: '',
    risk: 'ALL',
  }),
  getters: {
    totalPages(state) {
      return Math.ceil(state.total / state.pageSize)
    },
  },
  actions: {
    async fetchCases() {
      this.loading = true
      try {
        const res = await caseApi.getCases({
          page: this.page,
          pageSize: this.pageSize,
          search: this.search || undefined,
          risk: this.risk,
        })
        this.items = res.items
        this.total = res.total
      } finally {
        this.loading = false
      }
    },
  },
})

export const useCaseDetailStore = defineStore('case-detail', () => {
  const header = ref<CaseDetailHeader | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentCaseId = ref<string | null>(null)

  async function fetchCase(caseId: string, opts?: { force?: boolean }) {
    const force = Boolean(opts?.force)

    // ✅ ไม่ refetch ถ้า caseId เดิมและมี header แล้ว (กันหายตอนสลับ tab)
    if (!force && currentCaseId.value === caseId && header.value) return

    // ✅ reset เมื่อเปลี่ยนเคส
    if (currentCaseId.value !== caseId) {
      header.value = null
      error.value = null
      currentCaseId.value = caseId
    }

    loading.value = true
    try {
      const data = await getCaseDetail(caseId)
      // ✅ กัน race: response เก่ามาทีหลัง
      if (currentCaseId.value === caseId) {
        header.value = data
      }
    } catch (e: any) {
      if (currentCaseId.value === caseId) {
        error.value = e?.message || 'Failed to load case'
      }
    } finally {
      if (currentCaseId.value === caseId) {
        loading.value = false
      }
    }
  }

  function reset() {
    header.value = null
    loading.value = false
    error.value = null
    currentCaseId.value = null
  }

  return {
    header,
    loading,
    error,
    currentCaseId,
    fetchCase,
    reset,
  }
})
