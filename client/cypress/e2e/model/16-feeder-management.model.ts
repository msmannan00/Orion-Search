export interface FeederValidationCategory extends Record<string, unknown> {
  ruleKey: string;
  ruleType: string;
  fileFixture?: string;
  fileName?: string;
  seedHostsFixture?: string;
  valuesFixture?: string;
  invalidValuesFixture?: string;
}

export interface FeederValidationData extends Record<string, unknown> {
  ruleKeys: string[];
  categories: Record<string, FeederValidationCategory>;
}
