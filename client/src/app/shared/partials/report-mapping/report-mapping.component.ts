import { CommonModule, NgClass } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { LicenseService } from '../../../services/licenses/licenses.service';
import { TooltipDirective } from '../../directive/tooltip-directive.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ApiService } from '../../services/api.service';
import { ProxyController } from '../../services/proxy-controller';
import type { MappingEdge, MappingGraphItem, MappingVertex } from './model/report-mapping.interfaces.model';
import { RelatedReportItem, STRONG_RELATED_MAPPING_KEYS } from './model/report-mapping.model';
export type { MappingEdge,MappingGraphItem,MappingVertex } from './model/report-mapping.interfaces.model';








@Component({
  selector: 'app-report-mapping',
  templateUrl: './report-mapping.component.html',
  styleUrls: ['./report-mapping.component.css'],
  imports: [CommonModule, NgClass, TooltipDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ReportMappingComponent {
  private readonly proxied_resource = inject(ProxyController);
  private hasLoaded = false;

  readonly skeletonItems = [0, 1];
  loading = true;
  result: MappingGraphItem[] = [];
  filteredItems: RelatedReportItem[] = [];
  isExpanded = false;

  constructor(private api: ApiService, protected dashboardservice: DashboardService, protected licenseService: LicenseService) {
  }

  toggleContent(): void {
    if (!(this.licenseService.isAdmin() || this.licenseService.isMaintainer() || this.licenseService.getLicenses().includes('enterprise'))) {
      this.dashboardservice.showSubscription.set(true);
      return;
    }
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded && !this.hasLoaded) {
      this.loadGraph();
    }
  }

  loadGraph(): void {
    const parts = window.location.pathname.split('/');
    const value = parts[parts.length - 1];
    const params = new HttpParams()
      .set('data_point_type', 'document')
      .set('model_type', 'document')
      .set('query_value', value)
      .set('edge', '25')
      .set('depth', '2');
    this.loading = true;
    this.filteredItems = [];
    this.api.get<{
            results: MappingGraphItem[];
            limit_reached: boolean;
        }>('graph', { params }).subscribe({
          next: response => {
            const { results } = response;
            this.result = results;
            this.loading = false;
            this.hasLoaded = true;
            this.filteredItems = this.getUniqueSortedItems(this.result, 25);
          },
          error: () => {
            this.loading = false;
            this.hasLoaded = true;
          }
        });
  }

  getUniqueSortedItems(result: MappingGraphItem[], length: number): RelatedReportItem[] {
    const currentId = this.getCurrentReportId();
    const seenIds = new Set<string>();
    const items: RelatedReportItem[] = [];
    for (const item of result) {
      const vertex = this.getRelatedDocumentVertex(item, currentId);
      const id = this.getDocumentId(vertex) || this.extractDocumentIdFromEdge(item.edge, currentId);
      const mappingKey = this.extractMappingKeyRaw(item);
      if (!id || id === currentId || seenIds.has(id) || !this.isStrongMappingKey(mappingKey)) {
        continue;
      }
      seenIds.add(id);
      items.push(this.toRelatedReportItem(item, vertex, id, mappingKey));
      if (items.length >= length) {
        break;
      }
    }
    return items;
  }

  viewReport(id: string) {
    const parts = window.location.pathname.split('/');
    const category = parts[parts.length - 3];
    const subCategory = parts[parts.length - 2];
    const baseUrl = `${window.location.origin}/dashboard/${category}/${subCategory}/${id}`;
    this.proxied_resource.open(baseUrl);
  }

  private toRelatedReportItem(item: MappingGraphItem, vertex: MappingVertex | null, id: string, rawMappingKey: string): RelatedReportItem {
    const mappingKey = this.formatLabel(rawMappingKey);
    const mappingValue = this.extractMappingValue(item);
    const title = this.cleanText(vertex?.title ?? vertex?.display_value ?? vertex?.label) || `Related report ${this.compactId(id)}`;
    const summary = this.truncate(this.cleanText(vertex?.summary), 220);
    const cluster = this.formatLabel(vertex?.cluster_id ?? vertex?.module ?? '');
    const source = this.formatLabel(vertex?.source ?? vertex?.module ?? vertex?.cluster_id ?? '');
    return {
      id,
      title,
      summary,
      published: this.formatDate(vertex?.published),
      source: source || 'Unknown source',
      cluster: cluster || 'Uncategorized',
      reliability: this.formatReliability(vertex?.source_reliability),
      mappingKey: mappingKey || 'Shared entity',
      mappingValue: mappingValue || 'Matched through graph relationship',
      trackId: `${id}:${mappingKey}:${mappingValue}`
    };
  }

  private getRelatedDocumentVertex(item: MappingGraphItem, currentId: string): MappingVertex | null {
    const candidates = [item.vertex, ...(item.path?.vertices ?? [])].filter((vertex): vertex is MappingVertex => !!vertex);
    return candidates.find(vertex => {
      if (String(vertex?.type ?? '').toLowerCase() !== 'document') {
        return false;
      }
      const id = this.getDocumentId(vertex);
      return id && id !== currentId;
    }) ?? null;
  }

  private getDocumentId(vertex: MappingVertex | null | undefined): string {
    return this.extractDocumentId(vertex?.doc_id)
      || this.extractDocumentId(vertex?.m_document_id)
      || this.extractDocumentId(vertex?._key)
      || this.extractDocumentId(vertex?._id);
  }

  private extractDocumentIdFromEdge(edge: MappingEdge | undefined, currentId: string): string {
    const candidates = [edge?._from, edge?._to];
    for (const candidate of candidates) {
      const id = this.extractDocumentId(candidate);
      if (id && id !== currentId && this.isHashId(id)) {
        return id;
      }
    }
    const edgeId = this.extractId(edge?._id ?? '');
    if (edgeId && edgeId !== currentId) {
      return edgeId;
    }
    return '';
  }

  private extractDocumentId(value: unknown): string {
    const text = String(value ?? '').trim();
    if (!text) {
      return '';
    }
    const vertexMatch = /cti_vertices\/([^/]+)/.exec(text);
    if (vertexMatch?.[1]) {
      return vertexMatch[1];
    }
    const hashMatch = /[a-f0-9]{64}/i.exec(text);
    return hashMatch ? hashMatch[0] : text;
  }

  private isHashId(value: string): boolean {
    return /^[a-f0-9]{64}$/i.test(value);
  }

  private extractMappingKeyRaw(item: MappingGraphItem): string {
    const edge = item.edge ?? {};
    const key = this.extractProperty(edge._id ?? '', 'key', true)
      ?? this.extractProperty(edge._to ?? '', 'key', true)
      ?? edge.label
      ?? edge.relationship_type
      ?? edge.edge_type
      ?? edge.type;
    return String(key ?? '').replace(/^has_/, '').replace(/^derived_/, '');
  }

  private isStrongMappingKey(key: string): boolean {
    return STRONG_RELATED_MAPPING_KEYS.has(key);
  }

  private extractMappingValue(item: MappingGraphItem): string {
    const edge = item.edge ?? {};
    const edgeValue = this.extractProperty(edge._id ?? '', 'value') || this.extractProperty(edge._to ?? '', 'value');
    if (edgeValue) {
      return this.normalizeDisplayValue(edgeValue);
    }
    const propertyVertex = [item.vertex, ...(item.path?.vertices ?? [])].filter((vertex): vertex is MappingVertex => !!vertex).find(vertex => {
      const type = String(vertex?.type ?? '').toLowerCase();
      return type && type !== 'document' && type !== 'cluster';
    });
    return this.normalizeDisplayValue(propertyVertex?.display_value ?? propertyVertex?.value ?? propertyVertex?.label ?? '');
  }

  private getCurrentReportId(): string {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }

  private compactId(value: string): string {
    if (value.length <= 18) {
      return value;
    }
    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  }

  private cleanText(value: unknown): string {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  private truncate(value: string, limit: number): string {
    return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
  }

  private formatDate(value: unknown): string {
    const text = this.cleanText(value);
    if (!text) {
      return '';
    }
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) {
      return text.slice(0, 24);
    }
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private formatReliability(value: unknown): string {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '';
    }
    const percent = numeric <= 1 ? numeric * 100 : numeric;
    return `${Math.round(percent)}% reliable`;
  }

  private formatLabel(value: unknown): string {
    const text = this.cleanText(value).replace(/^m_/, '').replaceAll('_', ' ');
    if (!text) {
      return '';
    }
    const lower = text.toLowerCase();
    if (lower === 'url') {
      return 'URL';
    }
    if (lower === 'ip') {
      return 'IP';
    }
    if (lower === 'apt') {
      return 'APT';
    }
    return text.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1));
  }

  private normalizeDisplayValue(value: unknown): string {
    const text = this.cleanText(value);
    if (/^https?:[a-z0-9]/i.test(text)) {
      return text.replace(/^http:/i, 'http://').replace(/^https:/i, 'https://');
    }
    return text;
  }

  extractProperty(id: string, mode: 'key' | 'value' = 'value', keepRawKey = false): string {
    if (!id) {
      return '';
    }
    const vertexMatch = /cti_vertices\/([^:]+):(.+)/.exec(id);
    if (vertexMatch?.[1]) {
      return mode === 'key'
        ? (keepRawKey ? vertexMatch[1] : vertexMatch[1].replace(/^m_/, '').replaceAll('_', ''))
        : vertexMatch[2].replaceAll('_', ' ');
    }
    const idTemp = this.extractId(id);
    const locationPoint = id.indexOf(idTemp) + idTemp.length + 1;
    if (locationPoint >= id.length) {
      return '';
    }
    const item = id.substring(locationPoint);
    const disallowedPrefixes = ['leak_to_', 'defacement_to_', 'chat_to_', 'general_to_'];
    if (disallowedPrefixes.some(prefix => item.startsWith(prefix))) {
      return '';
    }
    if (!item.startsWith('m_')) {
      return '';
    }
    const key = this.extractKnownPropertyKey(item);
    if (!key) {
      return '';
    }
    const value = item.slice(key.length + 1);
    if (mode === 'key') {
      return keepRawKey ? key : key.replace(/^m_/, '').replaceAll('_', '');
    }
    return value.replaceAll('_', ' ');
  }

  private extractKnownPropertyKey(value: string): string {
    return Array.from(STRONG_RELATED_MAPPING_KEYS)
      .sort((a, b) => b.length - a.length)
      .find(key => value === key || value.startsWith(`${key}_`)) ?? '';
  }

  private extractId(path: string): string {
    const match = /[a-f0-9]{64}/.exec(path);
    return match ? match[0] : '';
  }
}
