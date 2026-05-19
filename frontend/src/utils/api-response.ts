/**
 * API Response Utilities
 * Helper functions for handling API responses consistently
 */

import { ApiResponse, SuccessResponse, ErrorResponse } from "@/src/types/api";

/**
 * Check if API response is successful
 * @param response - API response
 * @returns boolean - True if successful
 */
export const isSuccessResponse = <T = any>(
  response: ApiResponse<T>
): response is SuccessResponse<T> => {
  return response.success === true;
};

/**
 * Check if API response is an error
 * @param response - API response
 * @returns boolean - True if error
 */
export const isErrorResponse = <T = any>(
  response: ApiResponse<T>
): response is ErrorResponse => {
  return response.success === false;
};

/**
 * Get data from API response safely
 * @param response - API response
 * @returns T | null - Data or null
 */
export const getResponseData = <T = any>(response: ApiResponse<T>): T | null => {
  if (isSuccessResponse(response)) {
    return response.data || null;
  }
  return null;
};

/**
 * Get error message from API response
 * @param response - API response
 * @returns string - Error message
 */
export const getErrorMessage = (response: ApiResponse): string => {
  if (isErrorResponse(response)) {
    return response.message || response.error || "An error occurred";
  }
  return "Unknown error";
};

/**
 * Get credentials from API response (for center/franchise creation)
 * @param response - API response
 * @returns object | null - Credentials or null
 */
export const getCredentialsFromResponse = <T extends { credentials?: any }>(
  response: ApiResponse<T>
): T["credentials"] | null => {
  if (isSuccessResponse(response) && response.data?.credentials) {
    return response.data.credentials;
  }
  return null;
};

/**
 * Handle API response with callback
 * @param response - API response
 * @param onSuccess - Success callback
 * @param onError - Error callback
 */
export const handleApiResponse = <T = any>(
  response: ApiResponse<T>,
  onSuccess?: (data: T | undefined) => void,
  onError?: (message: string) => void
): void => {
  if (isSuccessResponse(response)) {
    onSuccess?.(response.data);
  } else {
    onError?.(getErrorMessage(response));
  }
};
