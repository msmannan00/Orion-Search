export interface InstitutionalCoverOptions {
  classification?: string;
  context: string;
  generatedAt: string;
  lead?: string;
  preparedFor: string;
  reportFamily: string;
  sections: string[];
  subtitle: string;
  title: string;
}

export interface InstitutionalHeaderOptions {
  reportFamily: string;
  section: string;
  tenantName: string;
}

export interface InstitutionalFooterOptions {
  pageNo: number;
  section: string;
  tenantName: string;
  totalPages: number;
}
