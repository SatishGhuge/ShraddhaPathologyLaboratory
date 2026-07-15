"use client";

import Image from "next/image";
import { Phone, Mail, Clock, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const quickLinks = ["Home", "About Us", "Services", "Home Visit", "Blogs", "Find Lab"];
const services   = ["Blood Tests", "Health Packages", "Home Sample Collection", "Corporate Tests", "Preventive Health Checkups", "Report Download"];

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#1E293B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* About */}
          <div>
            <Image src="/logo.png" alt="Shraddha Lab" width={130} height={44} className="object-contain mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-xs leading-relaxed mb-5">
              Delivering accurate diagnostics with compassion and care. Your health is our priority.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#EB925A] transition-colors">
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((l) => (
                <li key={l}>
                  <a href="#" className="text-gray-400 text-xs hover:text-[#EB925A] transition-colors flex items-center gap-1">
                    <span className="text-[#EB925A]">›</span> {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Our Services</h4>
            <ul className="space-y-2">
              {services.map((s) => (
                <li key={s}>
                  <a href="#" className="text-gray-400 text-xs hover:text-[#EB925A] transition-colors flex items-center gap-1">
                    <span className="text-[#EB925A]">›</span> {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Customer Support</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-400 text-xs">
                <Phone size={13} className="text-[#EB925A] flex-shrink-0" />
                <a href="tel:+919876543210" className="hover:text-[#EB925A]">+91 98765 43210</a>
              </li>
              <li className="flex items-center gap-2 text-gray-400 text-xs">
                <Mail size={13} className="text-[#EB925A] flex-shrink-0" />
                <a href="mailto:info@shraddhalab.com" className="hover:text-[#EB925A]">info@shraddhalab.com</a>
              </li>
              <li className="flex items-start gap-2 text-gray-400 text-xs">
                <Clock size={13} className="text-[#EB925A] flex-shrink-0 mt-0.5" />
                <span>Mon – Sat: 7:00 AM – 9:00 PM<br />Sunday: 7:00 AM – 2:00 PM</span>
              </li>
              <li className="flex items-start gap-2 text-gray-400 text-xs">
                <MapPin size={13} className="text-[#EB925A] flex-shrink-0 mt-0.5" />
                <span>123, Health Street, Medical Road,<br />Mumbai – 400001, Maharashtra</span>
              </li>
            </ul>

            {/* Newsletter */}
            <div className="mt-5">
              <p className="text-xs font-semibold mb-2">Newsletter</p>
              <div className="flex gap-2">
                <input placeholder="Enter your email" className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#EB925A]" />
                <button className="bg-[#EB925A] hover:bg-[#d4783f] text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-500 text-xs">© 2026 Shraddha Pathology Laboratory. All Rights Reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-500 text-xs hover:text-[#EB925A]">Privacy Policy</a>
            <a href="#" className="text-gray-500 text-xs hover:text-[#EB925A]">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
