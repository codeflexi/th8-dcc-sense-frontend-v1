// src/features/decision-run/api.ts
import { http } from '@/lib/http'
import type {
  CaseGroupsResponse,
  GroupRulesResponse,
  GroupEvidenceResponse,
  DecisionRunViewContext,
} from './types'

export const decisionRunApi = {

  // procurement groups (ยังใช้ได้)
  getCaseGroups(caseId: string): Promise<CaseGroupsResponse> {
    return http.get(`/api/v1/cases/${caseId}/groups`)
  },

  // ✅ ใหม่
  getDecisionRunView(caseId: string): Promise<DecisionRunViewContext> {
    return http.get(`/api/v1/cases/${caseId}/view`)
  },

  getGroupRules(groupId: string): Promise<GroupRulesResponse> {
    return http.get(`/api/v1/groups/${groupId}/rules`)
  },

  getGroupEvidence(groupId: string): Promise<GroupEvidenceResponse> {
    return http.get(`/api/v1/groups/${groupId}/evidence`)
  },

  // src/features/decision-run/api.ts

async getDocumentPagePdfUrl(documentId: string, page: number): Promise<string> {
  const res: any = await http.get(
    `/api/v1/documents/${documentId}/pages-no/${page}`
  )

  if (!res?.pdf_url) {
    throw new Error('pdf_url not found in response')
  }

  return res.pdf_url
}
}