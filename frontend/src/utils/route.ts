/**
 * Route Utilities
 * Helper functions for handling Next.js dynamic routes
 */

type ParamValue = string | string[] | undefined;

/**
 * Convert Next.js ParamValue to string
 * Handles both string and string[] types
 * @param id - ParamValue from Next.js dynamic route
 * @returns string - Single ID value
 */
export const getIdFromParams = (id: ParamValue): string => {
  if (Array.isArray(id)) {
    return id[0];
  }
  return id || "";
};

/**
 * Validate if ID is valid
 * @param id - ID to validate
 * @returns boolean - True if valid
 */
export const isValidId = (id: string | ParamValue): boolean => {
  const stringId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  return stringId.length > 0;
};

/**
 * Get multiple IDs from params
 * @param ids - ParamValue array
 * @returns string[] - Array of ID strings
 */
export const getIdsFromParams = (ids: ParamValue): string[] => {
  if (Array.isArray(ids)) {
    return ids;
  }
  return ids ? [ids] : [];
};
