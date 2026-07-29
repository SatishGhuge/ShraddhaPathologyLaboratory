"use client";

import { ReactNode, createElement } from "react";

interface SectionTitleProps {
  level?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  color?: string;
  children: ReactNode;
  className?: string;
  centerText?: boolean;
}

/**
 * SectionTitle - Consistent text styling for headings
 */
export default function SectionTitle({
  level = "h2",
  color = "#1E293B",
  children,
  className = "",
  centerText = false,
}: SectionTitleProps) {
  const sizeMap = {
    h1: "text-4xl lg:text-5xl font-extrabold",
    h2: "text-3xl lg:text-4xl font-bold",
    h3: "text-2xl lg:text-3xl font-semibold",
    h4: "text-xl lg:text-2xl font-semibold",
    h5: "text-lg font-semibold",
    h6: "text-base font-semibold",
  };

  return createElement(
    level,
    {
      className: `${sizeMap[level]} ${centerText ? "text-center" : ""} ${className}`,
      style: { color },
    },
    children
  );
}
