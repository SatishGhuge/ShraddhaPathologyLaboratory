"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

const publicRoutes = ["/", "/login", "/seed-data"];

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in cookies
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token && !publicRoutes.includes(pathname)) {
      router.push("/login");
    }
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Note: React Strict Mode in development is beneficial for catching bugs
  // It's enabled by React, not Next.js config
  // To disable: set NODE_ENV=production or accept the double-rendering in dev
  return children;
}
