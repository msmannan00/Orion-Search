export interface social_scan_status {
    status?: string;
    progress: number;
    step?: string;
    cancel_requested: boolean;
}

export interface social_meta {
    platform: string;
    username: string;
    url: string;
    target_type?: string;
    entity_type?: string;
    status?: 'active' | 'suggested' | 'informational';
    timestamp?: string;
    description?: string;
    avatar?: string;
    [key: string]: unknown;
}

export interface social_profile_details {
    real_name?: string;
    bio?: string;
    description?: string;
    location?: string;
    profile_url?: string;
    total_posts?: string;
    total_followers?: string;
    total_likes?: string;
    avatar?: string;
    banner?: string;
    crawl_type?: string[];
    is_parsed?: boolean;
    [key: string]: unknown;
}

export interface social_post_hate_speech {
    is_hate_speech?: boolean;
    label?: string | null;
    confidence?: number;
    explanation?: string | null;
    model?: string | null;
}

export interface social_resource {
    type?: string;
    resource_id?: string;
    url?: string;
    parent_url?: string;
    parent_urls?: string[];
    title?: string;
    caption?: string;
    author?: string;
    datetime?: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    likes?: string;
    shares?: string;
    views?: string;
    hate_speech?: social_post_hate_speech | null;
    [key: string]: unknown;
}

export interface social_resource_collection {
    id?: string;
    is_parsed?: boolean;
    resources?: social_resource[];
    next_cursor?: string;
    has_more?: boolean;
    last_synced?: string;
    [key: string]: unknown;
}

export interface social_online_presence_hit {
    title?: string;
    url?: string;
    snippet?: string;
    timestamp?: string;
}

export interface social_stealer_log {
    email?: string;
    username?: string;
    user?: string;
    login?: string;
    credential?: string;
    domain?: string;
    source_domain?: string;
    ip?: string;
    host?: string;
    url?: string;
    date?: string;
    timestamp?: string;
    created_at?: string;
    updated_at?: string;
    raw?: string;
    [key: string]: unknown;
}

export interface social_wanted {
    name?: string;
    caption?: string;
    entity?: string;
    id?: string;
    schema?: string;
    status?: string;
    authority?: string;
    program?: string;
    topics?: string;
    datasets?: string;
    description?: string;
    summary?: string;
    notes?: string;
    source_url?: string;
    [key: string]: unknown;
}

export interface social_phone_knowledge_graph extends Record<string, unknown> {
    description?: string;
    detailed_desc?: string;
}

export interface social_phone_web_footprint extends Record<string, unknown> {
    link?: string;
    title?: string;
    snippet?: string;
}

export interface social_phone_lookup_result extends Record<string, unknown> {
    knowledge_graph?: social_phone_knowledge_graph;
    name?: string;
    formatted_address?: string;
    rating?: string | number;
    user_ratings_total?: string | number;
    website?: string;
    phone_numbers?: (string | number)[];
    emails?: string[];
    web_footprints?: social_phone_web_footprint[];
}

export interface social_phone_lookup {
    query: string;
    result: social_phone_lookup_result;
    [key: string]: unknown;
}

export interface social_exposure_signals {
    query: string;
    records: social_stealer_log[];
    [key: string]: unknown;
}

export interface social_profile_config {
    disallowed: string[];
    [key: string]: unknown;
}

export interface social_profile {
    id: string;
    meta: social_meta;
    profile_details?: social_profile_details | null;
    section_status?: Record<string, string> | null;
    resources?: social_resource_collection[] | null;
    online_presence?: social_online_presence_hit[] | null;
    stealer_logs?: social_stealer_log[] | null;
    wanted?: social_wanted[] | null;
    wanted_query?: string | null;
    exposure_signals?: social_exposure_signals | null;
    phone_lookup?: social_phone_lookup | null;
    [key: string]: unknown;
}

export interface db_social_model {
    user_id: string;
    profile_username?: string;
    profiles: social_profile[];
    config: social_profile_config;
    scan: social_scan_status;
    updated_at?: string | null;
}

export interface Job {
    id: string;
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    step: string;
}
