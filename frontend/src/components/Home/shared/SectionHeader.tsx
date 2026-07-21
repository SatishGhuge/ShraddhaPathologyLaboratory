"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badgeColor?: string;
  centered?: boolean;
  children?: ReactNode;
}

/**
 * SectionHeader - Reusable component for section titles with optional subtitle and description
 * Used consistently across Services, Packages, Blog, About, Careers, etc.
 */
export default function SectionHeader({
  badge,
  title,
  subtitle,
  description,
  badgeColor = "oklch(60% 0.15 45)",
  centered = false,
  children,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`mb-12 ${centered ? "text-center" : ""}`}
    >
      {badge && (
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2"
          style={{ color: badgeColor }}
        >
          {badge}
        </p>
      )}

      <h2 className="text-3xl lg:text-4xl font-bold text-[#1E293B] mb-4 leading-tight">
        {title}
      </h2>

      {subtitle && (
        <p className="text-lg font-semibold text-[#64748B] mb-3">{subtitle}</p>
      )}

      {description && (
        <p className="text-[#64748B] text-sm leading-relaxed max-w-2xl mx-auto">
          {description}
        </p>
      )}

      {children}
    </motion.div>
  );
}
