import type { WritableSignal } from '@angular/core';
import type { FetchTabKey, SocialPlatformCapabilityKey } from '../enums/social-graph.enums';
import type { Job, social_profile, social_profile_config } from './social.models';

export type ManagedPlatform = social_profile & {
    stableKey: string;
    matches: boolean;
};

export interface ManageProfilesModalData {
    username: string;
    platforms: social_profile[];
    config: social_profile_config;
}

export interface ApiEnvelope<T> {
    status?: string;
    message?: unknown;
    result?: T;
}

export interface ScanStatusResponse extends ApiEnvelope<social_profile[]> {
    profile_username?: string;
    progress?: number;
    step?: string;
}

export type ScanEvent = {
    type: 'progress';
    payload: Partial<Job>;
} | {
    type: 'complete';
    payload: social_profile[];
};

export interface FeedUser {
    username: string;
    platforms: social_profile[];
    allPlatforms: social_profile[];
}

export interface FetchTab {
    key: FetchTabKey;
    label: string;
    icon: string;
}

interface SocialPlatformCapability {
    allow?: string[];
    disallow?: SocialPlatformCapabilityKey[];
}

export type SocialPlatformCapabilityMap = Record<string, SocialPlatformCapability>;

export interface NotificationData {
    message: string;
    icon: string;
    style: string;
}

export interface social_state {
    scanResults: WritableSignal<Map<string, social_profile[]>>;
    profileConfigs: WritableSignal<Map<string, social_profile_config>>;
    jobs: WritableSignal<Job[]>;
    homeMenuSearchTerm: WritableSignal<string>;
    isHomeMenuCollapsed: WritableSignal<boolean>;
    activeUsername: WritableSignal<string | null>;
    loadingUsernames: WritableSignal<Set<string>>;
}

export interface CrawlResultState {
    loading?: boolean;
    items?: unknown[];
    error?: string;
    login_url?: string;
    count?: number;
    log?: string;
}

export interface CrawlResultView extends CrawlResultState {
    lastSynced?: string;
}
