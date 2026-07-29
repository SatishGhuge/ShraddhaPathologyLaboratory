"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

const CAROUSEL_IMAGES = [
  "/labhomeimage.jpg",
  "/pic1.jpg",
  "/pic2.JPG",
  "/pic3.JPG",
  "/pic5.JPG",
  "/pic6.JPG",
  "/pic8.JPG",
];

export default function HeroImageCarousel() {
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  // Auto-slide every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Current Image */}
      <motion.div
        key={`current-${currentImageIdx}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{
          duration: 0.6,
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

      {/* Next Image (preloaded, positioned off-screen right) */}
      <motion.div
        key={`next-${currentImageIdx}`}
        initial={{ x: "100%" }}
        className="absolute inset-0"
      >
        <Image
          src={CAROUSEL_IMAGES[(currentImageIdx + 1) % CAROUSEL_IMAGES.length]}
          alt={`Gallery image ${(currentImageIdx + 1) % CAROUSEL_IMAGES.length + 1}`}
          fill
          className="object-cover object-center"
          quality={90}
        />
      </motion.div>

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
    </div>
  );
}
