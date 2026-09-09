const REPORT_ROUTE_SECTIONS = new Set([
  'breach',
  'strategic',
  'defacement',
  'exploit',
  'apt-intel',
  'threat-intel',
  'social',
  'discussion',
  'feed',
  'consolidated'
]);

const SOCIAL_REPORT_CATEGORIES = new Set([
  'all',
  'twitter',
  'reddit',
  'forum',
  'pastebin',
  'mastodon',
  'facebook',
  'youtube'
]);

function getReportDetailEndpointForRoute(section: string, category: string, reportId?: string | null): string {
  const type = getReportSearchTypeForRoute(section, category);
  return buildReportDetailEndpoint(type, reportId);
}

function getConsolidatedReportDetailEndpoint(index: string | null | undefined, reportId?: string | null): string {
  const type = normalizeConsolidatedReportSearchType(index);
  if (!type) {
    return '';
  }
  const endpointType = !reportId && type === 'social' ? 'chat' : type;
  return buildReportDetailEndpoint(endpointType, reportId);
}

function getReportDetailEndpointFromUrl(url: URL | string): string {
  const currentUrl = typeof url === 'string' ? new URL(url, window.location.origin) : url;
  const segments = currentUrl.pathname.split('/').filter(Boolean);
  const reportId = segments[segments.length - 1] || '';
  const type = getReportSearchTypeFromUrl(currentUrl, segments);
  return buildReportDetailEndpoint(type, reportId);
}

function getReportSearchTypeFromUrl(currentUrl: URL, segments = currentUrl.pathname.split('/').filter(Boolean)): string {
  const section = getReportRouteSection(segments);
  const queryType = normalizeConsolidatedReportSearchType(currentUrl.searchParams.get('ci'));
  if (section === 'consolidated' && queryType) {
    return queryType;
  }

  const category = segments[segments.length - 2] || '';
  const parentCategory = category === 'all' ? segments[segments.length - 3] || '' : category;
  return getReportSearchTypeForRoute(section, parentCategory || category);
}

function getReportRouteSection(segments: string[]): string {
  return segments.find(segment => REPORT_ROUTE_SECTIONS.has(segment)) ?? '';
}

function getReportSearchTypeForRoute(section: string, category: string): string {
  const normalizedSection = section.toLowerCase();
  const normalizedCategory = category.toLowerCase();

  if (normalizedSection === 'breach' || normalizedSection === 'strategic' || normalizedSection === 'defacement' || normalizedSection === 'exploit') {
    return normalizedSection;
  }
  if (normalizedSection === 'feed') {
    return 'news';
  }
  if (normalizedSection === 'apt-intel' || normalizedSection === 'threat-intel') {
    return normalizedCategory === 'compromised-actors'
      ? 'defacement'
      : normalizeAptReportSearchType(normalizedCategory) || 'apt';
  }
  if (normalizedSection === 'social') {
    return normalizedCategory === 'social' || SOCIAL_REPORT_CATEGORIES.has(normalizedCategory) ? 'social' : 'chat';
  }
  if (normalizedSection === 'discussion' || normalizedSection === 'consolidated') {
    return normalizeConsolidatedReportSearchType(normalizedCategory) || 'chat';
  }
  if (normalizedCategory === 'all' && normalizedSection) {
    return normalizeConsolidatedReportSearchType(normalizedSection) || normalizedSection;
  }

  return normalizeConsolidatedReportSearchType(normalizedCategory) || normalizedCategory;
}

function normalizeConsolidatedReportSearchType(value: string | null | undefined): string {
  const type = (value ?? '').replace('_model', '').toLowerCase();
  switch (type) {
    case 'leak':
    case 'tracking':
    case 'news':
      return 'breach';
    case 'general':
    case 'generic':
      return 'strategic';
    case 'credential':
      return 'chat';
    case 'malware-bazaar':
      return 'malware';
    case 'breach':
    case 'strategic':
    case 'defacement':
    case 'exploit':
    case 'apt':
    case 'malware':
    case 'social':
    case 'chat':
      return type;
    default:
      return '';
  }
}

function normalizeAptReportSearchType(category: string): string {
  if (category === 'apt') {
    return 'apt';
  }
  if (category === 'malware' || category === 'malware-bazaar') {
    return 'malware';
  }
  return '';
}

function buildReportDetailEndpoint(type: string, reportId?: string | null): string {
  if (!type) {
    return '';
  }
  return reportId ? `search/${type}/${reportId}` : `search/${type}`;
}

export const ReportRouteUtil = {
  getReportDetailEndpointForRoute,
  getConsolidatedReportDetailEndpoint,
  getReportDetailEndpointFromUrl,
  getReportSearchTypeFromUrl,
  getReportRouteSection,
  getReportSearchTypeForRoute,
  normalizeConsolidatedReportSearchType,
};
