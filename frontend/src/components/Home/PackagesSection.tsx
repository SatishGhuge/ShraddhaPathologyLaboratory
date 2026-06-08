"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, ArrowRight, ChevronLeft, ChevronRight,
  Star, X, FlaskConical,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getPackages } from "@/services/homepageApi";
import { HealthPackage } from "@/types/homepage";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";

/* ─── Fallback data ─────────────────────────────────────── */
const FALLBACK: HealthPackage[] = [
  { id:1, name:"Basic Health Checkup",   tests:"CBC, Blood Sugar, Urine Routine, Lipid Profile",                                                                        price:699,  originalPrice:1200, isPopular:false, isActive:true },
  { id:2, name:"Well Woman Package",     tests:"CBC, Blood Sugar, Thyroid, Pap Smear, Vitamin D, Calcium, Urine Routine",                                               price:1299, originalPrice:2200, isPopular:true,  isActive:true },
  { id:3, name:"Diabetes Care Package",  tests:"HbA1c, Fasting Blood Sugar, PP Blood Sugar, Urine Microalbumin, Kidney Function",                                       price:999,  originalPrice:1800, isPopular:false, isActive:true },
  { id:4, name:"Senior Citizen Package", tests:"CBC, Blood Sugar, Lipid Profile, Kidney Function, Liver Function, Thyroid, Vitamin B12, Vitamin D, ECG, Urine",        price:2169, originalPrice:3500, isPopular:false, isActive:true },
  { id:5, name:"Full Body Checkup",      tests:"CBC, Blood Sugar, Lipid Profile, Liver Function, Kidney Function, Thyroid, Vitamin D, Vitamin B12, ECG, Urine, X-Ray", price:1799, originalPrice:3000, isPopular:false, isActive:true },
  { id:6, name:"Heart Care Package",     tests:"Lipid Profile, ECG, Troponin, CRP, Homocysteine, Blood Sugar, CBC",                                                     price:1499, originalPrice:2500, isPopular:false, isActive:true },
];

/* ─── Detail Modal ──────────────────────────────────────── */
function PackageModal({ pkg, onClose }: { pkg: HealthPackage; onClose: () => void }) {
  const tests = pkg.tests.split(",").map((t) => t.trim());
  const disc = pkg.originalPrice
    ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 24 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-[#1D3F5F] to-[#152e46] p-6 relative">
            {pkg.isPopular && (
              <span className="inline-flex items-center gap-1 bg-[#EB925A] text-white text-[10px] font-bold px-3 py-1 rounded-full mb-3">
                <Star size={9} fill="white" /> MOST POPULAR
              </span>
            )}
            <h2 className="text-xl font-bold text-white mb-2">{pkg.name}</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#EB925A]">₹{pkg.price}</span>
              {pkg.originalPrice && (
                <span className="text-sm text-blue-300 line-through">₹{pkg.originalPrice}</span>
              )}
              {disc && (
                <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {disc}% OFF
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical size={16} className="text-[#EB925A]" />
              <p className="font-semibold text-[#1E293B] text-sm">{tests.length} Tests Included</p>
            </div>
            <ul className="space-y-2 mb-6 max-h-52 overflow-y-auto pr-1">
              {tests.map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-[#475569]">
                  <CheckCircle size={13} className="text-[#EB925A] flex-shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <button className="w-full bg-[#EB925A] hover:bg-[#d4783f] text-white font-bold py-3.5 rounded-2xl transition-colors text-sm">
              Book Now →
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Package Card ──────────────────────────────────────── */
function PackageCard({ pkg, onView }: { pkg: HealthPackage; onView: () => void }) {
  const testCount = pkg.tests.split(",").length;
  const disc = pkg.originalPrice
    ? Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)
    : null;

  return (
    <motion.div
      whileHover={{ y: -8, boxShadow: "0 24px 48px rgba(0,0,0,0.14)" }}
      transition={{ duration: 0.22 }}
      className={`relative rounded-2xl p-7 flex flex-col border-2 transition-colors duration-300 ${
        pkg.isPopular
          ? "bg-[#1D3F5F] border-[#EB925A] shadow-2xl shadow-[#1D3F5F]/30"
          : "bg-white border-gray-100 shadow-lg hover:border-[#EB925A]"
      }`}
      style={{ minHeight: "400px" }}
    >
      {/* Popular badge — sits above card, needs overflow visible on parent */}
      {pkg.isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 bg-[#EB925A] text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-xl">
            <Star size={10} fill="white" /> MOST POPULAR
          </span>
        </div>
      )}

      {/* Discount badge */}
      {disc && (
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full mb-4 w-fit ${
          pkg.isPopular ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
        }`}>
          {disc}% OFF
        </span>
      )}

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${
        pkg.isPopular ? "bg-white/15" : "bg-[#1D3F5F]/08"
      }`}
        style={{ background: pkg.isPopular ? "rgba(255,255,255,0.15)" : "rgba(47,86,120,0.08)" }}
      >
        <FlaskConical size={26} className={pkg.isPopular ? "text-white" : "text-[#1D3F5F]"} />
      </div>

      {/* Name */}
      <h3 className={`font-bold text-base leading-snug mb-2 ${pkg.isPopular ? "text-white" : "text-[#1E293B]"}`}>
        {pkg.name}
      </h3>

      {/* Test count */}
      <p className={`text-sm mb-6 ${pkg.isPopular ? "text-blue-200" : "text-[#64748B]"}`}>
        {testCount} tests included
      </p>

      {/* Price — push to bottom */}
      <div className="flex items-baseline gap-2 mt-auto mb-6">
        <span className="text-3xl font-extrabold text-[#EB925A]">₹{pkg.price}</span>
        {pkg.originalPrice && (
          <span className={`text-sm line-through ${pkg.isPopular ? "text-blue-300" : "text-gray-400"}`}>
            ₹{pkg.originalPrice}
          </span>
        )}
      </div>

      {/* Button */}
      <button
        onClick={onView}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
          pkg.isPopular
            ? "bg-[#EB925A] hover:bg-[#d4783f] text-white"
            : "border-2 border-[#1D3F5F] text-[#1D3F5F] hover:bg-[#1D3F5F] hover:text-white"
        }`}
      >
        View Details
      </button>
    </motion.div>
  );
}

/* ─── Section ───────────────────────────────────────────── */
export default function PackagesSection() {
  const [packages, setPackages] = useState<HealthPackage[]>(FALLBACK);
  const [selected, setSelected] = useState<HealthPackage | null>(null);
  const router = useRouter();
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getPackages().then((d) => { if (d.length) setPackages(d); }).catch(() => {});
  }, []);

  return (
    <section id="packages" className="bg-[#F8FAFC] py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4"
        >
          <div>
            <p className="text-[#EB925A] text-xs font-bold uppercase tracking-widest mb-2">Health Packages</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1E293B]">
              Curated Packages for Your Health
            </h2>
          </div>
          <button
            onClick={() => router.push("/packages")}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#1D3F5F] border-2 border-[#1D3F5F] px-4 py-2.5 rounded-lg hover:bg-[#1D3F5F] hover:text-white transition-colors whitespace-nowrap"
          >
            View All <ArrowRight size={14} />
          </button>
        </motion.div>

        {/* Swiper wrapper with side nav buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
         

          <Swiper
            modules={[Navigation, Autoplay]}
            loop={true}
            autoplay={{ delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true }}
            onBeforeInit={(swiper: SwiperType) => {
              if (typeof swiper.params.navigation !== "boolean") {
                const nav = swiper.params.navigation as {
                  prevEl?: Element | null;
                  nextEl?: Element | null;
                };
                nav.prevEl = prevRef.current;
                nav.nextEl = nextRef.current;
              }
            }}
            breakpoints={{
              0:    { slidesPerView: 1.1,  spaceBetween: 16 },
              480:  { slidesPerView: 1.6,  spaceBetween: 20 },
              768:  { slidesPerView: 2,    spaceBetween: 24 },
              1024: { slidesPerView: 2.6,  spaceBetween: 30 },
              1280: { slidesPerView: 2.8,  spaceBetween: 30 },
            }}
            style={{ overflow: "visible", paddingTop: "20px", paddingBottom: "20px" }}
          >
            {packages.map((pkg) => (
              <SwiperSlide
                key={pkg.id}
                style={{ height: "auto", overflow: "visible" }}
              >
                <PackageCard pkg={pkg} onView={() => setSelected(pkg)} />
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>

      </div>

      {/* Detail Modal */}
      {selected && (
        <PackageModal pkg={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
