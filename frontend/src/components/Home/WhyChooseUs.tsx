"use client";

import { motion } from "framer-motion";

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
        <div className="text-center mb-12">
          <p className="text-[#EB925A] text-sm font-semibold uppercase tracking-widest mb-2">Why Choose Us</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1D3F5F]">
            Your Health, Our Priority
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-2xl mb-3 group-hover:bg-[#EB925A] transition-colors duration-300">
                {f.emoji}
              </div>
              <h3 className="font-semibold text-[#1D3F5F] text-sm mb-1">{f.title}</h3>
              <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
