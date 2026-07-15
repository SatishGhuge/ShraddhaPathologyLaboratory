"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const CAROUSEL_IMAGES = [
  "/pic1.jpg",
  "/pic2.JPG",
  "/pic3.JPG",
  "/pic4.JPG",
  "/pic5.JPG",
  "/pic6.JPG",
  "/pic7.JPG",
  "/pic8.JPG",
];

export default function HeroImageCarousel() {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Delay carousel start by 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Cycle through images every 3.5 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentImageIdx}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-0"
        >
          <Image
            src={CAROUSEL_IMAGES[currentImageIdx]}
            alt={`Gallery image ${currentImageIdx + 1}`}
            fill
            className="object-cover object-center"
            quality={90}
            priority={currentImageIdx === 0}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay for smooth fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#F0F6FF] via-transparent to-transparent w-1/4 pointer-events-none" />

      {/* Image indicators (dots) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {CAROUSEL_IMAGES.map((_, idx) => (
          <motion.button
            key={idx}
            className={`h-2 rounded-full transition-all ${
              idx === currentImageIdx
                ? "bg-white w-8 shadow-lg"
                : "bg-white/50 hover:bg-white/70 w-2"
            }`}
            onClick={() => setCurrentImageIdx(idx)}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.95 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
