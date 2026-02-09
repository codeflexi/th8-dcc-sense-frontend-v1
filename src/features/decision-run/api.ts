// src/features/decision-run/api.ts
import { http } from '@/lib/http'
import type {
  CaseGroupsResponse,
  GroupEvidenceResponse,
  GroupRulesResponse,
} from './types'

export const decisionRunApi = {
  // GET /cases/{case_id}/groups
  async getCaseGroups(caseId: string): Promise<CaseGroupsResponse> {
    return await http.get(`/api/v1/cases/${caseId}/groups`)
  },

  // GET /groups/{group_id}/rules
  // จากตัวอย่างของคุณ path เป็น /api/v1/groups/groups/{groupId}/rules
  async getGroupRules(groupId: string): Promise<GroupRulesResponse> {
    return await http.get(`/api/v1/groups/groups/${groupId}/rules`)
  },

  // GET /groups/{group_id}/evidence
  async getGroupEvidence(groupId: string): Promise<GroupEvidenceResponse> {
    return await http.get(`/api/v1/groups/groups/${groupId}/evidence`)
  },

  // PDF page endpoint (ใช้กับ iframe/img/pdf viewer)
  getDocumentPageUrl(documentId: string, page: number) {
    return `/api/v1/documents/${documentId}/pages/${page}`
  },
}
