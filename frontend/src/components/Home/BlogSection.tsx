"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { getBlogs } from "@/services/homepageApi";
import { Blog } from "@/types/homepage";
import { SectionHeader, SectionGrid } from "./shared";

const FALLBACK: Blog[] = [
  {
    id: 1,
    title: "Understanding Your Blood Test Report",
    summary:
      "Learn how to read your CBC report and what each value means for your health.",
    imageUrl: "",
    isPublished: true,
    content: "",
    createdAt: "2026-05-20",
  },
  {
    id: 2,
    title: "Why Regular Health Checkups Matter",
    summary:
      "Prevention is better than cure. Discover why annual health checkups are essential.",
    imageUrl: "",
    isPublished: true,
    content: "",
    createdAt: "2026-05-15",
  },
  {
    id: 3,
    title: "Boost Immunity with Right Nutrition",
    summary:
      "Explore the key nutrients and foods that strengthen your immune system naturally.",
    imageUrl: "",
    isPublished: true,
    content: "",
    createdAt: "2026-05-10",
  },
];

export default function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>(FALLBACK);

  useEffect(() => {
    getBlogs()
      .then((d) => {
        if (d.length) setBlogs(d);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="blogs" className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <SectionHeader
            badge="Latest Blogs"
            title="Health & Wellness Insights"
            badgeColor="oklch(60% 0.15 45)"
          />
        </div>

        <SectionGrid columns={3} gap="6">
          {blogs.map((blog, i) => {
            // ================================
            // UPPER SECTION COLORS
            // ================================
            const upperColors = [
              "bg-cyan-800", // Card 1
              "bg-teal-600", // Card 2
              "bg-teal-800", // Card 3
            ];

            // ================================
            // BOTTOM SECTION COLORS (OKLCH)
            // ================================
            const bottomColors = [
              "oklch(77% 0.154 54.29)", // Card 1 - Orange
              "oklch(60% 0.164 34.01)", // Card 2 - Orange
              "oklch(68% 0.165 50.89)", // Card 3 - Amber
            ];

            // ================================
            // READ MORE BUTTON HEADER COLORS
            // ================================
            const headerBadgeColors = [
              "oklch(60% 0.15 45)", // Card 1 - Keep as is (orange)
              "oklch(60.9% 0.126 221.723)", // Card 2 - Blue tone
              "oklch(43.7% 0.078 188.216)", // Card 3 - Cyan/Teal tone
            ];

            const upperBgColor =
              upperColors[i] || upperColors[upperColors.length - 1];

            const bottomBgColor =
              bottomColors[i] || bottomColors[bottomColors.length - 1];

            const headerBadgeColor =
              headerBadgeColors[i] ||
              headerBadgeColors[headerBadgeColors.length - 1];

            return (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer group"
              >
                {/* ================================
                    UPPER SECTION
                    Same h-40 as your original code
                    ================================ */}
                <div
                  className={`h-40 flex items-center justify-center ${upperBgColor}`}
                >
                  {blog.imageUrl ? (
                    <img
                      src={blog.imageUrl}
                      alt={blog.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white/30 text-4xl font-bold">
                      {blog.title[0]}
                    </div>
                  )}
                </div>

                {/* ================================
                    BOTTOM SECTION
                    ================================ */}
                <div style={{ backgroundColor: bottomBgColor }} className="p-4">
                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-[#64748B] text-xs mb-2">
                    <Calendar size={11} />
                    {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-[#1E293B] text-sm mb-2 line-clamp-2 group-hover:text-[oklch(45%_0.085_224.283)] transition-colors">
                    {blog.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-[#64748B] text-xs leading-relaxed mb-3 line-clamp-2">
                    {blog.summary}
                  </p>

                  {/* Read More */}
                  <button
                    style={{ color: headerBadgeColor }}
                    className="text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Read More <ArrowRight size={11} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </SectionGrid>
      </div>
    </section>
  );
}
