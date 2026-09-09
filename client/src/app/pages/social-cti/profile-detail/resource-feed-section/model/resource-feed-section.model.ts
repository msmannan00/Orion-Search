import { resource_entry, resource_time } from '../../../utils/resource-view.util';

export interface feed_item_view {
  key: string;
  author: string;
  handle: string;
  avatar: string;
  initial: string;
  verified: boolean;
  time: resource_time;
  edited: boolean;
  kind: string;
  flags: string[];
  replyTo: string;
  title: string;
  body: string;
  images: string[];
  video: string;
  poster: string;
  duration: string;
  url: string;
  repo: string;
  repoUrl: string;
  branch: string;
  commits: string;
  tags: string[];
  mentions: string[];
  language: string;
  location: string;
  likes: string;
  comments: string;
  shares: string;
  quotes: string;
  bookmarks: string;
  views: string;
  warning: string;
  hateSpeech: string;
  extra: resource_entry[];
}
