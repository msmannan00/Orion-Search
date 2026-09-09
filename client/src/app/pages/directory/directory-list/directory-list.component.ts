import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { DirectoryCallbackModel } from '../model/directory.model';
import { DirectoryService } from '../services/directory.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-directory-list',
  templateUrl: './directory-list.component.html',
  styleUrls: ['./directory-list.component.css'],
  standalone: true,
  imports: [CommonModule, NgClass, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DirectoryListComponent implements AfterViewInit, OnDestroy {
  private dataSub?: Subscription;
  private observer?: IntersectionObserver;

  @ViewChild('infiniteAnchor', { static: false }) infiniteAnchor!: ElementRef<HTMLDivElement>;
  directoryData$: Observable<DirectoryCallbackModel | null>;
  visibleCount = 50;
  totalItems = 0;
  loadingMore = false;

  constructor(public directoryService: DirectoryService) {
    this.directoryData$ = this.directoryService.directoryData$;
    this.dataSub = this.directoryData$.subscribe(data => {
      this.totalItems = data?.mDirectoryCallbackLinks?.length ?? 0;
    });
  }

  isRecent(timestamp: string | number | Date | null | undefined): boolean {
    if (!timestamp) {
      return false;
    }
    const date = new Date(timestamp);
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    return date >= fifteenDaysAgo;
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadMore();
        }
      });
    }, { root: null, threshold: 0.1 });
    if (this.infiniteAnchor?.nativeElement) {
      this.observer.observe(this.infiniteAnchor.nativeElement);
    }
  }

  loadMore(): void {
    if (this.loadingMore) {
      return;
    }
    if (this.visibleCount >= this.totalItems) {
      return;
    }
    this.loadingMore = true;
    setTimeout(() => {
      this.visibleCount += 50;
      this.loadingMore = false;
    }, 250);
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
    this.observer?.disconnect();
  }
}
