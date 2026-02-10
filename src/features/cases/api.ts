import { http } from '@/lib/http'
import type {
  CaseListResponse,
  CaseDecisionSummary,
  CaseGroup,
  CaseDetailHeader,
} from './types'
import { get } from 'http'

export const caseApi = {

  // =========================
  // LIST CASES
  // =========================
  async getCases(params: {
    page: number
    pageSize: number
    search?: string
    risk?: string
  }): Promise<CaseListResponse> {
    const q = new URLSearchParams()
    q.set('page', String(params.page))
    q.set('page_size', String(params.pageSize))
    if (params.search) q.set('search', params.search)
    if (params.risk && params.risk !== 'ALL') q.set('risk', params.risk)

    return http.get<CaseListResponse>(`/api/v1/cases?${q.toString()}`)
  },

  // =========================
  // ⭐ INGEST FROM PO (NEW API)
  // =========================
  async ingestFromPO(payload: any): Promise<{
    case_id: string
    reference_type: string
    reference_id: string
    status: string
  }> {
    return await http.post('/api/v1/cases/ingest-from-po', payload, {
      headers: {
        'x-actor-id': 'SYSTEM'
      }
    })
  },

}
// =========================
// DETAIL
// =========================
export async function getCaseDetail(
  caseId: string
): Promise<CaseDetailHeader> {
  return http.get<CaseDetailHeader>(`/api/v1/cases/${caseId}`)
}

// =========================
// DECISION SUMMARY
// =========================
export async function getCaseDecisionSummary(
  caseId: string
): Promise<CaseDecisionSummary> {
  return http.get<CaseDecisionSummary>(
    `/api/v1/cases/${caseId}/decision-summary`
  )
}



// =========================
// GROUPS
// =========================
export async function getCaseGroups(
  caseId: string
): Promise<CaseGroup[]> {
  return http.get<CaseGroup[]>(
    `/api/v1/cases/${caseId}/groups`
  )
}