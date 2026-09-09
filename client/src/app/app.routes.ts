import { Route, Routes } from '@angular/router';
import { AuthGuard } from './shared/guards/auth-guard.guard';
import { InsightResolver } from './shared/resolvers/insight.resolver';
import { ReportResolver } from './shared/resolvers/report.resolver';
import { ReportConsolidatedResolver } from './shared/resolvers/consolidated.resolver';
import { subscriptionGuard } from './shared/guards/subscription.guard';
import { TenantGuard } from './shared/guards/tenant-guard.guard';
import { DashboardResolver } from './shared/resolvers/dashboard.resolver';
import { IocResolver } from './shared/resolvers/ioc.resolver';
import { ConfigResolver } from './shared/resolvers/config.resolver';
import { OnboardingGuard } from './shared/guards/onboarding-guard';
import { NotificationGuard } from './shared/guards/notification.guard';
const loadPhoneLookupComponent = () => import('./sections/api/phone-lookup/phone-lookup.component').then(m => m.PhoneLookupComponent);
const loadLoginComponent = () => import('./pages/login/login.component').then(m => m.LoginComponent);
const loadExtensionPrivacyComponent = () => import('./pages/legal/extension-privacy/extension-privacy.component').then(m => m.ExtensionPrivacyComponent);
const loadProjectPrivacyComponent = () => import('./pages/legal/project-privacy/project-privacy.component').then(m => m.ProjectPrivacyComponent);
const loadSignupComponent = () => import('./pages/signup/signup.component').then(m => m.SignupComponent);
const loadDashboardComponent = () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent);
const loadHomepageComponent = () => import('./pages/homepage/homepage.component').then(m => m.HomepageComponent);
const loadDirectoryComponent = () => import('./pages/directory/directory.component').then(m => m.DirectoryComponent);
const loadDashboardApiComponent = () => import('./pages/api/dashboard-api/dashboard-api.component').then(m => m.DashboardApiComponent);
const loadDashboardResultContainer = () => import('./pages/intel-panel/dashboard-result-container/dashboard-result-container.component').then(m => m.DashboardResultContainer);
const loadReportComponent = () => import('./pages/report/templates/report_general/report.component').then(m => m.ReportComponent);
const loadReportDefacementComponent = () => import('./pages/report/templates/report-defacement/report-defacement.component').then(m => m.ReportDefacementComponent);
const loadReportChatComponent = () => import('./pages/report/templates/report-chat/report-chat.component').then(m => m.ReportChatComponent);
const loadCredentialComponent = () => import('./pages/root-searches/credentials/credential.component').then(m => m.CredentialComponent);
const loadErrorHandlerComponent = () => import('./shared/partials/error-handler/error-handler.component').then(m => m.ErrorHandlerComponent);
const loadDashboardConsolidatedComponent = () => import('./pages/root-searches/dashboard-consolidated/dashboard-consolidated.component').then(m => m.DashboardConsolidatedComponent);
const loadAiWorkspaceComponent = () => import('./pages/root-searches/ai-workspace/ai-workspace.component').then(m => m.AiWorkspaceComponent);
const loadChatShareComponent = () => import('./pages/root-searches/ai-workspace/chat-share/chat-share.component').then(m => m.ChatShareComponent);
const loadSecurityScanComponent = () => import('./pages/root-searches/network-intel/security-scan/security-scan.component').then(m => m.SecurityScanComponent);
const loadTenantComponent = () => import('./pages/tenant/tenant.component').then(m => m.TenantComponent);
const loadWelcomeComponent = () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent);
const loadResetPasswordComponent = () => import('./shared/partials/forgot-password/reset-password.component').then(m => m.ResetPasswordComponent);
const loadSidebarUserStatisticsComponent = () => import('./pages/user-management/sidebar-user-statistics/sidebar-user-statistics.component').then(m => m.SidebarUserStatisticsComponent);
const loadSidebarUserIocComponent = () => import('./pages/user-management/sidebar-user-ioc/sidebar-user-ioc.component').then(m => m.SidebarUserIocComponent);
const loadSidebarUserMonitoringComponent = () => import('./pages/user-management/sidebar-user-monitoring/sidebar-user-monitoring.component').then(m => m.SidebarUserMonitoringComponent);
const loadSidebarUserEventManagementComponent = () => import('./pages/user-management/sidebar-user-event-management/sidebar-user-event-management.component').then(m => m.SidebarUserEventManagementComponent);
const loadSidebarUserLogManagerComponent = () => import('./pages/user-management/sidebar-user-log-manager/sidebar-user-log-manager.component').then(m => m.SidebarUserLogManagerComponent);
const loadAuditlogComponent = () => import('./pages/user-management/auditlog/auditlog.component').then(m => m.AuditlogComponent);
const loadNotificationComponent = () => import('./shared/partials/notification/notification.component').then(m => m.NotificationComponent);
const loadTrailNotificationComponent = () => import('./shared/partials/trail-notification/trail-notification.component').then(m => m.TrailNotificationComponent);
const loadAccountSettingsComponent = () => import('./pages/user-management/sidebar-user-settings/account-settings.component').then(m => m.AccountSettingsComponent);
const loadSidebarUserFeederComponent = () => import('./pages/user-management/sidebar-user-feeder/sidebar-user-feeder.component').then(m => m.SidebarUserFeederComponent);
const loadSidebarUserHomepageComponent = () => import('./pages/user-management/sidebar-user-homepage/sidebar-user-homepage.component').then(m => m.SidebarUserHomepageComponent);
const loadTakedownRequestsComponent = () => import('./pages/user-management/takedown-requests/takedown-requests.component').then(m => m.TakedownRequestsComponent);
const loadCategoryAlertReportComponent = () => import('./pages/user-management/sidebar-user-homepage/category-alert-report/category-alert-report.component').then(m => m.CategoryAlertReportComponent);
const loadAddCustomAlertComponent = () => import('./pages/user-management/sidebar-user-homepage/add-custom-alert/add-custom-alert.component').then(m => m.AddCustomAlertComponent);
const loadAlertScannerSettingsComponent = () => import('./pages/user-management/sidebar-user-homepage/alert-scanner-settings/alert-scanner-settings.component').then(m => m.AlertScannerSettingsComponent);
const loadManageProfileComponent = () => import('./pages/tenant/tenant-management/view-profile/manage-profile.component').then(m => m.ManageProfileComponent);
const loadViewTenantComponent = () => import('./pages/tenant/tenant-management/view-tenant/view-tenant.component').then(m => m.ViewTenantComponent);
const loadSidebarProfileSystemSettingsComponent = () => import('./pages/user-management/sidebar-user-system-settings/sidebar-user-system-settings.component').then(m => m.SidebarProfileSystemSettingsComponent);
const loadBackupRestoreComponent = () => import('./pages/user-management/backup-restore/backup-restore.component').then(m => m.BackupRestoreComponent);
const loadTenantSettingsComponent = () => import('./pages/user-management/sidebar-user-settings/tenant-settings/tenant-settings.component').then(m => m.TenantSettingsComponent);
const loadFileScannerComponent = () => import('./pages/api/ioc-extractor/file-scanner.component').then(m => m.FileScannerComponent);
const loadTextAnalysisComponent = () => import('./pages/api/text-analysis/text-analysis.component').then(m => m.TextAnalysisComponent);
const loadSocialMapperComponent = () => import('./pages/social-cti/social-mapper.component').then(m => m.SocialMapperComponent);
const loadNetworkIntelComponent = () => import('./pages/root-searches/network-intel/network-intel').then(m => m.NetworkIntel);
const loadSidebarUserCaseManagement = () => import('./pages/user-management/sidebar-user-case-management/sidebar-user-case-management').then(m => m.SidebarUserCaseManagement);
const loadUserProfileActivityComponent = () => import('./pages/profile/user-profile-activity/user-profile-activity.component').then(m => m.UserProfileActivityComponent);
const loadCaseDetailsComponent = () => import('./pages/user-management/sidebar-user-case-management/model/case-details/case-details').then(m => m.CaseDetails);
const loadCaseShareComponent = () => import('./pages/user-management/sidebar-user-case-management/model/case-share/case-share.component').then(m => m.CaseShareComponent);
const loadSatelliteIntelComponent = () => import('./pages/geo-fencing/satellite-intel/satellite-intel').then(m => m.SatelliteIntel);
const loadCaseTrackingBoardComponent = () => import('./pages/user-management/sidebar-user-case-management/model/case-tracking-board/case-tracking-board').then(m => m.CaseTrackingBoard);
const loadCaseTrackingBoardSettingsComponent = () => import('./pages/user-management/sidebar-user-case-management/model/case-tracking-board-settings/case-tracking-board-settings').then(m => m.CaseTrackingBoardSettings);
const loadScanReportComponent = () => import('./pages/scan-report/scan-report.component').then(m => m.ScanReportComponent);
const HASH_CONSOLIDATED_ROUTE = {
  resolve: { reportdata: ReportConsolidatedResolver },
  data: { type: 'consolidated', animation: 'HashPage' }
};
const consolidatedChildren: Route[] = [
  {
    path: '',
    redirectTo: 'all',
    pathMatch: 'full'
  },
  {
    path: 'all',
    loadComponent: loadDashboardConsolidatedComponent,
    data: { type: 'consolidated', animation: 'DataBreach' }
  },
  {
    path: 'chat/:m_hash',
    loadComponent: loadReportChatComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'social/:m_hash',
    loadComponent: loadReportChatComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'general/:m_hash',
    loadComponent: loadReportComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'leak/:m_hash',
    loadComponent: loadReportComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'exploit/:m_hash',
    loadComponent: loadReportComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'apt/:m_hash',
    loadComponent: loadReportComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'malware/:m_hash',
    loadComponent: loadReportComponent,
    ...HASH_CONSOLIDATED_ROUTE
  },
  {
    path: 'defacement/:m_hash',
    loadComponent: loadReportDefacementComponent,
    ...HASH_CONSOLIDATED_ROUTE
  }
];
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
    data: { animation: 'RootPage' }
  },
  {
    path: 'signup',
    loadComponent: loadSignupComponent,
    data: { animation: 'SignupPage' }
  },
  {
    path: 'login',
    loadComponent: loadLoginComponent,
    data: { animation: 'LoginPage' }
  },
  {
    path: 'privacy/extension',
    loadComponent: loadExtensionPrivacyComponent,
    data: { animation: 'ExtensionPrivacyPage' }
  },
  {
    path: 'privacy',
    loadComponent: loadProjectPrivacyComponent,
    data: { animation: 'PrivacyPage' }
  },
  {
    path: 'case-share/:shareId',
    loadComponent: loadCaseShareComponent,
    data: { animation: 'CaseSharePage' }
  },
  {
    path: 'chat-share/:shareId',
    loadComponent: loadChatShareComponent,
    data: { animation: 'ChatSharePage' }
  },
  {
    path: 'onboarding',
    resolve: { config: ConfigResolver },
    loadComponent: loadTenantComponent,
    canActivate: [TenantGuard],
    data: { animation: 'TenantPage' }
  },
  {
    path: 'welcome',
    loadComponent: loadWelcomeComponent,
    canActivate: [NotificationGuard],
    data: { animation: 'WelcomePage' }
  },
  {
    path: 'welcome/:token',
    loadComponent: loadWelcomeComponent,
    canActivate: [NotificationGuard],
    data: { animation: 'WelcomePage' }
  },
  {
    path: 'paymentGateway',
    loadComponent: loadTrailNotificationComponent,
    data: { animation: 'TrailNotificationPage' }
  },
  {
    path: 'reset',
    loadComponent: loadResetPasswordComponent,
    canActivate: [NotificationGuard],
    data: { animation: 'ForgotPasswordComponent' }
  },
  {
    path: 'notification',
    loadComponent: loadNotificationComponent,
    data: { animation: 'PaymentGatewayComponent' }
  },
  {
    path: 'reset/:token',
    loadComponent: loadResetPasswordComponent,
    canActivate: [NotificationGuard],
    data: { animation: 'ForgotPasswordComponent' }
  },
  {
    path: 'dashboard',
    loadComponent: loadDashboardComponent,
    canActivate: [AuthGuard],
    resolve: {
      config: ConfigResolver,
      session: DashboardResolver
    },
    data: { animation: 'DashboardPage' },
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full'
      },
      {
        path: 'scan',
        loadComponent: loadSecurityScanComponent,
        data: { animation: 'HomePage' }
      },
      {
        path: 'scan-report/:scanId',
        loadComponent: loadScanReportComponent,
        data: { animation: 'ScanReportPage' }
      },
      {
        path: 'home',
        loadComponent: loadHomepageComponent,
        data: { animation: 'HomePage' }
      },
      {
        path: 'ctigraph',
        loadComponent: () => import('./pages/cti-graph/graphs.component').then(m => m.GraphComponent),
        data: { animation: 'ctigraph' }
      },
      {
        path: 'social-graph',
        loadComponent: loadSocialMapperComponent,
        data: { animation: 'SocialMapper' }
      },
      {
        path: 'social-intel',
        loadComponent: loadSocialMapperComponent,
        data: { animation: 'SocialMapper' }
      },
      {
        path: 'manage-profiles',
        loadComponent: () => import('./pages/manage-profiles/manage-profiles.component').then(m => m.ManageProfilesComponent),
        data: { animation: 'CategoryPage' }
      },
      {
        path: 'ai',
        canActivate: [subscriptionGuard],
        loadComponent: loadAiWorkspaceComponent,
        data: { type: 'ai', animation: 'CategoryPage' }
      },
      {
        path: 'social-mapper',
        redirectTo: 'social-intel',
        pathMatch: 'full'
      },
      {
        path: 'directory',
        loadComponent: loadDirectoryComponent,
        data: { animation: 'DirectoryPage' }
      },
      {
        path: 'api',
        canActivate: [subscriptionGuard],
        data: { animation: 'APIPage' },
        children: [
          {
            path: '',
            redirectTo: 'email-breach',
            pathMatch: 'full'
          },
          {
            path: 'email-breach',
            loadComponent: loadDashboardApiComponent,
            data: { animation: 'EmailAPI', type: 'user' }
          },
          {
            path: 'social-scanner',
            loadComponent: loadDashboardApiComponent,
            data: { animation: 'SocialAPI', type: 'social' }
          },
          {
            path: 'wanted-list',
            loadComponent: loadDashboardApiComponent,
            data: { animation: 'WantedAPI', type: 'wanted' }
          },
          {
            path: 'national-identity',
            loadComponent: loadDashboardApiComponent,
            data: { animation: 'NationalIdentityAPI', type: 'national-identity' }
          },
          {
            path: 'playstore-scanner',
            loadComponent: loadDashboardApiComponent,
            data: { animation: 'CrackedAPI', type: 'cracked' }
          },
          {
            path: 'software-scanner',
            loadComponent: loadDashboardApiComponent,
            data: { animation: 'SoftwareAPI', type: 'software' }
          },
          {
            path: 'file-scanner',
            loadComponent: loadFileScannerComponent,
            data: {
              animation: 'FileAPI',
              type: 'filescan',
              title: 'File Analysis',
              description: 'Upload a file to extract Indicators of Compromise (IOCs)'
            }
          },
          {
            path: 'text-analysis',
            loadComponent: loadTextAnalysisComponent,
            data: {
              animation: 'TextAnalysisAPI',
              title: 'Text Analysis',
              description: 'Analyze text for spam and malicious URLs'
            }
          },
          {
            path: 'phone-lookup',
            loadComponent: loadPhoneLookupComponent,
            data: {
              animation: 'TextAnalysisAPI',
              title: 'Phone & Domain Lookup',
              description: 'Analyze phone numbers and domains for OSINT intelligence'
            }
          },
          {
            path: 'crypto-scanner',
            loadComponent: loadDashboardApiComponent,
            data: {
              animation: 'FileAPI',
              type: 'crypto',
              title: 'Crypto Analysis',
              description: 'provide a cryptocurrency address to extract related information and potential risks'
            }
          }
        ]
      },
      {
        path: 'discussion',
        data: { animation: 'Discussion' },
        children: [
          {
            path: '',
            redirectTo: 'databases',
            pathMatch: 'full'
          },
          {
            path: ':category/social',
            redirectTo: '/dashboard/discussion/:category',
            pathMatch: 'full'
          },
          {
            path: 'all',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Social', animation: 'Discussion' },
            pathMatch: 'full'
          },
          {
            path: ':category/chat',
            redirectTo: '/dashboard/discussion/:category',
            pathMatch: 'full'
          },
          {
            path: ':category/chat/:m_hash',
            loadComponent: loadReportChatComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: ':category/social/:m_hash',
            loadComponent: loadReportChatComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Social', animation: 'Discussion' },
            pathMatch: 'full'
          },
          {
            path: 'social/:m_hash',
            loadComponent: loadReportChatComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: 'general/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: 'leak/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: 'exploit/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: 'defacement/:m_hash',
            loadComponent: loadReportDefacementComponent,
            resolve: { reportdata: ReportConsolidatedResolver },
            data: { type: 'consolidated', animation: 'HashPage' }
          },
          {
            path: '**',
            redirectTo: 'all'
          }
        ]
      },
      {
        path: 'breach',
        data: { animation: 'DataBreach' },
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full'
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Breach', animation: 'DataBreach' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Breach', animation: 'HashPage' }
          }
        ]
      },
      {
        path: 'strategic',
        data: { animation: 'StrategicPage' },
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full'
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'strategic', animation: 'CategoryPage' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'strategic', animation: 'HashPage' }
          }
        ]
      },
      {
        path: 'defacement',
        data: { animation: 'DefacementPage' },
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full'
          },
          {
            path: 'all',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'defacement', animation: 'DataBreach' }
          },
          {
            path: 'hacked',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'defacement', animation: 'DataBreach' }
          },
          {
            path: 'phishing',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'defacement', animation: 'DataBreach' }
          },
          {
            path: 'databases',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'defacement', animation: 'DataBreach' }
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Defacement', animation: 'CategoryPage' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportDefacementComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Defacement', animation: 'HashPage' }
          }
        ]
      },
      {
        path: 'social',
        data: { animation: 'SocialPage' },
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'all',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'chat',
            redirectTo: '/dashboard/social/all',
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'telegram',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'twitter',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'mastodon',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'pastebin',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'forum',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'reddit',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: 'facebook',
            loadComponent: loadDashboardResultContainer,
            pathMatch: 'full',
            data: { type: 'social', animation: 'DataBreach' }
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Social', animation: 'CategoryPage' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportChatComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Social', animation: 'HashPage' }
          },
          {
            path: ':category/all/:m_hash',
            loadComponent: loadReportChatComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Social', animation: 'HashPage' }
          }
        ]
      },
      {
        path: 'feed',
        data: { animation: 'FeedPage' },
        children: [
          {
            path: '',
            redirectTo: 'news',
            pathMatch: 'full'
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Feed', animation: 'CategoryPage' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Feed', animation: 'HashPage' }
          }
        ]
      },
      {
        path: 'exploit',
        data: { animation: 'ExploitPage' },
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full'
          },
          {
            path: 'all',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'exploit', animation: 'DataBreach' }
          },
          {
            path: 'tools',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'exploit', animation: 'DataBreach' }
          },
          {
            path: 'cve',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'exploit', animation: 'DataBreach' }
          },
          {
            path: 'zeroday',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'exploit', animation: 'DataBreach' }
          },
          {
            path: ':category',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Social', animation: 'CategoryPage' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Exploit', animation: 'HashPage' }
          }
        ]
      },
      {
        path: 'apt-intel',
        data: { animation: 'AptIntelPage' },
        children: [
          {
            path: '',
            redirectTo: 'all',
            pathMatch: 'full'
          },
          {
            path: 'all',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'APT Intel', animation: 'DataBreach' }
          },
          {
            path: 'apt',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'APT Intel', animation: 'DataBreach' }
          },
          {
            path: 'malware',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'APT Intel', animation: 'DataBreach' }
          },
          {
            path: 'compromised-actors',
            loadComponent: loadDashboardResultContainer,
            data: { type: 'Threat Intelligence', animation: 'DataBreach' }
          },
          {
            path: 'compromised-actors/:m_hash',
            loadComponent: loadReportDefacementComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'Threat Intelligence', animation: 'HashPage' }
          },
          {
            path: ':category/:m_hash',
            loadComponent: loadReportComponent,
            resolve: { reportdata: ReportResolver },
            data: { type: 'APT Intel', animation: 'HashPage' }
          }
        ]
      },
      {
        canActivate: [subscriptionGuard],
        path: 'consolidated',
        data: { animation: 'ConsolidatedPage' },
        children: consolidatedChildren
      },
      {
        canActivate: [subscriptionGuard],
        path: 'scanner',
        data: { animation: 'ScannerPage' },
        children: [
          {
            path: '',
            redirectTo: 'network-scan',
            pathMatch: 'full'
          },
          {
            path: 'network-scan',
            loadComponent: loadNetworkIntelComponent,
            data: { animation: 'CategoryPage' }
          },
          {
            path: 'apk-scan',
            loadComponent: loadFileScannerComponent,
            data: {
              animation: 'CategoryPage',
              type: 'apk',
              title: 'APK Analysis',
              description: 'Upload an Android APK to perform static analysis, extract Indicators of Compromise (IOCs), and inspect permissions and behaviors'
            }
          }
        ]
      },
      {
        path: 'stealerlogs',
        canActivate: [subscriptionGuard],
        data: { animation: 'StealerlogsPage' },
        children: [
          {
            path: '',
            loadComponent: loadCredentialComponent,
            data: { type: 'credential', animation: 'CategoryPage' }
          },
          {
            path: 'iocs',
            redirectTo: '',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'tenant',
        canActivate: [subscriptionGuard],
        data: { animation: 'TenantPage' },
        children: [
          {
            path: '',
            redirectTo: 'view-profiles',
            pathMatch: 'full'
          },
          {
            path: 'view-profiles',
            loadComponent: loadManageProfileComponent,
            data: { type: 'view', animation: 'CategoryPage' }
          },
          {
            path: 'view-tenants',
            loadComponent: loadViewTenantComponent,
            data: { type: 'view', animation: 'CategoryPage' }
          },
          {
            path: 'auditlog',
            loadComponent: loadAuditlogComponent,
            data: { type: 'auditlog', animation: 'CategoryPage' }
          }
        ]
      },
      {
        path: 'netint',
        canActivate: [subscriptionGuard],
        loadComponent: loadNetworkIntelComponent,
        data: { animation: 'CategoryPage' }
      },
      {
        path: 'satellite-intel',
        canActivate: [subscriptionGuard],
        loadComponent: loadSatelliteIntelComponent
      },
      {
        path: 'threat-lens',
        canActivate: [subscriptionGuard],
        loadComponent: loadSatelliteIntelComponent,
        data: { animation: 'CategoryPage', view: 'threat' }
      },
      {
        path: 'profile',
        canActivate: [subscriptionGuard, OnboardingGuard],
        resolve: { ioc: IocResolver },
        data: { animation: 'ProifilePage' },
        children: [
          {
            path: '',
            redirectTo: 'homepage',
            pathMatch: 'full'
          },
          {
            path: 'ai',
            redirectTo: '/dashboard/ai',
            pathMatch: 'full'
          },
          {
            canActivate: [subscriptionGuard],
            path: 'consolidated',
            data: { animation: 'ConsolidatedPage' },
            children: consolidatedChildren
          },
          {
            path: 'alerts/:type',
            loadComponent: loadCategoryAlertReportComponent,
            data: { type: 'alert', animation: 'AlertPage' },
          },
          {
            path: 'addcustomalert',
            loadComponent: loadAddCustomAlertComponent,
            data: { type: 'alert', animation: 'AlertPage' },
          },
          {
            path: 'homepage',
            loadComponent: loadSidebarUserHomepageComponent,
            data: { type: 'homepage', animation: 'HomepagePage' },
          },
          {
            path: 'alert-scanners',
            loadComponent: loadAlertScannerSettingsComponent,
            data: { type: 'settings', animation: 'ProfilePage' }
          },
          {
            path: 'monitoring',
            loadComponent: loadSidebarUserMonitoringComponent,
            data: { type: 'monitoring', animation: 'CategoryPage' }
          },
          {
            path: 'take-down',
            loadComponent: loadTakedownRequestsComponent,
            data: { type: 'take-down', animation: 'CategoryPage' }
          },
          {
            path: 'statistics',
            loadComponent: loadSidebarUserStatisticsComponent,
            resolve: { insights: InsightResolver },
            data: { type: 'settings', animation: 'ProfilePage' }
          },
          {
            path: 'ioc',
            loadComponent: loadSidebarUserIocComponent,
            data: { type: 'settings', animation: 'ProfilePage' }
          },
          {
            path: 'consolidated',
            data: { animation: 'ConsolidatedPage' },
            children: consolidatedChildren
          },
          {
            path: 'auditlog',
            loadComponent: loadAuditlogComponent,
            data: { type: 'auditlog', animation: 'CategoryPage' }
          },
          {
            path: 'users',
            loadComponent: loadManageProfileComponent,
            data: { type: 'profile', animation: 'CategoryPage' }
          },
          {
            path: 'account',
            loadComponent: loadAccountSettingsComponent,
            data: { type: 'account', animation: 'CategoryPage' }
          },
          {
            path: 'event-management',
            loadComponent: loadSidebarUserEventManagementComponent,
            data: { type: 'event-management', animation: 'CategoryPage' }
          },
          {
            path: 'log-manager',
            loadComponent: loadSidebarUserLogManagerComponent,
            data: { type: 'log-manager', animation: 'CategoryPage' }
          },
          {
            path: 'feeder',
            loadComponent: loadSidebarUserFeederComponent,
            data: { type: 'feeder', animation: 'CategoryPage' }
          },
          {
            path: 'user/:user_id',
            loadComponent: loadUserProfileActivityComponent,
            data: { type: 'account', animation: 'CategoryPage' }
          },
          {
            path: 'tenant-settings',
            loadComponent: loadTenantSettingsComponent,
            data: { type: 'settings', animation: 'CategoryPage' }
          },
          {
            path: 'tenant',
            loadComponent: loadViewTenantComponent,
            data: { type: 'view', animation: 'CategoryPage' }
          },
          {
            path: 'system-settings',
            loadComponent: loadSidebarProfileSystemSettingsComponent,
            data: { type: 'srttings', animation: 'CategoryPage' }
          },
          {
            path: 'backup-restore',
            loadComponent: loadBackupRestoreComponent,
            data: { type: 'backup-restore', animation: 'CategoryPage' }
          },
          {
            path: 'case-management',
            data: { type: 'case-management', animation: 'CategoryPage' },
            children: [
              {
                path: '',
                loadComponent: loadSidebarUserCaseManagement
              },
              {
                path: 'case-details',
                loadComponent: loadCaseDetailsComponent,
                data: { type: 'case-details', animation: 'CaseDetailsPage' }
              },
              {
                path: 'tracking-board',
                loadComponent: loadCaseTrackingBoardComponent,
                data: { type: 'case-tracking-board', animation: 'CaseTrackingBoardPage' }
              },
              {
                path: 'tracking-board/settings',
                loadComponent: loadCaseTrackingBoardSettingsComponent,
                data: { type: 'case-tracking-board-settings', animation: 'CaseTrackingBoardSettingsPage' }
              },
              {
                path: 'admin-alerts/:tenantId/:type',
                loadComponent: loadCategoryAlertReportComponent,
                data: { type: 'case-admin-alerts', animation: 'CategoryPage', adminTenantAlerts: true }
              }
            ]
          },
          {
            path: 'alerts',
            redirectTo: 'homepage',
            pathMatch: 'full'
          },
          {
            path: '**',
            redirectTo: 'consolidated/all'
          }
        ]
      }
    ]
  },
  {
    path: '**',
    loadComponent: loadErrorHandlerComponent,
    data: { animation: 'ErrorPage' }
  }
];
