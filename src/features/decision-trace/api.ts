// src/features/audit/api.ts

import { http } from '@/lib/http'
import type { AuditTimelineResponse } from './types'

export const auditApi = {
  async getAuditTimeline(caseId: string): Promise<AuditTimelineResponse> {
    // NEW endpoint (audit timeline จริง)
    return await http.get<AuditTimelineResponse>(`/api/v1/cases/${caseId}/audit-timeline`)
  },
}