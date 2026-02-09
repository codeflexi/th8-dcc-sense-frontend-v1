import { http } from '@/lib/http'
import type { CaseHeader, CaseDecisionRun } from './types'

// Case
export const getCaseById = (caseId: string): Promise<CaseHeader> =>
  http.get(`/api/v1/cases/${caseId}`)

// Decision groups
export const getCaseGroups = (caseId: string): Promise<CaseDecisionRun> =>
  http.get(`/api/v1/cases/${caseId}/groups`)
