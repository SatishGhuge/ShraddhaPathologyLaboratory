"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

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
        <div className="grid lg:grid-cols-2 min-h-[520px] items-center">

          {/* ── LEFT CONTENT ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="py-16 lg:py-20 pr-8"
          >
            {/* Heading */}
            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold text-[#1D3F5F] leading-[1.05] mb-6">
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
            <p className="text-[#64748B] text-sm leading-relaxed mb-8 max-w-sm">
              Advanced diagnostics, accurate results and compassionate care —
              empowering healthier lives every day.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[#EB925A] hover:bg-[#d4783f] text-white font-semibold px-7 py-3 rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                Book Test
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="border-2 border-[#1D3F5F] text-[#1D3F5F] font-semibold px-7 py-3 rounded-lg hover:bg-[#1D3F5F] hover:text-white transition-colors text-sm"
              >
                View Packages
              </motion.button>
            </div>
          </motion.div>

          {/* ── RIGHT IMAGE — flush to right edge ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative h-full min-h-[520px] -mr-6 lg:-mr-10"
          >
            <Image
              src="/labhomeimage.jpg"
              alt="Lab Technician at Shraddha Pathology Laboratory"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Subtle left fade so image blends into the light bg */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#F0F6FF] via-transparent to-transparent w-1/3" />
          </motion.div>
        </div>
      </div>

    </section>
  );
}
