export class ConsolidatedParamModel {
  q = "";
  page = 1;
  category = "all";
  profile = false;
  platform = "all";
  content = "all";
  family = "all";
  m_country = "all";
  content_type = "all";
  m_reporter = "all";
  email?: string;
  username?: string;
  must = true;
  matchtype = "";
  url = "";
  user = "";
  ioc = "";
  fullsearch = false;
  tab = "";
  entity_filter?: Record<string, string[]>;
  hide_dismissed = true;

  reset(): void {
    this.q = "";
    this.page = 1;
    this.category = "all";
    this.platform = "all";
    this.content = "all";
    this.family = "all";
    this.m_country = "all";
    this.content_type = "all";
    this.m_reporter = "all";
    this.email = undefined;
    this.username = undefined;
    this.matchtype = "";
    this.url = "";
    this.user = "";
    this.ioc = "";
    this.fullsearch = false;
    this.tab = "";
    this.entity_filter = undefined;
    this.hide_dismissed = true;
  }
}
