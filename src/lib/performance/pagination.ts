/**
 * Pagination
 * 
 * Implements universal pagination with:
 * - Offset-based pagination
 * - Cursor-based pagination
 * - Page metadata
 * - Pagination helpers
 * - Infinite scroll support
 * - Pagination caching
 */

// Pagination options
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Paginated result
export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// Pagination metadata
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  firstCursor?: string;
  lastCursor?: string;
}

// Cursor info
export interface CursorInfo {
  id: string;
  createdAt: Date;
}

/**
 * Pagination Helper
 */
export class PaginationHelper {
  /**
   * Calculate pagination metadata
   */
  static calculateMetadata(
    page: number,
    pageSize: number,
    totalItems: number
  ): PaginationMetadata {
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  /**
   * Calculate offset from page and page size
   */
  static calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * Calculate page from offset and page size
   */
  static calculatePageFromOffset(offset: number, pageSize: number): number {
    return Math.floor(offset / pageSize) + 1;
  }

  /**
   * Validate pagination options
   */
  static validateOptions(options: PaginationOptions): Required<PaginationOptions> {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';

    return {
      page,
      pageSize,
      cursor: options.cursor || '',
      limit,
      sortBy,
      sortOrder,
    };
  }

  /**
   * Build pagination query
   */
  static buildQuery(options: PaginationOptions): {
    limit: number;
    offset: number;
    orderBy: string;
  } {
    const validated = this.validateOptions(options);
    const offset = this.calculateOffset(validated.page, validated.pageSize);
    const orderBy = `${validated.sortBy} ${validated.sortOrder.toUpperCase()}`;

    return {
      limit: validated.pageSize,
      offset,
      orderBy,
    };
  }

  /**
   * Paginate array
   */
  static paginateArray<T>(
    array: T[],
    options: PaginationOptions
  ): PaginatedResult<T> {
    const validated = this.validateOptions(options);
    const offset = this.calculateOffset(validated.page, validated.pageSize);
    const paginatedData = array.slice(offset, offset + validated.pageSize);
    const metadata = this.calculateMetadata(validated.page, validated.pageSize, array.length);

    return {
      data: paginatedData,
      pagination: metadata,
    };
  }

  /**
   * Create cursor from item
   */
  static createCursor(item: CursorInfo): string {
    return Buffer.from(JSON.stringify({ id: item.id, createdAt: item.createdAt.toISOString() })).toString('base64');
  }

  /**
   * Parse cursor
   */
  static parseCursor(cursor: string): CursorInfo | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return {
        id: parsed.id,
        createdAt: new Date(parsed.createdAt),
      };
    } catch {
      return null;
    }
  }

  /**
   * Cursor-based pagination
   */
  static paginateByCursor<T extends CursorInfo>(
    items: T[],
    options: PaginationOptions
  ): PaginatedResult<T> {
    const validated = this.validateOptions(options);
    let startIndex = 0;

    if (validated.cursor) {
      const cursorInfo = this.parseCursor(validated.cursor);
      if (cursorInfo) {
        startIndex = items.findIndex(item => item.id === cursorInfo.id);
        if (startIndex === -1) {
          startIndex = 0;
        } else {
          startIndex += 1; // Start after the cursor
        }
      }
    }

    const paginatedData = items.slice(startIndex, startIndex + validated.limit);
    const hasNextPage = startIndex + validated.limit < items.length;
    const hasPreviousPage = startIndex > 0;

    const metadata: PaginationMetadata = {
      page: validated.page,
      pageSize: validated.limit,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / validated.limit),
      hasNextPage,
      hasPreviousPage,
      nextCursor: hasNextPage && paginatedData.length > 0 ? this.createCursor(paginatedData[paginatedData.length - 1]) : undefined,
      previousCursor: hasPreviousPage && startIndex > 0 ? this.createCursor(items[startIndex - 1]) : undefined,
      firstCursor: items.length > 0 ? this.createCursor(items[0]) : undefined,
      lastCursor: items.length > 0 ? this.createCursor(items[items.length - 1]) : undefined,
    };

    return {
      data: paginatedData,
      pagination: metadata,
    };
  }

  /**
   * Get page range
   */
  static getPageRange(currentPage: number, totalPages: number, maxVisible: number = 5): number[] {
    const range: number[] = [];
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    if (end - start < maxVisible - 1) {
      if (start === 1) {
        end = Math.min(totalPages, start + maxVisible - 1);
      } else if (end === totalPages) {
        start = Math.max(1, end - maxVisible + 1);
      }
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }

  /**
   * Get pagination info for UI
   */
  static getPaginationInfo(metadata: PaginationMetadata): {
    showingFrom: number;
    showingTo: number;
    totalItems: number;
    currentPage: number;
    totalPages: number;
    pageRange: number[];
  } {
    const showingFrom = (metadata.page - 1) * metadata.pageSize + 1;
    const showingTo = Math.min(metadata.page * metadata.pageSize, metadata.totalItems);
    const pageRange = this.getPageRange(metadata.page, metadata.totalPages);

    return {
      showingFrom,
      showingTo,
      totalItems: metadata.totalItems,
      currentPage: metadata.page,
      totalPages: metadata.totalPages,
      pageRange,
    };
  }
}

/**
 * Paginated Query Builder
 */
export class PaginatedQueryBuilder {
  private query: string;
  private countQuery: string;
  private options: PaginationOptions;
  private params: unknown[];

  constructor(baseQuery: string, options: PaginationOptions = {}) {
    this.query = baseQuery;
    this.countQuery = `SELECT COUNT(*) FROM (${baseQuery}) as count`;
    this.options = options;
    this.params = [];
  }

  /**
   * Add WHERE clause
   */
  where(condition: string, ...params: unknown[]): this {
    if (!this.query.toLowerCase().includes('where')) {
      this.query += ` WHERE ${condition}`;
      this.countQuery += ` WHERE ${condition}`;
    } else {
      this.query += ` AND ${condition}`;
      this.countQuery += ` AND ${condition}`;
    }
    this.params.push(...params);
    return this;
  }

  /**
   * Add ORDER BY clause
   */
  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.query += ` ORDER BY ${column} ${direction.toUpperCase()}`;
    return this;
  }

  /**
   * Add LIMIT and OFFSET
   */
  paginate(): this {
    const validated = PaginationHelper.validateOptions(this.options);
    const offset = PaginationHelper.calculateOffset(validated.page, validated.pageSize);
    
    this.query += ` LIMIT ${validated.pageSize} OFFSET ${offset}`;
    return this;
  }

  /**
   * Build query
   */
  build(): {
    query: string;
    countQuery: string;
    params: unknown[];
  } {
    return {
      query: this.query,
      countQuery: this.countQuery,
      params: this.params,
    };
  }

  /**
   * Get query with pagination
   */
  getPaginatedQuery(): string {
    this.paginate();
    return this.query;
  }

  /**
   * Get count query
   */
  getCountQuery(): string {
    return this.countQuery;
  }
}

/**
 * Pagination response formatter
 */
export class PaginationResponseFormatter {
  /**
   * Format paginated response
   */
  static format<T>(data: T[], metadata: PaginationMetadata): PaginatedResult<T> {
    return {
      data,
      pagination: metadata,
    };
  }

  /**
   * Format for API response
   */
  static formatForAPI<T>(result: PaginatedResult<T>): {
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  } {
    return {
      data: result.data,
      pagination: {
        page: result.pagination.page,
        pageSize: result.pagination.pageSize,
        totalItems: result.pagination.totalItems,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
      },
    };
  }

  /**
   * Format for GraphQL
   */
  static formatForGraphQL<T>(result: PaginatedResult<T>): {
    nodes: T[];
    pageInfo: {
      currentPage: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
    totalCount: number;
  } {
    return {
      nodes: result.data,
      pageInfo: {
        currentPage: result.pagination.page,
        totalPages: result.pagination.totalPages,
        hasNextPage: result.pagination.hasNextPage,
        hasPreviousPage: result.pagination.hasPreviousPage,
        startCursor: result.pagination.firstCursor,
        endCursor: result.pagination.lastCursor,
      },
      totalCount: result.pagination.totalItems,
    };
  }
}

/**
 * Common pagination configurations
 */
export const PaginationConfig = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  SMALL_PAGE_SIZE: 10,
  LARGE_PAGE_SIZE: 50,

  // API endpoints
  PROPERTIES: { pageSize: 20 },
  TENANTS: { pageSize: 20 },
  PAYMENTS: { pageSize: 50 },
  INVOICES: { pageSize: 20 },
  MAINTENANCE: { pageSize: 20 },
  REPORTS: { pageSize: 10 },
  ACTIVITY_LOG: { pageSize: 50 },

  // Dashboard widgets
  DASHBOARD_RECENT_ACTIVITY: { pageSize: 10 },
  DASHBOARD_UPCOMING_PAYMENTS: { pageSize: 5 },
  DASHBOARD_PENDING_MAINTENANCE: { pageSize: 5 },
};

/**
 * Pagination middleware helper
 */
export class PaginationMiddleware {
  /**
   * Extract pagination options from request
   */
  static extractFromRequest(query: Record<string, unknown>): PaginationOptions {
    return {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      cursor: query.cursor as string,
      limit: query.limit ? Number(query.limit) : undefined,
      sortBy: query.sortBy as string,
      sortOrder: query.sortOrder as 'asc' | 'desc',
    };
  }

  /**
   * Validate and sanitize pagination options
   */
  static sanitize(options: PaginationOptions): Required<PaginationOptions> {
    return PaginationHelper.validateOptions(options);
  }

  /**
   * Apply pagination to Supabase query
   */
  static applyToSupabaseQuery(
    query: any,
    options: PaginationOptions
  ): any {
    const validated = this.sanitize(options);
    const offset = PaginationHelper.calculateOffset(validated.page, validated.pageSize);

    let paginatedQuery = query.range(offset, offset + validated.pageSize - 1);

    if (validated.sortBy) {
      paginatedQuery = paginatedQuery.order(validated.sortBy, { ascending: validated.sortOrder === 'asc' });
    }

    return paginatedQuery;
  }
}
