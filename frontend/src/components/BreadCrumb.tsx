"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, BarChart3, IndianRupee, FolderOpen, Settings, UserPlus, Search, Send, FileSignature, Database, ClipboardCheck, DollarSign, ChevronLeft } from "lucide-react";

// Icon mapping for breadcrumb paths
const iconMap = {
  "Reports": FileText,
  "MIS Reports": BarChart3,
  "Cost Related Reports": IndianRupee,
  "Other Reports": FolderOpen,
  "Master": Settings,
  "Patient": UserPlus,
  "Patient Registration": UserPlus,
  "Search for Booking": Search,
  "Outsourcing for Test": Send,
  "Configuration": Settings,
  "Signature": FileSignature,
  "Tests": Database,
  "Result": ClipboardCheck,
  "Dashboard": BarChart3,
  "Collection": DollarSign,
  "Patient List": UserPlus,
  "Referral Doctor Revenue": IndianRupee,
  "Inventory": FileText,
  "Stock Transactions": FileText,
};

// URL to breadcrumb mapping - Comprehensive list of all pages
const urlPathMap: { [key: string]: string } = {
  // Master Module
  "master/testlist": "Master / Tests",
  "master/test-excel-manager": "Master / Test Excel Manager",
  "master/test-templets": "Master / Test Template",
  "master/departmentlist": "Master / Department",
  "master/packagelist": "Master / Packages",
  "master/charges": "Master / Charges",
  "master/corporate-wise-charges": "Master / Corporate Wise Charges",
  "master/rolelist": "Master / Roles",
  "master/userlist": "Master / Users",
  "master/referral-doctor-list": "Master / Referral Doctors",
  "master/referral-doctor": "Master / Referral Doctor",
  "master/organization": "Master / Organization",
  "master/specimen-type": "Master / Specimen Type",
  "master/units": "Master / Units",
  "master/microbiology-organism": "Master / Microbiology Organism",
  "master/outsourcing": "Master / Outsourcing",
  
  // Patient Module
  "patient/registration": "Patient / Registration",
  "patient/search-booking": "Patient / Search for Booking",
  
  // Result Module
  "result": "Result",
  
  // Reports Module
  "reports/report-dashboard": "Reports / Dashboard",
  "reports/collection": "Reports / Collection",
  "reports/patient-list": "Reports / Patient List",
  "reports/referral-doctor-revenue": "Reports / Referral Doctor Revenue",
  "reports/center-wise-cost-report": "Reports / Center Wise Cost Report",
  "reports/b2b-testwise-cost-report": "Reports / B2B Testwise Cost Report",
  "reports/discount-report": "Reports / Discount Report",
  "reports/test-report": "Reports / Test Report",
  "reports/payment-receipt": "Reports / Payment Receipt",
  "reports/complement-all-doctors": "Reports / Complement Report",
  "reports/turn-around-time": "Reports / Turn Around Time",
  "reports/test-compliment": "Reports / Test Wise Complement",
  "reports/worksheet": "Reports / Worksheet",
  "reports/service-count": "Reports / Service Count",
  "reports/user-login-report": "Reports / User Login Report",
  "reports/sample-rejection-report": "Reports / Sample Rejection Report",
  "reports/hospital-bills": "Reports / Hospital Bills",
  "reports/monthly-collection-summary": "Reports / Monthly Collection Summary",
  "reports/group-summary": "Reports / Group Summary",
  "reports/detailed-worksheet": "Reports / Detailed Worksheet",
  "reports/daily-collection": "Reports / Daily Collection",
  "reports/patient-location-report": "Reports / Patient Location Report",
  "reports/b2b-bulk-settlement": "Reports / B2B Bulk Settlement",
  "reports/bulk-settlement": "Reports / Bulk Settlement",
  
  // Configuration Module
  "config/signature": "Configuration / Signature",
  
  // Inventory Module
  "inventory/stock-transactions": "Inventory / Stock Transactions",
  
  // Dashboard
  "labdashboard": "Dashboard",
  "dashboard/collectiondashboard": "Dashboard / Collection",
  "dashboard/franchisedashboard": "Dashboard / Franchise",
};

export default function PageHeader({ title = "", icon: Icon, path = "" }: { title?: string; icon?: React.ComponentType<any>; path?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Generate breadcrumb path from URL if not provided
  let pathItems: string[] = [];
  
  if (path) {
    // Use provided path if available
    pathItems = path.split(" / ").filter(item => item.trim());
  } else {
    // Generate from URL pathname
    const urlPath = pathname.replace(/^\//, "").toLowerCase();
    
    // Find matching breadcrumb from map
    for (const [url, breadcrumb] of Object.entries(urlPathMap)) {
      if (urlPath.startsWith(url)) {
        pathItems = breadcrumb.split(" / ").filter(item => item.trim());
        break;
      }
    }
  }

  // Show back button for specific pages (test-excel-manager, etc.)
  const showBackButton = pathname.includes('/test-excel-manager');

  return (
    <div className="mb-2">

      {/* Breadcrumb with optional Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <Home size={16} />
          <span>Home</span>

          {pathItems.map((item, i) => {
            const ItemIcon = iconMap[item] || FileText;
            return (
              <div key={i} className="flex items-center gap-2">
                <span>/</span>
                <ItemIcon size={16} />
                <span>{item}</span>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        {showBackButton && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-sm transition"
          >
            <ChevronLeft size={16} />
            Back to Test List
          </button>
        )}
      </div>
    </div>
  );
}
