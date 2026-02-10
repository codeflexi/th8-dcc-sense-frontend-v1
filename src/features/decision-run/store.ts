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
  const currentCaseId = ref<string | null>(null)

  const groups = ref<CaseGroup[]>([])
  const activeGroupId = ref<string | null>(null)

  const loadingGroups = ref(false)
  const loadingWhy = ref(false)
  const loadingEvidence = ref(false)

  const rulesCache = ref<Record<string, GroupRulesResponse>>({})
  const evidenceCache = ref<Record<string, GroupEvidenceResponse>>({})

  const rightTab = ref<RightPanelTab>('WHY')

  const evidenceModalOpen = ref(false)

  // ✅ PDF state
  const pdfModalOpen = ref(false)
  const pdfDocumentId = ref<string>('')
  const pdfPage = ref<number>(1)
  const pdfUrl = ref<string>('') // ✅ ไม่ใช่ computed แล้ว
  const pdfPageText = ref<string>('') // (optional) เผื่ออยากโชว์ text

  const decisionNote = ref<string>('')

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
    pdfUrl.value = ''
    pdfPageText.value = ''

    decisionNote.value = ''
  }

  function pickDefaultGroup(list: CaseGroup[]) {
    const risky = list.find(g => String(g.risk_level).toUpperCase() !== 'LOW')
    return risky?.group_id || list?.[0]?.group_id || null
  }

  async function loadCase(caseId: string) {
    if (!caseId) return

    if (currentCaseId.value !== caseId) {
      resetForNewCase(caseId)
    } else {
      if (groups.value.length) return
    }

    loadingGroups.value = true
    try {
      const res: CaseGroupsResponse = await decisionRunApi.getCaseGroups(caseId)
      const list = Array.isArray(res?.groups) ? res.groups : []

      groups.value = [...list].sort((a, b) => {
        const score = (x: string) => (x === 'CRITICAL' ? 4 : x === 'HIGH' ? 3 : x === 'MEDIUM' ? 2 : x === 'LOW' ? 1 : 0)
        return score(String(b.risk_level || '').toUpperCase()) - score(String(a.risk_level || '').toUpperCase())
      })

      const first = pickDefaultGroup(groups.value)
      if (first) await selectGroup(first, { openEvidence: false })
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
      if (opts?.openEvidence) evidenceModalOpen.value = true
      return
    }

    activeGroupId.value = groupId
    await Promise.all([loadWhy(groupId), loadEvidence(groupId)])

    if (opts?.openEvidence) evidenceModalOpen.value = true
  }

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

  // ✅ จุดสำคัญ: เปิด PDF ต้อง fetch ก่อน แล้วค่อยเอา pdf_url ไปใส่ iframe
  async function openPdf(documentId: string, page = 1) {
    if (!documentId) return
    pdfDocumentId.value = documentId
    pdfPage.value = page || 1

    try {
      const res = await decisionRunApi.getDocumentPage(documentId, pdfPage.value)
      // backend ของคุณตอนนี้คืน pdf_url
      pdfUrl.value = (res.pdf_url || res.image_url || '') ?? ''
      pdfPageText.value = (res.page_text || '') ?? ''
      pdfModalOpen.value = true
    } catch (e) {
      // กันหน้าเงียบ
      pdfUrl.value = ''
      pdfPageText.value = ''
      pdfModalOpen.value = true
      console.error('openPdf error', e)
    }
  }

  function closePdf() {
    pdfModalOpen.value = false
  }

  async function gotoPdfPage(page: number) {
    const next = Math.max(1, Number(page) || 1)
    pdfPage.value = next
    if (!pdfDocumentId.value) return
    await openPdf(pdfDocumentId.value, pdfPage.value)
  }

  async function submitDecision(action: 'APPROVE' | 'REJECT') {
    console.log('submitDecision', { action, note: decisionNote.value, caseId: currentCaseId.value })
  }

  return {
    currentCaseId,
    groups,
    activeGroupId,
    rightTab,

    loadingGroups,
    loadingWhy,
    loadingEvidence,

    activeGroup,
    activeWhy,
    activeEvidence,
    activeRules,
    activeDocuments,
    activeEvidences,

    evidenceModalOpen,
    pdfModalOpen,
    pdfDocumentId,
    pdfPage,
    pdfUrl,
    pdfPageText,

    decisionNote,

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
