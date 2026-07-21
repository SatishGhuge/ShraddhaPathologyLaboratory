"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Home, Phone, MessageCircle,
  X, User, Mail, MapPin, Calendar, Hash, Building2,
} from "lucide-react";
import { createBooking } from "@/services/homepageApi";

const features = [
  "Trained phlebotomists at your doorstep",
  "Safe & hygienic sample collection",
  "Reports delivered digitally",
];

const cities = [
  "Mumbai", "Pune", "Nashik", "Aurangabad",
  "Nagpur", "Kolhapur", "Solapur", "Thane",
];

/* ─── Patient Registration Modal ──────────────────────── */
function RegisterModal({ onClose }: { onClose: () => void }) {
  const [reg, setReg] = useState({
    name: "", age: "", mobile: "", email: "",
    address: "", location: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setReg((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800)); // simulate API
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[oklch(45%_0.085_224.283)] to-[oklch(40%_0.075_224.283)] px-7 py-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[oklch(60%_0.15_45)] rounded-xl flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Patient Registration</h2>
              <p className="text-blue-200 text-xs">Fill in your details to register</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-7">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[oklch(60%_0.15_45)] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h3 className="font-bold text-[#1E293B] text-xl mb-2">Registered Successfully!</h3>
              <p className="text-[#64748B] text-sm mb-6">
                Welcome, {reg.name}! Your registration has been received. We will contact you shortly.
              </p>
              <button
                onClick={onClose}
                className="bg-[oklch(45%_0.085_224.283)] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[oklch(40%_0.075_224.283)] transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name + Age row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    name="name"
                    value={reg.name}
                    onChange={handleChange}
                    required
                    placeholder="Full Name *"
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/20 focus:border-[oklch(45%_0.085_224.283)] transition"
                  />
                </div>
                <div className="relative">
                  <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    name="age"
                    value={reg.age}
                    onChange={handleChange}
                    required
                    placeholder="Age *"
                    type="number"
                    min={1}
                    max={120}
                    className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/20 focus:border-[oklch(45%_0.085_224.283)] transition"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  name="mobile"
                  value={reg.mobile}
                  onChange={handleChange}
                  required
                  placeholder="Mobile Number *"
                  type="tel"
                  maxLength={10}
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/20 focus:border-[oklch(45%_0.085_224.283)] transition"
                />
              </div>

              {/* Email */}
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  name="email"
                  value={reg.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  type="email"
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/20 focus:border-[oklch(45%_0.085_224.283)] transition"
                />
              </div>

              {/* Address */}
              <div className="relative">
                <MapPin size={15} className="absolute left-3.5 top-3.5 text-[#94A3B8]" />
                <input
                  name="address"
                  value={reg.address}
                  onChange={handleChange}
                  required
                  placeholder="Full Address *"
                  className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm text-[#1E293B] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/20 focus:border-[oklch(45%_0.085_224.283)] transition"
                />
              </div>

              {/* Location / City */}
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <select
                  name="location"
                  value={reg.location}
                  onChange={handleChange}
                  required
                  className="w-full pl-9 pr-8 py-3 border border-gray-200 rounded-xl text-sm text-[#1E293B] appearance-none focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/20 focus:border-[oklch(45%_0.085_224.283)] transition bg-white cursor-pointer"
                >
                  <option value="">Select Location / City *</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 uppercase tracking-widest">your info is secure</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[oklch(45%_0.085_224.283)] hover:bg-[oklch(40%_0.075_224.283)] text-white font-bold py-3.5 rounded-2xl transition-colors text-sm shadow-lg shadow-[oklch(45%_0.085_224.283)]/25 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Registering...
                  </>
                ) : (
                  <>
                    <User size={15} />
                    Register Now
                  </>
                )}
              </motion.button>

            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Section ─────────────────────────────────────── */
export default function HomeVisitSection() {
  const [form, setForm] = useState({
    fullName: "", mobile: "", city: "",
    agreeTerms: true, whatsapp: true,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((p) => ({
      ...p,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreeTerms) {
      alert("Please agree to Terms & Conditions to proceed.");
      return;
    }
    setLoading(true);
    try {
      await createBooking({
        fullName: form.fullName,
        mobile: form.mobile,
        address: form.city,
        preferredDate: "",
        preferredTime: "",
        testRequired: "",
      });
      setSuccess(true);
    } catch {
      alert("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="home-visit" className="bg-[oklch(45%_0.085_224.283)] py-16 lg:py-20 relative overflow-hidden">

      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-12 h-12 bg-[oklch(60%_0.15_45)] rounded-xl flex items-center justify-center mb-5">
              <Home size={22} className="text-white" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
              Book a Home Visit
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed mb-8">
              Get your tests done from the comfort of your home. Our trained professionals
              will collect samples safely and deliver reports digitally.
            </p>
            <ul className="space-y-4">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-blue-100 text-sm">
                  <div className="w-6 h-6 rounded-full bg-[oklch(60%_0.15_45)]/20 border border-[oklch(60%_0.15_45)]/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={14} className="text-[oklch(60%_0.15_45)]" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-[#EBF4FF] rounded-3xl p-6 shadow-2xl border border-white/40">
              {success ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-[oklch(60%_0.15_45)] rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-white" />
                  </div>
                  <h3 className="font-bold text-[#1E293B] text-xl mb-2">Request Submitted!</h3>
                  <p className="text-[#64748B] text-sm mb-6">
                    Our team will call you back shortly to confirm your home visit.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="bg-[oklch(45%_0.085_224.283)] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[oklch(40%_0.075_224.283)] transition-colors"
                  >
                    Book Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <input
                    name="fullName" value={form.fullName} onChange={handleChange} required
                    placeholder="Full Name*"
                    className="w-full bg-white border-0 rounded-2xl px-5 py-4 text-[#1E293B] text-sm placeholder-[#94A3B8] shadow-sm focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/30 transition"
                  />

                  {/* Mobile */}
                  <input
                    name="mobile" value={form.mobile} onChange={handleChange} required
                    placeholder="Mobile Number*" type="tel" maxLength={10}
                    className="w-full bg-white border-0 rounded-2xl px-5 py-4 text-[#1E293B] text-sm placeholder-[#94A3B8] shadow-sm focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/30 transition"
                  />

                  {/* City */}
                  <div className="relative">
                    <select
                      name="city" value={form.city} onChange={handleChange}
                      className="w-full bg-white border-0 rounded-2xl px-5 py-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]/30 transition appearance-none cursor-pointer text-[#1E293B]"
                    >
                      <option value="">Select City</option>
                      {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="relative mt-0.5">
                        <input type="checkbox" name="agreeTerms" checked={form.agreeTerms} onChange={handleChange} className="sr-only" />
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${form.agreeTerms ? "bg-[oklch(45%_0.085_224.283)] border-[oklch(45%_0.085_224.283)]" : "bg-white border-gray-300"}`}>
                          {form.agreeTerms && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                      <span className="text-xs text-[#475569] leading-relaxed">
                        I agree to Shraddha Lab <a href="#" className="text-[oklch(45%_0.085_224.283)] underline font-medium hover:text-[oklch(60%_0.15_45)]">T&amp;C</a> and <a href="#" className="text-[oklch(45%_0.085_224.283)] underline font-medium hover:text-[oklch(60%_0.15_45)]">Privacy Policy</a>
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" name="whatsapp" checked={form.whatsapp} onChange={handleChange} className="sr-only" />
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${form.whatsapp ? "bg-[oklch(45%_0.085_224.283)] border-[oklch(45%_0.085_224.283)]" : "bg-white border-gray-300"}`}>
                          {form.whatsapp && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                      <span className="text-xs text-[#475569] flex items-center gap-1.5">
                        <MessageCircle size={13} className="text-green-500" />
                        Enable WhatsApp communication
                      </span>
                    </label>
                  </div>

                  {/* Request a Call Back */}
                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full bg-[oklch(60%_0.15_45)] hover:bg-[oklch(55%_0.13_43)] text-white font-bold py-4 rounded-2xl transition-colors text-sm tracking-widest uppercase shadow-lg shadow-[oklch(60%_0.15_45)]/30 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Submitting...</>
                    ) : (
                      <><Phone size={15} /> Request a Call Back</>
                    )}
                  </motion.button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#CBD5E1]" />
                    <span className="text-[11px] text-[#64748B] font-medium">OR</span>
                    <div className="flex-1 h-px bg-[#CBD5E1]" />
                  </div>

                  {/* Register Button */}
                  <motion.button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[oklch(45%_0.085_224.283)] hover:bg-[oklch(40%_0.075_224.283)] text-white font-bold py-4 rounded-2xl transition-colors text-sm tracking-widest uppercase shadow-lg shadow-[oklch(45%_0.085_224.283)]/30 flex items-center justify-center gap-2"
                  >
                    <User size={15} />
                    Register as Patient
                  </motion.button>

                </form>
              )}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      </AnimatePresence>
    </section>
  );
}
