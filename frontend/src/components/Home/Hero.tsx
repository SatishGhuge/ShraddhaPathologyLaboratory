"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import HeroImageCarousel from "./HeroImageCarousel";

const taglines = [
  "Trusted Results, Reliable Care",
  "Where Science Meets Precision",
  "Quality Diagnosis, Reliable Care",
  "Trusted Results, Caring Service",
  "Where Science Meets Care & Testing Meets Trust",
];

export default function Hero() {
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTaglineIdx((i) => (i + 1) % taglines.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="home" className="relative bg-[#F0F6FF] overflow-hidden">

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-3 min-h-[520px] items-center">

          {/* ── LEFT CONTENT (COMPACT) ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="py-12 lg:py-16 lg:col-span-1"
          >
            {/* Heading */}
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-[#1D3F5F] leading-[1.05] mb-4">
              Shraddha<br />
              Pathology<br />
              Laboratory
            </h1>

            {/* Animated tagline */}
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw size={14} className="text-[#EB925A] flex-shrink-0 animate-spin" style={{ animationDuration: "4s" }} />
              <AnimatePresence mode="wait">
                <motion.span
                  key={taglineIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-[#1D3F5F] text-sm font-semibold"
                >
                  {taglines[taglineIdx]}
                </motion.span>
              </AnimatePresence>
              {/* Decorative line */}
              <div className="flex-1 h-px bg-gray-300 max-w-[80px]" />
            </div>

            {/* Description */}
            <p className="text-[#64748B] text-xs leading-relaxed mb-6 max-w-xs">
              Advanced diagnostics, accurate results and compassionate care —
              empowering healthier lives every day.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[#EB925A] hover:bg-[#d4783f] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 text-xs"
              >
                Book Test
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="border-2 border-[#1D3F5F] text-[#1D3F5F] font-semibold px-6 py-2.5 rounded-lg hover:bg-[#1D3F5F] hover:text-white transition-colors text-xs"
              >
                View Packages
              </motion.button>
            </div>
          </motion.div>

          {/* ── RIGHT IMAGE (LARGER) ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative h-full min-h-[520px] lg:col-span-2 -mr-6 lg:-mr-10"
          >
            {/* Animated carousel - handles all image display */}
            <HeroImageCarousel />
            
            {/* Subtle left fade so image blends into the light bg */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#F0F6FF] via-transparent to-transparent w-1/3 pointer-events-none" />
          </motion.div>
        </div>
      </div>

    </section>
  );
}
