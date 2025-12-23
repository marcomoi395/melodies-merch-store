export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T | null;
    meta?: Pagination;
}

export interface Pagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}
