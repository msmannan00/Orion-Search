export interface BackupJob {
  operation: string;
  status: 'idle' | 'running' | 'done' | 'failed';
  progress: number;
  message: string;
  filename: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  backup_type: 'auto' | 'instant';
  created_at: string;
}
