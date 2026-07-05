export interface PaginationParams {
  limit: number;
  skip: number;
  page: number;
}

export function parsePagination(
  query: Record<string, unknown>,
  defaultLimit = 25,
  maxLimit = 100,
): PaginationParams {
  const limit = Math.min(
    Math.max(parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit, 1),
    maxLimit,
  );
  const hasPage = query.page !== undefined && query.page !== "";
  const page = Math.max(parseInt(String(query.page ?? 1), 10) || 1, 1);
  const skip = hasPage
    ? (page - 1) * limit
    : Math.max(parseInt(String(query.skip ?? 0), 10) || 0, 0);

  return { limit, skip, page: hasPage ? page : Math.floor(skip / limit) + 1 };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  pagination: PaginationParams,
) {
  return {
    items,
    total,
    limit: pagination.limit,
    skip: pagination.skip,
    page: pagination.page,
    totalPages: Math.ceil(total / pagination.limit) || 1,
  };
}
