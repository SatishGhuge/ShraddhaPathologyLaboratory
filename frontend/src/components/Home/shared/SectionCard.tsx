"use client";

import { motion } from "framer-motion";
import { ReactNode, CSSProperties } from "react";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  isPopular?: boolean;
  isPadded?: boolean;
  minHeight?: string | number;
  style?: CSSProperties;
  whileHover?: any;
  onClick?: () => void;
}

/**
 * SectionCard - Consistent card styling with rounded corners, border, and padding
 * Used in: Packages, Services, Blog, WhyChooseUs sections
 */
export default function SectionCard({
  children,
  className = "",
  isPopular = false,
  isPadded = true,
  minHeight,
  style,
  whileHover = { y: -8, boxShadow: "0 24px 48px rgba(0,0,0,0.14)" },
  onClick,
}: SectionCardProps) {
  return (
    <motion.div
      whileHover={whileHover}
      transition={{ duration: 0.22 }}
      onClick={onClick}
      className={`relative rounded-2xl border-2 transition-colors duration-300 cursor-pointer ${
        isPopular
          ? "bg-[oklch(45%_0.085_224.283)] border-[oklch(60%_0.15_45)] shadow-2xl shadow-[oklch(45%_0.085_224.283)]/30"
          : "bg-white border-gray-100 shadow-lg hover:border-[oklch(60%_0.15_45)]"
      } ${isPadded ? "p-7" : "p-0"} ${className}`}
      style={{ minHeight, ...style }}
    >
      {children}
    </motion.div>
  );
}
