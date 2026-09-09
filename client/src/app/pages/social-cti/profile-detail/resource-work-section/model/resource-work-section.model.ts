import { resource_entry, resource_time } from '../../../utils/resource-view.util';

export interface work_item_view {
  key: string;
  name: string;
  owner: string;
  ownerAvatar: string;
  initial: string;
  url: string;
  homepage: string;
  description: string;
  language: string;
  stars: string;
  forks: string;
  watchers: string;
  issues: string;
  pulls: string;
  downloads: string;
  branch: string;
  license: string;
  size: string;
  forkSource: string;
  forkSourceUrl: string;
  latestTag: string;
  tagsCount: string;
  platforms: string[];
  topics: string[];
  labels: string[];
  status: string;
  created: resource_time;
  updated: resource_time;
  pushed: resource_time;
  extra: resource_entry[];
}
