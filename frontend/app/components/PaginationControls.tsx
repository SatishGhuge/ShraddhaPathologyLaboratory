"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/**
 * Reusable Pagination Controls Component
 * 
 * Features:
 * - Responsive design (mobile and desktop friendly)
 * - Shows record range (e.g., "Showing 1 to 20 of 150 records")
 * - Previous/Next navigation buttons
 * - Current page and total pages display
 * - Records per page selector (25, 50, 100)
 * - Disable buttons when at first/last page
 * - Loading state support
 * - Accessible with keyboard navigation
 */

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore?: boolean;
}

interface PaginationControlsProps {
  /** Pagination metadata from API response */
  pagination: PaginationData;
  
  /** Current active page number (1-indexed) */
  currentPage: number;
  
  /** Number of items displayed per page */
  itemsPerPage: number;
  
  /** Callback function triggered when user navigates to a different page */
  onPageChange: (page: number) => void;
  
  /** Callback function triggered when user changes items per page */
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  
  /** Optional: Set to true when data is being fetched to disable buttons */
  isLoading?: boolean;
}

export const PaginationControls = ({
  pagination,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false
}: PaginationControlsProps) => {
  // Don't render if no pagination data or no records
  if (!pagination || pagination.total === 0) {
    return null;
  }

  // Calculate which records are being displayed on current page
  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, pagination.total);
  
  // Determine if navigation buttons should be enabled
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pagination.totalPages;

  // Records per page options
  const perPageOptions = [25, 50, 100];

  const handleItemsPerPageChange = (value: number) => {
    if (onItemsPerPageChange) {
      onItemsPerPageChange(value);
    }
  };

  return (
    <div className="mt-1 bg-white rounded p-2 space-y-1">
      {/* Top Row: Records Info and Per-Page Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left: Shows record range */}
        <div className="text-gray-600 text-xs">
          Showing {startRecord} to {endRecord} of {pagination.total}
        </div>

        {/* Right: Records Per Page Selector - Inline Buttons */}
        <div className="flex items-center gap-2">
          <label className="text-gray-600 text-xs font-medium whitespace-nowrap">
            Show:
          </label>
          <div className="flex items-center gap-0.5">
            {perPageOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleItemsPerPageChange(option)}
                disabled={isLoading}
                className={`px-1.5 py-0.5 text-xs font-medium transition-colors rounded ${
                  itemsPerPage === option
                    ? 'bg-orange-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-400'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Navigation Controls */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Previous Button */}
        <button
          onClick={() => {
            const newPage = Math.max(1, currentPage - 1);
            onPageChange(newPage);
          }}
          disabled={!canGoPrevious || isLoading}
          className={`flex items-center gap-0.5 px-2 py-0.5 rounded transition-colors text-xs font-medium whitespace-nowrap ${
            canGoPrevious && !isLoading
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title="Go to previous page"
        >
          <ChevronLeft size={14} /> Previous
        </button>

        {/* Center: Current Page Display and Total */}
        <div className="flex items-center gap-1 text-xs font-medium">
          <span className="text-gray-600">
            Page <span className="font-bold">{currentPage}</span>/{pagination.totalPages}
          </span>
        </div>

        {/* Right: Next Button */}
        <button
          onClick={() => {
            const newPage = Math.min(pagination.totalPages, currentPage + 1);
            onPageChange(newPage);
          }}
          disabled={!canGoNext || isLoading}
          className={`flex items-center gap-0.5 px-2 py-0.5 rounded transition-colors text-xs font-medium whitespace-nowrap ${
            canGoNext && !isLoading
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title="Go to next page"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
