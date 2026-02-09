// src/features/cases/stores/api.ts
import { http } from '@/lib/http'
import type {
  CaseListResponse,
  CaseDecisionSummary,
  CaseGroup,
  CaseDetailHeader,
} from './types'

export const caseApi = {
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
}

export async function getCaseDetail(caseId: string): Promise<CaseDetailHeader> {
  return await http.get(`/api/v1/cases/${caseId}`)
}

export async function getCaseDecisionSummary(caseId: string): Promise<CaseDecisionSummary> {
  return await http.get(`/api/v1/cases/${caseId}/decision-summary`)
}

export async function getCaseGroups(caseId: string): Promise<CaseGroup[]> {
  return await http.get(`/api/v1/cases/${caseId}/groups`)
}
