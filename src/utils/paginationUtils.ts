export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  filters?: { [key: string]: any };
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startIndex: number;
    endIndex: number;
  };
  sorting?: {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
  };
  filters?: { [key: string]: any };
}

export interface DatabasePaginationOptions extends PaginationOptions {
  tableName: string;
  selectFields?: string[];
  whereConditions?: string[];
  whereParams?: any[];
  joinClauses?: string[];
}

export class PaginationService {
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 1000;

  /**
   * Validate and normalize pagination options
   */
  static validateOptions(options: PaginationOptions): Required<PaginationOptions> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(
      Math.max(1, options.limit || this.DEFAULT_LIMIT),
      this.MAX_LIMIT
    );
    
    return {
      page,
      limit,
      sortBy: options.sortBy || 'id',
      sortOrder: options.sortOrder || 'DESC',
      search: options.search || '',
      filters: options.filters || {}
    };
  }

  /**
   * Calculate pagination metadata
   */
  static calculatePagination(
    totalItems: number,
    currentPage: number,
    itemsPerPage: number
  ): PaginationResult<any>['pagination'] {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);

    return {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex,
      endIndex
    };
  }

  /**
   * Apply pagination to in-memory array
   */
  static paginateArray<T>(
    data: T[],
    options: PaginationOptions
  ): PaginationResult<T> {
    const validatedOptions = this.validateOptions(options);
    let filteredData = [...data];

    // Apply search filter
    if (validatedOptions.search) {
      filteredData = this.applySearch(filteredData, validatedOptions.search);
    }

    // Apply custom filters
    if (Object.keys(validatedOptions.filters).length > 0) {
      filteredData = this.applyFilters(filteredData, validatedOptions.filters);
    }

    // Apply sorting
    filteredData = this.applySorting(
      filteredData,
      validatedOptions.sortBy,
      validatedOptions.sortOrder
    );

    // Calculate pagination
    const totalItems = filteredData.length;
    const pagination = this.calculatePagination(
      totalItems,
      validatedOptions.page,
      validatedOptions.limit
    );

    // Apply pagination
    const startIndex = (validatedOptions.page - 1) * validatedOptions.limit;
    const endIndex = startIndex + validatedOptions.limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      pagination,
      sorting: {
        sortBy: validatedOptions.sortBy,
        sortOrder: validatedOptions.sortOrder
      },
      filters: validatedOptions.filters
    };
  }

  /**
   * Generate SQL query for database pagination
   */
  static buildPaginationQuery(options: DatabasePaginationOptions): {
    countQuery: string;
    dataQuery: string;
    params: any[];
  } {
    const validatedOptions = this.validateOptions(options);
    const {
      tableName,
      selectFields = ['*'],
      whereConditions = [],
      whereParams = [],
      joinClauses = []
    } = options;

    let params = [...whereParams];
    let whereClause = '';
    let searchClause = '';

    // Build WHERE clause
    if (whereConditions.length > 0) {
      whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add search functionality
    if (validatedOptions.search && selectFields.length > 0) {
      const searchConditions = selectFields
        .filter(field => field !== '*')
        .map(field => `${field} LIKE ?`)
        .join(' OR ');
      
      if (searchConditions) {
        searchClause = whereClause 
          ? ` AND (${searchConditions})`
          : `WHERE (${searchConditions})`;
        
        // Add search parameters for each field
        const searchParam = `%${validatedOptions.search}%`;
        const searchFieldCount = selectFields.filter(field => field !== '*').length;
        params.push(...Array(searchFieldCount).fill(searchParam));
      }
    }

    // Add filter conditions
    const filterConditions: string[] = [];
    Object.entries(validatedOptions.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(',');
          filterConditions.push(`${key} IN (${placeholders})`);
          params.push(...value);
        } else {
          filterConditions.push(`${key} = ?`);
          params.push(value);
        }
      }
    });

    if (filterConditions.length > 0) {
      const filterClause = filterConditions.join(' AND ');
      if (whereClause || searchClause) {
        searchClause += ` AND ${filterClause}`;
      } else {
        searchClause = `WHERE ${filterClause}`;
      }
    }

    // Build JOIN clause
    const joinClause = joinClauses.join(' ');

    // Build ORDER BY clause
    const orderClause = `ORDER BY ${validatedOptions.sortBy} ${validatedOptions.sortOrder}`;

    // Build LIMIT and OFFSET
    const offset = (validatedOptions.page - 1) * validatedOptions.limit;
    const limitClause = `LIMIT ? OFFSET ?`;
    const paginationParams = [validatedOptions.limit, offset];

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${tableName}
      ${joinClause}
      ${whereClause}
      ${searchClause}
    `.trim();

    // Data query
    const dataQuery = `
      SELECT ${selectFields.join(', ')}
      FROM ${tableName}
      ${joinClause}
      ${whereClause}
      ${searchClause}
      ${orderClause}
      ${limitClause}
    `.trim();

    return {
      countQuery,
      dataQuery,
      params: [...params, ...paginationParams]
    };
  }

  /**
   * Apply search filter to array
   */
  private static applySearch<T>(data: T[], searchTerm: string): T[] {
    if (!searchTerm) return data;

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return data.filter(item => {
      const itemString = JSON.stringify(item).toLowerCase();
      return itemString.includes(lowerSearchTerm);
    });
  }

  /**
   * Apply filters to array
   */
  private static applyFilters<T>(data: T[], filters: { [key: string]: any }): T[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return true;
        }

        const itemValue = (item as any)[key];
        
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }
        
        if (typeof value === 'string' && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }
        
        return itemValue === value;
      });
    });
  }

  /**
   * Apply sorting to array
   */
  private static applySorting<T>(
    data: T[],
    sortBy: string,
    sortOrder: 'ASC' | 'DESC'
  ): T[] {
    return data.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      let comparison = 0;

      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      return sortOrder === 'DESC' ? -comparison : comparison;
    });
  }

  /**
   * Create pagination links/info for frontend
   */
  static createPaginationInfo(
    currentPage: number,
    totalPages: number,
    maxVisiblePages = 5
  ): {
    pages: Array<{
      page: number;
      isCurrent: boolean;
      isEllipsis: boolean;
    }>;
    showFirst: boolean;
    showLast: boolean;
    showPrevious: boolean;
    showNext: boolean;
  } {
    const pages: Array<{
      page: number;
      isCurrent: boolean;
      isEllipsis: boolean;
    }> = [];

    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);

    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }

    // Add ellipsis at the beginning if needed
    if (startPage > 2) {
      pages.push({ page: 1, isCurrent: false, isEllipsis: false });
      if (startPage > 3) {
        pages.push({ page: -1, isCurrent: false, isEllipsis: true });
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push({
        page: i,
        isCurrent: i === currentPage,
        isEllipsis: false
      });
    }

    // Add ellipsis at the end if needed
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        pages.push({ page: -1, isCurrent: false, isEllipsis: true });
      }
      pages.push({ page: totalPages, isCurrent: false, isEllipsis: false });
    }

    return {
      pages,
      showFirst: currentPage > 1,
      showLast: currentPage < totalPages,
      showPrevious: currentPage > 1,
      showNext: currentPage < totalPages
    };
  }

  /**
   * Calculate optimal page size based on data characteristics
   */
  static calculateOptimalPageSize(
    totalItems: number,
    averageItemSize: number,
    targetResponseTime = 500 // milliseconds
  ): number {
    // Estimate items per page based on response time target
    const estimatedItemsPerMs = 100; // Rough estimate
    const maxItemsForTarget = targetResponseTime * estimatedItemsPerMs;
    
    // Consider memory constraints (assume 1MB max response)
    const maxItemsForMemory = Math.floor(1024 * 1024 / averageItemSize);
    
    // Take the minimum of constraints
    const optimalSize = Math.min(
      maxItemsForTarget,
      maxItemsForMemory,
      this.MAX_LIMIT
    );
    
    // Ensure minimum viable page size
    return Math.max(10, Math.min(optimalSize, this.DEFAULT_LIMIT));
  }
}

/**
 * Frontend pagination hook utilities
 */
export class FrontendPaginationUtils {
  /**
   * Generate URL query string from pagination options
   */
  static toQueryString(options: PaginationOptions): string {
    const params = new URLSearchParams();
    
    if (options.page && options.page > 1) {
      params.set('page', options.page.toString());
    }
    
    if (options.limit && options.limit !== PaginationService['DEFAULT_LIMIT']) {
      params.set('limit', options.limit.toString());
    }
    
    if (options.sortBy) {
      params.set('sortBy', options.sortBy);
    }
    
    if (options.sortOrder && options.sortOrder !== 'DESC') {
      params.set('sortOrder', options.sortOrder);
    }
    
    if (options.search) {
      params.set('search', options.search);
    }
    
    Object.entries(options.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(`filter_${key}`, Array.isArray(value) ? value.join(',') : value.toString());
      }
    });
    
    return params.toString();
  }

  /**
   * Parse pagination options from URL query string
   */
  static fromQueryString(queryString: string): PaginationOptions {
    const params = new URLSearchParams(queryString);
    const options: PaginationOptions = {};
    
    const page = params.get('page');
    if (page) options.page = parseInt(page, 10);
    
    const limit = params.get('limit');
    if (limit) options.limit = parseInt(limit, 10);
    
    const sortBy = params.get('sortBy');
    if (sortBy) options.sortBy = sortBy;
    
    const sortOrder = params.get('sortOrder');
    if (sortOrder === 'ASC' || sortOrder === 'DESC') {
      options.sortOrder = sortOrder;
    }
    
    const search = params.get('search');
    if (search) options.search = search;
    
    // Parse filters
    const filters: { [key: string]: any } = {};
    for (const [key, value] of params.entries()) {
      if (key.startsWith('filter_')) {
        const filterKey = key.substring(7); // Remove 'filter_' prefix
        filters[filterKey] = value.includes(',') ? value.split(',') : value;
      }
    }
    
    if (Object.keys(filters).length > 0) {
      options.filters = filters;
    }
    
    return options;
  }
}

export default PaginationService;