import { ChangeDetectorRef, Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Edge, Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { ApiService } from '../../shared/services/api.service';
import { CtiSidebarComponent } from './cti-sidebar/cti-sidebar.component';
import { GraphContextMenuComponent } from './context-menu/context-menu.component';
import { isPlatformBrowser } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { ExpandToggleButtonComponent } from './expand-toggle-button/expand-toggle-button.component';
import { ExportChoiceModalComponent } from '../../shared/partials/export-choice-modal/export-choice-modal.component';
import { CtiGraphFilters, CtiGraphLegendItem, CtiGraphStats, ExtendedNode, GraphResultItem, GraphVertex, NodeVisualState } from './model/cti-graph.model';
import { ReportExportService } from '../../shared/services/report-export.service';
import { GraphReportExportType, GraphReportPayload } from '../../shared/model/report/report-export.model';
import { GRAPH_REPORT_EXPORT_OPTIONS } from '../../shared/model/report/export-choice.model';
import { ensureStylesheet } from '../../shared/utils/ensure-stylesheet.util';
import { ProxyController } from '../../shared/services/proxy-controller';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ProfileComponent } from '../../shared/partials/profile/profile.component';
import { UiDropdownOption } from '../../shared/partials/ui-dropdown/ui-dropdown.component';
import { splitCountryValues } from '../../shared/utils/country-normalization.util';
import { GraphAdvancedBuilderPopupComponent } from './advanced-builder-popup/advanced-builder-popup.component';
import { GraphAdvancedFilterChipModel, GraphAdvancedFilterModel, GraphBuilderLogicalOperator, GraphSearchMode, GraphSearchOptionModel, GraphSearchRequestModel } from './model/graph-builder.model';
import { TranslationService } from '../../shared/services/translation.service';
import type { NetworkPointerParams } from './model/graphs.model';
import { getOwnProperty, setOwnProperty } from '../../shared/utils/type-guards.util';

export type { NetworkPointerParams } from './model/graphs.model';


type GraphNodeColor = NonNullable<ExtendedNode['color']>;

@Component({
  selector: 'app-graphs',
  standalone: true,
  templateUrl: './graphs.component.html',
  styleUrls: ['./graphs.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FormsModule, CtiSidebarComponent, GraphContextMenuComponent, ExpandToggleButtonComponent, ExportChoiceModalComponent, ProfileComponent, TranslatePipe, GraphAdvancedBuilderPopupComponent]
})
export class GraphComponent implements OnInit, OnDestroy {
  private readonly proxied_resource = inject(ProxyController);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);
  private readonly maxNodeLabelLength = 28;
  private readonly edgeBaseColor = 'rgba(75, 85, 99, 0.8)';
  private readonly edgeHighlightColor = '#a78bfa';
  private readonly nodeFillColor = '#334155';
  private readonly nodePrimaryBorder = '#818cf8';
  private readonly nodeSecondaryBorder = '#94a3b8';
  private readonly nodeClusterBorder = '#f59e0b';
  private readonly nodeDocumentBorder = '#f97316';
  private readonly nodePropertyBorder = '#38bdf8';
  private readonly nodeFocusColor = '#facc15';
  private readonly defaultGraphBuilderClusterValue = 'general';
  private readonly clusterPalette: Record<string, { color: string; label: string; swatchClass: string; }> = { general: { color: '#38bdf8', label: 'General', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-sky-400' }, leak: { color: '#f97316', label: 'Leak', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500' }, tracking: { color: '#22c55e', label: 'Tracking', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-green-500' }, news: { color: '#eab308', label: 'News', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-yellow-500' }, defacement: { color: '#ef4444', label: 'Defacement', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-red-500' }, chat: { color: '#06b6d4', label: 'Chat', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-500' }, exploit: { color: '#fb7185', label: 'Exploit', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400' }, social: { color: '#a78bfa', label: 'Social', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-purple-400' }, apt: { color: '#f43f5e', label: 'APT', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500' }, malware: { color: '#14b8a6', label: 'Malware', swatchClass: 'h-2.5 w-2.5 shrink-0 rounded-full bg-teal-500' } };
  private readonly propertyClassPalette: Record<string, string> = { geo: '#22c55e', identity: '#38bdf8', infrastructure: '#60a5fa', indicator: '#f59e0b', vulnerability: '#fb7185', host_indicator: '#eab308', financial: '#34d399', crypto: '#f97316', organization: '#a78bfa', source: '#94a3b8' };
  private readonly iconMap: Record<string, string> = { cluster: 'diagram-3-fill', campaign: 'diagram-3-fill', document: 'file-earmark-text-fill', property: 'tags-fill', actor: 'tags-fill', encoded: 'code-slash', document_id: 'file-earmark-lock-fill', ip: 'hdd-network-fill', phone: 'telephone-fill', email: 'envelope-fill', domain: 'globe2', url: 'link-45deg', country: 'flag-fill', file: 'folder-fill', card: 'credit-card-2-front-fill', crypto: 'currency-bitcoin', bank: 'bank2', platform: 'cpu-fill', company: 'building-fill', person: 'person-fill', location: 'geo-alt-fill', language: 'translate', hashtag: 'hash', mention: 'at', xmpp: 'chat-dots-fill', tactic: 'bullseye', technique: 'tools', script: 'braces' };
  private groupInfo = new Map<string, string[]>();
  private groupedSubNodesByParent = new Map<string, Set<string>>();
  private groupParentByGroupId = new Map<string, string>();
  private groupExpandedState = new Map<string, boolean>();
  private highlightedNodeId: string | null = null;
  private physicsTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly minZoomScale = 0.35;
  private minZoomLockPosition: { x: number; y: number; } | null = null;
  private readonly originalNodeState = new Map<string, NodeVisualState>();
  private readonly clusterNodePrefix = 'cti_vertices/';
  private nodeTypeById: Record<string, string> = {};
  private lastAppliedQuerySignature = '';
  private readonly globalKeyDownListener = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.isGraphBuilderExpanded) {
      event.preventDefault();
      this.closeGraphBuilderExpanded();
      return;
    }
    if (!this.network) {
      return;
    }
    const eventTargetElement = event.target;
    const tag = eventTargetElement instanceof Element ? eventTargetElement.tagName.toLowerCase() : '';
    const isEditable = (eventTargetElement instanceof Element && eventTargetElement.closest('[contenteditable="true"]') !== null) || tag === 'input' || tag === 'textarea' || tag === 'select';
    if (isEditable) {
      return;
    }
    const panStep = 60;
    const current = this.network.getViewPosition();
    let nextX = current.x;
    let nextY = current.y;
    if (event.key === 'ArrowLeft') {
      nextX -= panStep;
    }
    else if (event.key === 'ArrowRight') {
      nextX += panStep;
    }
    else if (event.key === 'ArrowUp') {
      nextY -= panStep;
    }
    else if (event.key === 'ArrowDown') {
      nextY += panStep;
    }
    else {
      return;
    }
    event.preventDefault();
    this.network.moveTo({
      position: { x: nextX, y: nextY },
      animation: false
    });
  };
  private pendingFilters: CtiGraphFilters | null = null;
  private graphAdvancedFilterCounter = 0;
  private skipNextBasicSearchRouteApply = false;
  private hoveredNodeId: string | null = null;
  private pendingFocusNodeId: string | null = null;
  private graphRequestSequence = 0;
  private themeObserver: MutationObserver | null = null;

  networkContainer?: ElementRef<HTMLElement>;
  public rawNodes: ExtendedNode[] = [];
  public rawEdges: Edge[] = [];
  public nodeSet!: DataSet<ExtendedNode>;
  public edgeSet!: DataSet<Edge>;
  contextMenuNodeId = '';
  contextCanExpand = false;
  contextCanCollapse = false;
  contextShowOpenCti = false;
  contextShowOpenDocument = false;
  contextShowOpenReport = false;
  network!: Network;
  selectedType = 'cluster';
  singleInput = 'all';
  propertyType = 'all';
  propertyValue = '';
  maxEdge = 25;
  maxDepth = 1;
  loading = false;
  physicsEnabled = true;
  expandEnabled = false;
  isEmpty = false;
  result: GraphResultItem[] = [];
  contextMenuNode: ExtendedNode | null = null;
  copied = false;
  orignalColor: GraphNodeColor = '';
  isSidebarCollapsed = false;
  showMaxEdgeNotice = false;
  isReportExportModalOpen = false;
  readonly graphExportOptions = GRAPH_REPORT_EXPORT_OPTIONS;
  readonly primaryGraphSearchKeys = ['all', 'leak', 'tracking', 'news', 'defacement', 'chat', 'exploit', 'social', 'apt', 'malware'];
  readonly graphWhereOperatorOptions: UiDropdownOption[] = [ { key: '__where__', label: 'WHERE' } ];
  readonly graphJoinOperatorOptions: UiDropdownOption[] = [ { key: '&&', label: 'AND' }, { key: '||', label: 'OR' } ];
  readonly graphBuilderClusterOption: GraphSearchOptionModel = new GraphSearchOptionModel({ key: 'cluster', label: 'Cluster', mode: GraphSearchMode.Cluster, placeholder: 'Select cluster' });
  readonly graphBuilderClusterValueOptions: UiDropdownOption[] = [ { key: 'general', label: 'General' }, { key: 'leak', label: 'Leak' }, { key: 'tracking', label: 'Tracking' }, { key: 'news', label: 'News' }, { key: 'defacement', label: 'Defacement' }, { key: 'chat', label: 'Chat' }, { key: 'exploit', label: 'Exploit' }, { key: 'social', label: 'Social' }, { key: 'apt', label: 'APT' }, { key: 'malware', label: 'Malware' } ];
  readonly graphSearchOptions: GraphSearchOptionModel[] = [ { key: 'all', label: 'All', mode: 'all', placeholder: 'Search...' }, { key: 'leak', label: 'Leak', mode: 'cluster', clusterValue: 'leak', placeholder: 'Search leak...' }, { key: 'tracking', label: 'Tracking', mode: 'cluster', clusterValue: 'tracking', placeholder: 'Search tracking...' }, { key: 'news', label: 'News', mode: 'cluster', clusterValue: 'news', placeholder: 'Search news...' }, { key: 'defacement', label: 'Defacement', mode: 'cluster', clusterValue: 'defacement', placeholder: 'Search defacement...' }, { key: 'chat', label: 'Chat', mode: 'cluster', clusterValue: 'chat', placeholder: 'Search chat...' }, { key: 'exploit', label: 'Exploit', mode: 'cluster', clusterValue: 'exploit', placeholder: 'Search exploit...' }, { key: 'social', label: 'Social', mode: 'cluster', clusterValue: 'social', placeholder: 'Search social...' }, { key: 'apt', label: 'APT', mode: 'cluster', clusterValue: 'apt', placeholder: 'Search APT...' }, { key: 'malware', label: 'Malware', mode: 'cluster', clusterValue: 'malware', placeholder: 'Search malware...' }, { key: 'm_ip', label: 'IP Address', mode: 'property', propertyType: 'm_ip', placeholder: '8.8.8.8' }, { key: 'm_asns', label: 'ASN', mode: 'property', propertyType: 'm_asns', placeholder: 'AS13335 or 13335' }, { key: 'm_domain', label: 'Domain', mode: 'property', propertyType: 'm_domain', placeholder: 'example.com' }, { key: 'm_url', label: 'URL', mode: 'property', propertyType: 'm_url', placeholder: 'https://example.com/path' }, { key: 'm_encoded_urls', label: 'Encoded URL', mode: 'property', propertyType: 'm_encoded_urls', placeholder: 'Encoded or defanged URL' }, { key: 'm_email', label: 'Email', mode: 'property', propertyType: 'm_email', placeholder: 'name@example.com' }, { key: 'm_username', label: 'Username', mode: 'property', propertyType: 'm_username', placeholder: 'Username or handle' }, { key: 'm_person', label: 'Person', mode: 'property', propertyType: 'm_person', placeholder: 'Person name' }, { key: 'm_phone_number', label: 'Phone Number', mode: 'property', propertyType: 'm_phone_number', placeholder: '+1 555 0100' }, { key: 'm_org', label: 'Organization', mode: 'property', propertyType: 'm_org', placeholder: 'Company or organization' }, { key: 'm_attacker', label: 'Threat Actor', mode: 'property', propertyType: 'm_attacker', placeholder: 'Threat actor or alias' }, { key: 'm_alias', label: 'Alias', mode: 'property', propertyType: 'm_alias', placeholder: 'Actor or entity alias' }, { key: 'm_country', label: 'Country', mode: 'property', propertyType: 'm_country', placeholder: 'Pakistan, Iran, United States...' }, { key: 'm_location', label: 'Location', mode: 'property', propertyType: 'm_location', placeholder: 'City, state, region...' }, { key: 'm_origin_country', label: 'Origin Country', mode: 'property', propertyType: 'm_origin_country', placeholder: 'Origin country' }, { key: 'm_industry', label: 'Industry', mode: 'property', propertyType: 'm_industry', placeholder: 'Finance, healthcare...' }, { key: 'm_cve', label: 'CVE', mode: 'property', propertyType: 'm_cve', placeholder: 'CVE-2026-0000' }, { key: 'm_cwe', label: 'CWE', mode: 'property', propertyType: 'm_cwe', placeholder: 'CWE-79' }, { key: 'm_vulnerability', label: 'Vulnerability', mode: 'property', propertyType: 'm_vulnerability', placeholder: 'Vulnerability name' }, { key: 'm_cvss', label: 'CVSS', mode: 'property', propertyType: 'm_cvss', placeholder: '9.8' }, { key: 'm_severity', label: 'Severity', mode: 'property', propertyType: 'm_severity', placeholder: 'critical, high...' }, { key: 'm_risk', label: 'Risk', mode: 'property', propertyType: 'm_risk', placeholder: 'Risk level' }, { key: 'm_product', label: 'Product', mode: 'property', propertyType: 'm_product', placeholder: 'Affected product' }, { key: 'm_vendor', label: 'Vendor', mode: 'property', propertyType: 'm_vendor', placeholder: 'Vendor name' }, { key: 'm_version', label: 'Version', mode: 'property', propertyType: 'm_version', placeholder: 'Version string' }, { key: 'm_platform', label: 'Platform', mode: 'property', propertyType: 'm_platform', placeholder: 'Windows, Linux, Android...' }, { key: 'm_web_server', label: 'Web Server', mode: 'property', propertyType: 'm_web_server', placeholder: 'nginx, Apache...' }, { key: 'm_remote_type', label: 'Remote Type', mode: 'property', propertyType: 'm_remote_type', placeholder: 'Remote exploit type' }, { key: 'm_md5', label: 'MD5', mode: 'property', propertyType: 'm_md5', placeholder: 'MD5 hash' }, { key: 'm_sha1', label: 'SHA1', mode: 'property', propertyType: 'm_sha1', placeholder: 'SHA1 hash' }, { key: 'm_sha256', label: 'SHA256', mode: 'property', propertyType: 'm_sha256', placeholder: 'SHA256 hash' }, { key: 'm_sha3_384', label: 'SHA3-384', mode: 'property', propertyType: 'm_sha3_384', placeholder: 'SHA3-384 hash' }, { key: 'm_imphash', label: 'Imphash', mode: 'property', propertyType: 'm_imphash', placeholder: 'Import hash' }, { key: 'm_telfhash', label: 'Telfhash', mode: 'property', propertyType: 'm_telfhash', placeholder: 'Telfhash' }, { key: 'm_tlsh', label: 'TLSH', mode: 'property', propertyType: 'm_tlsh', placeholder: 'TLSH hash' }, { key: 'm_file_name', label: 'File Name', mode: 'property', propertyType: 'm_file_name', placeholder: 'payload.exe' }, { key: 'm_file_paths', label: 'File Path', mode: 'property', propertyType: 'm_file_paths', placeholder: '/tmp/payload.exe' }, { key: 'm_file_type', label: 'File Type', mode: 'property', propertyType: 'm_file_type', placeholder: 'PE, APK, PDF...' }, { key: 'm_signature', label: 'Signature', mode: 'property', propertyType: 'm_signature', placeholder: 'Signature name' }, { key: 'm_yara_rule', label: 'YARA Rule', mode: 'property', propertyType: 'm_yara_rule', placeholder: 'YARA rule name' }, { key: 'm_family', label: 'Malware Family', mode: 'property', propertyType: 'm_family', placeholder: 'Malware family' }, { key: 'm_registry_key_path', label: 'Registry Key', mode: 'property', propertyType: 'm_registry_key_path', placeholder: 'HKCU\\Software\\...' }, { key: 'm_mac_address', label: 'MAC Address', mode: 'property', propertyType: 'm_mac_address', placeholder: '00:11:22:33:44:55' }, { key: 'm_user_agents', label: 'User Agent', mode: 'property', propertyType: 'm_user_agents', placeholder: 'Mozilla/5.0...' }, { key: 'm_crypto_address', label: 'Crypto Address', mode: 'property', propertyType: 'm_crypto_address', placeholder: 'Wallet address' }, { key: 'm_currencies', label: 'Currency', mode: 'property', propertyType: 'm_currencies', placeholder: 'BTC, USD...' }, { key: 'm_network', label: 'Network', mode: 'property', propertyType: 'm_network', placeholder: 'Network name' }, { key: 'm_social_media_profiles', label: 'Social Profile', mode: 'property', propertyType: 'm_social_media_profiles', placeholder: 'Profile URL or handle' }, { key: 'm_hashtag', label: 'Hashtag', mode: 'property', propertyType: 'm_hashtag', placeholder: '#tag' }, { key: 'm_mention', label: 'Mention', mode: 'property', propertyType: 'm_mention', placeholder: '@handle' }, { key: 'm_xmpp_addresses', label: 'XMPP Address', mode: 'property', propertyType: 'm_xmpp_addresses', placeholder: 'user@example.com' }, { key: 'm_enterprise_attack_tactics', label: 'MITRE Tactic', mode: 'property', propertyType: 'm_enterprise_attack_tactics', placeholder: 'TA0001' }, { key: 'm_enterprise_attack_techniques', label: 'MITRE Technique', mode: 'property', propertyType: 'm_enterprise_attack_techniques', placeholder: 'T1059' }, { key: 'm_author', label: 'Author', mode: 'property', propertyType: 'm_author', placeholder: 'Author/source' }, { key: 'm_reporter', label: 'Reporter', mode: 'property', propertyType: 'm_reporter', placeholder: 'Reporter/source' }, { key: 'm_team', label: 'Team', mode: 'property', propertyType: 'm_team', placeholder: 'Team or group' }, { key: 'm_tags', label: 'Tag', mode: 'property', propertyType: 'm_tags', placeholder: 'Tag value' }, { key: 'm_first_seen', label: 'First Seen', mode: 'property', propertyType: 'm_first_seen', placeholder: 'First seen date' }, { key: 'm_last_seen', label: 'Last Seen', mode: 'property', propertyType: 'm_last_seen', placeholder: 'Last seen date' }, { key: 'm_uk_nhs', label: 'UK NHS Number', mode: 'property', propertyType: 'm_uk_nhs', placeholder: 'NHS number' }, { key: 'm_us_driver_license', label: 'US Driver License', mode: 'property', propertyType: 'm_us_driver_license', placeholder: 'Driver license' } ];
  activeGraphSearchKey = 'all';
  graphSearchAdvancedMode = false;
  isGraphBuilderExpanded = false;
  graphAdvancedFilters: GraphAdvancedFilterModel[] = [this.createGraphAdvancedFilter()];
  appliedGraphAdvancedFilterChips: GraphAdvancedFilterChipModel[] = [];
  graphSearchText = '';
  legendItems: CtiGraphLegendItem[] = [];
  clusterLegendItems: CtiGraphLegendItem[] = [];
  graphStats: CtiGraphStats = { visibleNodes: 0, totalNodes: 0, visibleEdges: 0, totalEdges: 0, hiddenNodes: 0 };
  nodeInfoPanelVisible = false;
  nodeInfoPanelHtml = '';
  nodeInfoPanelLeft = 12;
  nodeInfoPanelTop = 12;

  private getNodeLabelColor(): string {
    if (isPlatformBrowser(this.platformId)) {
      const bodyColor = getComputedStyle(document.body).getPropertyValue('--color-text1').trim();
      if (bodyColor) {
        return bodyColor;
      }
      const rootColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text1').trim();
      if (rootColor) {
        return rootColor;
      }
    }
    return '#e5e7eb';
  }

  private refreshGraphTheme(): void {
    const labelColor = this.getNodeLabelColor();
    this.rawNodes = this.rawNodes.map(node => ({
      ...node,
      font: {
        ...(node.font && typeof node.font === 'object' ? node.font : {}),
        color: labelColor,
      },
    }));
    if (!this.nodeSet) {
      return;
    }
    const updates: ExtendedNode[] = [];
    this.nodeSet.get().forEach(node => {
      if (node.id === undefined) {
        return;
      }
      updates.push({
        id: node.id,
        font: {
          ...(node.font && typeof node.font === 'object' ? node.font : {}),
          color: labelColor,
        },
      });
    });
    if (updates.length > 0) {
      this.nodeSet.update(updates);
    }
    this.network?.redraw();
    this.changeDetector.markForCheck();
  }

  @ViewChild('networkContainer')
  set networkContainerRef(ref: ElementRef<HTMLElement>) {
    if (ref) {
      this.networkContainer = ref;
      this.tryApplyPendingFilters();
    }
  }

  constructor( private api: ApiService, private clipboard: Clipboard, private route: ActivatedRoute, private router: Router, private graphReportExport: ReportExportService, @Inject(PLATFORM_ID) private platformId: object ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      ensureStylesheet('/assets/libs/vis-network.css', 'vis-network-styles');
      document.addEventListener('keydown', this.globalKeyDownListener, true);
      this.themeObserver = new MutationObserver(() => {
        this.refreshGraphTheme();
      });
      this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
    this.route.queryParams.subscribe(params => {
      const routeFilters = this.buildRouteFilterOverride(params);
      const shouldSkipRouteApply = this.skipNextBasicSearchRouteApply;
      this.skipNextBasicSearchRouteApply = false;
      if (routeFilters) {
        this.applyFilterValues(routeFilters);
        this.syncBasicSearchControlsFromRoute(params, routeFilters);
        if (shouldSkipRouteApply) {
          return;
        }
      }
      this.applyCurrentFilters();
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.removeEventListener('keydown', this.globalKeyDownListener, true);
      this.themeObserver?.disconnect();
      this.themeObserver = null;
    }
  }

  goBack(): void {
    if (isPlatformBrowser(this.platformId) && window.history.length > 1) {
      window.history.back();
    }
  }

  onSidebarCollapsedChange(isCollapsed: boolean): void {
    this.isSidebarCollapsed = isCollapsed;
  }

  private tryApplyPendingFilters(): void {
    if (!this.networkContainer || !this.pendingFilters) {
      return;
    }
    const queued = this.pendingFilters;
    this.pendingFilters = null;
    this.onSidebarApply(queued);
  }

  private buildRouteFilterOverride(params: Params): CtiGraphFilters | null {
    const selectedType = String(params.selectedType ?? '').trim();
    const singleInput = String(params.singleInput ?? '').trim();
    const propertyType = String(params.propertyType ?? '').trim();
    const propertyValue = String(params.propertyValue ?? '').trim();
    const hasExplicitRouteFilters = selectedType.length > 0 || singleInput.length > 0 || propertyValue.length > 0;

    if (!hasExplicitRouteFilters) {
      return null;
    }

    const parsedMaxEdge = Number(params.maxEdge);
    const parsedMaxDepth = Number(params.maxDepth);

    return {
      selectedType: selectedType || 'cluster',
      singleInput: singleInput || 'all',
      propertyType: propertyType || 'all',
      propertyValue: propertyValue || '',
      maxEdge: Number.isFinite(parsedMaxEdge) && parsedMaxEdge >= 20 && parsedMaxEdge <= 800 ? parsedMaxEdge : 25,
      maxDepth: Number.isFinite(parsedMaxDepth) && parsedMaxDepth >= 1 && parsedMaxDepth <= 5 ? parsedMaxDepth : 1
    };
  }

  get activeSidebarFilters(): CtiGraphFilters {
    return {
      selectedType: this.selectedType,
      singleInput: this.singleInput,
      propertyType: this.propertyType,
      propertyValue: this.propertyValue,
      maxEdge: Number(this.maxEdge),
      maxDepth: Number(this.maxDepth)
    };
  }

  get activeSidebarCollapsed(): boolean {
    return this.isSidebarCollapsed;
  }

  get activeGraphSearchOption(): GraphSearchOptionModel {
    return this.graphSearchOptions.find(option => option.key === this.activeGraphSearchKey) ?? this.graphSearchOptions[0];
  }

  get primaryGraphSearchOptions(): GraphSearchOptionModel[] {
    return this.graphSearchOptions.filter(option => this.primaryGraphSearchKeys.includes(option.key));
  }

  get graphBuilderSearchOptions(): GraphSearchOptionModel[] {
    return [
      this.graphBuilderClusterOption,
      ...this.graphSearchOptions.filter(option => option.mode === GraphSearchMode.Property && option.key !== 'm_origin_country')
    ];
  }

  get graphSearchPlaceholder(): string {
    return this.activeGraphSearchOption.placeholder;
  }

  setGraphSearchOption(optionKey: string): void {
    const option = this.graphSearchOptions.find(item => item.key === optionKey);
    if (!option) {
      return;
    }
    this.activeGraphSearchKey = option.key;
    this.graphSearchAdvancedMode = false;
    this.closeGraphBuilderExpanded();
    if (option.mode === GraphSearchMode.Cluster) {
      this.graphSearchText = '';
      this.submitGraphSearch();
    }
  }

  toggleGraphSearchBuilder(): void {
    this.graphSearchAdvancedMode = !this.graphSearchAdvancedMode;
    if (this.graphSearchAdvancedMode) {
      this.activeGraphSearchKey = this.graphAdvancedFilters[0]?.optionKey || 'm_country';
      return;
    }
    if (!this.primaryGraphSearchKeys.includes(this.activeGraphSearchKey)) {
      this.activeGraphSearchKey = 'all';
    }
    this.closeGraphBuilderExpanded();
  }

  openGraphBuilderExpanded(): void {
    this.isGraphBuilderExpanded = true;
  }

  closeGraphBuilderExpanded(): void {
    this.isGraphBuilderExpanded = false;
  }

  clearGraphAdvancedBuilder(): void {
    this.graphAdvancedFilters = [this.createGraphAdvancedFilter()];
    this.appliedGraphAdvancedFilterChips = [];
  }

  hasGraphAdvancedBuilderState(): boolean {
    if (this.appliedGraphAdvancedFilterChips.length) {
      return true;
    }
    if (this.graphAdvancedFilters.length !== 1) {
      return true;
    }
    const filter = this.graphAdvancedFilters[0];
    return Boolean(filter?.value.trim() || filter?.optionKey !== 'm_ip');
  }

  addGraphAdvancedFilter(): void {
    if (this.graphAdvancedFilters.length >= 8) {
      return;
    }
    this.graphAdvancedFilters = [...this.graphAdvancedFilters, this.createGraphAdvancedFilter()];
  }

  removeGraphAdvancedFilter(id: string): void {
    if (this.graphAdvancedFilters.length <= 1) {
      return;
    }
    this.graphAdvancedFilters = this.graphAdvancedFilters.filter(filter => filter.id !== id);
  }

  getGraphAdvancedOption(optionKey: string): GraphSearchOptionModel {
    return this.graphBuilderSearchOptions.find(option => option.key === optionKey) ?? this.graphBuilderSearchOptions[0] ?? this.graphSearchOptions[0];
  }

  setGraphFilterOperator(filter: GraphAdvancedFilterModel, value: string | null, index: number): void {
    if (index === 0) {
      return;
    }
    filter.operator = value === GraphBuilderLogicalOperator.Or ? GraphBuilderLogicalOperator.Or : GraphBuilderLogicalOperator.And;
  }

  setGraphFilterOption(filter: GraphAdvancedFilterModel, value: string | null): void {
    const option = this.graphBuilderSearchOptions.find(item => item.key === value);
    if (!option) {
      return;
    }
    const previousOption = this.getGraphAdvancedOption(filter.optionKey);
    filter.optionKey = option.key;
    if (option.mode === GraphSearchMode.Cluster) {
      filter.value = this.defaultGraphBuilderClusterValue;
    }
    else if (previousOption.mode === GraphSearchMode.Cluster) {
      filter.value = '';
    }
  }

  getGraphFilterClusterValue(filter: GraphAdvancedFilterModel): string {
    return filter.value || this.defaultGraphBuilderClusterValue;
  }

  getGraphAdvancedFilterChips(): GraphAdvancedFilterChipModel[] {
    return this.appliedGraphAdvancedFilterChips;
  }

  private buildGraphAdvancedFilterChips(): GraphAdvancedFilterChipModel[] {
    return this.graphAdvancedFilters.reduce<GraphAdvancedFilterChipModel[]>((chips, filter, index) => {
      const option = this.getGraphAdvancedOption(filter.optionKey);
      const value = this.getGraphFilterChipValue(filter, option);
      if (!value) {
        return chips;
      }

      const operator = chips.length === 0 ? 'WHERE' : (index === 0 || filter.operator === GraphBuilderLogicalOperator.And ? 'AND' : 'OR');
      chips.push(new GraphAdvancedFilterChipModel({ id: filter.id, label: `${operator} ${option.label}: ${value}` }));
      return chips;
    }, []);
  }

  setGraphFilterClusterValue(filter: GraphAdvancedFilterModel, value: string | null): void {
    if (!value || !this.graphBuilderClusterValueOptions.some(option => option.key === value)) {
      return;
    }
    filter.value = value;
  }

  private getGraphFilterChipValue(filter: GraphAdvancedFilterModel, option: GraphSearchOptionModel): string {
    if (option.mode === GraphSearchMode.Cluster) {
      const clusterValue = this.getGraphFilterClusterValue(filter);
      return this.graphBuilderClusterValueOptions.find(item => item.key === clusterValue)?.label ?? clusterValue;
    }
    return filter.value.trim();
  }

  private createGraphAdvancedFilter(): GraphAdvancedFilterModel {
    this.graphAdvancedFilterCounter += 1;
    return new GraphAdvancedFilterModel({
      id: `graph-filter-${Date.now()}-${this.graphAdvancedFilterCounter}`,
      optionKey: 'm_ip',
      value: '',
      operator: GraphBuilderLogicalOperator.And
    });
  }

  submitGraphSearch(): void {
    if (this.graphSearchAdvancedMode) {
      this.submitGraphSearchBuilder();
      return;
    }

    const option = this.activeGraphSearchOption;
    const queryValue = this.graphSearchText.trim();
    const nextFilters = { ...this.activeSidebarFilters };

    if (option.mode === GraphSearchMode.Cluster) {
      if (queryValue) {
        nextFilters.selectedType = 'property';
        nextFilters.singleInput = option.clusterValue ?? 'all';
        nextFilters.propertyType = 'all';
        nextFilters.propertyValue = queryValue;
        this.applyFilterValues(nextFilters);
        this.onSidebarApply(nextFilters);
        this.persistBasicSearchParams(nextFilters, option.key);
        return;
      }
      nextFilters.selectedType = 'cluster';
      nextFilters.singleInput = option.clusterValue ?? 'all';
      nextFilters.propertyType = 'all';
      nextFilters.propertyValue = '';
    }
    else if (option.mode === GraphSearchMode.Property) {
      if (!queryValue) {
        return;
      }
      nextFilters.selectedType = 'property';
      nextFilters.singleInput = '';
      nextFilters.propertyType = option.propertyType ?? 'all';
      nextFilters.propertyValue = queryValue;
    }
    else if (queryValue) {
      nextFilters.selectedType = 'property';
      nextFilters.singleInput = '';
      nextFilters.propertyType = 'all';
      nextFilters.propertyValue = queryValue;
    }
    else {
      nextFilters.selectedType = 'cluster';
      nextFilters.singleInput = 'all';
      nextFilters.propertyType = 'all';
      nextFilters.propertyValue = '';
    }

    this.applyFilterValues(nextFilters);
    this.onSidebarApply(nextFilters);
    this.persistBasicSearchParams(nextFilters, option.key);
  }

  private persistBasicSearchParams(filters: CtiGraphFilters, graphSearchKey: string): void {
    this.skipNextBasicSearchRouteApply = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        selectedType: filters.selectedType || null,
        singleInput: filters.singleInput || null,
        propertyType: filters.propertyType || null,
        propertyValue: filters.propertyValue || null,
        maxEdge: Number(filters.maxEdge),
        maxDepth: Number(filters.maxDepth),
        graphSearchKey: graphSearchKey || null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    }).finally(() => {
      this.skipNextBasicSearchRouteApply = false;
    });
  }

  private syncBasicSearchControlsFromRoute(params: Params, filters: CtiGraphFilters): void {
    this.graphSearchAdvancedMode = false;
    const requestedKey = String(params.graphSearchKey ?? '').trim();
    const requestedOption = requestedKey ? this.graphSearchOptions.find(option => option.key === requestedKey) : null;
    if (requestedOption) {
      this.activeGraphSearchKey = requestedOption.key;
      this.graphSearchText = filters.propertyValue || '';
      return;
    }

    if (filters.selectedType === 'property') {
      const propertyOption = this.graphSearchOptions.find(option => option.mode === GraphSearchMode.Property && option.propertyType === filters.propertyType);
      const scopedClusterOption = this.graphSearchOptions.find(option => option.mode === GraphSearchMode.Cluster && option.clusterValue === filters.singleInput);
      this.activeGraphSearchKey = propertyOption?.key ?? scopedClusterOption?.key ?? 'all';
      this.graphSearchText = filters.propertyValue || '';
      return;
    }

    const clusterOption = this.graphSearchOptions.find(option => option.mode === GraphSearchMode.Cluster && option.clusterValue === filters.singleInput);
    this.activeGraphSearchKey = clusterOption?.key ?? 'all';
    this.graphSearchText = '';
  }

  submitGraphSearchBuilder(): void {
    const requests = this.groupGraphBuilderListRequests(this.graphAdvancedFilters
      .map((filter, index) => this.buildGraphSearchRequest(this.getGraphAdvancedOption(filter.optionKey), filter.value.trim(), index === 0 ? undefined : filter.operator))
      .filter((request): request is GraphSearchRequestModel => !!request));
    const chips = this.buildGraphAdvancedFilterChips();

    if (requests.length === 0) {
      this.appliedGraphAdvancedFilterChips = [];
      return;
    }

    this.appliedGraphAdvancedFilterChips = chips;
    const nextFilters = {
      ...this.activeSidebarFilters,
      selectedType: 'property',
      singleInput: '',
      propertyType: 'advanced',
      propertyValue: this.describeGraphSearchBuilder(chips)
    };
    this.applyFilterValues(nextFilters);
    this.lastAppliedQuerySignature = `advanced-builder:${JSON.stringify({ requests, maxEdge: this.maxEdge, maxDepth: this.maxDepth })}`;
    this.loadGraphByRequests(requests);
  }

  private describeGraphSearchBuilder(chips: GraphAdvancedFilterChipModel[]): string {
    const filled = chips
      .map(chip => chip.label)
      .join(' ');
    return filled || 'advanced builder';
  }

  private buildGraphSearchRequest(option: GraphSearchOptionModel, queryValue: string, operator?: GraphSearchRequestModel['operator']): GraphSearchRequestModel | null {
    if (option.mode === GraphSearchMode.Cluster) {
      return new GraphSearchRequestModel({ dataPointType: 'cluster', modelType: 'cluster', queryValues: [queryValue ?? option.clusterValue ?? this.defaultGraphBuilderClusterValue], operator });
    }
    if (option.mode === GraphSearchMode.Property) {
      const queryValues = this.parseGraphBuilderValues(option, queryValue);
      return queryValues.length ? new GraphSearchRequestModel({ dataPointType: 'property', modelType: option.propertyType ?? 'all', queryValues, operator }) : null;
    }
    return null;
  }

  private parseGraphBuilderValues(option: GraphSearchOptionModel, queryValue: string): string[] {
    const trimmedValue = queryValue.trim();
    if (!trimmedValue) {
      return [];
    }
    if (option.propertyType === 'm_country' || option.propertyType === 'm_origin_country') {
      return splitCountryValues(trimmedValue);
    }
    return [trimmedValue];
  }

  private groupGraphBuilderListRequests(requests: GraphSearchRequestModel[]): GraphSearchRequestModel[] {
    const groupedRequests: GraphSearchRequestModel[] = [];

    requests.forEach(request => {
      if (request.dataPointType !== 'property' || !this.isGraphBuilderListKey(request.modelType)) {
        groupedRequests.push(request);
        return;
      }

      const previousRequest = groupedRequests[groupedRequests.length - 1];
      const canMergeWithPrevious = request.operator !== GraphBuilderLogicalOperator.And &&
        previousRequest?.dataPointType === request.dataPointType &&
        previousRequest.modelType === request.modelType &&
        previousRequest.operator !== GraphBuilderLogicalOperator.And;
      if (!canMergeWithPrevious) {
        groupedRequests.push(new GraphSearchRequestModel({ ...request, queryValues: [...request.queryValues] }));
        return;
      }

      previousRequest.queryValues = this.mergeGraphBuilderQueryValues(previousRequest.queryValues, request.queryValues);
    });

    return groupedRequests;
  }

  private isGraphBuilderListKey(modelType: string): boolean {
    return modelType === 'm_country' || modelType === 'm_origin_country';
  }

  private mergeGraphBuilderQueryValues(first: string[], second: string[]): string[] {
    const values: string[] = [];
    const seen = new Set<string>();
    [...first, ...second].forEach(value => {
      const trimmedValue = value.trim();
      const normalizedValue = trimmedValue.toLowerCase();
      if (!trimmedValue || seen.has(normalizedValue)) {
        return;
      }
      seen.add(normalizedValue);
      values.push(trimmedValue);
    });
    return values;
  }

  openReportExportModal(): void {
    this.isReportExportModalOpen = true;
  }

  closeReportExportModal(): void {
    this.isReportExportModalOpen = false;
  }

  exportByType(type: string): void {
    const exportType = type as GraphReportExportType;
    const payload = this.buildGraphReportPayload();
    if (exportType === 'graph_pdf') {
      payload.graphImageDataUrl = this.captureExpandedGraphSnapshot();
    }
    this.graphReportExport.exportByType(payload, exportType);
    this.closeReportExportModal();
  }

  private buildGraphReportPayload(): GraphReportPayload {
    const nodes = this.rawNodes.map(node => ({
      id: String(node.id ?? ''),
      label: String(node.label ?? ''),
      type: String(node.nodeType ?? 'unknown')
    }));
    const edges = this.rawEdges.map(edge => ({
      id: String(edge.id ?? `${edge.from}->${edge.to}`),
      from: String(edge.from ?? ''),
      to: String(edge.to ?? ''),
      label: edge.label ? String(edge.label) : ''
    }));
    const byType: Record<string, number> = {};
    nodes.forEach(node => {
      byType[node.type] = (byType[node.type] ?? 0) + 1;
    });
    return {
      graphKind: 'cti',
      title: this.translationService.translate('CTI Graph Intelligence Report'),
      sessionName: 'CTI Graph',
      generatedAtIso: new Date().toISOString(),
      nodes,
      edges,
      summary: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        clusters: byType.cluster ?? 0,
        documents: byType.document ?? 0,
        properties: byType.property ?? 0
      }
    };
  }

  private captureExpandedGraphSnapshot(): string | undefined {
    if (!this.networkContainer || !this.network || !this.nodeSet) {
      return undefined;
    }
    const originalScale = this.network.getScale();
    const originalPosition = this.network.getViewPosition();
    const groupsToExpand: {
        id: string;
        subNodes: string[];
    }[] = [];
    this.nodeSet.get().forEach(node => {
      const ext = node as ExtendedNode;
      const nodeId = String(ext.id ?? '');
      if (!ext.isGroup || !nodeId || (ext.subNodes?.length ?? 0) === 0) {
        return;
      }
      if (!this.groupExpandedState.get(nodeId)) {
        groupsToExpand.push({ id: nodeId, subNodes: ext.subNodes ?? [] });
      }
    });
    groupsToExpand.forEach(item => {
      this.expandGroupFromNodeId(item.id, item.subNodes, 200);
    });
    this.network.redraw();
    this.network.fit({ animation: false });
    const fittedPosition = this.network.getViewPosition();
    const fittedScale = this.network.getScale();
    this.network.moveTo({
      position: fittedPosition,
      scale: fittedScale * 0.9,
      animation: false
    });
    this.network.redraw();
    const canvasElements = this.networkContainer.nativeElement.querySelectorAll('canvas');
    let snapshot: string | undefined;
    if (canvasElements.length > 0) {
      const width = canvasElements[0].width;
      const height = canvasElements[0].height;
      const merged = document.createElement('canvas');
      merged.width = width;
      merged.height = height;
      const ctx = merged.getContext('2d');
      if (ctx) {
        canvasElements.forEach(canvasElement => {
          if (canvasElement.width === width && canvasElement.height === height) {
            ctx.drawImage(canvasElement, 0, 0);
          }
        });
        const pad = Math.round(Math.max(width, height) * 0.06);
        const padded = document.createElement('canvas');
        padded.width = width + (pad * 2);
        padded.height = height + (pad * 2);
        const pctx = padded.getContext('2d');
        if (pctx) {
          pctx.fillStyle = '#0f172a';
          pctx.fillRect(0, 0, padded.width, padded.height);
          pctx.drawImage(merged, pad, pad);
          snapshot = padded.toDataURL('image/jpeg', 0.92);
        }
        else {
          snapshot = merged.toDataURL('image/jpeg', 0.92);
        }
      }
    }
    groupsToExpand.forEach(item => {
      this.collapseGroupFromNodeId(item.id, item.subNodes, true);
    });
    this.network.moveTo({
      position: originalPosition,
      scale: originalScale,
      animation: false
    });
    this.network.redraw();
    return snapshot;
  }

  private applyCurrentFilters(): void {
    this.onSidebarApply(this.activeSidebarFilters);
  }

  private applyFilterValues(filters: CtiGraphFilters): void {
    this.selectedType = filters.selectedType;
    this.singleInput = filters.singleInput;
    this.propertyType = filters.propertyType;
    this.propertyValue = filters.propertyValue;
    this.maxEdge = Number(filters.maxEdge);
    this.maxDepth = Number(filters.maxDepth);
  }

  private buildQuerySignature(filters: CtiGraphFilters): string {
    return JSON.stringify({
      selectedType: filters.selectedType,
      singleInput: filters.singleInput,
      propertyType: filters.propertyType,
      propertyValue: filters.propertyValue,
      maxEdge: Number(filters.maxEdge),
      maxDepth: Number(filters.maxDepth)
    });
  }

  private nextGraphRequestId(): number {
    this.graphRequestSequence += 1;
    return this.graphRequestSequence;
  }

  private isCurrentGraphRequest(requestId: number): boolean {
    return requestId === this.graphRequestSequence;
  }

  resetGraph(): void {
    if (this.network) {
      this.network.destroy();
      Reflect.deleteProperty(this, 'network');
    }
    if (this.nodeSet) {
      this.nodeSet.clear();
    }
    if (this.edgeSet) {
      this.edgeSet.clear();
    }
    this.nodeSet = new DataSet<ExtendedNode>();
    this.edgeSet = new DataSet<Edge>();
    this.rawNodes = [];
    this.rawEdges = [];
    this.groupInfo.clear();
    this.groupedSubNodesByParent.clear();
    this.groupParentByGroupId.clear();
    this.groupExpandedState.clear();
    this.highlightedNodeId = null;
    this.contextMenuNode = null;
    this.contextMenuNodeId = '';
    this.hideNodeInfoPanel();
    this.hoveredNodeId = null;
    this.result = [];
    this.originalNodeState.clear();
    this.updateLegendState([], []);
    const container = this.networkContainer?.nativeElement;
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  }

  loadGraphByNode(data_point_type: string, type: string, value: string, maxEdge: string, maxDepth: string): void {
    if (this.expandEnabled) {
      queueMicrotask(() => {
        this.expandEnabled = false;
      });
    }
    else {
      this.expandEnabled = false;
    }
    this.loading = false;
    const requestId = this.nextGraphRequestId();
    const payload = this.buildGraphPayload(data_point_type, type, value, '', maxEdge, maxDepth);
    this.resetGraph();
    this.api.post<{
      results: GraphResultItem[];
  }>('graph', payload).subscribe({
    next: response => {
      if (!this.isCurrentGraphRequest(requestId)) {
        return;
      }
      const { results } = response;
      this.result = results;
      this.renderGraph(this.result);
      if (data_point_type === 'document') {
        this.focusGraphNode(this.pendingFocusNodeId ?? `cti_vertices/${value}`);
        this.pendingFocusNodeId = null;
      }
      this.loading = true;
    },
    error: () => {
      if (!this.isCurrentGraphRequest(requestId)) {
        return;
      }
      this.pendingFocusNodeId = null;
      this.isEmpty = true;
      this.loading = true;
    }
  });
  }

  private loadGraphByScopedPropertySearch(queryValue: string, clusterKey: string): void {
    if (this.expandEnabled) {
      queueMicrotask(() => {
        this.expandEnabled = false;
      });
    }
    else {
      this.expandEnabled = false;
    }

    this.loading = false;
    const requestId = this.nextGraphRequestId();
    this.resetGraph();
    this.api.post<{ results: GraphResultItem[]; }>('graph', this.buildGraphPayload('property', 'all', queryValue, clusterKey)).subscribe({
      next: response => {
        if (!this.isCurrentGraphRequest(requestId)) {
          return;
        }
        const results = response.results ?? [];
        this.result = clusterKey === 'all' ? results : this.filterGraphResultsByCluster(results, clusterKey);
        this.renderGraph(this.result);
        this.loading = true;
      },
      error: () => {
        if (!this.isCurrentGraphRequest(requestId)) {
          return;
        }
        this.isEmpty = true;
        this.loading = true;
      }
    });
  }

  private buildGraphPayload(dataPointType: string, modelType: string, queryValue: string, scopeCluster = '', edgeOverride?: string | number, depthOverride?: string | number): Record<string, string> {
    const payload: Record<string, string> = {
      data_point_type: dataPointType,
      model_type: modelType,
      query_value: queryValue,
      edge: String(edgeOverride ?? this.maxEdge),
      depth: String(depthOverride ?? this.maxDepth)
    };
    if (scopeCluster && scopeCluster !== 'all') {
      payload.scope_cluster = scopeCluster;
    }
    return payload;
  }

  private loadGraphByRequests(requests: GraphSearchRequestModel[]): void {
    if (this.expandEnabled) {
      queueMicrotask(() => {
        this.expandEnabled = false;
      });
    }
    else {
      this.expandEnabled = false;
    }
    this.loading = false;
    const requestId = this.nextGraphRequestId();
    this.resetGraph();
    const payload = {
      requests: requests.map(request => ({
        data_point_type: request.dataPointType,
        model_type: request.modelType,
        query_value: request.queryValues[0] || '',
        query_values: request.queryValues,
        operator: request.operator
      })),
      edge: String(this.maxEdge),
      depth: String(this.maxDepth)
    };
    this.api.post<{ results: GraphResultItem[]; }>('graph', payload).subscribe({
      next: response => {
        if (!this.isCurrentGraphRequest(requestId)) {
          return;
        }
        this.result = response.results ?? [];
        this.renderGraph(this.result);
        this.loading = true;
      },
      error: () => {
        if (!this.isCurrentGraphRequest(requestId)) {
          return;
        }
        this.isEmpty = true;
        this.loading = true;
      }
    });
  }

  private filterGraphResultsByCluster(results: GraphResultItem[], clusterKey: string): GraphResultItem[] {
    const clusterId = `cti_vertices/${clusterKey}`;
    const documentIds = new Set<string>();
    results.forEach(item => {
      const from = String(item.edge?._from ?? '');
      const to = String(item.edge?._to ?? '');
      if (from === clusterId && to) {
        documentIds.add(to);
      }
      if (to === clusterId && from) {
        documentIds.add(from);
      }
    });

    if (documentIds.size === 0) {
      return [];
    }

    return this.dedupeGraphResults(results.filter(item => {
      const vertexId = String(item.vertex?._id ?? '');
      const edgeFrom = String(item.edge?._from ?? '');
      const edgeTo = String(item.edge?._to ?? '');
      if (vertexId === clusterId || documentIds.has(vertexId)) {
        return true;
      }
      if (edgeFrom === clusterId || edgeTo === clusterId || documentIds.has(edgeFrom) || documentIds.has(edgeTo)) {
        return true;
      }
      return (item.path?.vertices ?? []).some(vertex => documentIds.has(String(vertex?._id ?? '')) || String(vertex?._id ?? '') === clusterId);
    }));
  }

  private dedupeGraphResults(results: GraphResultItem[]): GraphResultItem[] {
    const merged = new Map<string, GraphResultItem>();
    results.forEach(item => {
      const edgeId = item?.edge?._id ?? '';
      const vertexId = item?.vertex?._id ?? '';
      const key = `${edgeId}:${vertexId}:${item?.vertex?._key ?? ''}`;
      if (!merged.has(key)) {
        merged.set(key, item);
      }
    });
    return Array.from(merged.values());
  }

  showContextMenu( node: ExtendedNode, pointerDom?: { x: number; y: number; } ) {
    const menu = document.getElementById('customContextMenu');
    if (!menu) {
      return;
    }
    if (node?.color) {
      this.orignalColor = node.color;
    }
    if (node && typeof node.id === 'string') {
      const nodeId = node.id;
      const containerRect = this.networkContainer?.nativeElement?.getBoundingClientRect();
      let left: number;
      let top: number;
      if (pointerDom && containerRect) {
        left = containerRect.left + pointerDom.x;
        top = containerRect.top + pointerDom.y;
      }
      else {
        const box = this.network.getBoundingBox(node.id);
        const bottomRightDom = this.network.canvasToDOM({
          x: box.right,
          y: box.bottom
        });
        left = containerRect ? (containerRect.left + bottomRightDom.x) : bottomRightDom.x;
        top = containerRect ? (containerRect.top + bottomRightDom.y) : bottomRightDom.y;
      }
      this.contextMenuNodeId = node.id;
      this.contextMenuNode = node;
      this.contextCanExpand = this.canContextExpand();
      this.contextCanCollapse = this.canContextCollapse();
      this.contextShowOpenCti = this.showContextOpenCti();
      this.contextShowOpenDocument = this.showContextOpenDocument();
      this.contextShowOpenReport = this.showContextOpenReport();
      this.changeDetector.detectChanges();
      const menuWidth = menu.offsetWidth || 256;
      const menuHeight = menu.offsetHeight || 260;
      const viewportPadding = 12;
      if (left + menuWidth > window.innerWidth - viewportPadding) {
        left = window.innerWidth - menuWidth - viewportPadding;
      }
      if (top + menuHeight > window.innerHeight - viewportPadding) {
        top = window.innerHeight - menuHeight - viewportPadding;
      }
      if (left < viewportPadding) {
        left = viewportPadding;
      }
      if (top < viewportPadding) {
        top = viewportPadding;
      }
      menu.classList.remove('hidden');
      menu.setAttribute('data-left', String(this.normalizePositionValue(left)));
      menu.setAttribute('data-top', String(this.normalizePositionValue(top)));
      if (node.color) {
        this.orignalColor = node.color;
      }
      this.nodeSet.update({
        id: nodeId,
        color: {
          border: this.nodeFocusColor,
          background: this.nodeFillColor,
          highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
          hover: { border: this.nodeFocusColor, background: this.nodeFillColor }
        }
      });
    }
  }

  hideContextMenu() {
    const menu = document.getElementById('customContextMenu');
    const listingMenu = document.getElementById('contextMenu');
    if (listingMenu) {
      listingMenu.classList.add('hidden');
    }
    if (menu) {
      menu.classList.add('hidden');
      if (this.contextMenuNodeId) {
        this.nodeSet.update({ id: this.contextMenuNodeId, color: this.orignalColor });
      }
    }
    this.contextCanExpand = false;
    this.contextCanCollapse = false;
    this.contextShowOpenCti = false;
    this.contextShowOpenDocument = false;
    this.contextShowOpenReport = false;
    this.changeDetector.detectChanges();
  }

  private normalizePositionValue(rawValue: number): number {
    const step = 2;
    const rounded = Math.round(rawValue / step) * step;
    return Math.max(0, Math.min(4000, rounded));
  }

  private getEdgeIdsToRemove(fromId: string, toIds: string[]): string[] {
    const sourceId = this.groupParentByGroupId.get(fromId) ?? fromId;
    return this.rawEdges
      .filter(e => (e.from === sourceId && toIds.includes(e.to as string)) ||
  (e.to === sourceId && toIds.includes(e.from as string)) ||
  (toIds.includes(String(e.from)) && toIds.includes(String(e.to))))
      .map(e => e.id as string);
  }

  private removeSubNodesAndEdges(fromId: string, subNodes: string[]): void {
    subNodes.forEach(subId => {
      if (this.nodeSet.get(subId)) {
        this.nodeSet.remove(subId);
      }
    });
    const edgeIdsToRemove = this.getEdgeIdsToRemove(fromId, subNodes);
    this.edgeSet.remove(edgeIdsToRemove);
  }

  private buildCircularSubNodes( subNodes: string[], centerPos: { x: number; y: number; }, radius: number ): ExtendedNode[] {
    const newNodes: ExtendedNode[] = [];
    const uniqueSubNodes = Array.from(new Set(subNodes));
    const denom = uniqueSubNodes.length || 1;
    uniqueSubNodes.forEach((subId, index) => {
      if (this.nodeSet.get(subId)) {
        return;
      }
      const rawNode = this.rawNodes.find(n => n.id === subId);
      if (!rawNode) {
        return;
      }
      const angle = (2 * Math.PI * index) / denom;
      const x = centerPos.x + radius * Math.cos(angle);
      const y = centerPos.y + radius * Math.sin(angle);
      newNodes.push({ ...rawNode, x, y, physics: true });
    });
    return newNodes;
  }

  private createGroupNodeSvg(count: number, isExpanded = false, clusterLabel = 'CTI Cluster', clusterKey = ''): string {
    const paletteColor = getOwnProperty(this.clusterPalette, clusterKey)?.color ?? '#7dd3fc';
    const borderColor = isExpanded ? '#facc15' : paletteColor;
    const subtitle = clusterLabel.replace(/&/g, '&amp;').slice(0, 20);
    const initials = subtitle
      .split(/\s+/)
      .map(part => part.charAt(0))
      .join('')
      .slice(0, 3)
      .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${paletteColor}" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#1e293b" stop-opacity="1" />
      </linearGradient>
    </defs>
    <g>
      <circle cx="80" cy="80" r="74" fill="url(#grad1)" stroke="${borderColor}" stroke-width="6" />
      <text x="80" y="54" dominant-baseline="middle" font-family="'Inter', sans-serif" text-anchor="middle" font-size="18" font-weight="800" fill="#f8fafc">${initials}</text>
      <text x="80" y="85" dominant-baseline="middle" font-family="'Inter', sans-serif" text-anchor="middle" font-size="32" font-weight="800" fill="#f1f5f9">${count}</text>
      <text x="80" y="112" dominant-baseline="middle" font-family="'Inter', sans-serif" text-anchor="middle" font-size="10" font-weight="700" fill="#cbd5e1">${subtitle}</text>
    </g>
  </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private updateGroupNodeVisual(nodeId: string, count: number, isExpanded: boolean): void {
    const groupNode = this.nodeSet.get(nodeId) as ExtendedNode | null;
    const clusterKey = this.getClusterKeyFromNodeId(nodeId);
    const clusterLabel = groupNode?.title
      ? String(groupNode.title).split('(')[0].trim()
      : `${getOwnProperty(this.clusterPalette, clusterKey)?.label ?? this.toTitleCase(String(nodeId).split('/').pop() ?? 'CTI')} Cluster`;
    this.nodeSet.update({
      id: nodeId,
      shape: 'circularImage',
      image: this.createGroupNodeSvg(count, isExpanded, clusterLabel, clusterKey),
      size: 40,
      borderWidth: 0,
      label: ''
    });
  }

  private getClusterDocumentIds(nodeId: string): string[] {
    const resultDocIds = (this.result ?? [])
      .filter((item) => {
        const vertexId = String(item?.vertex?._id ?? '');
        const vertexType = String(item?.vertex?.type ?? '').toLowerCase();
        if (vertexType !== 'document' || !vertexId) {
          return false;
        }
        const from = String(item?.edge?._from ?? '');
        const to = String(item?.edge?._to ?? '');
        return from === nodeId || to === nodeId;
      })
      .map((item) => String(item?.vertex?._id ?? ''))
      .filter(Boolean);
    if (resultDocIds.length > 0) {
      return Array.from(new Set(resultDocIds));
    }
    const directNeighbors = this.rawEdges
      .filter(e => String(e.from) === nodeId || String(e.to) === nodeId)
      .map(e => String(e.from) === nodeId ? String(e.to) : String(e.from))
      .filter(id => !this.isClusterRootNode(id) && id !== nodeId);
    return Array.from(new Set(directNeighbors));
  }

  private getClusterCollapseTargets(nodeId: string): string[] {
    const documentIds = this.getClusterDocumentIds(nodeId);
    if (documentIds.length <= 5) {
      return [];
    }
    const collapsedTargets = new Set<string>(documentIds);
    for (const docId of documentIds) {
      this.rawEdges.forEach(edge => {
        const fromId = String(edge.from);
        const toId = String(edge.to);
        if (fromId === docId && !this.isClusterRootNode(toId) && toId !== nodeId) {
          collapsedTargets.add(toId);
        }
        if (toId === docId && !this.isClusterRootNode(fromId) && fromId !== nodeId) {
          collapsedTargets.add(fromId);
        }
      });
    }
    return Array.from(collapsedTargets);
  }

  private expandGroupFromNodeId(nodeId: string, subNodes: string[], radius: number): void {
    const isExpanded = this.groupExpandedState.get(nodeId) ?? false;
    if (isExpanded) {
      return;
    }
    const uniqueSubNodes = Array.from(new Set(subNodes));
    const sourceId = this.groupParentByGroupId.get(nodeId) ?? nodeId;
    const centerPos = getOwnProperty(this.network.getPositions([nodeId]), nodeId) ?? { x: 0, y: 0 };
    const existingEdgeIds = new Set(this.edgeSet.getIds().map(id => String(id)));
    const uniqueEdgesById = new Map<string, Edge>();
    this.rawEdges.forEach(e => {
      const fromId = String(e.from);
      const toId = String(e.to);
      const fromIn = uniqueSubNodes.includes(fromId);
      const toIn = uniqueSubNodes.includes(toId);
      const fromVisible = !!this.nodeSet.get(fromId);
      const toVisible = !!this.nodeSet.get(toId);
      const shouldInclude = ((fromId === sourceId && toIn) ||
  (toId === sourceId && fromIn) ||
  (fromIn && toIn) ||
  (fromIn && toVisible) ||
  (toIn && fromVisible));
      if (!shouldInclude) {
        return;
      }
      const edgeId = String(e.id ?? `${fromId}->${toId}`);
      if (existingEdgeIds.has(edgeId)) {
        return;
      }
      if (!uniqueEdgesById.has(edgeId)) {
        uniqueEdgesById.set(edgeId, { ...e, id: edgeId });
      }
    });
    const newEdges = Array.from(uniqueEdgesById.values());
    if (newEdges.length > 0) {
      this.edgeSet.add(newEdges);
    }
    const newNodes = this.buildCircularSubNodes(uniqueSubNodes, centerPos, radius);
    if (newNodes.length > 0) {
      this.nodeSet.add(newNodes);
    }
    this.groupExpandedState.set(nodeId, true);
    this.updateGroupNodeVisual(nodeId, uniqueSubNodes.length, true);
  }

  private autoExpandSingleVisibleGroupNode(visibleNodes: ExtendedNode[]): void {
    if (visibleNodes.length !== 1) {
      return;
    }
    const node = visibleNodes[0];
    const nodeId = String(node?.id ?? '');
    const subNodes = node?.subNodes ?? [];
    if (!node?.isGroup || !nodeId || subNodes.length === 0) {
      return;
    }
    queueMicrotask(() => {
      if (!this.network || !this.nodeSet?.get(nodeId)) {
        return;
      }
      const hasVisibleSubNode = subNodes.some(subNodeId => !!this.nodeSet.get(subNodeId));
      if (!hasVisibleSubNode) {
        this.groupExpandedState.set(nodeId, false);
      }
      this.expandGroupFromNodeId(nodeId, subNodes, 200);
      this.captureOriginalNodeColors([nodeId, ...subNodes]);
    });
  }

  private collapseGroupFromNodeId(nodeId: string, subNodes: string[], force = false): void {
    const isExpanded = this.groupExpandedState.get(nodeId) ?? false;
    if (!isExpanded && !force) {
      return;
    }
    this.removeSubNodesAndEdges(nodeId, subNodes);
    this.groupExpandedState.set(nodeId, false);
    this.updateGroupNodeVisual(nodeId, subNodes.length, false);
  }

  expandGroupNode(): void {
    this.hideContextMenu();
    const node = this.contextMenuNode;
    if (!node) {
      return;
    }
    const nodeId = node.id as string;
    const subNodes = this.getContextSubNodes(nodeId, node);
    if (!nodeId || subNodes.length === 0) {
      return;
    }
    this.expandGroupFromNodeId(nodeId, subNodes, 200);
    this.hideContextMenu();
  }

  collapseGroupNode(): void {
    this.hideContextMenu();
    const node = this.contextMenuNode;
    if (!node) {
      return;
    }
    const nodeId = node.id as string;
    const subNodes = this.getContextSubNodes(nodeId, node);
    if (this.isClusterRootNode(nodeId)) {
      this.collapseClusterGroup(nodeId, subNodes);
      this.hideContextMenu();
      return;
    }
    if (!nodeId || subNodes.length === 0) {
      return;
    }
    this.collapseGroupFromNodeId(nodeId, subNodes, true);
    this.hideContextMenu();
  }

  canContextExpand(): boolean {
    const node = this.contextMenuNode;
    if (!node) {
      return false;
    }
    const nodeId = String(node.id);
    if (this.isClusterRootNode(nodeId)) {
      return true;
    }
    const subNodes = this.getContextSubNodes(nodeId, node);
    if (subNodes.length === 0) {
      return false;
    }
    return !this.groupExpandedState.get(nodeId);
  }

  canContextCollapse(): boolean {
    const node = this.contextMenuNode;
    if (!node) {
      return false;
    }
    const nodeId = String(node.id);
    if (this.isClusterRootNode(nodeId)) {
      return true;
    }
    const subNodes = this.getContextSubNodes(nodeId, node);
    if (subNodes.length === 0) {
      return false;
    }
    return this.groupExpandedState.get(nodeId) ?? false;
  }

  showContextOpenCti(): boolean {
    const node = this.contextMenuNode;
    if (!node) {
      return false;
    }
    return !this.isClusterRootNode(String(node.id));
  }

  showContextOpenReport(): boolean {
    const node = this.contextMenuNode;
    if (!node) {
      return false;
    }
    return this.isReportNode(node);
  }

  showContextOpenDocument(): boolean {
    return this.showContextOpenReport();
  }

  private isReportNode(node: ExtendedNode | null): boolean {
    if (!node?.id) {
      return false;
    }
    const nodeId = String(node.id);
    const nodeType = String(node.nodeType ?? getOwnProperty(this.nodeTypeById, nodeId) ?? '').toLowerCase();
    const nodeClass = String(node.nodeClass ?? '').toLowerCase();
    return nodeType === 'document' || nodeType === 'report' || nodeClass === 'report';
  }

  openCTI() {
    const baseUrl = `${window.location.origin}/dashboard/ctigraph`;
    const parts = this.contextMenuNodeId.split('/');
    const singleInput = parts[parts.length - 1];
    const params = new URLSearchParams({
      selectedType: 'document',
      singleInput: singleInput
    });
    const fullUrl = `${baseUrl}?${params.toString()}`;
    this.proxied_resource.open(fullUrl);
    this.hideContextMenu();
  }

  openDocumentGraph(): void {
    const nodeId = this.contextMenuNodeId;
    const parts = nodeId.split('/');
    const documentKey = parts[parts.length - 1] || '';
    if (!documentKey) {
      this.hideContextMenu();
      return;
    }
    const nextFilters: CtiGraphFilters = {
      ...this.activeSidebarFilters,
      selectedType: 'document',
      singleInput: documentKey,
      propertyType: 'all',
      propertyValue: ''
    };
    this.pendingFocusNodeId = nodeId;
    this.hideContextMenu();
    this.applyFilterValues(nextFilters);
    this.lastAppliedQuerySignature = '';
    this.onSidebarApply(nextFilters);
    this.persistBasicSearchParams(nextFilters, 'all');
  }

  copyNodeLabel() {
    const _label = this.contextMenuNode?.label;
    if (_label) {
      this.clipboard.copy(_label);
      this.showCopiedMessage();
      this.hideContextMenu();
    }
  }

  private hasClusterEdge(nodeId: string, clusterId: string): boolean {
    return this.rawEdges.some(edge => (edge.from === nodeId && edge.to === clusterId) ||
  (edge.to === nodeId && edge.from === clusterId));
  }

  private normalizeReportCategory(category: string): string {
    const normalized = category.trim().toLowerCase();
    const aliases: Record<string, string> = {
      breach: 'leak',
      leaks: 'leak',
      strategic: 'general',
      telegram: 'chat',
      chats: 'chat'
    };
    return getOwnProperty(aliases, normalized) || normalized;
  }

  private getReportCategory(nodeId: string): string {
    const nodeClusterId = this.normalizeReportCategory(String(this.contextMenuNode?.clusterId ?? ''));
    if (nodeClusterId && getOwnProperty(this.clusterPalette, nodeClusterId)) {
      return nodeClusterId;
    }

    const checks: [
      string,
      string
  ][] = [
    ['general', 'cti_vertices/general'],
    ['leak', 'cti_vertices/leak'],
    ['tracking', 'cti_vertices/tracking'],
    ['news', 'cti_vertices/news'],
    ['defacement', 'cti_vertices/defacement'],
    ['exploit', 'cti_vertices/exploit'],
    ['chat', 'cti_vertices/chat'],
    ['social', 'cti_vertices/social'],
    ['apt', 'cti_vertices/apt'],
    ['malware', 'cti_vertices/malware']
  ];
    for (const [cat, clusterId] of checks) {
      if (this.hasClusterEdge(nodeId, clusterId)) {
        return cat;
      }
    }
    const connectedCluster = Array.from(this.getConnectedClusterKeys(nodeId))
      .find(clusterKey => checks.some(([cat]) => cat === clusterKey));
    if (connectedCluster) {
      return this.normalizeReportCategory(connectedCluster);
    }
    if (this.selectedType === 'cluster' && this.singleInput && this.singleInput !== 'all') {
      return this.normalizeReportCategory(this.singleInput);
    }
    return '';
  }

  private getReportPathForCategory(category: string): string | null {
    const pathByCategory: Record<string, string> = {
      apt: '/dashboard/apt-intel/apt',
      chat: '/dashboard/social/chat/all',
      defacement: '/dashboard/defacement/all',
      exploit: '/dashboard/exploit/all',
      general: '/dashboard/strategic/all',
      leak: '/dashboard/breach/all',
      malware: '/dashboard/apt-intel/malware',
      news: '/dashboard/feed/news',
      social: '/dashboard/social/all',
      tracking: '/dashboard/breach/tracking'
    };
    return pathByCategory[this.normalizeReportCategory(category)] || null;
  }

  viewReport() {
    const nodeId = this.contextMenuNodeId;
    const parts = nodeId.split('/');
    const singleInput = this.contextMenuNode?.docId ?? parts[parts.length - 1];
    const category = this.getReportCategory(nodeId);
    const reportPath = this.getReportPathForCategory(category);
    if (!singleInput || !reportPath) {
      this.hideContextMenu();
      return;
    }
    const encodedInput = encodeURIComponent(singleInput);
    this.proxied_resource.open(`${window.location.origin}${reportPath}/${encodedInput}`);
    this.hideContextMenu();
  }

  showCopiedMessage() {
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1500);
  }

  onPhysicsToggled(enabled: boolean): void {
    this.physicsEnabled = enabled;
    if (this.network) {
      this.network.setOptions({ physics: { enabled } });
    }
  }

  togglePhysics(): void {
    this.onPhysicsToggled(!this.physicsEnabled);
  }

  toggleExpandCollapseAll(): void {
    this.expandEnabled = !this.expandEnabled;
    this.nodeSet.get().forEach(node => {
      const groupNode = node as ExtendedNode;
      if (!groupNode.isGroup || !groupNode.subNodes || !groupNode.id) {
        return;
      }
      const nodeId = String(groupNode.id);
      if (this.expandEnabled) {
        this.expandGroupFromNodeId(nodeId, groupNode.subNodes, 200);
      }
      else {
        this.collapseGroupFromNodeId(nodeId, groupNode.subNodes);
      }
    });
    this.captureOriginalNodeColors();
  }

  onSidebarApply(filters: CtiGraphFilters): void {
    if (!this.networkContainer) {
      this.pendingFilters = { ...filters };
      return;
    }
    this.applyFilterValues(filters);
    queueMicrotask(() => {
      this.showMaxEdgeNotice = Number(this.maxEdge) > 50;
    });

    const nextQuerySignature = this.buildQuerySignature(filters);
    const shouldReload = this.lastAppliedQuerySignature !== nextQuerySignature || !this.network;
    if (!shouldReload) {
      this.applyGraphViewFilters();
      return;
    }

    this.lastAppliedQuerySignature = nextQuerySignature;
    if (filters.selectedType === 'property' && filters.propertyType && filters.propertyValue) {
      if (filters.propertyType === 'all' && filters.singleInput && filters.singleInput !== 'all') {
        this.loadGraphByScopedPropertySearch(filters.propertyValue, filters.singleInput);
      }
      else {
        this.loadGraphByNode(this.selectedType, filters.propertyType, filters.propertyValue, this.maxEdge.toString(), this.maxDepth.toString());
      }
    }
    else if ((filters.selectedType === 'cluster' || filters.selectedType === 'document') && filters.singleInput) {
      this.loadGraphByNode(this.selectedType, filters.selectedType, filters.singleInput, this.maxEdge.toString(), this.maxDepth.toString());
    }
  }

  onGraphSizeApply(filters: CtiGraphFilters): void {
    this.onSidebarApply(filters);
    if (this.graphSearchAdvancedMode || filters.propertyType === 'advanced') {
      return;
    }
    this.persistBasicSearchParams(filters, this.activeGraphSearchKey);
  }

  private renderGraph(data: GraphResultItem[]): void {
    this.resetGraph();
    this.isEmpty = data.length === 0;
    this.rawNodes = [];
    this.rawEdges = [];
    this.groupInfo.clear();
    this.groupedSubNodesByParent.clear();
    this.groupParentByGroupId.clear();
    this.groupExpandedState.clear();
    const edgeMap = this.buildEdgesAndEdgeMap(data);
    const rawNodeMap = this.buildRawNodeMap(data);
    const nodeTypeMap = this.buildNodeTypeMap(data);
    this.nodeTypeById = nodeTypeMap;
    this.rawNodes = this.buildRawNodes(rawNodeMap, nodeTypeMap, edgeMap);
    const { visibleNodes, visibleEdges } = this.buildVisibleSets();
    this.nodeSet = new DataSet(visibleNodes);
    this.edgeSet = new DataSet(visibleEdges);
    this.captureOriginalNodeColors();
    this.initNetwork();
    this.applyPhysicsAutoDisableIfNeeded();
    this.attachNetworkHandlers();
    this.autoExpandSingleVisibleGroupNode(visibleNodes);
    this.applyPropertyHighlights();
  }

  private applyGraphViewFilters(): void {
    if (!this.nodeSet || !this.edgeSet) {
      return;
    }
    this.hideContextMenu();
    this.highlightedNodeId = null;
    const { visibleNodes, visibleEdges } = this.buildVisibleSets();
    this.nodeSet.clear();
    this.edgeSet.clear();
    if (visibleNodes.length > 0) {
      this.nodeSet.add(visibleNodes);
    }
    if (visibleEdges.length > 0) {
      this.edgeSet.add(visibleEdges);
    }
    this.originalNodeState.clear();
    this.captureOriginalNodeColors();
    this.autoExpandSingleVisibleGroupNode(visibleNodes);
    this.applyPropertyHighlights();
    if (this.network) {
      this.network.redraw();
    }
  }

  private focusGraphNode(nodeId: string): void {
    queueMicrotask(() => {
      if (!this.network || !this.nodeSet?.get(nodeId)) {
        return;
      }
      this.network.focus(nodeId, {
        scale: Math.max(this.network.getScale(), 0.9),
        animation: {
          duration: 250,
          easingFunction: 'easeInOutQuad'
        }
      });
    });
  }

  private buildEdgesAndEdgeMap(data: GraphResultItem[]): Record<string, number> {
    const edgeMap: Record<string, number> = {};
    data.forEach(item => {
      const e = item.edge;
      if (!e?._from || !e._to) {
        return;
      }
      const edgeTitle = this.getEdgeTitle(e);
      this.rawEdges.push({
        id: e._id ?? `${e._from}->${e._to}`,
        from: e._from,
        to: e._to,
        arrows: 'to',
        color: { color: this.edgeBaseColor },
        title: edgeTitle,
        width: 1.5
      });
      edgeMap[e._from] = (edgeMap[e._from] || 0) + 1;
      edgeMap[e._to] = (edgeMap[e._to] || 0) + 1;
    });
    return edgeMap;
  }

  private getEdgeTitle(edge: GraphResultItem['edge']): string {
    const label = edge?.label ?? edge?.edge_type ?? edge?.relationship_type ?? edge?.type ?? 'Connection';
    const confidence = typeof edge?.confidence === 'number' ? ` (${Math.round(edge.confidence * 100)}%)` : '';
    return `${String(label).replace(/_/g, ' ')}${confidence}`;
  }

  private getNodeTitleAsHtml(vertex: GraphVertex): string {
    const lines: string[] = [];
    const type = String(vertex?.type ?? '').toLowerCase();
    const add = (label: string, value: unknown) => {
      const text = this.formatTooltipValue(value);
      if (text) {
        lines.push(`<strong>${this.escapeHtml(label)}:</strong> ${this.escapeHtml(text)}`);
      }
    };
    const title = this.formatTooltipValue(vertex?.display_value ?? vertex?.label ?? vertex?.title ?? vertex?.value);
    if (title) {
      lines.push(`<strong>${this.escapeHtml(this.truncateTooltipText(title, 90))}</strong>`);
    }

    if (type === 'document') {
      add('Type', 'Report');
      add('Cluster', this.formatTooltipLabel(vertex?.cluster_id ?? vertex?.module));
      add('Published', vertex?.published);
      add('Summary', this.truncateTooltipText(vertex?.summary, 180));
      add('Reliability', this.formatTooltipPercent(vertex?.source_reliability));
      add('ID', this.shortenTooltipId(vertex?.doc_id ?? vertex?.m_document_id ?? vertex?._key));
    }
    else if (type === 'cluster') {
      add('Type', 'Cluster');
    }
    else {
      add('Type', this.formatTooltipLabel(vertex?.type ?? vertex?.node_class));
      add('Role', this.formatTooltipLabel(vertex?.entity_role));
      add('Confidence', this.formatTooltipPercent(vertex?.confidence));
      add('Evidence', vertex?.evidence_count);
      add('First Seen', vertex?.first_seen);
      add('Last Seen', vertex?.last_seen);
      if (Array.isArray(vertex?.aliases) && vertex.aliases.length > 0) {
        add('Aliases', vertex.aliases.slice(0, 3).join(', '));
      }
    }

    return lines.join('<br>');
  }

  private formatTooltipValue(value: unknown): string {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return '';
    }
    return String(value).replace(/\s+/g, ' ').trim();
  }

  private truncateTooltipText(value: unknown, limit: number): string {
    const text = this.formatTooltipValue(value);
    if (text.length <= limit) {
      return text;
    }
    return `${text.slice(0, limit - 3)}...`;
  }

  private formatTooltipLabel(value: unknown): string {
    const text = this.formatTooltipValue(value).replace(/^m_/, '').replace(/_/g, ' ');
    if (!text) {
      return '';
    }
    return text.toLowerCase() === 'apt' ? 'APT' : this.toTitleCase(text);
  }

  private formatTooltipPercent(value: unknown): string {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return '';
    }
    const percent = numeric <= 1 ? numeric * 100 : numeric;
    return `${Math.round(percent)}%`;
  }

  private shortenTooltipId(value: unknown): string {
    const text = this.formatTooltipValue(value);
    if (/^[a-f0-9]{32,}$/i.test(text)) {
      return '';
    }
    if (text.length <= 22) {
      return text;
    }
    return `${text.slice(0, 12)}...${text.slice(-6)}`;
  }

  private toTitleCase(input: string): string {
    return input.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1));
  }

  private truncateLabel(label: string): string {
    const text = label.trim();
    if (text.length <= this.maxNodeLabelLength) {
      return text;
    }
    return `${text.slice(0, this.maxNodeLabelLength - 3)}...`;
  }

  private prettifyLabel(rawLabel: string): string {
    const base = rawLabel.split('/').pop() ?? rawLabel;
    const withoutPrefix = base.replace(/^m_/, '');
    const [rawKey, ...rawValueParts] = withoutPrefix.split(':');
    const key = this.toTitleCase(rawKey.replace(/_/g, ' ').trim());
    if (rawValueParts.length === 0) {
      return this.truncateLabel(key);
    }
    const value = rawValueParts.join(':').replace(/_/g, ' ').trim();
    return this.truncateLabel(`${key}: ${value}`);
  }

  private normalizeFullLabel(v: GraphVertex): string {
    if (this.selectedType === 'document' && String(v?.type ?? '').toLowerCase() === 'document') {
      const docLabel = v?.doc_id ?? v?.m_document_id ?? v?._key ?? v?._id;
      if (docLabel) {
        return String(docLabel).trim();
      }
    }
    const preferred = v?.display_value ?? v?.label ?? v?.title ?? v?.value;
    if (preferred) {
      return String(preferred).replace(/_/g, ' ').trim();
    }
    const rawLabel = String(v?._key ?? v?._id ?? '');
    const base = rawLabel.split('/').pop() ?? rawLabel;
    return base.replace(/^m_/, '').replace(/_/g, ' ').trim();
  }

  private normalizeLabel(v: GraphVertex): string {
    const fullLabel = this.normalizeFullLabel(v);
    if (fullLabel) {
      const propertyLabel = this.formatTooltipLabel(this.extractPropertyKey(v));
      if (propertyLabel) {
        const labelRemainder = fullLabel.slice(propertyLabel.length);
        const existingSeparator = /^\s*:/.exec(labelRemainder);
        const hasExistingKey = existingSeparator !== null
          && fullLabel.slice(0, propertyLabel.length).toLowerCase() === propertyLabel.toLowerCase();
        const displayLabel = hasExistingKey
          ? `${propertyLabel}:${labelRemainder.slice(existingSeparator[0].length)}`
          : `${propertyLabel}: ${fullLabel}`;
        return this.truncateLabel(displayLabel);
      }
      return this.truncateLabel(fullLabel);
    }
    return this.prettifyLabel(String(v?._key ?? v?._id ?? ''));
  }

  private extractPropertyKey(vertex: GraphVertex): string | null {
    const key = String(vertex?._key ?? '').toLowerCase();
    const match = /m_[a-z0-9_]+/.exec(key);
    return match ? match[0] : null;
  }

  private extractPropertyKeyFromLabel(label: string | undefined): string | null {
    if (!label) {
      return null;
    }
    const normalized = label.toLowerCase().replace(/\s+/g, '_');
    const match = /m_[a-z0-9_]+/.exec(normalized);
    if (match) {
      return match[0];
    }
    return normalized;
  }

  private getVisualNodeCategory(node: ExtendedNode): string {
    const type = String(node.nodeType ?? '').toLowerCase();
    if (type === 'cluster' || this.isClusterRootNode(String(node.id ?? ''))) {
      return 'cluster';
    }
    if (type === 'document') {
      return 'document';
    }
    return 'property';
  }

  private getClusterKeyFromNodeId(nodeId: string): string {
    if (!nodeId.startsWith(this.clusterNodePrefix)) {
      return '';
    }
    return nodeId.slice(this.clusterNodePrefix.length).toLowerCase();
  }

  private getConnectedClusterKeys(nodeId: string): Set<string> {
    const clusters = new Set<string>();
    const addCluster = (candidateId: string) => {
      const clusterKey = this.getClusterKeyFromNodeId(candidateId);
      if (clusterKey) {
        clusters.add(clusterKey);
      }
    };
    this.rawEdges.forEach(edge => {
      const from = String(edge.from ?? '');
      const to = String(edge.to ?? '');
      if (from === nodeId) {
        addCluster(to);
      }
      else if (to === nodeId) {
        addCluster(from);
      }
    });
    if (clusters.size > 0) {
      return clusters;
    }

    const adjacent = new Set<string>();
    this.rawEdges.forEach(edge => {
      const from = String(edge.from ?? '');
      const to = String(edge.to ?? '');
      if (from === nodeId) {
        adjacent.add(to);
      }
      else if (to === nodeId) {
        adjacent.add(from);
      }
    });
    adjacent.forEach(adjacentId => {
      this.rawEdges.forEach(edge => {
        const from = String(edge.from ?? '');
        const to = String(edge.to ?? '');
        if (from === adjacentId) {
          addCluster(to);
        }
        else if (to === adjacentId) {
          addCluster(from);
        }
      });
    });
    return clusters;
  }

  private getNodeAccentColor(node: ExtendedNode, type: string): string {
    if (type === 'cluster') {
      const clusterKey = this.getClusterKeyFromNodeId(String(node.id ?? ''));
      return getOwnProperty(this.clusterPalette, clusterKey)?.color ?? this.nodeClusterBorder;
    }
    if (type === 'document') {
      if (this.isFocusedDocumentNode(node)) {
        return this.nodeFocusColor;
      }
      return this.nodeDocumentBorder;
    }
    const classKey = String(node.nodeClass ?? '').toLowerCase();
    return getOwnProperty(this.propertyClassPalette, classKey) ?? this.nodePropertyBorder;
  }

  private getNodeSize(type: string, degree: number): number {
    const normalizedDegree = Math.min(Math.max(degree, 0), 14);
    const degreeBonus = Math.round(normalizedDegree * 0.7);
    if (type === 'cluster') {
      return 44 + degreeBonus;
    }
    if (type === 'document') {
      return 34 + degreeBonus;
    }
    return 30 + degreeBonus;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getIconNameForNode(node: ExtendedNode, type: string): string {
    if (node.isGroup) {
      return this.iconMap.cluster;
    }
    if (type === 'cluster') {
      return this.iconMap.cluster;
    }
    if (type === 'document') {
      return this.iconMap.document;
    }
    const rawKey = (node.propertyKey ?? '').toLowerCase();
    const labelKey = this.extractPropertyKeyFromLabel(node.label?.toString()) ?? '';
    const typeKey = (type ?? '').toLowerCase();
    const classKey = (node.nodeClass ?? '').toLowerCase();
    const key = rawKey || typeKey || classKey || labelKey;
    const tokens = [key, rawKey, typeKey, classKey, labelKey, key.replace(/^m_/, ''), key.replace(/_/g, ' ')]
      .filter(Boolean);
    for (const token of tokens) {
      for (const [needle, icon] of Object.entries(this.iconMap)) {
        if (needle === 'cluster' || needle === 'document' || needle === 'property') {
          continue;
        }
        if (token.includes(needle)) {
          return icon;
        }
      }
    }
    return this.iconMap.property;
  }

  private getNodeAcronym(node: ExtendedNode): string {
    const clusterKey = this.getClusterKeyFromNodeId(String(node.id ?? ''));
    if (clusterKey) {
      const label = getOwnProperty(this.clusterPalette, clusterKey)?.label ?? clusterKey;
      return label
        .split(/\s+/)
        .map(part => part.charAt(0))
        .join('')
        .slice(0, 3)
        .toUpperCase();
    }
    const source = String(node.propertyKey ?? node.nodeClass ?? node.rawLabel ?? node.label ?? '');
    const cleaned = source.replace(/^m_/, '').replace(/[_:./-]+/g, ' ').trim();
    if (!cleaned) {
      return '?';
    }
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts.map(part => part.charAt(0)).join('').slice(0, 3).toUpperCase();
  }

  private buildIconSvg(iconName: string, borderColor: string, node?: ExtendedNode): string | null {
    const def = getOwnProperty(BOOTSTRAP_ICON_PATHS, iconName);
    const iconContent = def
      ? `<g transform="translate(4 4) scale(0.5)">${def.paths.map(d => `<path d="${d}" fill="#f8fafc"/>`).join('')}</g>`
      : `<text x="8" y="9" dominant-baseline="middle" font-family="'Inter', sans-serif" text-anchor="middle" font-size="5.3" font-weight="800" fill="#f8fafc">${this.escapeHtml(node ? this.getNodeAcronym(node) : '?')}</text>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7.5" fill="${this.nodeFillColor}" stroke="${borderColor}" stroke-width="0.75"/>
      <circle cx="8" cy="8" r="5.9" fill="${borderColor}" fill-opacity="0.18"/>
      ${iconContent}
    </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private buildRawNodeMap(data: GraphResultItem[]): Map<string, ExtendedNode> {
    const rawNodeMap = new Map<string, ExtendedNode>();
    const put = (vertex: GraphVertex, color: string) => {
      const id = vertex?._id;
      if (!id) {
        return;
      }
      const rawLabel = this.normalizeFullLabel(vertex);
      const existingNode = rawNodeMap.get(id);
      if (existingNode) {
        existingNode.nodeClass = existingNode.nodeClass ?? vertex?.node_class;
        existingNode.clusterId = existingNode.clusterId ?? vertex?.cluster_id;
        existingNode.docId = existingNode.docId ?? vertex?.doc_id ?? vertex?.m_document_id ?? vertex?._key;
        existingNode.rawLabel = existingNode.rawLabel ?? rawLabel;
        existingNode.hiddenByDefault = [existingNode.hiddenByDefault, vertex?.hidden_by_default].some(Boolean);
        existingNode.nodeInfoHtml = existingNode.nodeInfoHtml ?? this.getNodeTitleAsHtml(vertex);
        return;
      }
      rawNodeMap.set(id, {
        id,
        label: this.normalizeLabel(vertex),
        nodeInfoHtml: this.getNodeTitleAsHtml(vertex),
        rawLabel,
        nodeClass: vertex?.node_class,
        clusterId: vertex?.cluster_id,
        docId: vertex?.doc_id ?? vertex?.m_document_id ?? vertex?._key,
        propertyKey: this.extractPropertyKey(vertex),
        hiddenByDefault: !!vertex?.hidden_by_default,
        color: {
          border: color,
          background: this.nodeFillColor,
          highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
          hover: { border: '#a5b4fc', background: this.nodeFillColor }
        },
        shape: 'dot',
        font: { size: 14, color: this.getNodeLabelColor() },
        size: 18
      });
    };
    data.forEach(item => {
      put(item.vertex, this.nodePrimaryBorder);
      (item.path?.vertices ?? []).forEach(pv => {
        put(pv, this.nodeSecondaryBorder);
      });
    });
    return rawNodeMap;
  }

  private buildNodeTypeMap(data: GraphResultItem[]): Record<string, string> {
    const nodeTypeMap: Record<string, string> = {};
    data.forEach(item => {
      if (item?.vertex?._id) {
        nodeTypeMap[item.vertex._id] = item.vertex.type ?? '';
      }
      (item.path?.vertices ?? []).forEach(pv => {
        if (pv?._id && pv?.type) {
          nodeTypeMap[pv._id] = pv.type;
        }
      });
    });
    return nodeTypeMap;
  }

  private buildRawNodes(rawNodeMap: Map<string, ExtendedNode>, nodeTypeMap: Record<string, string>, edgeMap: Record<string, number>): ExtendedNode[] {
    const nodes: ExtendedNode[] = [];
    rawNodeMap.forEach(node => {
      const nodeId = node.id as string;
      const nodeType = getOwnProperty(nodeTypeMap, nodeId) || '';
      const isClusterNode = nodeType === 'cluster';
      const isClusterRootNode = this.isClusterRootNode(nodeId);
      const clusterKey = this.getClusterKeyFromNodeId(nodeId);
      const clusterDocumentIds = isClusterRootNode ? this.getClusterDocumentIds(nodeId) : [];
      node.nodeType = nodeType;
      node.propertyKey ??= this.extractPropertyKeyFromLabel(node.label?.toString());
      let degree = getOwnProperty(edgeMap, nodeId) || 0;
      if (this.expandEnabled) {
        degree = 0;
      }
      const isGroupable = degree > 2 && isClusterRootNode && clusterDocumentIds.length > 5;
      if (isGroupable) {
        const subNodes = this.getClusterCollapseTargets(nodeId);
        const clusterLabel = `${getOwnProperty(this.clusterPalette, clusterKey)?.label ?? this.toTitleCase(String(nodeId).split('/').pop() ?? 'CTI')} Cluster`;
        this.groupInfo.set(nodeId, subNodes);
        this.groupParentByGroupId.set(nodeId, nodeId);
        nodes.push({
          id: node.id,
          label: '',
          rawLabel: clusterLabel,
          nodeType,
          degree,
          color: { border: 'transparent', background: 'transparent' },
          shape: 'circularImage',
          isGroup: true,
          physics: false,
          subNodes,
          nodeInfoHtml: `<strong>${this.escapeHtml(clusterLabel)}</strong><br><strong>${this.escapeHtml(this.translationService.translate('Type'))}:</strong> ${this.escapeHtml(this.translationService.translate('Cluster Group'))}<br><strong>${this.escapeHtml(this.translationService.translate('Reports'))}:</strong> ${clusterDocumentIds.length}`,
          font: { size: 14, color: this.getNodeLabelColor(), strokeWidth: 1 },
          size: 44,
          image: this.createGroupNodeSvg(clusterDocumentIds.length, false, clusterLabel, clusterKey),
          borderWidth: 0
        });
        this.groupedSubNodesByParent.set(nodeId, new Set(subNodes));
        return;
      }
      this.applyNonGroupNodeColor(node, isClusterNode, edgeMap);
      if (isClusterNode) {
        node.physics = false;
      }
      node.degree = degree;
      const iconName = this.getIconNameForNode(node, nodeType);
      const borderColor = this.getNodeAccentColor(node, nodeType);
      const icon = this.buildIconSvg(iconName, borderColor, node);
      if (icon) {
        node.shape = 'circularImage';
        node.image = icon;
        node.size = this.getNodeSize(nodeType, degree);
        node.borderWidth = 0;
      }
      nodes.push(node);
    });
    return nodes;
  }

  private applyNonGroupNodeColor(node: ExtendedNode, isClusterNode: boolean, edgeMap: Record<string, number>): void {
    const visualType = this.getVisualNodeCategory(node);
    const accentColor = this.getNodeAccentColor(node, visualType);
    if (this.isFocusedDocumentNode(node)) {
      node.color = {
        border: this.nodeFocusColor,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: this.nodeFocusColor, background: this.nodeFillColor }
      };
      return;
    }
    if (isClusterNode) {
      node.color = {
        border: accentColor,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: accentColor, background: this.nodeFillColor }
      };
      return;
    }
    const hasOutgoing = edgeMap[node.id as string];
    if (hasOutgoing) {
      return;
    }
    if (this.selectedType == 'cluster') {
      node.color = {
        border: accentColor,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: accentColor, background: this.nodeFillColor }
      };
    }
    else if (this.selectedType == 'document') {
      node.color = {
        border: this.nodeDocumentBorder,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: '#fdba74', background: this.nodeFillColor }
      };
    }
    else if (this.propertyValue && String(node.id).includes(this.propertyValue)) {
      node.color = {
        border: this.nodeFocusColor,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: this.nodeFocusColor, background: this.nodeFillColor }
      };
    }
    else {
      node.color = {
        border: accentColor,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: accentColor, background: this.nodeFillColor }
      };
    }
  }

  private isFocusedDocumentNode(node: ExtendedNode): boolean {
    if (this.selectedType !== 'document') {
      return false;
    }
    const nodeId = String(node.id ?? '');
    const documentKey = String(this.singleInput || '').trim();
    return !!documentKey && nodeId === `${this.clusterNodePrefix}${documentKey}`;
  }

  private buildVisibleSets(): {
  visibleNodes: ExtendedNode[];
  visibleEdges: Edge[];
  } {
    const groupedSubNodeIds = new Set([...this.groupInfo.values()].flat());
    const visibleNodes = this.rawNodes.filter(node => [node.isGroup, !groupedSubNodeIds.has(node.id as string)].some(Boolean));
    const visibleNodeIds = new Set(visibleNodes.map(node => String(node.id)));
    const hiddenToParent = new Map<string, string>();
    this.groupedSubNodesByParent.forEach((subSet, parentId) => {
      if (!visibleNodeIds.has(parentId)) {
        return;
      }
      subSet.forEach(subId => hiddenToParent.set(subId, parentId));
    });
    const visibleEdgesById = new Map<string, Edge>();
    this.rawEdges.forEach(edge => {
      const rawFrom = String(edge.from ?? '');
      const rawTo = String(edge.to ?? '');
      const from = hiddenToParent.get(rawFrom) ?? rawFrom;
      const to = hiddenToParent.get(rawTo) ?? rawTo;
      if (from === to || !visibleNodeIds.has(from) || !visibleNodeIds.has(to)) {
        return;
      }
      const isAggregated = from !== rawFrom || to !== rawTo;
      const id = isAggregated ? `${from}->${to}` : String(edge.id ?? `${from}->${to}`);
      if (!visibleEdgesById.has(id)) {
        visibleEdgesById.set(id, {
          ...edge,
          id,
          from,
          to,
          arrows: 'to',
          color: { color: this.edgeBaseColor },
          title: isAggregated ? 'Aggregated connection' : edge.title,
          width: edge.width ?? 1.5
        });
      }
    });

    const visibleEdges = Array.from(visibleEdgesById.values());
    this.updateLegendState(visibleNodes, visibleEdges);
    return { visibleNodes, visibleEdges };
  }

  private updateLegendState(visibleNodes: ExtendedNode[], visibleEdges: Edge[]): void {
    const counts: Record<string, number> = {
      cluster: 0,
      document: 0,
      property: 0
    };
    const clusterCounts: Record<string, number> = {};

    visibleNodes.forEach(node => {
      const category = this.getVisualNodeCategory(node);
      setOwnProperty(counts, category, (getOwnProperty(counts, category) ?? 0) + 1);
      if (category === 'cluster') {
        const clusterKey = this.getClusterKeyFromNodeId(String(node.id ?? ''));
        if (clusterKey) {
          setOwnProperty(clusterCounts, clusterKey, (getOwnProperty(clusterCounts, clusterKey) ?? 0) + 1);
        }
        return;
      }
      this.getConnectedClusterKeys(String(node.id ?? '')).forEach(clusterKey => {
        setOwnProperty(clusterCounts, clusterKey, (getOwnProperty(clusterCounts, clusterKey) ?? 0) + 1);
      });
    });

    this.legendItems = [
      { key: 'cluster', label: 'Clusters', color: this.nodeClusterBorder, swatchClass: 'h-3.5 w-3.5 shrink-0 rounded-full border-2 border-amber-500 bg-[var(--color-blue-720)]', count: counts.cluster ?? 0 },
      { key: 'document', label: 'Documents', color: this.nodeDocumentBorder, swatchClass: 'h-3.5 w-3.5 shrink-0 rounded-full border-2 border-orange-500 bg-[var(--color-blue-720)]', count: counts.document ?? 0 },
      { key: 'property', label: 'Entities', color: this.nodePropertyBorder, swatchClass: 'h-3.5 w-3.5 shrink-0 rounded-full border-2 border-sky-400 bg-[var(--color-blue-720)]', count: counts.property ?? 0 }
    ];

    this.clusterLegendItems = Object.entries(this.clusterPalette)
      .map(([key, value]) => ({
        key,
        label: value.label,
        color: value.color,
        swatchClass: value.swatchClass,
        count: getOwnProperty(clusterCounts, key) ?? 0
      }))
      .filter(item => item.count > 0);

    this.graphStats = {
      visibleNodes: visibleNodes.length,
      totalNodes: this.rawNodes.length,
      visibleEdges: visibleEdges.length,
      totalEdges: this.rawEdges.length,
      hiddenNodes: Math.max(0, this.rawNodes.length - visibleNodes.length)
    };
  }

  private initNetwork(): void {
    if (!this.networkContainer) {
      return;
    }
    const container = this.networkContainer.nativeElement;
    this.network = new Network(container, { nodes: this.nodeSet, edges: this.edgeSet }, {
      physics: {
        enabled: this.physicsEnabled,
        solver: 'forceAtlas2Based',
        timestep: 1,
        stabilization: { iterations: 1000, fit: true },
        forceAtlas2Based: {
          gravitationalConstant: -80,
          centralGravity: 0.003,
          springLength: 220,
          springConstant: 0.08,
          avoidOverlap: 1,
          damping: 0.6
        },
        maxVelocity: 100,
        minVelocity: 0.75
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.65 } },
        width: 1.5,
        smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
        color: {
          color: 'rgba(75, 85, 99, 0.8)',
          highlight: '#a78bfa',
          hover: '#d1d5db'
        }
      },
      nodes: {
        shape: 'dot',
        size: 18,
        borderWidth: 0.5,
        shadow: {
          enabled: true,
          color: 'rgba(0,0,0,0.5)',
          size: 10,
          x: 5,
          y: 5
        },
        shapeProperties: {
          useBorderWithImage: true
        },
        font: { size: 14, color: this.getNodeLabelColor() },
        color: {
          highlight: { border: '#c4b5fd', background: '#6d28d9' },
          hover: { border: '#a5b4fc', background: '#5b21b6' }
        }
      },
      interaction: {
        selectConnectedEdges: false,
        tooltipDelay: 100,
        hideEdgesOnDrag: false,
        hover: true,
        navigationButtons: false,
        keyboard: false,
        zoomView: true,
        dragView: true
      },
      layout: {
        improvedLayout: true
      }
    });
    container.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });
  }

  private applyPhysicsAutoDisableIfNeeded(): void {
    if (this.physicsTimeoutId !== null) {
      clearTimeout(this.physicsTimeoutId);
      this.physicsTimeoutId = null;
    }
    if (this.physicsEnabled) {
      return;
    }
    if (this.network) {
      this.network.setOptions({ physics: { enabled: true } });
    }
    this.physicsTimeoutId = setTimeout(() => {
      this.physicsEnabled = false;
      if (this.network) {
        this.network.setOptions({ physics: { enabled: false } });
      }
      this.physicsTimeoutId = null;
    }, 1500);
  }

  private attachNetworkHandlers(): void {
    this.network.on('oncontext', params => {
      this.handleContextMenu(params);
    });
    this.network.on('click', params => {
      this.handleClick(params);
    });
    this.network.on('hoverNode', params => {
      this.handleNodeHover(String(params.node));
    });
    this.network.on('blurNode', params => {
      this.handleNodeBlur(String(params.node));
    });
    this.network.on('doubleClick', params => {
      this.handleDoubleClick(params);
    });
    this.network.on('dragStart', () => {
      this.hideNodeInfoPanel();
    });
    this.network.on('zoom', (properties: { direction?: string }) => {
      this.hideNodeInfoPanel();
      const currentScale = this.network.getScale();
      const currentPosition = this.network.getViewPosition();
      if (currentScale <= this.minZoomScale) {
        const lockPosition = this.minZoomLockPosition ?? currentPosition;
        this.minZoomLockPosition = lockPosition;
        if (properties?.direction === '-') {
          this.network.moveTo({ scale: this.minZoomScale, position: lockPosition, animation: false });
        }
        else {
          this.network.moveTo({ scale: this.minZoomScale, animation: false });
        }
      }
      else {
        this.minZoomLockPosition = currentPosition;
      }
    });
  }

  private handleContextMenu(params: NetworkPointerParams): void {
    this.hideContextMenu();
    const pointer = params.pointer.DOM;
    const rawNodeId = this.network.getNodeAt(pointer);
    if (!rawNodeId) {
      this.hideContextMenu();
      return;
    }
    const nodeId = String(rawNodeId);
    const node = this.nodeSet.get(nodeId) as ExtendedNode;
    const isMainClusterNode = this.isClusterRootNode(nodeId);
    const isReportNode = this.isReportNode(node);
    const hasClusterConnection = this.rawEdges.some(edge => (edge.from === node?.id && this.isClusterRootNode(String(edge.to))) ||
  (edge.to === node?.id && this.isClusterRootNode(String(edge.from))));
    if (!node) {
      return;
    }
    if (!isMainClusterNode && !hasClusterConnection && !node.isGroup && !isReportNode) {
      return;
    }
    this.showContextMenu(node, pointer);
  }

  private getContextSubNodes(nodeId: string, node: ExtendedNode): string[] {
    if ((node.subNodes?.length ?? 0) > 0) {
      return node.subNodes ?? [];
    }
    if ((this.groupInfo.get(nodeId)?.length ?? 0) > 0) {
      return this.groupInfo.get(nodeId) ?? [];
    }
    if (this.isClusterRootNode(nodeId)) {
      const visibleResolved = this.getVisibleClusterAttachedNodeIds(nodeId);
      if (visibleResolved.length > 0) {
        return visibleResolved;
      }
      return this.getClusterCollapseTargets(nodeId);
    }
    return [];
  }

  private isClusterRootNode(nodeId: string): boolean {
    const t = this.nodeTypeById[String(nodeId)] ?? '';
    if (t) {
      return t === 'cluster';
    }
    return nodeId.startsWith(this.clusterNodePrefix);
  }

  private collapseClusterGroup(clusterNodeId: string, subNodes: string[]): void {
    const candidates = new Set(subNodes);
    if (candidates.size === 0) {
      return;
    }
    const directNeighbors = new Set(this.getDirectClusterNeighbors(clusterNodeId));
    const docsToRemove = Array.from(candidates).filter(id => directNeighbors.has(id));
    const docsToRemoveSet = new Set(docsToRemove);
    docsToRemove.forEach(id => {
      if (this.nodeSet.get(id)) {
        this.nodeSet.remove(id);
      }
    });
    const edges = this.edgeSet.get();
    const edgeIdsToRemove = edges
      .filter(edge => docsToRemoveSet.has(String(edge.from)) || docsToRemoveSet.has(String(edge.to)))
      .map(edge => edge.id as string)
      .filter(Boolean);
    this.edgeSet.remove(edgeIdsToRemove);
    const props = Array.from(candidates).filter(id => !directNeighbors.has(id));
    props.forEach(propId => {
      const remainingEdges = this.edgeSet.get({
        filter: edge => String(edge.from) === propId || String(edge.to) === propId
      });
      const hasOutsideConnection = remainingEdges.some(edge => {
        const other = String(edge.from) === propId ? String(edge.to) : String(edge.from);
        return !candidates.has(other) && other !== clusterNodeId;
      });
      if (!hasOutsideConnection && this.nodeSet.get(propId)) {
        this.nodeSet.remove(propId);
      }
    });
    const residualEdgesToRemove = this.edgeSet.get()
      .filter(edge => {
        const from = String(edge.from);
        const to = String(edge.to);
        return ((from === clusterNodeId && candidates.has(to)) ||
  (to === clusterNodeId && candidates.has(from)) ||
  (candidates.has(from) && candidates.has(to)));
      })
      .map(edge => edge.id as string)
      .filter(Boolean);
    this.edgeSet.remove(residualEdgesToRemove);
    this.groupExpandedState.set(clusterNodeId, false);
    this.updateGroupNodeVisual(clusterNodeId, this.getClusterDocumentIds(clusterNodeId).length, false);
  }

  private getVisibleClusterAttachedNodeIds(clusterNodeId: string): string[] {
    const direct = this.getDirectClusterNeighbors(clusterNodeId);
    const all = new Set<string>(direct);
    const edges = this.edgeSet.get();
    for (const baseId of direct) {
      for (const edge of edges) {
        const from = String(edge.from);
        const to = String(edge.to);
        if (from === baseId && !this.isClusterRootNode(to) && to !== clusterNodeId) {
          all.add(to);
        }
        else if (to === baseId && !this.isClusterRootNode(from) && from !== clusterNodeId) {
          all.add(from);
        }
      }
    }
    return Array.from(all);
  }

  private getDirectClusterNeighbors(clusterNodeId: string): string[] {
    const neighbors = new Set<string>();
    const edges = this.edgeSet.get();
    for (const edge of edges) {
      const from = String(edge.from);
      const to = String(edge.to);
      if (from === clusterNodeId && !this.isClusterRootNode(to) && to !== clusterNodeId) {
        neighbors.add(to);
      }
      else if (to === clusterNodeId && !this.isClusterRootNode(from) && from !== clusterNodeId) {
        neighbors.add(from);
      }
    }
    return Array.from(neighbors);
  }

  private handleClick(params: NetworkPointerParams): void {
    this.hideContextMenu();
    const pointer = params.pointer.DOM;
    const nodeIdRaw = this.network.getNodeAt(pointer);
    if (!nodeIdRaw) {
      this.hideNodeInfoPanel();
      return;
    }
    const nodeId = String(nodeIdRaw);
    const node = this.nodeSet.get(nodeId) as ExtendedNode | null;
    this.toggleEdgeHighlightOnClick(nodeId);
    if (node) {
      this.showNodeInfoPanel(node, pointer);
    }
  }

  private handleNodeHover(nodeId: string): void {
    if (!this.nodeSet?.get(nodeId) || this.hoveredNodeId === nodeId) {
      return;
    }
    if (this.hoveredNodeId) {
      this.handleNodeBlur(this.hoveredNodeId);
    }
    this.hoveredNodeId = nodeId;
    const node = this.nodeSet.get(nodeId) as ExtendedNode;
    const visualType = this.getVisualNodeCategory(node);
    const accentColor = this.getNodeAccentColor(node, visualType);
    this.nodeSet.update({
      id: nodeId,
      color: {
        border: this.nodeFocusColor,
        background: this.nodeFillColor,
        highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
        hover: { border: accentColor, background: this.nodeFillColor }
      },
      borderWidth: 2,
      borderWidthSelected: 3
    });
  }

  private handleNodeBlur(nodeId: string): void {
    const original = this.originalNodeState.get(nodeId);
    if (original && this.nodeSet?.get(nodeId)) {
      this.nodeSet.update({
        id: nodeId,
        color: original.color,
        borderWidth: original.borderWidth,
        borderWidthSelected: original.borderWidthSelected,
        image: original.image
      });
    }
    if (this.hoveredNodeId === nodeId) {
      this.hoveredNodeId = null;
    }
  }

  private showNodeInfoPanel(node: ExtendedNode, pointerDom?: { x: number; y: number; }): void {
    const html = node.nodeInfoHtml ?? this.getFallbackNodeInfoHtml(node);
    if (!html) {
      this.hideNodeInfoPanel();
      return;
    }
    this.positionNodeInfoPanel(pointerDom);
    this.nodeInfoPanelHtml = html;
    this.nodeInfoPanelVisible = true;
    this.changeDetector.detectChanges();
    this.applyNodeInfoPanelPosition();
  }

  hideNodeInfoPanel(): void {
    this.nodeInfoPanelVisible = false;
    this.nodeInfoPanelHtml = '';
  }

  private positionNodeInfoPanel(pointerDom?: { x: number; y: number; }): void {
    const container = this.networkContainer?.nativeElement;
    const width = 292;
    const height = 260;
    const padding = 12;
    const offset = 14;
    const containerWidth = container?.clientWidth ?? window.innerWidth;
    const containerHeight = container?.clientHeight ?? window.innerHeight;
    const maxLeft = Math.max(padding, containerWidth - width - padding);
    const maxTop = Math.max(padding, containerHeight - height - padding);
    const x = pointerDom?.x ?? padding;
    const y = pointerDom?.y ?? padding;
    const preferredLeft = x + offset + width <= containerWidth - padding ? x + offset : x - width - offset;
    const preferredTop = y + offset + height <= containerHeight - padding ? y + offset : y - height - offset;
    this.nodeInfoPanelLeft = Math.min(Math.max(preferredLeft, padding), maxLeft);
    this.nodeInfoPanelTop = Math.min(Math.max(preferredTop, padding), maxTop);
  }

  private applyNodeInfoPanelPosition(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const panel = document.getElementById('ctiNodeInfoPanel');
    if (!panel) {
      return;
    }
    panel.setAttribute('data-left', String(this.normalizePositionValue(this.nodeInfoPanelLeft)));
    panel.setAttribute('data-top', String(this.normalizePositionValue(this.nodeInfoPanelTop)));
  }

  private getFallbackNodeInfoHtml(node: ExtendedNode): string {
    const label = this.formatTooltipValue(node.rawLabel ?? node.label ?? node.id);
    const type = this.formatTooltipLabel(node.nodeType ?? node.nodeClass ?? 'Node');
    const lines = [
      label ? `<strong>${this.escapeHtml(this.truncateTooltipText(label, 90))}</strong>` : '',
      type ? `<strong>${this.escapeHtml(this.translationService.translate('Type'))}:</strong> ${this.escapeHtml(type)}` : '',
      node.degree !== undefined ? `<strong>${this.escapeHtml(this.translationService.translate('Connections'))}:</strong> ${node.degree}` : ''
    ].filter(Boolean);
    return lines.join('<br>');
  }

  private handleDoubleClick(params: NetworkPointerParams): void {
    this.hideContextMenu();
    const pointer = params.pointer.DOM;
    const nodeIdRaw = this.network.getNodeAt(pointer);
    if (!nodeIdRaw) {
      return;
    }
    const nodeId = String(nodeIdRaw);
    const node = this.nodeSet.get(nodeId) as ExtendedNode;
    if (!node) {
      return;
    }
    const subNodes = this.getContextSubNodes(nodeId, node);
    if (subNodes.length === 0) {
      return;
    }
    const isExpanded = this.groupExpandedState.get(nodeId) ?? false;
    if (isExpanded) {
      this.collapseGroupFromNodeId(nodeId, subNodes);
    }
    else {
      this.expandGroupFromNodeId(nodeId, subNodes, 200);
    }
  }

  private toggleEdgeHighlightOnClick(nodeId: string): void {
    const isSameNodeClicked = this.highlightedNodeId === nodeId;
    const allEdges = this.edgeSet.get();
    const resetEdges = allEdges
      .filter((e): e is { id: string | number } => e.id !== undefined)
      .map(e => ({
        id: e.id,
        color: { color: this.edgeBaseColor },
        width: 1.5
      }));
    this.edgeSet.update(resetEdges);
    if (isSameNodeClicked) {
      this.highlightedNodeId = null;
      return;
    }
    const connectedEdges = this.edgeSet.get({
      filter: edge => edge.from === nodeId || edge.to === nodeId
    });
    const highlightEdges = connectedEdges
      .filter((e): e is { id: string | number } => e.id !== undefined)
      .map(e => ({
        id: e.id,
        color: { color: this.edgeHighlightColor },
        width: 2.5
      }));
    this.edgeSet.update(highlightEdges);
    this.highlightedNodeId = String(nodeId);
  }

  private applyPropertyHighlights(): void {
    const needle = (this.propertyValue || '').toLowerCase();
    if (!needle) {
      return;
    }
    const matchedNodeIds: string[] = [];
    this.nodeSet.get().forEach(node => {
      const label = (node.label ?? '').toString().toLowerCase();
      if (!label.includes(needle)) {
        return;
      }
      matchedNodeIds.push(node.id as string);
      this.nodeSet.update({
        id: node.id,
        color: {
          border: this.nodeFocusColor,
          background: this.nodeFillColor,
          highlight: { border: this.nodeFocusColor, background: this.nodeFillColor },
          hover: { border: this.nodeFocusColor, background: this.nodeFillColor }
        }
      });
    });
    const matchedEdges = this.edgeSet.get({
      filter: edge => matchedNodeIds.includes(edge.from as string) || matchedNodeIds.includes(edge.to as string)
    });
    this.edgeSet.update(matchedEdges
      .filter((edge): edge is { id: string | number } => edge.id !== undefined)
      .map(edge => ({
        id: edge.id,
        color: { color: this.edgeHighlightColor },
        dashes: true,
        width: 2.5,
        arrows: { to: { enabled: false } }
      })));
  }

  private captureOriginalNodeColors(nodeIds?: string[]): void {
    const nodes: ExtendedNode[] = [];
    if (nodeIds) {
      nodeIds.forEach(id => {
        const node = this.nodeSet.get(id) as ExtendedNode | null;
        if (node) {
          nodes.push(node);
        }
      });
    }
    else {
      nodes.push(...(this.nodeSet.get() as ExtendedNode[]));
    }
    nodes.forEach(node => {
      if (!node?.id) {
        return;
      }
      this.originalNodeState.set(String(node.id), {
        color: node.color ?? '',
        borderWidth: node.borderWidth,
        borderWidthSelected: node.borderWidthSelected,
        image: typeof node.image === 'string' ? node.image : undefined
      });
    });
  }
}
const BOOTSTRAP_ICON_PATHS: Record<string, {
  viewBox: string;
  paths: string[];
}> = {
  'diagram-3-fill': { viewBox: '0 0 16 16', paths: [
    'M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1H14a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0V8h-5v.5a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 2 7h5.5V6A1.5 1.5 0 0 1 6 4.5zm-6 8A1.5 1.5 0 0 1 1.5 10h1A1.5 1.5 0 0 1 4 11.5v1A1.5 1.5 0 0 1 2.5 14h-1A1.5 1.5 0 0 1 0 12.5zm6 0A1.5 1.5 0 0 1 7.5 10h1a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 8.5 14h-1A1.5 1.5 0 0 1 6 12.5zm6 0a1.5 1.5 0 0 1 1.5-1.5h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5z',
  ] },
  'file-earmark-text-fill': { viewBox: '0 0 16 16', paths: [
    'M9.293 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0M9.5 3.5v-2l3 3h-2a1 1 0 0 1-1-1M4.5 9a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1zM4 10.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 1 0-1h4a.5.5 0 0 1 0 1z',
  ] },
  'tags-fill': { viewBox: '0 0 16 16', paths: [
    'M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
    'M1.293 7.793A1 1 0 0 1 1 7.086V2a1 1 0 0 0-1 1v4.586a1 1 0 0 0 .293.707l7 7a1 1 0 0 0 1.414 0l.043-.043z',
  ] },
};
