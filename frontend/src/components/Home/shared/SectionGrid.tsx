"use client";

import { ReactNode } from "react";

interface SectionGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  gap?: string;
  className?: string;
}

/**
 * SectionGrid - Responsive grid layout wrapper
 * Used in: Services grid, Blog grid, WhyChooseUs features
 */
export default function SectionGrid({
  children,
  columns = 3,
  gap = "6",
  className = "",
}: SectionGridProps) {
  const colMap = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  const gapClass = `gap-${gap}`;

  return (
    <div className={`grid ${colMap[columns]} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}
