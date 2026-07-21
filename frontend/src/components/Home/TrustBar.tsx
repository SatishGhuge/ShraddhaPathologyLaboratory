"use client";

const stats = [
  { icon: "🕐", label: "24/7 Support", sub: "We are always here to help you" },
  { icon: "⚡", label: "Fast & Reliable", sub: "Quality services you can trust" },
  { icon: "👨‍⚕️", label: "Trusted by Doctors", sub: "Preferred for accuracy results" },
  { icon: "💰", label: "Affordable Pricing", sub: "Quality tests at the best prices" },
];

export default function TrustBar() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                {s.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[oklch(45%_0.085_224.283)]">{s.label}</p>
                <p className="text-xs text-gray-400">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
