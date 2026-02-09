import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  getCaseDetail,
  getCaseDecisionSummary,
  getCaseGroups,
} from '@/features/cases/api'

type DecisionSummaryResponse = {
  case_id?: string
  run_id?: string
  decision?: string
  confidence?: number
  risk_level?: string
  policy?: any
  summary?: any
  timing?: any
  // rules may or may not exist
  rules?: any[]
  [key: string]: any
}

type CaseGroupsResponse =
  | any[]
  | {
      case_id?: string
      run_id?: string
      groups?: any[]
      [key: string]: any
    }

export const useDecisionStore = defineStore('decision', () => {
  const caseHeader = ref<any>(null)
  const rules = ref<any[]>([])
  const groups = ref<any[]>([])
  const recommendation = ref<string | null>(null)
  const confidenceScore = ref<number | null>(null) // percent 0..100
  const isProcessing = ref(false)

  let currentCaseId: string | null = null
  let inFlightToken = 0

  const resetState = () => {
    // keep header? no — decision view expects fresh per case
    caseHeader.value = null
    rules.value = []
    groups.value = []
    recommendation.value = null
    confidenceScore.value = null
  }

  const normalizeConfidenceToPercent = (v: any): number | null => {
    if (v === null || v === undefined) return null
    const n = Number(v)
    if (!Number.isFinite(n)) return null
    // backend returns 0..1 (0.85) → UI expects %
    const pct = n <= 1 ? n * 100 : n
    // clamp 0..100
    return Math.max(0, Math.min(100, Math.round(pct * 100) / 100))
  }

  const normalizeGroups = (res: CaseGroupsResponse): any[] => {
    if (Array.isArray(res)) return res
    if (res && Array.isArray((res as any).groups)) return (res as any).groups
    return []
  }

  async function loadContext(caseId: string) {
    if (!caseId) return

    // allow reload if explicitly different case
    if (currentCaseId !== caseId) {
      currentCaseId = caseId
      resetState()
    } else {
      // same caseId: do not refetch automatically
      return
    }

    isProcessing.value = true
    const token = ++inFlightToken

    try {
      const [headerRes, summaryResRaw, groupsResRaw] = await Promise.all([
        getCaseDetail(caseId),
        getCaseDecisionSummary(caseId),
        getCaseGroups(caseId),
      ])

      // If user navigated to another case while awaiting, ignore stale response
      if (token !== inFlightToken || currentCaseId !== caseId) return

      const summaryRes = summaryResRaw as DecisionSummaryResponse
      const groupsRes = groupsResRaw as CaseGroupsResponse

      caseHeader.value = headerRes || null

      // groups endpoint returns { groups: [...] }
      groups.value = normalizeGroups(groupsRes)

      // summary endpoint returns { decision, confidence, risk_level, ... }
      recommendation.value = summaryRes?.decision ?? null
      confidenceScore.value = normalizeConfidenceToPercent(summaryRes?.confidence)

      // do not guess rules: only accept if it's an array
      rules.value = Array.isArray(summaryRes?.rules) ? summaryRes.rules! : []
    } catch (err) {
      // keep state reset but do not crash UI
      console.error('decision.loadContext error:', err)
    } finally {
      if (token === inFlightToken) {
        isProcessing.value = false
      }
    }
  }

  async function runAnalysis() {
    // no new endpoints allowed; keep as placeholder
    if (!currentCaseId) return
    console.log('rerun decision', currentCaseId)
  }

  async function submit(action: string, reason: string) {
    // no new endpoints allowed; keep as placeholder
    console.log('submit', action, reason)
  }

  return {
    caseHeader,
    rules,
    groups,
    recommendation,
    confidenceScore,
    isProcessing,
    loadContext,
    runAnalysis,
    submit,
  }
})
