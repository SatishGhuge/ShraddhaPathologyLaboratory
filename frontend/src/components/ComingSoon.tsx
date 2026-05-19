"use client";

import { X, Clock, Wrench, Sparkles } from "lucide-react";

export default function ComingSoon({ feature, onClose }: { feature?: string; onClose?: () => void }) {
  if (!feature) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60"
      onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top gradient bar */}
        <div className="h-2 bg-gradient-to-r from-slate-800 via-cyan-600 to-cyan-400"/>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20}/>
        </button>

        <div className="px-8 py-10 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
                <Wrench size={36} className="text-cyan-600"/>
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center">
                <Clock size={14} className="text-white"/>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Coming Soon</h2>
          <div className="flex items-center justify-center gap-1 mb-4">
            <Sparkles size={14} className="text-cyan-500"/>
            <span className="text-sm text-cyan-600 font-medium">{feature}</span>
            <Sparkles size={14} className="text-cyan-500"/>
          </div>

          {/* Message */}
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            This feature is currently under development and will be available soon.
            We're working hard to bring you the best experience.
          </p>

          {/* Progress bar decoration */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-6 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full animate-pulse" style={{width:"65%"}}/>
          </div>

          <button onClick={onClose}
            className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white px-8 py-2 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
