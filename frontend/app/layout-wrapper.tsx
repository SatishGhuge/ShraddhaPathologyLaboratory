"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/src/components/Header";

const publicRoutes = ["/", "/login", "/seed-data"];

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isPublicRoute, setIsPublicRoute] = useState(false);

  useEffect(() => {
    // Check if token exists in cookies
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    const isPublic = publicRoutes.includes(pathname);
    setIsPublicRoute(isPublic);

    if (!token && !isPublic) {
      router.push("/login");
    }
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      <Header />
      <div className={`${!isPublicRoute ? "ml-48 mt-14" : ""}`}>
        {children}
      </div>
    </>
  );
}
