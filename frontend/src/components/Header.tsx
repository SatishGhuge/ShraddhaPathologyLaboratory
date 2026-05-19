"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
const logo = "/logo.png";

import {
  User,
  Database,
  FileBarChart2,
  Settings,
  HelpCircle,
  ClipboardCheck,
  ChevronDown,
  X,
} from "lucide-react";
import ComingSoon from "./ComingSoon";

const menus = [
  {
    title: "Patient",
    items: ["Patient Registration", "Search for Test"],
  },
  {
    title: "Master",
    items: [
      "Tests",
      "Test Template",
      "Department",
      "Packages",
      "Roles",
      "Users",
      "Charges",
      "Referral Doctors",
      "Centers",
      "Corporates",
      "Franchise List",
      "Other Masters",
    ],
  },
  {
    title: "Config ",
    items: [
      "Signature",
    ],
  },
];

const otherMasterSubItems = [
  "Specimen Type",
  "Units",
  "Microbiology Organism",
];

const misReportItems = [
  "Dashboard",
  "Daily Collection",
  "Payment Receipt Report",
  "Complement report (All Doctors)",
];

const costReportItems = [
  "Center wise cost Report",
  "B2B Testwise Cost Report",
];

const otherReportItems = [
  "Turn around time",
  "Worksheet",
  "Detailed Worksheet",
  "User Login Report",
  "Discount Report",
  "Monthly Collection Summary",
  "Sample Rejection Report",
  "Hospital Bills",
];

const helpItems = [
  "User Manual",
  "Download Ultraviewer",
  "Download Anydesk",
  "How to add new test (Hindi)",
  "How to add new test (English)",
  "How to update charges",
  "How to add packages",
];

const helpLinks = {
  "Download Ultraviewer": { type: "download", url: "/api/download/UltraViewer_setup.exe", filename: "UltraViewer_setup.exe" },
  "Download Anydesk":     { type: "download", url: "/api/download/AnyDesk.exe",            filename: "AnyDesk.exe" },
};

// Items that show "Coming Soon" modal
const configComingSoon = new Set([
  // All config items except Signature are now hidden
]);

const helpComingSoon = new Set([
  "User Manual", "How to add new test (Hindi)", "How to add new test (English)",
  "How to update charges", "How to add packages",
]);

const triggerDownload = async (url, filename) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // fallback: direct link if fetch fails (e.g. CORS)
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};

const reportMenu = [
  "MIS Report",
  "Cost Related Report",
  "Others Report",
  "Patient List",
  "Bulk Settlement",
  "B2B Bulk Settlement",
  "Service Count",
  "Group Summary",
  "Test Report",
];

const Header = () => {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<any>(null);
  const [openSubDropdown, setOpenSubDropdown] = useState<any>(null);
  const [videoModal,   setVideoModal]   = useState<any>(null); // holds embed URL
  const [comingSoon,   setComingSoon]   = useState<any>(null); // holds feature name
  const menuRef = useRef(null);

  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem('admin') || '{}');
  const isAdmin = currentUser.userType === 'admin' || !currentUser.userType;
  const isCollectionCenter = currentUser.role === 'Collection Center';
  const isFranchise = currentUser.role === 'Franchise';
  // Regular staff user created via AddUser (technician, etc.)
  const isUser = currentUser.userType === 'user' && !isCollectionCenter && !isFranchise;
  const isRestricted = isCollectionCenter || isFranchise;

  // Items hidden from non-admin users
  const restrictedItems = isAdmin ? [] : ['Roles', 'Users'];

  // Franchise/Collection center report restrictions
  const franchiseMisItems = ['Daily Collection'];
  const franchiseOtherItems = ['Discount Report'];
  const franchiseReportMenu = ['MIS Report', 'Others Report', 'Patient List'];

  // Regular user (technician) — same 3 reports only
  const userMisItems = ['Daily Collection'];
  const userOtherItems = ['Discount Report'];
  const userReportMenu = ['MIS Report', 'Others Report', 'Patient List'];

  const allowedMisItems   = isUser ? userMisItems   : isRestricted ? franchiseMisItems   : misReportItems;
  const allowedOtherItems = isUser ? userOtherItems : isRestricted ? franchiseOtherItems : otherReportItems;
  const allowedReportMenu = isUser ? userReportMenu : isRestricted ? franchiseReportMenu : reportMenu;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
        setOpenDropdown(null);
        setOpenSubDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigation = (path: any) => {
    router.push(path);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setOpenSubDropdown(null);
  };

  const toggleDropdown = (name: any) => {
    setOpenDropdown(openDropdown === name ? null : name);
    setOpenSubDropdown(null);
  };

  const toggleSubDropdown = (name: any) => {
    setOpenSubDropdown(openSubDropdown === name ? null : name);
  };

  return (
    <>
      {/* ===== Small Top Header ===== */}
      <div className="w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-800 text-white text-xs">
        {/* Mobile: two compact rows */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 sm:px-5 py-1 gap-0.5 sm:gap-0">

          {/* Row 1 / Left: Tagline - animated on all devices */}
          <div className="flex items-center gap-2 font-semibold tracking-wide text-[10px] sm:text-xs overflow-hidden">
            <span className="animate-slideFade delay-0">🩺 Care Beyond Time</span>
            <span className="animate-slideFade delay-200">• 🔬 Science You Trust</span>
            <span className="animate-slideFade delay-400">• 🕒 24/7 Support</span>
          </div>

          {/* Row 2 / Right: Phone + Email */}
          <div className="flex items-center gap-3 sm:gap-5 text-[10px] sm:text-xs text-gray-300 flex-wrap">
            <span className="flex items-center gap-1 whitespace-nowrap">
              📞 <span>9049904042</span>
              <span className="hidden sm:inline"> | 8779295302</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
             📧<span className="hidden sm:inline">silverleafdignos@gmail.com</span>
              <span className="sm:hidden">silverleafdignos@gmail.com</span>
            </span>
          </div>

        </div>
      </div>

      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-0 py-1 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <img
              src={logo}
              alt="Logo"
              onClick={() => router.push("/labdashboard")}
              className="w-12 h-12 object-contain rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform duration-200"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isCollectionCenter ? 'SilverLeaf Collection Center' : isFranchise ? 'SilverLeaf Franchise' : 'SilverLeaf Diagnostics'}
              </h1>
              <h3 className="text-xs font-medium bg-gradient-to-r from-blue-400 via-green-400 to-cyan-400 bg-clip-text text-transparent">Empowering Health Transforming Life</h3>
            </div>
          </div>

          {/* ===== Mobile Hamburger ===== */}
          <div
            className="md:hidden text-white text-3xl cursor-pointer px-3"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </div>

          {/* ===== Navigation ===== */}
          <nav
            ref={menuRef}
            className={`
              ${mobileMenuOpen ? "flex" : "hidden"} md:flex
              flex-col md:flex-row
              gap-2 md:gap-6
              text-white

              absolute md:static
              top-full right-2 md:right-auto
              w-[220px] md:w-auto
              max-h-[40vh] md:max-h-none
              overflow-y-auto md:overflow-visible

              bg-slate-900 md:bg-transparent
              rounded-xl md:rounded-none
              py-2 md:py-0
              shadow-2xl md:shadow-none
              z-[999]
              -ml-6
            `}
          >

            {/* Patient */}
            <div className="relative group">
              <span 
                className="cursor-pointer font-semibold px-2 py-1 text-12px flex items-center gap-2 md:hover:bg-cyan-600 md:rounded"
                onClick={() => toggleDropdown('patient')}
              >
                <User size={18} /> Patient
                <ChevronDown 
                  size={16} 
                  className={`md:hidden transition-transform ${openDropdown === 'patient' ? 'rotate-180' : ''}`} 
                />
              </span>

              {/* Desktop hover dropdown */}
              <div className="hidden md:block absolute left-0 top-full h-3 w-full"></div>
              <div className="hidden md:block absolute left-0 mt-2 w-56 bg-slate-800 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                {menus[0].items.map((item) => (
                  <div
                    key={item}
                    className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                    onClick={() => handleNavigation(
                      item === "Patient Registration" ? "/patient/registration" :
                      item === "Search for Test" ? "/patient/search-booking" : "/"
                    )}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Mobile click dropdown */}
              {openDropdown === 'patient' && (
                <div className="md:hidden mt-2 w-full bg-slate-700 rounded shadow-lg">
                  {menus[0].items.map((item) => (
                    <div
                      key={item}
                      className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                      onClick={() => handleNavigation(
                        item === "Patient Registration" ? "/patient/registration" :
                        item === "Search for Test" ? "/patient/search-booking" : "/"
                      )}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Master — hidden for Collection Center, Franchise and regular users */}
            {!isRestricted && !isUser && <div className="relative group">              <span 
                className="cursor-pointer font-semibold px-2 py-1 text-12px flex items-center gap-2 md:hover:bg-cyan-600 md:rounded"
                onClick={() => toggleDropdown('master')}
              >
                <Database size={18} /> Master
                <ChevronDown 
                  size={16} 
                  className={`md:hidden transition-transform ${openDropdown === 'master' ? 'rotate-180' : ''}`} 
                />
              </span>

              {/* Desktop hover dropdown */}
              <div className="hidden md:block absolute left-0 top-full h-3 w-full"></div>
              <div className="hidden md:block absolute left-0 mt-2 w-48 bg-slate-800 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                {menus[1].items.filter(item => !restrictedItems.includes(item)).map((item) => {
                  if (item === "Other Masters") {
                    return (
                      <div key={item} className="relative group/othermaster">
                        <div className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer flex justify-between">
                          Other Masters <span>▶</span>
                        </div>
                        <div className="absolute left-full top-0 w-3 h-full"></div>
                        <div className="absolute left-full top-0 ml-1 w-72 bg-slate-900 rounded shadow-lg opacity-0 pointer-events-none group-hover/othermaster:opacity-100 group-hover/othermaster:pointer-events-auto transition">
                          {otherMasterSubItems.map((sub) => (
                            <div
                              key={sub}
                              className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                              onClick={() => handleNavigation(
                                sub === "Specimen Type" ? "/master/specimen-type" :
                                sub === "Units" ? "/master/units" :
                                sub === "Microbiology Organism" ? "/master/microbiology-organism" : "/"
                              )}
                            >
                              {sub}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item}
                      onClick={() => handleNavigation(
                        item === "Tests" ? "/master/testlist" :
                        item === "Test Template" ? "/master/test-templets" :
                        item === "Department" ? "/master/departmentlist" :
                        item === "Packages" ? "/master/packagelist" :
                        item === "Roles" ? "/master/rolelist" :
                        item === "Centers" ? "/master/centerlist" :
                        item === "Users" ? "/master/userlist" :
                        item === "Charges" ? "/master/charges" :
                        item === "Referral Doctors" ? "/master/referral-doctor-list" :
                        item === "Corporates" ? "/master/corporatelist" :
                        item === "Franchise List" ? "/master/franchise" :
                        item === "Outsource Labs" ? "/master/outsourcing" : "/"
                      )}
                      className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                    >
                      {item}
                    </div>
                  );
                })}
              </div>

              {/* Mobile click dropdown */}
              {openDropdown === 'master' && (
                <div className="md:hidden mt-2 w-full bg-slate-700 rounded shadow-lg">
                  {menus[1].items.filter(item => !restrictedItems.includes(item)).map((item) => {
                    if (item === "Other Masters") {
                      return (
                        <div key={item}>
                          <div 
                            className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 flex justify-between items-center"
                            onClick={() => toggleSubDropdown('otherMasters')}
                          >
                            Other Masters 
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform ${openSubDropdown === 'otherMasters' ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          {openSubDropdown === 'otherMasters' && (
                            <div className="bg-slate-600 rounded-b">
                              {otherMasterSubItems.map((sub) => (
                                <div
                                  key={sub}
                                  className="px-6 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-500 last:border-b-0"
                                  onClick={() => handleNavigation(
                                    sub === "Specimen Type" ? "/master/specimen-type" :
                                    sub === "Units" ? "/master/units" :
                                    sub === "Microbiology Organism" ? "/master/microbiology-organism" : "/"
                                  )}
                                >
                                  {sub}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item}
                        onClick={() => handleNavigation(
                          item === "Tests" ? "/master/testlist" :
                          item === "Test Template" ? "/master/test-templets" :
                          item === "Department" ? "/master/departmentlist" :
                          item === "Packages" ? "/master/packagelist" :
                          item === "Roles" ? "/master/rolelist" :
                          item === "Centers" ? "/master/centerlist" :
                          item === "Users" ? "/master/userlist" :
                          item === "Charges" ? "/master/charges" :
                          item === "Referral Doctors" ? "/master/referral-doctor-list" :
                          item === "Corporates" ? "/master/corporatelist" :
                          item === "Franchise List" ? "/master/franchise" :
                          item === "Outsource Labs" ? "/master/outsourcing" : "/"
                        )}
                        className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                      >
                        {item}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>}
            {/* End Master */}


            {/* Report */}
            <div className="relative group">
              <span 
                className="cursor-pointer font-semibold px-2 py-1 text-12px flex items-center gap-2 md:hover:bg-cyan-600 md:rounded"
                onClick={() => toggleDropdown('report')}
              >
                <FileBarChart2 size={18} /> Report
                <ChevronDown 
                  size={16} 
                  className={`md:hidden transition-transform ${openDropdown === 'report' ? 'rotate-180' : ''}`} 
                />
              </span>

              {/* Desktop hover dropdown */}
              <div className="hidden md:block absolute left-0 top-full h-3 w-full"></div>
              <div className="hidden md:block absolute left-0 mt-2 w-56 bg-slate-800 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                {allowedReportMenu.map((item) => {
                  if (item === "MIS Report") {
                    return (
                      <div key={item} className="relative group/mis">
                        <div className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer flex justify-between">
                          MIS Report <span>▶</span>
                        </div>
                        <div className="absolute left-full top-0 w-3 h-full"></div>
                        <div className="absolute left-full top-0 ml-1 w-72 bg-slate-900 rounded shadow-lg opacity-0 pointer-events-none group-hover/mis:opacity-100 group-hover/mis:pointer-events-auto transition">
                          {allowedMisItems.map((sub) => (
                            <div
                              key={sub}
                              onClick={() => handleNavigation(
                                sub === "Daily Collection" ? "/reports/daily-collection" :
                                sub === "Payment Receipt Report" ? "/reports/payment-receipt" :
                                sub === "Complement report (All Doctors)" ? "/reports/complement-all-doctors" :
                                sub === "Dashboard" ? "/reports/report-dashboard" : "/"
                              )}
                              className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                            >
                              {sub}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (item === "Cost Related Report") {
                    return (
                      <div key={item} className="relative group/cost">
                        <div className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer flex justify-between">
                          Cost Related Report <span>▶</span>
                        </div>
                        <div className="absolute left-full top-0 w-3 h-full"></div>
                        <div className="absolute left-full top-0 ml-1 w-72 bg-slate-900 rounded shadow-lg opacity-0 pointer-events-none group-hover/cost:opacity-100 group-hover/cost:pointer-events-auto transition">
                          {costReportItems.map((sub) => (
                            <div
                              key={sub}
                              onClick={() => handleNavigation(
                                sub === "Center wise cost Report" ? "/reports/center-wise-cost-report" :
                                sub === "B2B Testwise Cost Report" ? "/reports/b2b-testwise-cost-report" : "/"
                              )}
                              className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                            >
                              {sub}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (item === "Others Report") {
                    return (
                      <div key={item} className="relative group/other">
                        <div className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer flex justify-between">
                          Others Report <span>▶</span>
                        </div>
                        <div className="absolute left-full top-0 w-3 h-full"></div>
                        <div className="absolute left-full top-0 ml-1 w-72 bg-slate-900 rounded shadow-lg opacity-0 pointer-events-none group-hover/other:opacity-100 group-hover/other:pointer-events-auto transition">
                          {allowedOtherItems.map((sub) => (
                            <div
                              key={sub}
                              onClick={() => handleNavigation(
                                sub === "Turn around time" ? "/reports/turn-around-time" :
                                sub === "Worksheet" ? "/reports/worksheet" :
                                sub === "Detailed Worksheet" ? "/reports/detailed-worksheet" :
                                sub === "User Login Report" ? "/reports/user-login-report" :
                                sub === "Discount Report" ? "/reports/discount-report" :
                                sub === "Monthly Collection Summary" ? "/reports/monthly-collection-summary" :
                                sub === "Sample Rejection Report" ? "/reports/sample-rejection-report" :
                                sub === "Hospital Bills" ? "/reports/hospital-bills" : "/"
                              )}
                              className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                            >
                              {sub}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item}
                      onClick={() => handleNavigation(
                        item === "Patient List" ? "/reports/patient-list" :
                        item === "Bulk Settlement" ? "/reports/bulk-settlement" :
                        item === "B2B Bulk Settlement" ? "/reports/b2b-bulk-settlement" :
                        item === "Service Count" ? "/reports/service-count" :
                        item === "Group Summary" ? "/reports/group-summary" :
                        item === "Test Report" ? "/reports/test-report" : "/"
                      )}
                      className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                    >
                      {item}
                    </div>
                  );
                })}
              </div>

              {/* Mobile click dropdown */}
              {openDropdown === 'report' && (
                <div className="md:hidden mt-2 w-full bg-slate-700 rounded shadow-lg max-h-60 overflow-y-auto">
                  {allowedReportMenu.map((item) => {
                    if (item === "MIS Report") {
                      return (
                        <div key={item}>
                          <div 
                            className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 flex justify-between items-center"
                            onClick={() => toggleSubDropdown('misReport')}
                          >
                            MIS Report 
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform ${openSubDropdown === 'misReport' ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          {openSubDropdown === 'misReport' && (
                            <div className="bg-slate-600 rounded-b">
                              {allowedMisItems.map((sub) => (
                                <div
                                  key={sub}
                                  className="px-6 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-500 last:border-b-0"
                                  onClick={() => handleNavigation(
                                    sub === "Daily Collection" ? "/reports/daily-collection" :
                                    sub === "Payment Receipt Report" ? "/reports/payment-receipt" :
                                    sub === "Complement report (All Doctors)" ? "/reports/complement-all-doctors" :
                                    sub === "Dashboard" ? "/reports/report-dashboard" : "/"
                                  )}
                                >
                                  {sub}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (item === "Cost Related Report") {
                      return (
                        <div key={item}>
                          <div 
                            className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 flex justify-between items-center"
                            onClick={() => toggleSubDropdown('costReport')}
                          >
                            Cost Related Report 
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform ${openSubDropdown === 'costReport' ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          {openSubDropdown === 'costReport' && (
                            <div className="bg-slate-600 rounded-b">
                              {costReportItems.map((sub) => (
                                <div
                                  key={sub}
                                  className="px-6 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-500 last:border-b-0"
                                  onClick={() => handleNavigation(
                                    sub === "Center wise cost Report" ? "/reports/center-wise-cost-report" :
                                    sub === "B2B Testwise Cost Report" ? "/reports/b2b-testwise-cost-report" : "/"
                                  )}
                                >
                                  {sub}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (item === "Others Report") {
                      return (
                        <div key={item}>
                          <div 
                            className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 flex justify-between items-center"
                            onClick={() => toggleSubDropdown('othersReport')}
                          >
                            Others Report 
                            <ChevronDown 
                              size={14} 
                              className={`transition-transform ${openSubDropdown === 'othersReport' ? 'rotate-180' : ''}`} 
                            />
                          </div>
                          {openSubDropdown === 'othersReport' && (
                            <div className="bg-slate-600 rounded-b">
                              {allowedOtherItems.map((sub) => (
                                <div
                                  key={sub}
                                  className="px-6 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-500 last:border-b-0"
                                  onClick={() => handleNavigation(
                                    sub === "Turn around time" ? "/reports/turn-around-time" :
                                    sub === "Worksheet" ? "/reports/worksheet" :
                                    sub === "Detailed Worksheet" ? "/reports/detailed-worksheet" :
                                    sub === "User Login Report" ? "/reports/user-login-report" :
                                    sub === "Discount Report" ? "/reports/discount-report" :
                                    sub === "Monthly Collection Summary" ? "/reports/monthly-collection-summary" :
                                    sub === "Sample Rejection Report" ? "/reports/sample-rejection-report" :
                                    sub === "Hospital Bills" ? "/reports/hospital-bills" : "/"
                                  )}
                                >
                                  {sub}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item}
                        onClick={() => handleNavigation(
                          item === "Patient List" ? "/reports/patient-list" :
                          item === "Bulk Settlement" ? "/reports/bulk-settlement" :
                          item === "B2B Bulk Settlement" ? "/reports/b2b-bulk-settlement" :
                          item === "Service Count" ? "/reports/service-count" :
                          item === "Group Summary" ? "/reports/group-summary" :
                          item === "Test Report" ? "/reports/test-report" : "/"
                        )}
                        className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                      >
                        {item}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="relative group">
              <span 
                className="cursor-pointer font-semibold px-2 py-1 text-12px flex items-center gap-2 md:hover:bg-cyan-600 md:rounded"
                onClick={() => toggleDropdown('config')}
              >
                <Settings size={18} /> Configuration
                <ChevronDown 
                  size={16} 
                  className={`md:hidden transition-transform ${openDropdown === 'config' ? 'rotate-180' : ''}`} 
                />
              </span>

              {/* Desktop hover dropdown */}
              <div className="hidden md:block absolute left-0 top-full h-3 w-full"></div>
              <div className="hidden md:block absolute left-0 mt-2 w-52 bg-slate-800 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                {menus[2].items.map((item) => (
                  <div
                    key={item}
                    className="px-4 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                    onClick={() => {
                      if (item === "Signature") { handleNavigation("/config/signature"); }
                      else if (configComingSoon.has(item)) { setComingSoon(item); setOpenDropdown(null); }
                      else setOpenDropdown(null);
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Mobile click dropdown */}
              {openDropdown === 'config' && (
                <div className="md:hidden mt-2 w-full bg-slate-700 rounded shadow-lg">
                  {menus[2].items.map((item) => (
                    <div
                      key={item}
                      className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                      onClick={() => {
                        if (item === "Signature") { handleNavigation("/config/signature"); }
                        else if (configComingSoon.has(item)) { setComingSoon(item); setOpenDropdown(null); }
                        else setOpenDropdown(null);
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help */}
            <div className="relative group">
              <span 
                className="cursor-pointer font-semibold px-2 py-1 text-12px flex items-center gap-2 md:hover:bg-cyan-600 md:rounded"
                onClick={() => toggleDropdown('help')}
              >
                <HelpCircle size={18} /> Help
                <ChevronDown 
                  size={16} 
                  className={`md:hidden transition-transform ${openDropdown === 'help' ? 'rotate-180' : ''}`} 
                />
              </span>

              {/* Desktop hover dropdown */}
              <div className="hidden md:block absolute left-0 top-full h-3 w-full"></div>
              <div className="hidden md:block absolute left-0 mt-2 w-52 bg-slate-800 rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition">
                {helpItems.map((item) => (
                  <div
                    key={item}
                    className="px-2 py-1 text-sm hover:bg-cyan-600 cursor-pointer"
                    onClick={() => {
                      const link = helpLinks[item];
                      if (link?.type === 'download') {
                        triggerDownload(link.url, link.filename);
                        setOpenDropdown(null);
                      } else if (helpComingSoon.has(item)) {
                        setComingSoon(item); setOpenDropdown(null);
                      }
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Mobile click dropdown */}
              {openDropdown === 'help' && (
                <div className="md:hidden mt-2 w-full bg-slate-700 rounded shadow-lg">
                  {helpItems.map((item) => (
                    <div
                      key={item}
                      className="px-4 py-2 text-sm hover:bg-cyan-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                      onClick={() => {
                        const link = helpLinks[item];
                        if (link?.type === 'download') {
                          triggerDownload(link.url, link.filename);
                          setOpenDropdown(null);
                        } else if (helpComingSoon.has(item)) {
                          setComingSoon(item); setOpenDropdown(null);
                        }
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Result */}
            <div
              className="cursor-pointer font-semibold px-2 py-1 text-12px flex items-center gap-2"
              onClick={() => router.push("/result")}
            >
              <ClipboardCheck size={18} /> Result
            </div>

          </nav>
        </div>
      </header>

      {/* Coming Soon Modal */}
      <ComingSoon feature={comingSoon} onClose={() => setComingSoon(null)} />

      {/* YouTube Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setVideoModal(null)}>
          <div className="relative w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVideoModal(null)}
              className="absolute -top-9 right-0 text-white hover:text-red-400 flex items-center gap-1 text-sm">
              <X size={18}/> Close
            </button>
            <div className="relative w-full" style={{paddingTop:"56.25%"}}>
              <iframe
                src={`${videoModal}?autoplay=1`}
                className="absolute inset-0 w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Help Video"
              />
            </div>
          </div>
        </div>
      )}

      <style>
        {`
        @keyframes slideFade {
          0% { opacity: 0; transform: translateX(-30px); }
          20% { opacity: 1; transform: translateX(0); }
          80% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(30px); }
        }
        .animate-slideFade {
          animation: slideFade 6s ease-in-out infinite;
        }
        .delay-0 { animation-delay: 0s; }
        .delay-200 { animation-delay: 0.8s; }
        .delay-400 { animation-delay: 1.6s; }
      `}
      </style>
    </>
  );
};

export default Header;
