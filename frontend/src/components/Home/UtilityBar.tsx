"use client";

import { useRef } from "react";

const quickLinks = [
  { label: "Home Collection", href: "#home-visit" },
  { label: "Health Packages", href: "#packages" },
  { label: "Download Report", href: "#reports" },
  { label: "Careers",         href: "#careers" },
  { label: "Contact Us",      href: "#contact" },
];

const tickerText =
  ".             🔔 Home Sample Collection Available  |  NABL Standard Reporting  |  Same Day Report Delivery Available  |  Book Your Test Online  |  Trusted by 2,50,000+ Patients  |  Advanced Automated Analysers  |";

export default function UtilityBar() {
  const tickerRef = useRef<HTMLDivElement>(null);

  const handleNav = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-[#1D3F5F] h-10 flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">

        {/* ── Quick Links (left) ── */}
        <div className="hidden md:flex items-center gap-0 flex-shrink-0">
          {quickLinks.map(({ label, href }, i) => (
            <span key={label} className="flex items-center">
              <button
                onClick={() => handleNav(href)}
                className="text-white/80 hover:text-white text-xs font-medium px-3 py-1 transition-colors whitespace-nowrap hover:text-[#EB925A]"
              >
                {label}
              </button>
              {i < quickLinks.length - 1 && (
                <span className="text-white/30 text-xs">|</span>
              )}
            </span>
          ))}
        </div>

        {/* ── Ticker (right) ── */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade masks */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1D3F5F] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1D3F5F] to-transparent z-10 pointer-events-none" />

          <div
            ref={tickerRef}
            className="ticker-track flex whitespace-nowrap"
            style={{ animation: "ticker-scroll 30s linear infinite" }}
            onMouseEnter={() => {
              if (tickerRef.current) tickerRef.current.style.animationPlayState = "paused";
            }}
            onMouseLeave={() => {
              if (tickerRef.current) tickerRef.current.style.animationPlayState = "running";
            }}
          >
            {/* Duplicate text for seamless loop */}
            {[0, 1].map((n) => (
              <span key={n} className="text-white/90 text-xs font-medium pr-16 flex-shrink-0">
                {tickerText}
              </span>
            ))}
          </div>
        </div>

        {/* ── Mobile: show only ticker label ── */}
        <div className="md:hidden flex-shrink-0">
          <span className="text-white/70 text-[10px] font-medium">🔔 Alerts</span>
        </div>
      </div>
    </div>
  );
}
