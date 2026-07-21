"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";

interface SectionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: "primary" | "secondary" | "outline";
  children: ReactNode;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * SectionButton - Consistent button styling across sections
 * Variants:
 *   - primary: Orange background (oklch(60% 0.15 45))
 *   - secondary: Gray background
 *   - outline: Blue border with transparent background (oklch(45% 0.085 224.283))
 */
export default function SectionButton({
  variant = "primary",
  children,
  className = "",
  loading = false,
  disabled = false,
  ...props
}: SectionButtonProps) {
  const variants = {
    primary:
      "bg-[oklch(60%_0.15_45)] hover:bg-[oklch(55%_0.14_45)] text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-[#1E293B]",
    outline:
      "border-2 border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)] hover:bg-[oklch(45%_0.085_224.283)] hover:text-white",
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02 } : {}}
      whileTap={!isDisabled ? { scale: 0.98 } : {}}
      disabled={isDisabled}
      className={`font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm ${
        variants[variant]
      } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      {...(props as any)}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
