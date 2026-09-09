import { FilterModel } from '../model/filter/filter.model';
const COMMON_NETWORK = {
  title: "Network Type",
  options: [
    { key: "all", label: "All" },
    { key: "onion", label: "Onion" },
    { key: "i2p", label: "I2P" },
    { key: "clearnet", label: "Clearnet" },
  ],
  type: "dropdown" as const,
  tooltip: "Web Layers",
  selected: "all"
};
const COMMON_THREAT_OPTIONS = [
  { key: "all", label: "All" },
  { key: "breach", label: "Breach" },
  { key: "credential", label: "Credential" },
  { key: "ransomware", label: "Ransomware" },
  { key: "phishing", label: "Phishing" },
  { key: "scam", label: "Scam" },
  { key: "malware", label: "Malware" },
  { key: "infostealer", label: "Infostealer" },
  { key: "c2", label: "C2" },
  { key: "ddos", label: "DDoS" },
  { key: "exploit", label: "Exploit" },
  { key: "leak", label: "Leak" },
  { key: "logs", label: "Logs" },
  { key: "vpn", label: "VPN" },
  { key: "carding", label: "Carding" },
  { key: "rat", label: "RAT" },
  { key: "keylogger", label: "Keylogger" },
  { key: "spyware", label: "Spyware" },
  { key: "sqlinjection", label: "SQL Injection" },
  { key: "xss", label: "XSS" },
  { key: "supplychain", label: "Supply Chain" },
  { key: "insider", label: "Insider" },
  { key: "fraud", label: "Fraud" },
  { key: "obfuscation", label: "Obfuscation" },
  { key: "crack", label: "Crack" },
  { key: "cheats", label: "Cheats" },
  { key: "cve", label: "CVE" },
  { key: "zero_day", label: "Zero Day" },
  { key: "rootkit", label: "Rootkit" },
  { key: "apt", label: "APT" },
  { key: "threat_intel", label: "APT Intel" },
  { key: "darkweb", label: "Dark Web" },
  { key: "rce", label: "RCE" },
  { key: "lpe", label: "LPE" },
  { key: "exfiltration", label: "Exfiltration" },
  { key: "persistence", label: "Persistence" },
  { key: "reconnaissance", label: "Reconnaissance" },
  { key: "hack", label: "Hack" },
  { key: "news", label: "News" },
  { key: "credentials_common", label: "Credentials (Common)" },
  { key: "war", label: "War" }
];
const GENERAL_CONTENT_OPTIONS = [
  { key: "all", label: "All" },
  { key: "general", label: "General" },
  { key: "swarm", label: "Swarm" },
  { key: "forums", label: "Forums" },
  { key: "news", label: "News" },
  { key: "stolen", label: "Stolen" },
  { key: "drugs", label: "Drugs" },
  { key: "hacking", label: "Hacking" },
  { key: "marketplaces", label: "Marketplaces" },
  { key: "cryptocurrency", label: "Cryptocurrency" },
  { key: "leaks", label: "Leaks" }
];
const DEFACEMENT_CONTENT_OPTIONS = [
  { key: "hacked", label: "hacked" },
  { key: "malicious_redirect", label: "malicious_redirect" },
  { key: "malware_url", label: "malware_url" },
  { key: "open_directory", label: "open_directory" },
  { key: "phishing", label: "phishing" },
  { key: "phishing_domain", label: "phishing_domain" },
  { key: "scam", label: "scam" },
  { key: "spam_url", label: "spam_url" },
  { key: "typosquatting", label: "typosquatting" }
];
const APT_INTEL_CONTENT_OPTIONS = [
  { key: "all", label: "All" },
  { key: "apt", label: "APT" },
  { key: "malware", label: "Malware" },
  { key: "defacement", label: "Defacement" }
];
const BASE_DATERANGE = {
  options: [],
  type: 'daterange' as const,
  selected: ""
};
const DATERANGE_DEFAULT = {
  ...BASE_DATERANGE,
  title: "Date Range",
  tooltip: "Date Range"
};
const DATERANGE_CREATION = {
  ...BASE_DATERANGE,
  title: "Creation Date Range",
  tooltip: "Creation Date Range"
};
function createThreatContent() {
  return {
    title: "Content Type",
    options: COMMON_THREAT_OPTIONS,
    type: 'dropdown' as const,
    tooltip: "Content Filter",
    selected: "attack-pattern"
  };
}
function createGeneralContent() {
  return {
    title: "Content Type",
    options: GENERAL_CONTENT_OPTIONS,
    type: 'dropdown' as const,
    tooltip: "Content Filter",
    selected: "all"
  };
}
const DEFACEMENT_CONTENT_FILTER = {
  title: "Type of Content",
  options: DEFACEMENT_CONTENT_OPTIONS,
  type: 'dropdown' as const,
  tooltip: "Type of Content",
  selected: ""
};
const APT_INTEL_CONTENT_FILTER = {
  title: "Content Type",
  options: APT_INTEL_CONTENT_OPTIONS,
  type: 'dropdown' as const,
  tooltip: "Content Filter",
  selected: "all"
};
const EXPLOIT_TYPE_FILTER = {
  title: "Type",
  options: COMMON_THREAT_OPTIONS,
  type: 'dropdown' as const,
  tooltip: "Type",
  selected: "all"
};
const EXPLOIT_SEVERITY_OPTIONS = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "info", label: "Info" },
  { key: "unknown", label: "Unknown" }
];
const EXPLOIT_RISK_OPTIONS = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "info", label: "Info" }
];
const ALERT_RISK_OPTIONS = [
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "informational", label: "Informational" },
  { key: "unknown", label: "Unknown" }
];
const EXPLOIT_REMOTE_TYPE_OPTIONS = [
  { key: "remote", label: "Remote" },
  { key: "local", label: "Local" },
  { key: "physical", label: "Physical" },
  { key: "adjacent", label: "Adjacent" },
  { key: "unknown", label: "Unknown" }
];
const EXPLOIT_PLATFORM_OPTIONS = [
  { key: "windows", label: "Windows" },
  { key: "linux", label: "Linux" },
  { key: "macos", label: "macOS" },
  { key: "android", label: "Android" },
  { key: "ios", label: "iOS" },
  { key: "web", label: "Web" },
  { key: "php", label: "PHP" },
  { key: "java", label: "Java" },
  { key: "multiple", label: "Multiple" },
  { key: "unknown", label: "Unknown" }
];
const EXPLOIT_STRICT_FILTERS = {
  m_severity: {
    title: "Severity",
    options: EXPLOIT_SEVERITY_OPTIONS,
    type: 'dropdown' as const,
    tooltip: "Severity",
    selected: ""
  },
  m_risk: {
    title: "Risk",
    options: EXPLOIT_RISK_OPTIONS,
    type: 'dropdown' as const,
    tooltip: "Risk",
    selected: ""
  },
  m_remote_type: {
    title: "Remote Type",
    options: EXPLOIT_REMOTE_TYPE_OPTIONS,
    type: 'dropdown' as const,
    tooltip: "Remote Type",
    selected: ""
  },
  m_platform: {
    title: "Platform",
    options: EXPLOIT_PLATFORM_OPTIONS,
    type: 'dropdown' as const,
    tooltip: "Platform",
    selected: ""
  }
};
const EXPLOIT_TEXT_FILTERS = {
  m_cve: {
    title: "CVE",
    options: [],
    type: 'dropdown' as const,
    tooltip: "CVE",
    selected: "",
    suggestionSource: "exploit",
    placeholder: "CVE-2024-12345"
  },
  m_cwe: {
    title: "CWE",
    options: [],
    type: 'dropdown' as const,
    tooltip: "CWE",
    selected: "",
    suggestionSource: "exploit",
    placeholder: "CWE-79"
  },
  m_product: {
    title: "Product",
    options: [],
    type: 'dropdown' as const,
    tooltip: "Product",
    selected: "",
    suggestionSource: "exploit",
    placeholder: "Product name"
  },
  m_tags: {
    title: "Tags",
    options: [],
    type: 'dropdown' as const,
    tooltip: "Tags",
    selected: "",
    suggestionSource: "exploit",
    placeholder: "rce, poc, exploit"
  }
};
const SAFE_FILTER = {
  title: "Safe Search",
  options: [
    { key: "yes", label: "Yes" },
    { key: "no", label: "No" }
  ],
  type: "dropdown" as const,
  tooltip: "Enable Filtering",
  selected: "yes"
};
const INDEX_FILTER = {
  title: "Index Type",
  options: [
    { key: "all", label: "All" },
    { key: "general", label: "General" },
    { key: "leak", label: "Leak" },
    { key: "defacement", label: "Defacement" },
    { key: "chat", label: "Chat" },
    { key: "exploit", label: "Exploit" },
    { key: "twitter", label: "Twitter" },
    { key: "reddit", label: "Reddit" },
  ],
  type: "dropdown" as const,
  tooltip: "",
  selected: "all"
};
const DIRECTORY_CONTENT_TYPE = {
  title: "Content Type",
  options: [
    { key: "all", label: "All" },
    { key: "general", label: "General" },
    { key: "forums", label: "Forums" },
    { key: "news", label: "News" },
    { key: "stolen", label: "Stolen" },
    { key: "drugs", label: "Drugs" },
    { key: "hacking", label: "Hacking" },
    { key: "marketplaces", label: "Marketplaces" },
    { key: "cryptocurrency", label: "Cryptocurrency" },
    { key: "leaks", label: "Leaks" },
    { key: "adult", label: "Adult" },
    { key: "tracking", label: "Tracking" },
    { key: "chat", label: "Chat" },
    { key: "social", label: "Social" }
  ],
  type: "dropdown" as const,
  tooltip: "",
  selected: "all"
};
const PLATFORM_FILTER = {
  title: "Platform",
  options: [
    { key: "generic_model", label: "General Iintelligence" },
    { key: "leak_model", label: "Data Breach" },
    { key: "exploit_model", label: "Exploit" },
    { key: "apt_model", label: "APT" },
    { key: "malware_model", label: "Malware Bazaar" },
    { key: "social_model", label: "Social" },
    { key: "chat_model", label: "Chat" },
    { key: "all", label: "All" },
  ],
  type: "dropdown" as const,
  tooltip: "Platform",
  selected: "all"
};
const SOCIAL_PLATFORM_FILTER = {
  title: "Platform",
  options: [
    { key: "all", label: "All" },
    { key: "telegram", label: "Telegram" },
    { key: "forum", label: "Forum" },
    { key: "blogger", label: "Blogger" },
    { key: "bluesky", label: "Bluesky" },
    { key: "devto", label: "Dev.to" },
    { key: "facebook", label: "Facebook" },
    { key: "habr", label: "Habr" },
    { key: "hackernoon", label: "HackerNoon" },
    { key: "hashnode", label: "Hashnode" },
    { key: "mastodon", label: "Mastodon" },
    { key: "medium", label: "Medium" },
    { key: "microblog", label: "Micro.blog" },
    { key: "misskey", label: "Misskey" },
    { key: "nostr", label: "Nostr" },
    { key: "pastebin", label: "Pastebin" },
    { key: "pleroma", label: "Pleroma" },
    { key: "primal", label: "Primal" },
    { key: "reddit", label: "Reddit" },
    { key: "stackoverflow", label: "Stack Overflow" },
    { key: "substack", label: "Substack" },
    { key: "gettr", label: "Gettr" },
    { key: "pinterest", label: "Pinterest" },
    { key: "plurk", label: "Plurk" },
    { key: "threads", label: "Threads" },
    { key: "twitter", label: "Twitter" },
    { key: "youtube", label: "YouTube" },
  ],
  type: "dropdown" as const,
  tooltip: "Platform",
  selected: "all"
};
const PLATFORM_RESULT_COUNT_FILTER = {
  title: "Platform Result Count",
  options: [],
  type: "number" as const,
  tooltip: "Maximum results for per platform",
  selected: "25",
  min: 1,
  max: 50,
  placeholder: "Enter platforms result count"
};
const APT_FAMILY_FILTER = {
  title: "Family",
  options: [
    { key: "all", label: "All" }
  ],
  type: "dropdown" as const,
  tooltip: "APT Family",
  selected: "all"
};
const MALPEDIA_COUNTRY_FILTER = {
  title: "Country",
  options: [
    { key: "all", label: "All" }
  ],
  type: "dropdown" as const,
  tooltip: "Country",
  selected: "all"
};
const MALWARE_BAZAAR_COUNTRY_FILTER = {
  title: "Country",
  options: [
    { key: "all", label: "All" }
  ],
  type: "dropdown" as const,
  tooltip: "Country",
  selected: "all"
};
const MALWARE_CONTENT_TYPE_FILTER = {
  title: "Content Type",
  options: [
    { key: "all", label: "All" }
  ],
  type: "dropdown" as const,
  tooltip: "Content Type",
  selected: "all"
};
const MALWARE_REPORTER_FILTER = {
  title: "Reporter",
  options: [
    { key: "all", label: "All" }
  ],
  type: "dropdown" as const,
  tooltip: "Reporter",
  selected: "all"
};
export const audit_filters: FilterModel = {
  filters: {
    daterange: DATERANGE_DEFAULT
  }
};
export const takedown_filters: FilterModel = {
  filters: {
    daterange: DATERANGE_DEFAULT,
    status: {
      title: "Status",
      options: [
        { key: "all", label: "All" },
        { key: "pending", label: "Pending" },
        { key: "accepted", label: "Accepted" },
        { key: "denied", label: "Denied" },
        { key: "failed", label: "Failed" }
      ],
      type: "dropdown" as const,
      tooltip: "Status",
      selected: "all"
    }
  }
};
export const event_management_filters: FilterModel = {
  filters: {
    daterange: {
      ...DATERANGE_DEFAULT,
      title: "Event Date",
      tooltip: "Event Date"
    }
  }
};
export const stealer_filters: FilterModel = {
  filters: {
    daterange: DATERANGE_DEFAULT
  }
};
export const directory_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    index: INDEX_FILTER,
    content_type: DIRECTORY_CONTENT_TYPE,
    daterange: DATERANGE_DEFAULT
  }
};
export const general_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    safe: SAFE_FILTER,
    daterange: DATERANGE_CREATION,
    m_content_type: createGeneralContent()
  }
};
export const leak_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: createThreatContent()
  }
};
export const feed_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: createThreatContent()
  }
};
export const social_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    platform: SOCIAL_PLATFORM_FILTER,
    daterange: DATERANGE_CREATION,
    content: createThreatContent()
  }
};
export const defacement_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: DEFACEMENT_CONTENT_FILTER
  }
};
export const exploit_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: EXPLOIT_TYPE_FILTER,
    ...EXPLOIT_STRICT_FILTERS,
    ...EXPLOIT_TEXT_FILTERS
  }
};
export const apt_intel_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: APT_INTEL_CONTENT_FILTER
  }
};
export const threat_intel_apt_filters: FilterModel = {
  filters: {
    daterange: DATERANGE_CREATION,
    family: APT_FAMILY_FILTER,
    m_country: MALPEDIA_COUNTRY_FILTER
  }
};
export const threat_intel_malware_filters: FilterModel = {
  filters: {
    daterange: DATERANGE_CREATION,
    m_country: MALWARE_BAZAAR_COUNTRY_FILTER,
    content_type: MALWARE_CONTENT_TYPE_FILTER,
    m_reporter: MALWARE_REPORTER_FILTER
  }
};
export const consolidated_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: createThreatContent(),
    platform: PLATFORM_FILTER
  }
};
export const threat_lens_filters: FilterModel = {
  filters: {
    network: COMMON_NETWORK,
    daterange: DATERANGE_CREATION,
    content: createThreatContent(),
    platform: PLATFORM_FILTER,
    platform_result_count: PLATFORM_RESULT_COUNT_FILTER
  }
};
export const alert_filters: FilterModel = {
  filters: {
    daterange: DATERANGE_DEFAULT,
    content_type: {
      title: "Content Type",
      options: [],
      type: "dropdown",
      tooltip: "Content Type",
      selected: "",
      placeholder: "Headers, PII, vulnerability"
    },
    risk: {
      title: "Risk",
      options: ALERT_RISK_OPTIONS,
      type: "dropdown",
      tooltip: "Risk",
      selected: "",
      placeholder: "Risk"
    },
  }
};
export const filter_mapping: Record<string, string> = {
  source: "Source",
  daterange: "Date Range",
  status: "Status",
  network: "Network Type",
  index: "Index Type",
  content_type: "Content Type",
  safe: "Safe Search",
  content: "Content Type",
  m_content_type: "Content Type",
  mitre: "Mitre TTP",
  platform: "Platform",
  platform_result_count: "Platform Results Count",
  m_cve: "CVE",
  m_cwe: "CWE",
  m_product: "Product",
  m_severity: "Severity",
  m_risk: "Risk",
  m_remote_type: "Remote Type",
  m_platform: "Platform",
  m_tags: "Tags",
  family: "Family",
  m_country: "Country",
  m_reporter: "Reporter",
};
