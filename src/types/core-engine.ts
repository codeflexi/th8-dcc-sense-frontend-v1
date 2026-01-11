// 1. ระบุว่า Case นี้อยู่ใน Domain ไหน
export type DomainType = 'PROCUREMENT' | 'HR' | 'LEGAL' | 'FINANCE';

// 2. Case Group (เช่น "Payment Run ประจำสัปดาห์")
export interface CaseGroup {
  id: string;
  name: string;      // e.g., "Weekly Payment Run #42"
  domain: DomainType;
  totalItems: number;
  status: 'PENDING' | 'PROCESSED' | 'COMPLETED';
  createdDate: string;
}

// 3. ตัว Case จริงๆ (Generic)
export interface CaseContext {
  id: string;
  groupId?: string;  // เชื่อมกับ Group
  domain: DomainType;
  
  // ข้อมูลสรุปที่แสดงในการ์ด (Dynamic Key-Value)
  summary_fields: {
    label: string;
    value: string | number;
    type: 'currency' | 'date' | 'text' | 'tag';
    highlight?: boolean;
  }[];

  // ข้อมูลดิบทั้งหมด (สำหรับส่งให้ Rule Engine)
  payload: Record<string, any>; 
}