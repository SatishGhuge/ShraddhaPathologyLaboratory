"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Organization Stock is accessible via the "Organization Stock" button
// inside Stock Transfers (/inventory/transfers). This redirect handles
// any direct navigation to this URL.
export default function OrgStockRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/inventory/transfers");
  }, [router]);
  return null;
}
