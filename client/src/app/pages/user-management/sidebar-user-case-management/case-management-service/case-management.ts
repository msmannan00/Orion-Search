import { Injectable } from '@angular/core';
import { Observable, catchError, filter, map, of, switchMap, take, timer } from 'rxjs';
import { ApiService } from '../../../../shared/services/api.service';
import { ArtifactReportOption, Case, CaseAnalyst, CaseCommunicationRequest, CaseRequest, CaseShareRequest, CaseShareResponse, CaseStatusReason, CaseUpdateRequest } from '../model/case.model';
import { CaseStatusBoardConfig } from '../model/status-board-config.model';
import { ArtifactFileIntegrityResult } from './model/case-management.model';
import { ArtifactFileUploadResponse } from './model/case-management.model';
import { AssignCaseAnalystRequest } from './model/case-management.model';




@Injectable({ providedIn: 'root' })
export class CaseManagement {
  constructor(private api: ApiService) { }

  getCases(archived = false): Observable<Case[]> {
    return this.api.get<Case[]>(`profile/cases?archived=${archived}`);
  }

  getStatusBoardConfig(): Observable<CaseStatusBoardConfig> {
    return this.api.get<CaseStatusBoardConfig>('profile/cases/status-board-config');
  }

  updateStatusBoardConfig(payload: CaseStatusBoardConfig): Observable<CaseStatusBoardConfig> {
    return this.api.put<CaseStatusBoardConfig>('profile/cases/status-board-config/update', payload);
  }

  createCase(caseData: CaseRequest): Observable<Case> {
    return this.api.post<Case>('profile/cases', caseData);
  }

  getNextCaseId(): Observable<{ nextCaseId: string }> {
    return this.api.get<{ nextCaseId: string }>('profile/cases/next-id');
  }

  getAnalysts(): Observable<CaseAnalyst[]> {
    return this.api.get<CaseAnalyst[]>('profile/cases/analysts');
  }

  getCaseById(caseId: string): Observable<Case> {
    return this.api.get<Case>(`profile/cases/${caseId}`);
  }

  updateCase(caseId: string, caseData: CaseUpdateRequest): Observable<Case> {
    return this.api.put<Case>(`profile/cases/${caseId}`, caseData);
  }

  updateCaseStatus(caseId: string, payload: CaseStatusReason): Observable<Case> {
    return this.api.put<Case>(`profile/cases/${caseId}/status`, payload);
  }

  deleteCase(caseId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`profile/cases/${caseId}`);
  }

  createCaseShare(caseId: string, payload: CaseShareRequest): Observable<CaseShareResponse> {
    return this.api.post<CaseShareResponse>(`profile/cases/${caseId}/shares`, payload);
  }

  revokeCaseShares(caseId: string): Observable<{ success: boolean; revokedCount: number }> {
    return this.api.delete<{ success: boolean; revokedCount: number }>(`profile/cases/${caseId}/shares`);
  }

  addCommunication(caseId: string, payload: CaseCommunicationRequest): Observable<Case> {
    return this.api.post<Case>(`profile/cases/${caseId}/communications`, payload);
  }

  updateCommunication(caseId: string, communicationId: string, payload: CaseCommunicationRequest): Observable<Case> {
    return this.api.put<Case>(`profile/cases/${caseId}/communications/${communicationId}`, payload);
  }

  deleteCommunication(caseId: string, communicationId: string): Observable<Case> {
    return this.api.delete<Case>(`profile/cases/${caseId}/communications/${communicationId}`);
  }

  openCommunication(caseId: string, communicationId: string): Observable<{ opened?: boolean; error?: string }> {
    return this.api.post<{ result?: { opened?: boolean }; error?: string }>(`profile/cases/${caseId}/communications/${communicationId}/open`, {}).pipe(map(response => ({ opened: response?.result?.opened, error: response?.error })),
      catchError(() => of<{ opened?: boolean; error?: string }>({ error: 'open_failed' })));
  }

  saveCommunicationSession(caseId: string, communicationId: string): Observable<{ case?: Case; error?: string }> {
    return timer(0, 2500).pipe(switchMap(() => this.api.post<{ result?: { saved?: boolean; case?: Case }; error?: string; status?: string }>(`profile/cases/${caseId}/communications/${communicationId}/session`, {})),
      map(response => ({ pending: response?.status === 'pending', case: response?.result?.case, error: response?.error })),
      filter(result => !result.pending),
      take(1),
      map(result => ({ case: result.case, error: result.error })),
      catchError(() => of<{ case?: Case; error?: string }>({ error: 'session_failed' })));
  }

  uploadArtifactFiles(caseId: string, artifactId: string, files: File[]): Observable<ArtifactFileUploadResponse> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    return this.api.post<ArtifactFileUploadResponse>(`profile/cases/${caseId}/artifacts/${artifactId}/files`, formData);
  }

  verifyArtifactFile(caseId: string, artifactId: string, fileId: string): Observable<ArtifactFileIntegrityResult> {
    return this.api.post<ArtifactFileIntegrityResult>(`profile/cases/${caseId}/artifacts/${artifactId}/files/${fileId}/verify`, {});
  }

  deleteArtifactFile(caseId: string, artifactId: string, fileId: string): Observable<{ success: boolean }> {
    return this.api.delete<{ success: boolean }>(`profile/cases/${caseId}/artifacts/${artifactId}/files/${fileId}`);
  }

  getArtifactReports(source: string, q = '', limit = 10): Observable<ArtifactReportOption[]> {
    const params = new URLSearchParams();

    params.set('source', source);
    params.set('q', q);
    params.set('limit', String(limit));

    return this.api.get<ArtifactReportOption[]>(`profile/cases/artifact-reports?${params.toString()}`);
  }

  archiveCase(caseId: string): Observable<{ success: boolean; message?: string }> {
    return this.api.put<{ success: boolean; message?: string }>(`profile/cases/${caseId}/archive`, {});
  }

  unarchiveCase(caseId: string): Observable<{ success: boolean; message?: string }> {
    return this.api.put<{ success: boolean; message?: string }>(`profile/cases/${caseId}/unarchive`, {});
  }

  assignCaseAnalyst(caseId: string, payload: AssignCaseAnalystRequest): Observable<Case> {
    return this.api.put<Case>(`profile/cases/${caseId}/assign-analyst`, payload);
  }
}
