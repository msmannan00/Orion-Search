import { resource_entry, resource_time } from '../../../utils/resource-view.util';

export interface media_item_view {
  key: string;
  title: string;
  caption: string;
  author: string;
  kind: string;
  isVideo: boolean;
  isVertical: boolean;
  isLive: boolean;
  image: string;
  fullImage: string;
  url: string;
  duration: string;
  views: string;
  likes: string;
  comments: string;
  rating: string;
  dimensions: string;
  time: resource_time;
  timeText: string;
  tags: string[];
  flags: string[];
  extra: resource_entry[];
}
