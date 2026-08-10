"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

const publicRoutes = ["/", "/login", "/seed-data", "/report-view", "/report"];


// Create context for sidebar state
export const SidebarContext = createContext<{
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isPublicRoute, setIsPublicRoute] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Suppress console.error to hide red error badge in dev tools
    // Only show user-friendly error messages in UI
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Silently suppress errors - they're shown in UI instead
      // Uncomment below to debug specific errors:
      // originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    // Check if token exists in cookies
    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    // Check if current pathname is public
    // Include routes that start with /report-view or /report/ (for both token-based and visitId-based)
    const isPublic = publicRoutes.some(route => {
      if (route === pathname) return true;
      if (pathname.startsWith(route + '/')) return true; // Handle /report/[token], /report-view/...
      return false;
    });
    
    setIsPublicRoute(isPublic);

    if (!token && !isPublic) {
      router.push("/login");
    }
    setLoading(false);
  }, [pathname, router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Determine if this is the registration page to apply minimal padding
  const isRegistrationPage = pathname.includes('/patient/registration');
  const containerPadding = isRegistrationPage ? 'p-2 sm:p-3' : 'p-3 sm:p-4 md:p-6';

  return (
    <SidebarContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <Header />
      <div className={`transition-all duration-300 ${!isPublicRoute ? `mt-14 ${sidebarOpen ? 'ml-48' : 'ml-0'} ${containerPadding}` : ""}`}>
        {/* Auto-render breadcrumb for non-public routes, but NOT on dashboard */}
        {!isPublicRoute && !pathname.includes('/labdashboard') && !pathname.includes('/dashboard') && <PageHeader />}
        {children}
      </div>
    </SidebarContext.Provider>
  );
}
