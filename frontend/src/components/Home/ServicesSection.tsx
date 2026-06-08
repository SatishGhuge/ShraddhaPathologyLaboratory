"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { getServices } from "@/services/homepageApi";
import { LabService } from "@/types/homepage";

const FALLBACK_SERVICES: LabService[] = [
  { id:1, name:"Hematology",     category:"Blood",     description:"Complete blood count, blood group and anemia tests.", isActive:true },
  { id:2, name:"Biochemistry",   category:"Blood",     description:"Blood sugar, lipid profile, liver & kidney function.", isActive:true },
  { id:3, name:"Microbiology",   category:"Infection", description:"Infection detection & culture sensitivity tests.", isActive:true },
  { id:4, name:"Immunology",     category:"Immunity",  description:"Allergy, autoimmune & specialized tests.", isActive:true },
  { id:5, name:"Hormones",       category:"Endocrine", description:"Thyroid, diabetes & reproductive hormone panels.", isActive:true },
  { id:6, name:"Molecular Tests",category:"Genetics",  description:"PCR, genetic & advanced molecular diagnostics.", isActive:true },
];

// Map service name → image in /public/tests/
const serviceImages: Record<string, string> = {
  "Hematology":     "/haematology.jpg",
  "Biochemistry":   "/biochemistry.jpg",
  "Microbiology":   "/microbiology.jpg",
  "Immunology":     "/immunology.jpg",
  "Hormones":       "/hormones.jpg",
  "Molecular Tests":"/molecular_tests.jpg",
};

// Fallback for any service not in the map
const DEFAULT_IMAGE = "/tests/haematology.jpg";

export default function ServicesSection() {
  const [services, setServices] = useState<LabService[]>(FALLBACK_SERVICES);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getServices().then((d) => { if (d.length) setServices(d); }).catch(() => {});
  }, []);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section id="services" className="bg-white py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <p className="text-[#EB925A] text-xs font-bold uppercase tracking-widest mb-2">Tests & Services</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1E293B]">
              Comprehensive Diagnostic Solutions
            </h2>
          </div>
          <button className="flex items-center gap-1.5 text-sm font-semibold text-[#1D3F5F] border border-[#1D3F5F] px-4 py-2 rounded-lg hover:bg-[#1D3F5F] hover:text-white transition-colors whitespace-nowrap">
            View All Tests <ArrowRight size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm mb-8">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D3F5F]/20"
          />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {filtered.map((s, i) => {
            const imgSrc = serviceImages[s.name] ?? DEFAULT_IMAGE;
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className="bg-[#F8FAFC] rounded-xl p-4 cursor-pointer group hover:shadow-md transition-all border border-gray-100"
              >
                {/* Image replacing icon */}
                <div className="w-full h-24 rounded-lg overflow-hidden mb-3 relative">
                  <Image
                    src={imgSrc}
                    alt={s.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  />
                  {/* Subtle overlay on hover */}
                  <div className="absolute inset-0 bg-[#EB925A]/0 group-hover:bg-[#EB925A]/15 transition-colors duration-300" />
                </div>

                <h3 className="font-semibold text-[#1E293B] text-sm mb-1">{s.name}</h3>
                <p className="text-[#64748B] text-xs leading-relaxed mb-3 line-clamp-2">{s.description}</p>
                <button className="text-[#EB925A] text-xs font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  Explore <ArrowRight size={11} />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
