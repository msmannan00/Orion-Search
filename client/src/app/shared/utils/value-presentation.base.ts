export abstract class ValuePresentationBase {
  getObjectEntries(item: unknown): { key: string; value: unknown }[] {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    return Object.entries(item).map(([key, value]) => ({ key, value }));
  }

  getFlattenedObjectEntries(item: unknown, prefix = ''): { key: string; value: unknown }[] {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    return Object.entries(item).flatMap(([key, value]) => {
      const entryKey = prefix ? `${prefix}_${key}` : key;
      if (this.isObjectValue(value)) {
        return this.getFlattenedObjectEntries(value, entryKey);
      }
      return [{ key: entryKey, value }];
    });
  }

  displayFieldLabel(key: string): string {
    return key
      .replace(/^m_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  isObjectValue(value: unknown): boolean {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  isUrlValue(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return /^https?:\/\//i.test(value.trim());
  }

  stringifyPrimitive(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'not available';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  isEmptyDisplayValue(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === '' || normalized === 'not available' || normalized === 'n/a' || normalized === 'na' || normalized === 'none' || normalized === 'null';
    }
    if (Array.isArray(value)) {
      return value.length === 0 || value.every(item => this.isEmptyDisplayValue(item));
    }
    if (this.isObjectValue(value)) {
      return Object.keys(value).length === 0;
    }
    return false;
  }

  stringifyNestedValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .filter(item => !this.isEmptyDisplayValue(item))
        .map(item => this.isObjectValue(item) ? this.stringifyJson(item) : this.stringifyPrimitive(item))
        .join(', ');
    }
    if (this.isObjectValue(value)) {
      return this.stringifyJson(value);
    }
    return this.stringifyPrimitive(value);
  }

  stringifyJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    }
    catch {
      return String(value);
    }
  }
}
