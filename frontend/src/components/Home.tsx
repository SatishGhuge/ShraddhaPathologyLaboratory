"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Clock, Stethoscope, HeartPulse, IndianRupee,
  Headphones, ShieldCheck, CheckCircle, Users, FlaskConical, BadgeCheck,
  MapPin, Navigation, Phone, Clock3, ArrowRight,
} from "lucide-react";

// Images from public folder
const logo = "/logo.png";
const homeVisitImg = "/HomeVisit.png";
const hero2 = "/Hero2.jpeg";
const hero3 = "/Hero3.png";
const hero5 = "/Hero5.png";
const hero6 = "/Hero6.png";
const hero7 = "/Hero7.png";

const heroImages = [hero2, hero3, hero5, hero6, hero7];

/* ── Scroll-reveal hook ── */
function useReveal(): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Animated counter ── */
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(t); }
      else setCount(start);
    }, 24);
    return () => clearInterval(t);
  }, [visible, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

const HomePage = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [formErrors, setFormErrors] = useState({ name: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setHeroIndex(p => (p + 1) % heroImages.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const errors = { name: "", phone: "" };

    if (!form.name.trim()) {
      errors.name = "Full name is required";
    } else if (form.name.trim().length < 3) {
      errors.name = "Name must be at least 3 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(form.name.trim())) {
      errors.name = "Name must contain only letters";
    }

    if (!form.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(form.phone.trim())) {
      errors.phone = "Enter a valid 10-digit phone number";
    }

    setFormErrors(errors);
    if (errors.name || errors.phone) return;

    // Save callback request to localStorage so dashboard bell picks it up
    const existing = JSON.parse(localStorage.getItem("callbackRequests") || "[]");
    const newRequest = {
      id: Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      timestamp: new Date().toISOString(),
      read: false,
      called: false,
    };
    localStorage.setItem("callbackRequests", JSON.stringify([newRequest, ...existing]));
    window.dispatchEvent(new Event("callbackRequestAdded"));

    setSubmitted(true);
    setTimeout(() => {
      setShowModal(false);
      setSubmitted(false);
      setForm({ name: "", phone: "" });
      setFormErrors({ name: "", phone: "" });
    }, 2500);
  };

  /* section refs */
  const [whyRef, whyVis] = useReveal();
  const [visitRef, visitVis] = useReveal();
  const [pkgRef, pkgVis] = useReveal();
  const [statsRef, statsVis] = useReveal();
  const [testRef, testVis] = useReveal();
  const [locRef, locVis] = useReveal();
  const [ctaRef, ctaVis] = useReveal();

  return (
    <div className="w-full overflow-x-hidden font-sans">

      {/* ── HEADER ── */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-9 h-9 rounded-full" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">Shraddha Pathology Laboratory</h1>
              <p className="text-[9px] sm:text-[10px] text-cyan-600">Empowering Life, Transforming Health</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-cyan-600 transition">Home</a>
            <a href="#why" className="hover:text-cyan-600 transition">About</a>
            <a href="#services" className="hover:text-cyan-600 transition">Services</a>
            <a href="#packages" className="hover:text-cyan-600 transition">Packages</a>
            <a href="#locations" className="hover:text-cyan-600 transition">Locations</a>
          </nav>

          {/* Right side: Login + Hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/login")}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition"
            >
              Login
            </button>
            {/* Hamburger - mobile only */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
              onClick={() => setMobileNavOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span className={`block h-0.5 w-5 bg-slate-700 transition-all duration-300 ${mobileNavOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 w-5 bg-slate-700 transition-all duration-300 ${mobileNavOpen ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 bg-slate-700 transition-all duration-300 ${mobileNavOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg px-4 py-3 flex flex-col gap-1">
            {[
              { label: "Home", href: "#" },
              { label: "About", href: "#why" },
              { label: "Services", href: "#services" },
              { label: "Packages", href: "#packages" },
              { label: "Locations", href: "#locations" },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="py-2.5 px-3 text-sm font-medium text-slate-700 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ── HERO SLIDESHOW ── */}
      <section className="min-h-screen flex items-center pt-16 relative overflow-hidden">
        {heroImages.map((img, i) => (
          <div key={i} className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{ backgroundImage: `url(${img})`, opacity: i === heroIndex ? 1 : 0 }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        <div className="relative z-10 container mx-auto px-4 sm:px-6 text-white py-12 sm:py-20">
          <span className="bg-orange-500 px-3 py-1 rounded-full text-xs font-semibold animate-pulse">
            Leading Diagnostic Center
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4 sm:mt-6 leading-tight drop-shadow-lg">
            Precision Diagnostics <br />
            <span className="text-cyan-400">for Better Health</span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-xl text-gray-300 text-sm">
            Experience world-class healthcare testing with advanced technology and expert professionals.
          </p>
          <div className="mt-6 sm:mt-8 flex gap-3 sm:gap-4 flex-wrap">
            <button className="bg-cyan-500 hover:bg-cyan-600 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm font-semibold transition hover:scale-105 active:scale-95">
              Browse For Tests
            </button>
            <button className="border border-white/40 hover:bg-white/10 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm transition hover:scale-105">
              View Packages
            </button>
          </div>
          <div className="flex gap-2 mt-10">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroIndex(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${i === heroIndex ? "bg-cyan-400 w-6" : "bg-white/40 w-2.5 hover:bg-white/70"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE ── */}
      <section id="why" ref={whyRef} className="py-8 sm:py-14 bg-gray-50 text-center">
        <div className={`transition-all duration-700 ${whyVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Why Choose Shraddha?</h2>
          <p className="text-gray-500 mb-8 sm:mb-12 text-sm">Advanced medical technology with compassionate care</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 container mx-auto px-4 sm:px-6">
            {[
              { icon: Clock, title: "Quick Results", desc: "Get reports within 24 hours" },
              { icon: Stethoscope, title: "Expert Professionals", desc: "Experienced doctors & staff" },
              { icon: HeartPulse, title: "Home Visit", desc: "Sample collection at home" },
              { icon: IndianRupee, title: "Affordable Pricing", desc: "Transparent pricing" },
              { icon: Headphones, title: "24/7 Support", desc: "Always here to help" },
              { icon: ShieldCheck, title: "Certified Labs", desc: "NABL accredited labs" },
            ].map((item, i) => (
              <div key={i}
                className="bg-white p-5 rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="w-14 h-14 bg-cyan-50 group-hover:bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4 transition">
                  <item.icon className="text-cyan-500 w-7 h-7" />
                </div>
                <h3 className="font-semibold text-lg text-slate-800">{item.title}</h3>
                <p className="text-gray-500 text-sm mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOME VISIT ── */}
      <section id="services" ref={visitRef} className="py-12 sm:py-16 bg-slate-900">
        <div className={`container mx-auto px-4 sm:px-6 transition-all duration-700 ${visitVis ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
            <div className="relative">
              <img src={homeVisitImg} alt="Home Visit" className="w-full h-full object-cover min-h-[260px] sm:min-h-[380px]" />
              <div className="absolute bottom-5 left-5 bg-white rounded-xl px-4 py-3 shadow-lg max-w-[200px] animate-bounce-slow">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="text-green-500 w-5 h-5" />
                  <span className="text-green-600 font-bold text-sm">Safe & Hygienic</span>
                </div>
                <p className="text-gray-500 text-xs leading-snug">Strict adherence to safety protocols during every home visit.</p>
              </div>
            </div>
            <div className="bg-slate-800 text-white p-5 sm:p-8 flex flex-col justify-center">
              <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-semibold w-fit mb-4">
                Convenience First
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">Lab Tests at Your Doorstep</h2>
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                Skip the waiting room. Our certified phlebotomists will visit your home or office to collect samples safely and efficiently.
              </p>
              <ul className="space-y-3 mb-8">
                {["Flexible scheduling including weekends", "Trained and vaccinated staff", "Painless collection techniques", "Digital reports sent directly to you"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-200">
                    <CheckCircle className="text-green-400 w-5 h-5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3 rounded-lg text-sm font-semibold transition hover:scale-105 active:scale-95 w-fit">
                Schedule Home Visit
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── PACKAGES ── */}
      <section id="packages" ref={pkgRef} className="py-8 sm:py-14 bg-white text-center">
        <div className={`transition-all duration-700 ${pkgVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Popular Health Packages</h2>
          <p className="text-gray-500 mb-8 sm:mb-10 text-sm">Preventive checkups designed for you</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 container mx-auto px-4 sm:px-6">
            {[
              { name: "Complete Blood Count", tests: "25 Tests", price: "₹500", color: "from-cyan-500 to-cyan-700" },
              { name: "Liver Function Test", tests: "12 Tests", price: "₹800", color: "from-orange-400 to-orange-600" },
              { name: "Full Body Checkup", tests: "60 Tests", price: "₹1499", color: "from-purple-500 to-purple-700" },
            ].map((pkg, i) => (
              <div key={i}
                className="bg-gray-50 p-4 sm:p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${pkg.color} mx-auto mb-5`} />
                <h3 className="font-semibold text-lg text-slate-800">{pkg.name}</h3>
                <p className="text-sm text-gray-500 mt-2">{pkg.tests} Included</p>
                <p className="text-3xl font-bold mt-4 text-cyan-600">{pkg.price}</p>
                <button className="mt-6 bg-slate-900 hover:bg-slate-700 text-white w-full py-2.5 rounded-lg text-sm transition group-hover:bg-cyan-700">
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-8 sm:py-12 bg-cyan-600">
        <div className={`container mx-auto px-4 sm:px-6 transition-all duration-700 ${statsVis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-white text-center">
            {[
              { icon: Activity, value: 15, suffix: "+", label: "Years Experience" },
              { icon: Users, value: 500, suffix: "k+", label: "Happy Patients" },
              { icon: FlaskConical, value: 50, suffix: "+", label: "Advanced Labs" },
              { icon: BadgeCheck, value: 10, suffix: "k+", label: "Trusted Doctors" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2 group">
                <div className="bg-white/15 group-hover:bg-white/25 p-3 rounded-2xl transition">
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-4xl font-extrabold tracking-tight">
                  {statsVis ? <Counter target={stat.value} suffix={stat.suffix} /> : `0${stat.suffix}`}
                </p>
                <p className="text-cyan-100 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section ref={testRef} className="py-8 sm:py-14 bg-gray-50 text-center">
        <div className={`transition-all duration-700 ${testVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Patient Stories</h2>
          <p className="text-gray-500 mb-8 sm:mb-12 text-sm">What our patients say about us</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 container mx-auto px-4 sm:px-6">
            {[
              { text: "Very convenient home service! Reports were ready the same day.", name: "Priya S." },
              { text: "Clean facility and very friendly staff. Highly recommended.", name: "Rahul M." },
              { text: "Reports are easy to understand. Great experience overall.", name: "Anita K." },
            ].map((t, i) => (
              <div key={i}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="text-yellow-400 text-lg mb-3">⭐⭐⭐⭐⭐</div>
                <p className="text-gray-600 text-sm italic">"{t.text}"</p>
                <p className="mt-4 text-xs font-semibold text-cyan-600">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOCATIONS ── */}
      <section id="locations" ref={locRef} className="py-8 sm:py-14 bg-white">
        <div className={`container mx-auto px-4 sm:px-6 transition-all duration-700 ${locVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          <div className="text-center mb-8 sm:mb-12">
            <span className="bg-cyan-50 text-cyan-600 border border-cyan-200 px-3 py-1 rounded-full text-xs font-semibold">Our Locations</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mt-3 mb-2">Find Us Near You</h2>
            <p className="text-gray-500 text-sm">Main labs and collection centers across Mumbai & Pune</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* ── MUMBAI ── */}
            <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl"><MapPin className="text-white w-5 h-5" /></div>
                <div>
                  <h3 className="text-white font-bold text-lg">Mumbai</h3>
                  <p className="text-cyan-100 text-xs">Main Lab + Collection Centers</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    type: "Main Lab",
                    name: "Shraddha Central Lab",
                    address: "Plot 12, MIDC Industrial Area, Andheri East, Mumbai – 400093",
                    phone: "+91 22 4567 8900",
                    hours: "Mon–Sat: 7:00 AM – 9:00 PM",
                    badge: "bg-orange-100 text-orange-600",
                    badgeLabel: "Main Lab",
                    maps: "https://maps.google.com/?q=Andheri+East+Mumbai",
                  },
                  {
                    type: "Collection Center",
                    name: "Dadar Collection Center",
                    address: "Shop 4, Shivaji Park Road, Dadar West, Mumbai – 400028",
                    phone: "+91 22 4567 8901",
                    hours: "Mon–Sun: 7:00 AM – 2:00 PM",
                    badge: "bg-cyan-100 text-cyan-700",
                    badgeLabel: "Collection Center",
                    maps: "https://maps.google.com/?q=Dadar+West+Mumbai",
                  },
                  {
                    type: "Collection Center",
                    name: "Borivali Collection Center",
                    address: "Office 2B, Chandavarkar Road, Borivali West, Mumbai – 400092",
                    phone: "+91 22 4567 8902",
                    hours: "Mon–Sun: 7:00 AM – 2:00 PM",
                    badge: "bg-cyan-100 text-cyan-700",
                    badgeLabel: "Collection Center",
                    maps: "https://maps.google.com/?q=Borivali+West+Mumbai",
                  },
                ].map((loc, i) => (
                  <div key={i} className="p-3 hover:bg-gray-50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${loc.badge}`}>{loc.badgeLabel}</span>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-sm">{loc.name}</h4>
                        <p className="text-gray-500 text-xs mt-1 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />{loc.address}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />{loc.phone}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />{loc.hours}
                        </p>
                      </div>
                      <a href={loc.maps} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs px-3 py-1.5 rounded-lg transition group-hover:scale-105">
                        <Navigation className="w-3.5 h-3.5" /> Directions
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PUNE ── */}
            <div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-gray-100">
              <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-6 py-4 flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl"><MapPin className="text-white w-5 h-5" /></div>
                <div>
                  <h3 className="text-white font-bold text-lg">Pune</h3>
                  <p className="text-slate-300 text-xs">Main Lab + Collection Centers</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  {
                    type: "Main Lab",
                    name: "Shraddha Pune Lab",
                    address: "Survey No. 45, Baner Road, Baner, Pune – 411045",
                    phone: "+91 20 4567 8900",
                    hours: "Mon–Sat: 7:00 AM – 9:00 PM",
                    badge: "bg-orange-100 text-orange-600",
                    badgeLabel: "Main Lab",
                    maps: "https://maps.google.com/?q=Baner+Pune",
                  },
                  {
                    type: "Collection Center",
                    name: "Kothrud Collection Center",
                    address: "Shop 7, Paud Road, Kothrud, Pune – 411038",
                    phone: "+91 20 4567 8901",
                    hours: "Mon–Sun: 7:00 AM – 2:00 PM",
                    badge: "bg-cyan-100 text-cyan-700",
                    badgeLabel: "Collection Center",
                    maps: "https://maps.google.com/?q=Kothrud+Pune",
                  },
                  {
                    type: "Collection Center",
                    name: "Hadapsar Collection Center",
                    address: "Office 3, Magarpatta City Road, Hadapsar, Pune – 411028",
                    phone: "+91 20 4567 8902",
                    hours: "Mon–Sun: 7:00 AM – 2:00 PM",
                    badge: "bg-cyan-100 text-cyan-700",
                    badgeLabel: "Collection Center",
                    maps: "https://maps.google.com/?q=Hadapsar+Pune",
                  },
                ].map((loc, i) => (
                  <div key={i} className="p-3 hover:bg-gray-50 transition group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${loc.badge}`}>{loc.badgeLabel}</span>
                        </div>
                        <h4 className="font-semibold text-slate-800 text-sm">{loc.name}</h4>
                        <p className="text-gray-500 text-xs mt-1 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />{loc.address}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />{loc.phone}
                        </p>
                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />{loc.hours}
                        </p>
                      </div>
                      <a href={loc.maps} target="_blank" rel="noopener noreferrer"
                        className="flex-shrink-0 flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg transition group-hover:scale-105">
                        <Navigation className="w-3.5 h-3.5" /> Directions
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section ref={ctaRef} className="py-10 sm:py-16 bg-gray-100">
        <div className={`container mx-auto px-4 sm:px-6 transition-all duration-700 ${ctaVis ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-900 rounded-2xl p-5 sm:p-8 text-center text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 relative">Ready to prioritize your health?</h2>
            <p className="text-gray-300 text-sm mb-6 sm:mb-8 max-w-md mx-auto relative">
              Join thousands of satisfied patients. Book your test today and get access to your personal health dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center relative">
              <h2 className="px-4 py-2 rounded-lg text-lg sm:text-xl font-semibold flex items-center gap-2">
                <span className="bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer">
                  Join With Shraddha Pathology Laboratory
                </span>
                <ArrowRight size={22} className="text-cyan-500" />
              </h2>
              <button onClick={() => router.push("/login")}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-lg text-base sm:text-xl font-semibold transition hover:scale-105">
                Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-white pt-8 sm:pt-12 pb-5">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8 pb-6 sm:pb-8 border-b border-white/10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-cyan-600 p-1.5 rounded-lg"><Activity className="w-5 h-5 text-white" /></div>
                <span className="font-bold text-lg">Shraddha</span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-5">
                Precision diagnostics and compassionate care. We bring advanced healthcare testing directly to you with accurate, timely results.
              </p>
              <div className="flex gap-3">
                {["f", "𝕏", "in", "▣"].map((icon, i) => (
                  <button key={i} className="w-8 h-8 rounded-full border border-white/20 hover:border-cyan-400 hover:text-cyan-400 text-gray-400 text-xs flex items-center justify-center transition">
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-gray-400 text-xs">
                {["About Us", "Our Services", "Health Packages", "Find a Center", "Book Home Visit"].map((link, i) => (
                  <li key={i}><a href="#" className="hover:text-cyan-400 transition flex items-center gap-1.5"><span className="text-cyan-500">•</span>{link}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Our Services</h4>
              <ul className="space-y-2.5 text-gray-400 text-xs">
                {["Blood Tests", "Full Body Checkup", "Corporate Wellness", "Allergy Testing", "COVID-19 Testing"].map((svc, i) => (
                  <li key={i}><a href="#" className="hover:text-cyan-400 transition flex items-center gap-1.5"><span className="text-cyan-500">•</span>{svc}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Contact Us</h4>
              <ul className="space-y-3 text-gray-400 text-xs">
                <li className="flex gap-2 items-start"><span className="text-cyan-400 mt-0.5">📍</span><span>123 Healthcare Avenue, Medical District, NY 10001</span></li>
                <li className="flex gap-2 items-center"><span className="text-cyan-400">📞</span><span>+1 (800) 555-0199</span></li>
                <li className="flex gap-2 items-center"><span className="text-cyan-400">✉</span><span>care@shraddha.com</span></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} Shraddha Diagnostic Center. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-cyan-400 transition">Privacy Policy</a>
              <a href="#" className="hover:text-cyan-400 transition">Terms of Service</a>
              <a href="#" className="hover:text-cyan-400 transition">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── HOME VISIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-fade-in">
            <button onClick={() => { setShowModal(false); setSubmitted(false); setForm({ name: "", phone: "" }); setFormErrors({ name: "", phone: "" }); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">×</button>
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle className="text-green-500 w-14 h-14 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Request Received!</h3>
                <p className="text-gray-500 text-sm">Our team will call you shortly to confirm your home visit.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-100 p-2.5 rounded-xl"><HeartPulse className="text-orange-500 w-6 h-6" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Schedule Home Visit</h3>
                    <p className="text-xs text-gray-500">We'll call you to confirm the appointment</p>
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: "" })); }}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${formErrors.name ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                    />
                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit phone number"
                      value={form.phone}
                      maxLength={10}
                      onChange={e => { setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, "") })); setFormErrors(p => ({ ...p, phone: "" })); }}
                      className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${formErrors.phone ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                    />
                    {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
                  </div>
                  <button type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg text-sm font-bold transition hover:scale-105 mt-2">
                    📞 Request a Call Back
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
