"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Phone, LogIn } from "lucide-react";

const navLinks = [
  { label: "Home",            href: "#home" },
  { label: "About Us",        href: "#about" },
  { label: "Tests/Services",  href: "#services" },
  { label: "Book Home Visit", href: "#home-visit" },
  { label: "Find Lab",        href: "#find-lab" },
  { label: "Blogs",           href: "#blogs" },
];

export default function Navbar() {
  const [active, setActive] = useState("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (label: string, href: string) => {
    setActive(label);
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className={`bg-white transition-shadow ${scrolled ? "shadow-md" : "shadow-sm"}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <div className="flex-shrink-0">
            <Image
              src="logo.png"
              alt="Shraddha Pathology Laboratory"
              width={180}
              height={60}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navLinks.map(({ label, href }) => (
              <button
                key={label}
                onClick={() => handleNav(label, href)}
                className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap relative ${
                  active === label
                    ? "text-[#EB925A]"
                    : "text-[#1E293B] hover:text-[#1D3F5F]"
                }`}
              >
                {label}
                {active === label && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[#EB925A] rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Right: Login + Phone */}
            <a
              href="tel:+919876543210"
              className="flex items-center gap-2 bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              <Phone size={14} />
              +91 98765 43210
            </a>
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              <LogIn size={14} />
              Login
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2 flex-shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen
              ? <X size={22} className="text-[#1E293B]" />
              : <Menu size={22} className="text-[#1E293B]" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
          {navLinks.map(({ label, href }) => (
            <button
              key={label}
              onClick={() => handleNav(label, href)}
              className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                active === label ? "text-[#EB925A] bg-orange-50" : "text-[#1E293B] hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Link
              href="/login"
              className="flex items-center gap-2 bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-semibold px-4 py-2 rounded-full w-fit transition-colors"
            >
              <LogIn size={14} /> Login
            </Link>
            <a
              href="tel:+919876543210"
              className="flex items-center gap-2 bg-[#1D3F5F] hover:bg-[#152e46] text-white text-sm font-semibold px-4 py-2 rounded-full w-fit transition-colors"
            >
              <Phone size={14} /> +91 98765 43210
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
