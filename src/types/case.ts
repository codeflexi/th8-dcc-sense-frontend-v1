export type CaseStatus = 'OPEN' | 'CLOSED' | 'PENDING';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';


export interface CaseDTO {
  id: string;
  vendor: string;
  amount: number;
  currency: string;
  status: CaseStatus;
  risk_level: RiskLevel;
  created_at: string;
  priority_score: number;
}