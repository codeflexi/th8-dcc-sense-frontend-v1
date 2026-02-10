// src/features/decision-run/api.ts
import { http } from '@/lib/http'
import type { CaseGroupsResponse, GroupRulesResponse, GroupEvidenceResponse } from './types'

export type DocumentPageResponse = {
  document_id: string
  contract_id?: string | null
  file_name?: string | null
  page: number
  page_id?: string | null
  page_text?: string | null
  pdf_url?: string | null
  image_url?: string | null
  text_blocks?: any[]
}

export const decisionRunApi = {
  getCaseGroups(caseId: string): Promise<CaseGroupsResponse> {
    return http.get(`/api/v1/cases/${caseId}/groups`)
  },

  getGroupRules(groupId: string): Promise<GroupRulesResponse> {
    return http.get(`/api/v1/groups/${groupId}/rules`)
  },

  getGroupEvidence(groupId: string): Promise<GroupEvidenceResponse> {
    return http.get(`/api/v1/groups/${groupId}/evidence`)
  },

  // ✅ backend คืน JSON มี pdf_url
  getDocumentPage(documentId: string, page: number): Promise<DocumentPageResponse> {
    return http.get(`/api/v1/documents/${documentId}/pages-no/${page}`)
  },
}
