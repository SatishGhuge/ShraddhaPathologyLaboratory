"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Award, Users, ShieldCheck, FileText, Package } from "lucide-react";
import { getCapabilities } from "@/services/homepageApi";
import { Capability } from "@/types/homepage";

const FALLBACK: Capability[] = [
  { id:1, title:"Advanced Automation",     description:"High precision automated analysers",         icon:"Cpu",        isActive:true, sortOrder:1 },
  { id:2, title:"NABL Accredited",         description:"Quality assurance & future excellence",       icon:"Award",      isActive:true, sortOrder:2 },
  { id:3, title:"Experienced Staff",       description:"Qualified pathologists & lab professionals",  icon:"Users",      isActive:true, sortOrder:3 },
  { id:4, title:"Internal Quality Control",description:"Strict protocols for accurate reporting",     icon:"ShieldCheck",isActive:true, sortOrder:4 },
  { id:5, title:"Digital Reports",         description:"Secure, fast & easy access anytime",          icon:"FileText",   isActive:true, sortOrder:5 },
  { id:6, title:"Sample Integrity",        description:"Safe handling & secure storage",              icon:"Package",    isActive:true, sortOrder:6 },
];

const iconMap: Record<string, React.ElementType> = {
  Cpu, Award, Users, ShieldCheck, FileText, Package,
};

export default function CapabilitiesSection() {
  const [caps, setCaps] = useState<Capability[]>(FALLBACK);

  useEffect(() => {
    getCapabilities().then((d) => { if (d.length) setCaps(d); }).catch(() => {});
  }, []);

  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12">
          <p className="text-[#EB925A] text-xs font-bold uppercase tracking-widest mb-2">Technical Capabilities</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1D3F5F]">
            Advanced Technology, Accurate Results.
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          {caps.map((cap, i) => {
            const Icon = iconMap[cap.icon || "Cpu"] || Cpu;
            return (
              <motion.div
                key={cap.id}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="text-center group"
              >
                <div className="w-14 h-14 bg-[#F8FAFC] rounded-2xl flex items-center justify-center text-[#1D3F5F] mx-auto mb-3 group-hover:bg-[#1D3F5F] group-hover:text-white transition-colors shadow-sm">
                  <Icon size={24} />
                </div>
                <h3 className="font-semibold text-[#1D3F5F] text-xs mb-1">{cap.title}</h3>
                <p className="text-[#64748B] text-[11px] leading-relaxed">{cap.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
