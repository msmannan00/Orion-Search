import { resource_entry, resource_time } from '../../../utils/resource-view.util';

export interface people_item_view {
  key: string;
  name: string;
  handle: string;
  url: string;
  avatar: string;
  initial: string;
  bio: string;
  kind: string;
  verified: boolean;
  flags: string[];
  followers: string;
  posts: string;
  location: string;
  company: string;
  website: string;
  joined: resource_time;
  tags: string[];
  extra: resource_entry[];
}
