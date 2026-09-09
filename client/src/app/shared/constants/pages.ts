export enum Category {
    STRATEGIC = 'Strategic',
    BREACH = 'Breach',
    HOMEPAGE = 'Home',
    DIRECTORY = 'Directory',
    DEFACEMENT = 'Defacement',
    SOCIAL = 'Social',
    API = 'Api',
    EXPLOIT = 'Exploit',
    APT_INTEL = 'APT Intel',
    FEED = 'Feed',
    STEALERLOGS = 'Stealerlogs',
    TENANT = 'Tenant',
    PROFILE = 'Profile',
    NETINT = 'NETINT',
    SATELLITE_INTEL = 'SATELLITE_INTEL'
}
export enum BreachSubCategory {
    DATABASES = 'Databases'
}
export enum DefacementSubCategory {
    ALL = 'All',
    HACKED = 'Hacked',
    PHISHING = 'Phishing',
    DATABASES = 'Databases'
}
export enum ApiSubCategory {
    EMAIL = 'Email-Breach',
    SOCIAL = 'Social-Scanner',
    WANTED = 'Wanted-List',
    NATIONAL_IDENTITY = 'National-Identity',
    CRACKED = 'Playstore-Scanner',
    SOFTWARE = 'Software-Scanner',
    FILE = 'File-Scanner',
    TEXT_ANALYSIS = 'Text-Analysis',
    CRYPTO = 'Crypto-Scanner',
    PHONE_LOOKUP = 'Phone-Lookup'
}
export enum SocialSubCategory {
    ALL = 'All',
    TELEGRAM = 'Telegram',
    TWITTER = 'Twitter',
    MASTODON = 'Mastodon',
    PASTEBIN = 'Pastebin',
    FORUM = 'Forum',
    REDDIT = 'Reddit',
    FACEBOOK = 'Facebook',
    YOUTUBE = 'YouTube',
}
export enum ExploitSubCategory {
    ALL = 'All',
    CVE = 'CVE',
    TOOLS = 'Tools',
    ZERODAY = 'ZeroDay'
}
export enum AptIntelSubCategory {
    ALL = 'All',
    APT = 'APT',
    MALWARE_BAZAAR = 'Malware',
    COMPROMISED_ACTORS = 'Compromised-Actors'
}
export enum FeedSubCategory {
    NEWS = 'News',
    TRACKING = 'Tracking'
}
export enum TenantSubCategory {
    VIEW_PROFILE = 'View-Profiles',
    VIEW_TENANT = 'View-Tenants',
    AUDITLOG = 'Auditlog'
}
export enum ProfileSubCategory {
    HOMEPAGE = 'Homepage',
    MONITORING = 'Monitoring',
    TAKEDOWN = 'Take-Down',
    EVENT_MANAGEMENT = 'Event-Management',
    LOG_MANAGER = 'Log-Manager',
    FEEDER = 'Feeder',
    IOC = 'IOC',
    TENANT_SETTINGS = 'Tenant-Settings',
    ACCOUNT = 'Account',
    USERS = 'Users',
    STATISTICS = 'Statistics',
    AUDITLOG = 'Auditlog',
    TENANT = 'Tenant',
    SYSTEM_SETTINGS = 'System-Settings',
    BACKUP_RESTORE = 'Backup-Restore',
    CASE_MANAGEMENT = 'Case-Management'
}
