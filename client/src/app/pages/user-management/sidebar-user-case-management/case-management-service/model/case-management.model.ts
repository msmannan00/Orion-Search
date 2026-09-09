export interface ArtifactFileIntegrityResult {
  fileId: string;
  success: boolean;
  status: 'verified' | 'failed';
}

export interface ArtifactFileUploadResponse {
  files: {
    fileId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileResourceId: string;
    fileHash?: string;
    hashAlgorithm?: string;
    integrityStatus?: 'unknown' | 'verified' | 'failed';
    integrityCheckedAt?: string;
    integrityMessage?: string;
    uploadedAt?: string;
  }[];
}

export interface AssignCaseAnalystRequest {
  analystId: string;
}
