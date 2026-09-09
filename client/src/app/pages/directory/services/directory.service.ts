import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { DirectoryCallbackModel } from '../model/directory.model';
import { ApiService } from '../../../shared/services/api.service';
import type { Either } from '../../../shared/utils/type-guards.util';
import { HttpParams } from '@angular/common/http';
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private directoryDataSubject = new BehaviorSubject<DirectoryCallbackModel | null>(null);
  private currentPageSubject = new BehaviorSubject<number>(1);

  directoryData$ = this.directoryDataSubject.asObservable();
  currentPage$ = this.currentPageSubject.asObservable();

  constructor(private apiService: ApiService) {
  }

  reloadDirectoryData(params?: Either<HttpParams, Record<string, string | number | boolean>>): void {
    const httpParams = params instanceof HttpParams
      ? params
      : new HttpParams({ fromObject: params ?? {} });
    this.apiService.get<DirectoryCallbackModel>('directory', { params: httpParams }).subscribe((data) => {
      this.directoryDataSubject.next(data);
    });
  }

  getCurrentPage(): number {
    return this.currentPageSubject.getValue();
  }

  setCurrentPage(page: number): void {
    if (page > 0) {
      this.currentPageSubject.next(page);
    }
  }
}
