"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Eye, Target, Stethoscope, ArrowRight,
  CheckCircle, Award, Users, FlaskConical, ShieldCheck, Clock,
} from "lucide-react";
import { getAboutContent } from "@/services/homepageApi";
import { AboutContent } from "@/types/homepage";

const FALLBACK = {
  vision:
    "To be the most trusted diagnostic network known for accuracy, innovation and compassionate care — setting the gold standard in pathology services across the region.",
  mission:
    "Deliver reliable, affordable and timely diagnostic services using advanced technology, ethical practices and a patient-first approach that empowers healthier lives every day.",
  doctor_view:
    `"Accurate diagnosis is the first step towards effective treatment and better health. At Shraddha, we combine cutting-edge technology with clinical expertise to deliver results you can trust." — Dr. Ritesh Sharma, Chief Pathologist`,
};

const sections = [
  {
    type:    "vision",
    label:   "Our Vision",
    badge:   "Vision",
    icon:    Eye,
    image:   "vision.jpg",
    accent:  "#1D3F5F",
    bg:      "from-[#1D3F5F] to-[#152e46]",
    reverse: false,
    stat:    { value: "25+",    label: "Years of Excellence", color: "#1D3F5F" },
    highlights: [
      { icon: Award,       text: "NABL Accredited Standards" },
      { icon: ShieldCheck, text: "ISO Certified Processes" },
      { icon: Users,       text: "2,50,000+ Patients Served" },
    ],
  },
  {
    type:    "mission",
    label:   "Our Mission",
    badge:   "Mission",
    icon:    Target,
    image:   "mission1.jpg",
    accent:  "#EB925A",
    bg:      "from-[#EB925A] to-[#d4783f]",
    reverse: true,
    stat:    { value: "1,500+", label: "Tests Available",     color: "#EB925A" },
    highlights: [
      { icon: FlaskConical, text: "Advanced Automated Analysers" },
      { icon: Clock,        text: "Same Day Report Delivery" },
      { icon: CheckCircle,  text: "Affordable Pricing Plans" },
    ],
  },
  {
    type:    "doctor_view",
    label:   "Doctor's View",
    badge:   "Expert Opinion",
    icon:    Stethoscope,
    image:   "doctor1.jpg",
    accent:  "#1D3F5F",
    bg:      "from-[#1D3F5F] to-[#152e46]",
    reverse: false,
    stat:    { value: "NABL",   label: "Accredited Lab",      color: "#1D3F5F" },
    highlights: [
      { icon: Stethoscope, text: "Expert Pathologists On-Site" },
      { icon: ShieldCheck, text: "100% Accurate Reporting" },
      { icon: Users,       text: "Trusted by 500+ Doctors" },
    ],
  },
];

export default function AboutSection() {
  const [content, setContent] = useState<AboutContent[]>([]);

  useEffect(() => {
    getAboutContent().then(setContent).catch(() => {});
  }, []);

  const get = (type: string) =>
    content.find((c) => c.sectionType === type)?.content ||
    FALLBACK[type as keyof typeof FALLBACK];

  return (
    <section id="about" className="bg-[#F8FAFC] py-16 lg:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">

        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[#EB925A] text-xs font-bold uppercase tracking-widest mb-3">About Us</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1E293B] mb-4 leading-tight">
            Dedicated to Excellence in Diagnostics
          </h2>
          <p className="text-[#64748B] text-sm leading-relaxed max-w-2xl mx-auto">
            Shraddha Pathology Laboratory is committed to providing high-quality, accurate and timely
            diagnostic services using advanced technology and a patient-first approach.
          </p>
        </motion.div>

        {/* ── Alternating Rows ── */}
        <div className="space-y-16 lg:space-y-24">
          {sections.map(({ type, label, badge, icon: Icon, image, accent, bg, reverse, stat, highlights }, idx) => (
            <div
              key={type}
              className={`relative rounded-3xl overflow-hidden`}
              style={{ background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)` }}
            >
              {/* Row-level decorative dots */}
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />

              <div
                className={`relative grid grid-cols-1 lg:grid-cols-2 items-stretch ${
                  reverse ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""
                }`}
              >
              {/* ── IMAGE SIDE ── */}
              <motion.div
                initial={{ opacity: 0, x: reverse ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.1 }}
                className="relative p-8 lg:p-10 flex items-center justify-center"
              >
                {/* Accent circle behind image */}
                <div
                  className="absolute w-72 h-72 rounded-full opacity-20 blur-3xl"
                  style={{ background: accent }}
                />

                <motion.div
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.3 }}
                  className="relative rounded-2xl overflow-hidden shadow-2xl w-full aspect-[4/3]"
                >
                  <Image
                    src={image}
                    alt={label}
                    fill
                    className="object-cover object-center transition-transform duration-700 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span
                      className="inline-flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-md"
                      style={{ background: `${accent}dd` }}
                    >
                      <Icon size={12} /> {badge}
                    </span>
                  </div>
                </motion.div>

                {/* Floating stat */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-4 right-4 bg-white rounded-2xl shadow-xl px-5 py-3 border border-gray-100"
                >
                  <p className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">{stat.label}</p>
                </motion.div>
              </motion.div>

              {/* ── CONTENT CARD SIDE ── */}
              <motion.div
                initial={{ opacity: 0, x: reverse ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="relative overflow-hidden"
              >
                {/* Gradient background — same accent, darker */}
                <div className={`absolute inset-0 bg-gradient-to-br ${bg}`} />

                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
                <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
                <div className="absolute top-1/2 right-8 w-20 h-20 rounded-full bg-white/5" />

                {/* Decorative grid dots */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />

                {/* Floating icon watermark */}
                <div className="absolute bottom-6 right-6 opacity-10">
                  <Icon size={96} className="text-white" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-8 lg:p-10 h-full flex flex-col justify-between">

                  {/* Top: icon + label */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                        <Icon size={24} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                          {idx === 0 ? "Our" : idx === 1 ? "Our" : "Expert"}
                        </p>
                        <p className="text-white font-bold text-lg leading-tight">{label}</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-10 h-0.5 bg-white/40 rounded-full mb-5" />

                    {/* Main text */}
                    <p className="text-white/90 text-sm lg:text-base leading-relaxed mb-7">
                      {get(type)}
                    </p>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-3 mb-7">
                    {highlights.map(({ icon: HIcon, text }) => (
                      <motion.div
                        key={text}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/15 cursor-default"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                          <HIcon size={14} className="text-white" />
                        </div>
                        <span className="text-white/90 text-xs font-medium">{text}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button className="inline-flex items-center gap-2 text-white font-semibold text-sm group w-fit">
                    <span className="border-b border-white/40 group-hover:border-white transition-colors pb-0.5">
                      Learn More
                    </span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
