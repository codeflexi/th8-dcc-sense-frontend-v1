// src/features/decision-run/store.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { decisionRunApi } from './api'
import type {
  CaseGroup,
  CaseGroupsResponse,
  GroupEvidenceResponse,
  GroupRulesResponse,
  GroupRule,
  EvidenceDocument,
  EvidenceItem,
} from './types'

type RightPanelTab = 'WHY' | 'EVIDENCE'

export const useDecisionRunStore = defineStore('decisionRun', () => {
  // =========================
  // Core state
  // =========================
  const currentCaseId = ref<string | null>(null)

  const groups = ref<CaseGroup[]>([])
  const activeGroupId = ref<string | null>(null)

  const loadingGroups = ref(false)
  const loadingWhy = ref(false)
  const loadingEvidence = ref(false)

  // =========================
  // Cached by group
  // =========================
  const rulesCache = ref<Record<string, GroupRulesResponse>>({})
  const evidenceCache = ref<Record<string, GroupEvidenceResponse>>({})

  // =========================
  // Right panel + modals
  // =========================
  const rightTab = ref<RightPanelTab>('WHY')

  const evidenceModalOpen = ref(false)

  const pdfModalOpen = ref(false)
  const pdfDocumentId = ref<string>('')
  const pdfPage = ref<number>(1)
  const pdfUrl = computed(() => {
    if (!pdfDocumentId.value) return ''
    return decisionRunApi.getDocumentPageUrl(pdfDocumentId.value, pdfPage.value)
  })

  const decisionNote = ref<string>('')

  // =========================
  // Derived
  // =========================
  const activeGroup = computed(() => {
    const id = activeGroupId.value
    if (!id) return null
    return groups.value.find(g => g.group_id === id) || null
  })

  const activeWhy = computed(() => {
    const id = activeGroupId.value
    if (!id) return null
    return rulesCache.value[id] || null
  })

  const activeEvidence = computed(() => {
    const id = activeGroupId.value
    if (!id) return null
    return evidenceCache.value[id] || null
  })

  const activeRules = computed<GroupRule[]>(() => activeWhy.value?.rules || [])
  const activeDocuments = computed<EvidenceDocument[]>(() => activeEvidence.value?.documents || [])
  const activeEvidences = computed<EvidenceItem[]>(() => activeEvidence.value?.evidences || [])

  // =========================
  // Utilities
  // =========================
  function resetForNewCase(caseId: string) {
    currentCaseId.value = caseId
    groups.value = []
    activeGroupId.value = null

    rulesCache.value = {}
    evidenceCache.value = {}

    rightTab.value = 'WHY'
    evidenceModalOpen.value = false

    pdfModalOpen.value = false
    pdfDocumentId.value = ''
    pdfPage.value = 1

    decisionNote.value = ''
  }

  function pickDefaultGroup(list: CaseGroup[]) {
    // CFO cockpit: focus exception first
    const risky = list.find(g => String(g.risk_level).toUpperCase() !== 'LOW')
    return risky?.group_id || list?.[0]?.group_id || null
  }

  // =========================
  // Loaders
  // =========================
  async function loadCase(caseId: string) {
    if (!caseId) return

    // case change: reset all
    if (currentCaseId.value !== caseId) {
      resetForNewCase(caseId)
    } else {
      // same case: do nothing (idempotent)
      if (groups.value.length) return
    }

    loadingGroups.value = true
    try {
      const res: CaseGroupsResponse = await decisionRunApi.getCaseGroups(caseId)
      const list = Array.isArray(res?.groups) ? res.groups : []
      // sort by risk then decision
      groups.value = [...list].sort((a, b) => {
        const ra = String(a.risk_level || '').toUpperCase()
        const rb = String(b.risk_level || '').toUpperCase()
        const score = (x: string) =>
          x === 'CRITICAL' ? 4 : x === 'HIGH' ? 3 : x === 'MEDIUM' ? 2 : x === 'LOW' ? 1 : 0
        return score(rb) - score(ra)
      })

      const first = pickDefaultGroup(groups.value)
      if (first) {
        await selectGroup(first, { openEvidence: false })
      }
    } finally {
      loadingGroups.value = false
    }
  }

  async function loadWhy(groupId: string) {
    if (!groupId) return
    if (rulesCache.value[groupId]) return

    loadingWhy.value = true
    try {
      const res = await decisionRunApi.getGroupRules(groupId)
      rulesCache.value = { ...rulesCache.value, [groupId]: res }
    } finally {
      loadingWhy.value = false
    }
  }

  async function loadEvidence(groupId: string) {
    if (!groupId) return
    if (evidenceCache.value[groupId]) return

    loadingEvidence.value = true
    try {
      const res = await decisionRunApi.getGroupEvidence(groupId)
      evidenceCache.value = { ...evidenceCache.value, [groupId]: res }
    } finally {
      loadingEvidence.value = false
    }
  }

  async function selectGroup(groupId: string, opts?: { openEvidence?: boolean }) {
    if (!groupId) return
    if (activeGroupId.value === groupId && (rulesCache.value[groupId] || evidenceCache.value[groupId])) {
      // already loaded
      if (opts?.openEvidence) evidenceModalOpen.value = true
      return
    }

    activeGroupId.value = groupId

    // load WHY first for fast perception, evidence in parallel
    await Promise.all([loadWhy(groupId), loadEvidence(groupId)])

    if (opts?.openEvidence) evidenceModalOpen.value = true
  }

  // =========================
  // UI actions
  // =========================
  function setRightTab(tab: RightPanelTab) {
    rightTab.value = tab
  }

  function openEvidenceModal() {
    evidenceModalOpen.value = true
    rightTab.value = 'EVIDENCE'
  }

  function closeEvidenceModal() {
    evidenceModalOpen.value = false
  }

  function openPdf(documentId: string, page = 1) {
    if (!documentId) return
    pdfDocumentId.value = documentId
    pdfPage.value = page || 1
    pdfModalOpen.value = true
  }

  function closePdf() {
    pdfModalOpen.value = false
  }

  function gotoPdfPage(page: number) {
    pdfPage.value = Math.max(1, Number(page) || 1)
  }

  // =========================
  // CFO actions (placeholder)
  // =========================
  async function submitDecision(action: 'APPROVE' | 'REJECT') {
    // backend submit ยังไม่ได้ให้ endpoint ในชุดนี้
    // เราเก็บ state พร้อมไว้ให้แล้ว
    console.log('submitDecision', { action, note: decisionNote.value, caseId: currentCaseId.value })
  }

  return {
    // state
    currentCaseId,
    groups,
    activeGroupId,
    rightTab,

    loadingGroups,
    loadingWhy,
    loadingEvidence,

    // derived
    activeGroup,
    activeWhy,
    activeEvidence,
    activeRules,
    activeDocuments,
    activeEvidences,

    // modals
    evidenceModalOpen,
    pdfModalOpen,
    pdfDocumentId,
    pdfPage,
    pdfUrl,

    // decision bar
    decisionNote,

    // actions
    loadCase,
    selectGroup,

    setRightTab,
    openEvidenceModal,
    closeEvidenceModal,

    openPdf,
    closePdf,
    gotoPdfPage,

    submitDecision,
  }
})
