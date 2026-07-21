"use client";

import { motion } from "framer-motion";
import { SectionHeader, SectionGrid } from "./shared";

const features = [
  {
    emoji: "🏅",
    title: "NABL Accredited",
    desc: "Certified lab with high quality standards",
  },
  {
    emoji: "🎯",
    title: "Accurate Results",
    desc: "Advanced technology ensures precision",
  },
  {
    emoji: "⏱️",
    title: "Timely Reports",
    desc: "Quick turnaround time for all tests",
  },
  {
    emoji: "🏠",
    title: "Home Collection",
    desc: "Convenient sample collection at home",
  },
  {
    emoji: "🔒",
    title: "Secure & Safe",
    desc: "Your data and samples are 100% safe",
  },
  {
    emoji: "👨‍⚕️",
    title: "Expert Team",
    desc: "Experienced pathologists & staff",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <SectionHeader
          badge="Why Choose Us"
          title="Your Health, Our Priority"
          badgeColor="oklch(60% 0.15 45)"
          centered
        />

        {/* Grid */}
        <SectionGrid columns={6} gap="6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-2xl mb-3 group-hover:bg-[oklch(60%_0.15_45)] transition-colors duration-300">
                {f.emoji}
              </div>
              <h3 className="font-semibold text-[oklch(45%_0.085_224.283)] text-sm mb-1">{f.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </SectionGrid>
      </div>
    </section>
  );
}
