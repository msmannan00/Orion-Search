export interface BaseListResponse {
    total_count: number;
}

export interface ListService {
    reload(params: unknown): void;
    setCurrentPage(page: number): void;
}
