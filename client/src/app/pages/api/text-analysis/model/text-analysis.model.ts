export interface TextAnalysisResult {
  title: string;
  status?: string;
  text_length?: number;
  truncated?: boolean;
  urls_found?: number;
  spam?: {
    label?: string;
    confidence?: number;
    is_spam?: boolean;
  };
  url_results?: {
    url?: string;
    label?: string;
    confidence?: number;
    is_safe?: boolean;
  }[];
  verdict?: {
    safe?: boolean;
    threats?: string[];
  };
}
