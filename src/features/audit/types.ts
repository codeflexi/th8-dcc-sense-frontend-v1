export interface AuditLog {
  id: string;
  action: string;
  actor: {
    name: string;
    role: string;
    avatar?: string; // URL or Initials
  };
  timestamp: string;
  details: string;
  hash: string; // Blockchain/Immutable hash simulation
  status: 'COMPLETED' | 'PENDING' | 'REJECTED';
  context?: any[]
  
}