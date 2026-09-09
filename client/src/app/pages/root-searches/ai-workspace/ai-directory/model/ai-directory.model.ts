export type WorkspaceStatusType = 'idle' | 'loading' | 'approved' | 'infected' | 'failed';

export interface WorkspaceLogEntry {
  id: number;
  message: string;
  details: string;
  timestamp: Date;
  type: Exclude<WorkspaceStatusType, 'idle'>;
}
