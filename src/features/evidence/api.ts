// src/features/copilot/api.ts
import { http } from '@/lib/http'

export type CopilotEventType = 'trace' | 'evidence_reveal' | 'message_chunk' | 'error'

export interface CopilotEvent {
  type: CopilotEventType
  data: any
}

export const copilotApi = {
  async streamChat(
    payload: { case_id: string; query: string },
    onEvent: (event: CopilotEvent) => void,
    opts?: { signal?: AbortSignal }
  ) {
    try {
      await http.streamNdjson(
        '/api/v1/copilot/chat/stream',
        payload,
        (ev) => onEvent(ev as CopilotEvent),
        {
          // ใส่ header เพิ่มได้ที่นี่ ถ้าต้องการ actor
          headers: { 'x-actor-id': 'SYSTEM' },
          signal: opts?.signal,
        }
      )
    } catch (error: any) {
      onEvent({ type: 'error', data: { message: error?.message || 'Connection failed' } })
      throw error
    }
  },
}
