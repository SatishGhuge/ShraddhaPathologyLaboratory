"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Navigation } from "lucide-react";
import { SectionHeader, SectionCard, SectionButton } from "./shared";

export default function FindLabSection() {
  return (
    <section id="find-lab" className="bg-[#F8FAFC] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <SectionHeader
          badge="Find Lab"
          title="40+ Centers Near You"
          badgeColor="oklch(60% 0.15 45)"
          centered
        />

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Google Maps iframe */}
          <motion.div
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 h-72 lg:h-full min-h-64"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3780.0842766363808!2d73.77515167496651!3d18.660213782460637!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2b9e0ffffffff%3A0x31ff4b24c0d0ff01!2sShraddha%20Pathology%20Laboratory!5e0!3m2!1sen!2sin!4v1780145829326!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "280px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Shraddha Pathology Laboratory Location"
            />
          </motion.div>

          {/* Lab info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <SectionCard isPadded={true}>
              <h3 className="font-bold text-[#1E293B] text-lg mb-1">Shraddha Pathology Laboratory</h3>
              <p className="text-[#64748B] text-xs mb-5">Main Branch</p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-[oklch(60%_0.15_45)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B]">Address</p>
                    <p className="text-xs text-[#64748B]">123, Health Street, Medical Road,<br />Mumbai – 400001, Maharashtra</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={16} className="text-[oklch(60%_0.15_45)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B]">Phone</p>
                    <a href="tel:+919876543210" className="text-xs text-[oklch(45%_0.085_224.283)] hover:text-[oklch(60%_0.15_45)]">+91 98765 43210</a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail size={16} className="text-[oklch(60%_0.15_45)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B]">Email</p>
                    <a href="mailto:info@shraddhalab.com" className="text-xs text-[oklch(45%_0.085_224.283)] hover:text-[oklch(60%_0.15_45)]">info@shraddhalab.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-[oklch(60%_0.15_45)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1E293B]">Working Hours</p>
                    <p className="text-xs text-[#64748B]">Mon – Sat: 7:00 AM – 9:00 PM</p>
                    <p className="text-xs text-[#64748B]">Sunday: 7:00 AM – 2:00 PM</p>
                  </div>
                </div>
              </div>

              <SectionButton variant="primary" className="mt-5 w-full justify-center gap-2 text-sm">
                <Navigation size={16} /> Get Directions
              </SectionButton>
            </SectionCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
