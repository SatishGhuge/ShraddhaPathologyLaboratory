/**
 * Pagination Utility Functions
 * Handles pagination logic for API responses
 */

/**
 * Get pagination parameters from query
 * @param {Object} query - Express query object
 * @returns {Object} Pagination parameters {page, limit, skip}
 */
export const getPaginationParams = (query) => {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 20;

  // Validate page
  if (page < 1) page = 1;

  // Validate limit (min 1, max 100)
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build paginated response
 * @param {Array} data - Array of data items
 * @param {number} total - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Paginated response object
 */
export const buildPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore,
    },
  };
};

/**
 * Build error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Error response object
 */
export const buildErrorResponse = (message, statusCode = 500) => {
  return {
    success: false,
    message,
    statusCode,
  };
};
