"use client";

import { motion } from "framer-motion";
import { SectionHeader, SectionButton } from "./shared";

export default function ReportAccess() {
  return (
    <section className="bg-[oklch(45%_0.085_224.283)] py-14 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4">
              <p className="text-[oklch(60%_0.15_45)] text-sm font-semibold uppercase tracking-widest mb-3">
                Report Access
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                Access Your Reports<br />Anytime, Anywhere
              </h2>
              <p className="text-blue-200 text-sm leading-relaxed mb-8 max-w-md">
                View, download and share your lab reports securely with just a few clicks. Get instant notifications when your reports are ready.
              </p>
            </div>

            <SectionButton variant="primary" className="gap-2">
              View Your Reports
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </SectionButton>
          </motion.div>

          {/* Right — mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="bg-[#2F4B6C] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 bg-[oklch(45%_0.085_224.283)] rounded h-5 ml-2" />
              </div>

              {/* Mock report UI */}
              <div className="bg-white rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#1D3F5F]">Your Test Report</p>
                    <p className="text-[10px] text-gray-400">Patient: Rahul Sharma</p>
                  </div>
                  <span className="bg-green-100 text-green-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">Ready</span>
                </div>

                {[
                  { label: "Hemoglobin", value: "14.2 g/dL", status: "Normal" },
                  { label: "Blood Sugar", value: "98 mg/dL", status: "Normal" },
                  { label: "Cholesterol", value: "185 mg/dL", status: "Normal" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between border-t pt-2">
                    <p className="text-xs text-gray-600">{row.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[oklch(45%_0.085_224.283)]">{row.value}</p>
                      <span className="text-[10px] text-green-500">{row.status}</span>
                    </div>
                  </div>
                ))}

                <button className="w-full bg-[oklch(60%_0.15_45)] text-white text-xs font-semibold py-2 rounded-lg mt-2">
                  Download PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
