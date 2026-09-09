import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getOwnProperty } from '../../../utils/type-guards.util';


@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './json-viewer.component.html'
})
export class JsonViewerComponent {
  readonly jsonInput = input<unknown>(undefined, { alias: 'json' });
  readonly parentPathInput = input('', { alias: 'parentPath' });
  expandedMap = new Map<string, boolean>();
  excludedPaths = new Set([ '_title:trocador.app', 'm_meta_description', 'm_content', 'm_important_content' ]);
  json: unknown;
  readonly level = input(0);
  parentPath = '';
  readonly showRootBraces = input(false);

  constructor() {
    effect(() => {
      this.json = this.jsonInput();
      this.parentPath = this.parentPathInput();
      this.expandedMap.clear();
      this.initExpansionState(this.json, this.parentPath);
    });
  }

  initExpansionState(obj: unknown, path: string): void {
    const shouldCollapse = [...this.excludedPaths].some(ex => path.endsWith(ex));
    if (this.isObject(obj)) {
      this.expandedMap.set(path, !shouldCollapse);
      for (const [key, value] of Object.entries(obj)) {
        const nextPath = this.pathKey(path, key);
        this.initExpansionState(value, nextPath);
      }
    }
    else {
      this.expandedMap.set(path, !shouldCollapse);
    }
  }

  pathKey(parent: string, key: string): string {
    return parent ? `${parent}.${key}` : key;
  }

  isObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null;
  }

  isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  isCollapsible(value: unknown): boolean {
    return this.isObject(value);
  }

  toggle(path: string): void {
    const current = this.expandedMap.get(path);
    this.expandedMap.set(path, !current);
  }

  isExpanded(path: string): boolean {
    return this.expandedMap.get(path) ?? false;
  }

  keys(obj: unknown): string[] {
    if (!obj || typeof obj !== 'object') {
      return [];
    }
    return Object.keys(obj);
  }

  valueAt(key: string): unknown {
    return this.isObject(this.json)
      ? getOwnProperty((this.json as Record<string, unknown>), key)
      : undefined;
  }

  openToken(value: unknown): string {
    return this.isArray(value) ? '[' : '{';
  }

  closeToken(value: unknown): string {
    return this.isArray(value) ? ']' : '}';
  }

  collapsedSummary(value: unknown): string {
    if (!this.isObject(value)) {
      return '';
    }
    if (this.isArray(value)) {
      return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }
    const count = Object.keys(value || {}).length;
    return `${count} key${count === 1 ? '' : 's'}`;
  }

  formatPrimitive(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'string') {
      const escaped = value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${escaped}"`;
    }
    return String(value);
  }

  primitiveClass(value: unknown): string {
    if (value === null) {
      return 'text-[var(--color-text4)]';
    }
    if (typeof value === 'string') {
      return 'text-[var(--color-text1)]';
    }
    if (typeof value === 'boolean') {
      return 'text-[#d97706]';
    }
    return 'text-[var(--color-text1)]';
  }

  primitiveSummary(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'string') {
      return 'string';
    }
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    return 'value';
  }
}
