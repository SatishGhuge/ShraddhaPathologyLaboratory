"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { getBlogs } from "@/services/homepageApi";
import { Blog } from "@/types/homepage";
import { SectionHeader, SectionGrid } from "./shared";

const FALLBACK: Blog[] = [
  { id:1, title:"Understanding Your Blood Test Report", summary:"Learn how to read your CBC report and what each value means for your health.", imageUrl:"", isPublished:true, content:"", createdAt:"2026-05-20" },
  { id:2, title:"Why Regular Health Checkups Matter", summary:"Prevention is better than cure. Discover why annual health checkups are essential.", imageUrl:"", isPublished:true, content:"", createdAt:"2026-05-15" },
  { id:3, title:"Boost Immunity with Right Nutrition", summary:"Explore the key nutrients and foods that strengthen your immune system naturally.", imageUrl:"", isPublished:true, content:"", createdAt:"2026-05-10" },
];

export default function BlogSection() {
  const [blogs, setBlogs] = useState<Blog[]>(FALLBACK);

  useEffect(() => {
    getBlogs().then((d) => { if (d.length) setBlogs(d); }).catch(() => {});
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
          {blogs.map((blog, i) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-[#F8FAFC] rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer group"
            >
              {/* Image */}
              <div className="h-40 bg-gradient-to-br from-[oklch(45%_0.085_224.283)] to-[oklch(40%_0.075_224.283)] flex items-center justify-center">
                {blog.imageUrl ? (
                  <img src={blog.imageUrl} alt={blog.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-white/30 text-4xl font-bold">{blog.title[0]}</div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center gap-1.5 text-[#64748B] text-xs mb-2">
                  <Calendar size={11} />
                  {new Date(blog.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                </div>
                <h3 className="font-bold text-[#1E293B] text-sm mb-2 line-clamp-2 group-hover:text-[oklch(45%_0.085_224.283)] transition-colors">
                  {blog.title}
                </h3>
                <p className="text-[#64748B] text-xs leading-relaxed mb-3 line-clamp-2">{blog.summary}</p>
                <button className="text-[oklch(60%_0.15_45)] text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  Read More <ArrowRight size={11} />
                </button>
              </div>
            </motion.div>
          ))}
        </SectionGrid>
      </div>
    </section>
  );
}
