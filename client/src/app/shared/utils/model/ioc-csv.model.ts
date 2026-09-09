export interface EntityDefinition {
  title: string;
  key: string;
}

export interface ParsedIocCsv {
  valuesByKey: Record<string, string[]>;
  valueCount: number;
}
