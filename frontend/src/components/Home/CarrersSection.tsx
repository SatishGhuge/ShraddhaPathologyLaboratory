"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight } from "lucide-react";
import Image from "next/image";
import { getJobs } from "@/services/homepageApi";
import { JobOpening } from "@/types/homepage";
import { SectionButton } from "./shared";

const FALLBACK: JobOpening[] = [
  { id:1, title:"Lab Technician",       description:"2+ years experience in clinical laboratory. DMLT/BMLT required.", isOpen:true, createdAt:"" },
  { id:2, title:"Phlebotomist",         description:"Home collection experience preferred. Training provided.",        isOpen:true, createdAt:"" },
  { id:3, title:"Front Desk Executive", description:"Good communication skills. Computer proficiency required.",       isOpen:true, createdAt:"" },
];

export default function CareersSection() {
  const [jobs, setJobs] = useState<JobOpening[]>(FALLBACK);

  useEffect(() => {
    getJobs().then((d) => { if (d.length) setJobs(d); }).catch(() => {});
  }, []);

  return (
    <section id="careers" className="relative py-14 lg:py-16 overflow-hidden border-b border-gray-200">

      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/labhomeimage.jpg"
          alt="Lab background"
          fill
          className="object-cover object-center"
        />
        {/* Left fade overlay — makes left side white/readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-12 h-12 bg-[oklch(60%_0.15_45)] rounded-xl flex items-center justify-center mb-4">
              <Briefcase size={22} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-[#1E293B] mb-3">
              Build Your Career with Shraddha
            </h2>
            <p className="text-[#64748B] text-sm leading-relaxed mb-5">
              Join a team that values expertise, compassion and growth. We are always looking for passionate healthcare professionals.
            </p>
            <SectionButton variant="primary" className="gap-2">
              Explore Careers <ArrowRight size={16} />
            </SectionButton>
          </motion.div>

          {/* Right — job cards */}
          <div className="space-y-3">
            {jobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 hover:shadow-md transition-all"
              >
                <div>
                  <p className="font-semibold text-[#1E293B] text-sm">{job.title}</p>
                  <p className="text-[#64748B] text-xs mt-0.5 line-clamp-1">{job.description}</p>
                </div>
                <SectionButton
                  variant="outline"
                  className="flex-shrink-0 border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)] text-xs px-3 py-1.5"
                >
                  Apply
                </SectionButton>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
