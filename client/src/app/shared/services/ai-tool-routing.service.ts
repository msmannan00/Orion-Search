import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AiToolRouteConfig } from './model/ai-tool-routing.model';


const DEFAULT_MESSAGE = 'Ask me what to check and I will use the active route.';
const ROUTE_MAPPINGS: ({ pattern: RegExp } & AiToolRouteConfig)[] = [
  { pattern: /\/dashboard\/profile\/consolidated\b(?=.*[?&]ioc=)/, type: '/api/search/stealer/ioc', message: 'Search stealer IoCs by IP, domain, URL, hash, email, username, malware phrase, date range, or filter details.' },
  { pattern: /\/dashboard\/strategic\b/, type: '/api/search/strategic', message: 'Search strategic intelligence by topic, organization, asset, country, network, date range, or advanced entity filters.' },
  { pattern: /\/dashboard\/breach\b/, type: '/api/search/breach', message: 'Search breach intelligence by email, username, domain, leak source, database, country, network, date range, or filters.' },
  { pattern: /\/dashboard\/social\b/, type: '/api/search/social', message: 'Search social intelligence by handle, username, platform, forum, Telegram source, country, date range, or filters.' },
  { pattern: /\/dashboard\/exploit\b/, type: '/api/search/exploit', message: 'Search exploit intelligence by CVE, product, vendor, version, platform, severity, CVSS, tags, date range, or filters.' },
  { pattern: /\/dashboard\/(?:apt-intel|threat-intel)\b/, type: '/api/search/apt-intel', message: 'Search APT and malware intelligence by actor, campaign, family, tool, country, sector, tag, date range, or filters.' },
  { pattern: /\/dashboard\/defacement\b/, type: '/api/search/defacement', message: 'Search defacement intelligence by domain, URL, actor, hacked page, phishing, malware URL, country, date range, or filters.' },
  { pattern: /\/dashboard\/consolidated\b/, type: '/api/search/consolidated', message: 'Search all intelligence categories by topic, entity, indicator, category, network, country, date range, or advanced filters.' },
  { pattern: /\/dashboard\/profile\/consolidated\b/, type: '/api/search/consolidated', message: 'Search all intelligence categories by topic, entity, indicator, category, network, country, date range, or advanced filters.' },
  { pattern: /\/dashboard\/stealerlogs\b/, type: '/api/search/stealer/ioc', message: 'Search stealer IoCs by IP, domain, URL, hash, email, username, malware phrase, date range, or filter details.' },
  { pattern: /\/dashboard\/profile\/ioc\b/, type: '/api/search/stealer/ioc', message: 'Search stealer IoCs by IP, domain, URL, hash, email, username, malware phrase, date range, or filter details.' },
  { pattern: /\/dashboard\/profile\/event-management\b/, type: '/api/profile/event-management/siem/search', message: 'Search Event Manager SIEM logs by text, asset, service, event type, source, host, user, indicator, severity, or date range.' },
  { pattern: /\/dashboard\/profile\/log-manager\b/, type: '/api/profile/system-logs', message: 'Inspect system logs by log type, date, source file, caller, module, error text, page, or entry limit.' },
  { pattern: /\/dashboard\/profile\/auditlog\b/, type: '/api/audit/logs', message: 'Search audit logs by username, actor, tenant activity, action, event, date range, or page.' },
  { pattern: /\/dashboard\/api\/email-breach\b/, type: '/api/dynamic/user', message: 'Check exposed account records by email, username, account identifier, domain, breach source, or dataset phrase.' },
  { pattern: /\/dashboard\/api\/social-scanner\b/, type: '/api/dynamic/social', message: 'Check public social presence and exposure by handle, username, profile URL, platform, account ID, or impersonation phrase.' },
  { pattern: /\/dashboard\/api\/wanted-list\b/, type: '/api/dynamic/wanted', message: 'Search wanted, watchlist, sanctions, and law-enforcement records by person name, alias, identity phrase, or country context.' },
  { pattern: /\/dashboard\/api\/national-identity\b/, type: '/api/dynamic/national-identity', message: 'Run Pakistan identity lookup by CNIC, phone number, family number, SIM context, address phrase, or FIR context.' },
  { pattern: /\/dashboard\/api\/playstore-scanner\b/, type: '/api/dynamic/cracked', message: 'Check redistributed Android app records by Google Play URL, package name, app title, APK reference, mirror, or modified app phrase.' },
  { pattern: /\/dashboard\/api\/software-scanner\b/, type: '/api/dynamic/software', message: 'Check unofficial software records by software, game, tool, package, release title, version, leak, crack, mirror, mod, or repack phrase.' },
  { pattern: /\/dashboard\/api\/text-analysis\b/, type: '/api/nexus/analyze-text', message: 'Analyze pasted messages, emails, chat text, URLs, snippets, phishing language, spam, and safety verdicts.' },
  { pattern: /\/dashboard\/api\/crypto-scanner\b/, type: '/api/crypto/scan', message: 'Check blockchain risk by wallet address, transaction hash, chain/network phrase, scam context, or ransomware payment context.' },
];
const API_TYPE_MAPPINGS: Record<string, AiToolRouteConfig> = {
  user: { type: '/api/dynamic/user', message: 'Check exposed account records by email, username, account identifier, domain, breach source, or dataset phrase.' },
  social: { type: '/api/dynamic/social', message: 'Check public social presence and exposure by handle, username, profile URL, platform, account ID, or impersonation phrase.' },
  wanted: { type: '/api/dynamic/wanted', message: 'Search wanted, watchlist, sanctions, and law-enforcement records by person name, alias, identity phrase, or country context.' },
  'national-identity': { type: '/api/dynamic/national-identity', message: 'Run Pakistan identity lookup by CNIC, phone number, family number, SIM context, address phrase, or FIR context.' },
  cracked: { type: '/api/dynamic/cracked', message: 'Check redistributed Android app records by Google Play URL, package name, app title, APK reference, mirror, or modified app phrase.' },
  software: { type: '/api/dynamic/software', message: 'Check unofficial software records by software, game, tool, package, release title, version, leak, crack, mirror, mod, or repack phrase.' },
  crypto: { type: '/api/crypto/scan', message: 'Check blockchain risk by wallet address, transaction hash, chain/network phrase, scam context, or ransomware payment context.' },
  'text-analysis': { type: '/api/nexus/analyze-text', message: 'Analyze pasted messages, emails, chat text, URLs, snippets, phishing language, spam, and safety verdicts.' },
  'stealer-ioc': { type: '/api/search/stealer/ioc', message: 'Search stealer IoCs by IP, domain, URL, hash, email, username, malware phrase, date range, or filter details.' },
  'consolidated-ioc': { type: '/api/search/stealer/ioc', message: 'Search stealer IoCs by IP, domain, URL, hash, email, username, malware phrase, date range, or filter details.' },
  'event-management': { type: '/api/profile/event-management/siem/search', message: 'Search Event Manager SIEM logs by text, asset, service, event type, source, host, user, indicator, severity, or date range.' },
  'log-manager': { type: '/api/profile/system-logs', message: 'Inspect system logs by log type, date, source file, caller, module, error text, page, or entry limit.' },
  auditlog: { type: '/api/audit/logs', message: 'Search audit logs by username, actor, tenant activity, action, event, date range, or page.' },
};

@Injectable({ providedIn: 'root' })
export class AiToolRoutingService {
  private readonly defaultMessage = DEFAULT_MESSAGE;
  private readonly routeMappings = ROUTE_MAPPINGS;
  private readonly apiTypeMappings = API_TYPE_MAPPINGS;

  constructor(private router: Router) {}

  getType(route = this.router.url): string {
    return this.getRouteConfig(route).type;
  }

  getMessage(route = this.router.url): string {
    return this.getRouteConfig(route).message;
  }

  getTypeForApiType(apiType = ''): string {
    return this.getApiTypeConfig(apiType).type;
  }

  getMessageForApiType(apiType = ''): string {
    return this.getApiTypeConfig(apiType).message;
  }

  getTypeForEndpoint(endpoint = ''): string {
    return this.getEndpointConfig(endpoint).type;
  }

  getMessageForEndpoint(endpoint = ''): string {
    return this.getEndpointConfig(endpoint).message;
  }

  private getRouteConfig(route = this.router.url): AiToolRouteConfig {
    const cleanRoute = String(route || '');
    if (cleanRoute.startsWith('/api/')) {
      return this.getEndpointConfig(cleanRoute);
    }
    return this.routeMappings.find(({ pattern }) => pattern.test(cleanRoute)) ?? { type: 'default', message: this.defaultMessage };
  }

  private getApiTypeConfig(apiType = ''): AiToolRouteConfig {
    return this.apiTypeMappings[String(apiType || '').trim()] || { type: 'default', message: this.defaultMessage };
  }

  private getEndpointConfig(endpoint = ''): AiToolRouteConfig {
    const cleanEndpoint = this.normalizeApiEndpoint(endpoint);
    if (!cleanEndpoint) {
      return this.getRouteConfig();
    }
    return this.routeMappings.find(route => route.type === cleanEndpoint)
      ?? Object.values(this.apiTypeMappings).find(config => config.type === cleanEndpoint)
      ?? { type: cleanEndpoint, message: this.defaultMessage };
  }

  private normalizeApiEndpoint(endpoint: string): string {
    const cleanEndpoint = String(endpoint || '').trim();
    if (!cleanEndpoint) {
      return '';
    }
    return cleanEndpoint.startsWith('/api/') ? cleanEndpoint : `/api/${cleanEndpoint.replace(/^\/+/, '')}`;
  }
}
