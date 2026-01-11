
import { http } from '@/lib/http';
import type { AuditLog } from './types';

export const auditApi = {
  async getLogs(caseId: string): Promise<AuditLog[]> {
    try {
      // ใช้ parameter group=flat ตาม Swagger เพื่อให้ได้ Timeline เรียงกัน
      const rawLogs = await http.get<any[]>(`/api/cases/${caseId}/audit?group=flat`);

      return rawLogs.map(log => ({
        id: log.event_id,
        action: log.event_type,
        actor: {
          name: log.actor || 'System',
          role: log.actor_role || 'Auto'
        },
        timestamp: log.timestamp,
        details: log.message, // หรือ log.details ถ้าต้องการ object
        hash: '0x' + log.event_id.substring(0,8), // Mock Hash จาก ID
        status: 'COMPLETED',
        context: log.context || []
      }));
    } catch (e) {
      console.error('Load Audit Failed', e);
      return [];
    }
  }
};
// import { http } from '@/lib/http';
// import type { AuditLog } from './types';

// export const auditApi = {
//   async getLogs(caseId: string): Promise<AuditLog[]> {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve([
//           {
//             id: 'log_004',
//             action: 'Decision Recorded',
//             actor: { name: 'Somchai M.', role: 'Procurement Manager' },
//             timestamp: '2026-01-02T10:30:00',
//             details: 'Approved PO creation. Note: "Budget confirmed with K.Suda"',
//             hash: '0x8f...a1b2',
//             status: 'COMPLETED'
//           },
//           {
//             id: 'log_003',
//             action: 'AI Risk Analysis',
//             actor: { name: 'TH8 Sentinel AI', role: 'System' },
//             timestamp: '2026-01-01T16:26:15',
//             details: 'Flagged "High Amount" and "Split PO Risk". Confidence: 98.5%',
//             hash: '0x7a...c9d1',
//             status: 'COMPLETED'
//           },
//           {
//             id: 'log_002',
//             action: 'Policy Validation',
//             actor: { name: 'Rule Engine v2', role: 'System' },
//             timestamp: '2026-01-01T16:25:05',
//             details: 'Checked against Policy Procurement-001 v3. Passed 12/13 rules.',
//             hash: '0x3b...f2e4',
//             status: 'COMPLETED'
//           },
//           {
//             id: 'log_001',
//             action: 'Case Created',
//             actor: { name: 'ERP Sync', role: 'Integration' },
//             timestamp: '2026-01-01T16:25:00',
//             details: 'Ingested from SAP Connector. PO #PO-2025-9981',
//             hash: '0x1c...d4e5',
//             status: 'COMPLETED'
//           }
//         ]);
//       }, 500);
//     });
//   }
// };