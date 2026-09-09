export enum LicenseName {
    FREE = 'free',
    FEEDER = 'feeder',
    OSINT_BASIC = 'osint_basic',
    OSINT_ADVANCED = 'osint_advanced',
    SOCIAL_MAPPER = 'social_mapper',
    PENTESTER = 'pentester',
    MAINTAINER = 'maintainer',
    ENTERPRISE = 'enterprise'
}

export interface LicenseRule {
    modules: string[] | 'all';
    cti_graph?: boolean;
    mapping?: boolean;
    scanning?: boolean;
    geo_fencing?: boolean;
    maintainer?: boolean;
}
