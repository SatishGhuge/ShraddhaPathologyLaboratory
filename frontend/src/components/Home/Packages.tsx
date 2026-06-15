"use client";

import { motion } from "framer-motion";

const packages = [
  {
    name: "Basic Health Checkup",
    price: "₹499",
    popular: false,
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Sugar (Fasting)",
      "Urine Routine",
      "Lipid Profile",
    ],
  },
  {
    name: "Advanced Health Checkup",
    price: "₹999",
    popular: true,
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Sugar (Fasting & PP)",
      "Lipid Profile",
      "Liver Function Test (LFT)",
      "Kidney Function Test (KFT)",
      "Thyroid Profile (T3, T4, TSH)",
    ],
  },
  {
    name: "Full Body Checkup",
    price: "₹1799",
    popular: false,
    tests: [
      "Complete Blood Count (CBC)",
      "Blood Sugar (Fasting & PP)",
      "Lipid Profile",
      "Liver Function Test (LFT)",
      "Kidney Function Test (KFT)",
      "Thyroid Profile (T3, T4, TSH)",
      "Vitamin D",
      "ECG",
    ],
  },
];

export default function Packages() {
  return (
    <section className="bg-[#F5F7FA] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[#EB925A] text-sm font-semibold uppercase tracking-widest mb-2">Health Packages</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1D3F5F] mb-3">
            Affordable Packages for Every Need
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Choose from our carefully curated health packages designed for comprehensive wellness monitoring.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              whileHover={{ y: -6 }}
              className={`relative rounded-2xl p-6 shadow-sm transition-all ${
                pkg.popular
                  ? "bg-[#1D3F5F] text-white shadow-xl scale-105"
                  : "bg-white text-[#1D3F5F]"
              }`}
            >
              {/* Popular badge */}
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#EB925A] text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <h3 className={`font-bold text-lg mb-1 ${pkg.popular ? "text-white" : "text-[#1D3F5F]"}`}>
                {pkg.name}
              </h3>
              <p className={`text-xs mb-4 ${pkg.popular ? "text-blue-200" : "text-gray-400"}`}>
                {pkg.popular ? "Advanced tests for detailed health insights" : "Essential tests for a quick health overview"}
              </p>

              <p className="text-4xl font-bold mb-6 text-[#EB925A]">
                {pkg.price}
              </p>

              <ul className="space-y-2 mb-6">
                {pkg.tests.map((test) => (
                  <li key={test} className="flex items-center gap-2 text-sm">
                    <svg
                      className="w-4 h-4 flex-shrink-0 text-[#EB925A]"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={pkg.popular ? "text-blue-100" : "text-gray-600"}>{test}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                  pkg.popular
                    ? "bg-[#EB925A] text-white hover:bg-[#d4783f]"
                    : "border-2 border-[#1D3F5F] text-[#1D3F5F] hover:bg-[#1D3F5F] hover:text-white"
                }`}
              >
                view
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
