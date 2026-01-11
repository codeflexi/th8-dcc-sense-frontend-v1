// src/features/cases/api.ts
import { http } from '@/lib/http';
import type { CaseDTO } from '@/types/case';

// Interface ตรงตาม Swagger
interface BackendCaseItem {
  id: string;
  vendor_id: string;
  amount_total: number;
  status: string;
  created_at: string;
  priority_score?: number;
  domain?: string;
  // เพิ่ม Type เผื่อ Backend ส่งมา
  vendor_name?: string;
  vendor?: string;
}

interface BackendCaseDetail extends BackendCaseItem {
  decision_summary?: {
    risk_level?: string;
    recommended_action?: string;
  };
  violations?: Array<{
    rule_name: string;
    severity: string;
  }>;
}

export const caseApi = {
  async getAll(): Promise<CaseDTO[]> {
    try {
      const items = await http.get<BackendCaseItem[]>('/api/cases');
      
      // 🔥 DEBUG: ดูว่า Backend ส่งอะไรมาบ้าง (กด F12 ดู Console)
      if (items.length > 0) {
        console.log('Sample Case from Backend:', items[0]);
      }

      return items.map(item => ({
        id: item.id,
        // พยายามดึงจากทุก field ที่เป็นไปได้
        vendor: item.vendor_id || item.vendor_name || item.vendor || 'Unknown Vendor',
        amount: item.amount_total,
        currency: 'THB',
        status: item.status as any,
        risk_level: (item.priority_score || 0) > 80 ? 'HIGH' : 'LOW', 
        created_at: item.created_at,
        priority_score: item.priority_score || 0,
        domain: item.domain || 'procurement' 
      }));
    } catch (e) {
      console.warn('API Failed, using Mock Data');
      return []; 
    }
  },
  
  // ... functions อื่นๆ (getById, ingest) เหมือนเดิม
  async getById(id: string): Promise<BackendCaseDetail> {
      return http.get<BackendCaseDetail>(`/api/cases/${id}`);
  },

  async ingest(data: { case_id: string; domain: string; payload: any }): Promise<boolean> {
    try {
      await http.post('/api/cases/ingest', {
        case_id: data.case_id,
        domain: data.domain || 'procurement',
        payload: data.payload
      });
      return true;
    } catch (e) {
      console.error('Ingest API Failed', e);
      throw e;
    }
  }
};

// import { http } from '@/lib/http';
// import type { CaseDTO } from '@/types/case';

// export const caseApi = {
//   async getAll(): Promise<CaseDTO[]> {
//     try {
//       // Mapping Field จาก Backend (ตาม Swagger) -> Frontend
//       const rawData = await http.get<any[]>('/api/cases');
      
//       return rawData.map(item => ({
//         id: item.id,
//         vendor: item.vendor_id || 'Unknown Vendor',
//         amount: item.amount_total,
//         currency: 'THB', // Backend ยังไม่มีค่านี้ Hardcode ไปก่อน
//         status: item.status, 
//         risk_level: (item.priority_score || 0) > 80 ? 'HIGH' : 'LOW', // Logic ชั่วคราว
//         created_at: item.created_at,
//         priority_score: item.priority_score
//       }));
//     } catch (e) {
//       console.error('Load Cases Failed', e);
//       return []; 
//     }
//   },

//   async getById(id: string) {
//     // ดึง Detail
//     return http.get(`/api/cases/${id}`);
//   },

//   // เพิ่มฟังก์ชันนี้
//   async ingest(data: { case_id: string; payload: any }): Promise<boolean> {
//     try {
//       // ยิงไปที่ /api/cases/ingest ตาม Swagger
//       await http.post('/api/cases/ingest', {
//         case_id: data.case_id,
//         domain: 'procurement', // Default domain
//         payload: data.payload  // ข้อมูลจริงของ PO
//       });
//       return true;
//     } catch (e) {
//       console.error('Ingest Failed', e);
//       throw e;
//     }
//   }

// };