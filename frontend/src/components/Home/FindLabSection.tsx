"use client";

import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Navigation } from "lucide-react";

export default function FindLabSection() {
  return (
    <section id="find-lab" className="bg-[#F8FAFC] py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-10">
          <p className="text-[#EB925A] text-xs font-bold uppercase tracking-widest mb-2">Find Lab</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1E293B]">40+ Centers Near You</h2>
        </div>

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
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <h3 className="font-bold text-[#1E293B] text-lg mb-1">Shraddha Pathology Laboratory</h3>
            <p className="text-[#64748B] text-xs mb-5">Main Branch</p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-[#EB925A]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1E293B]">Address</p>
                  <p className="text-xs text-[#64748B]">123, Health Street, Medical Road,<br />Mumbai – 400001, Maharashtra</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone size={16} className="text-[#EB925A]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1E293B]">Phone</p>
                  <a href="tel:+919876543210" className="text-xs text-[#1D3F5F] hover:text-[#EB925A]">+91 98765 43210</a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="text-[#EB925A]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1E293B]">Email</p>
                  <a href="mailto:info@shraddhalab.com" className="text-xs text-[#1D3F5F] hover:text-[#EB925A]">info@shraddhalab.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-[#EB925A]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1E293B]">Working Hours</p>
                  <p className="text-xs text-[#64748B]">Mon – Sat: 7:00 AM – 9:00 PM</p>
                  <p className="text-xs text-[#64748B]">Sunday: 7:00 AM – 2:00 PM</p>
                </div>
              </div>
            </div>

            <button className="mt-5 w-full flex items-center justify-center gap-2 bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-semibold py-3 rounded-xl transition-colors">
              <Navigation size={16} /> Get Directions
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
