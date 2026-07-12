"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarContext } from "@/app/layout-wrapper";
import {
  User,
  Database,
  FileBarChart2,
  Settings,
  HelpCircle,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Search,
  Bell,
  Package,
} from "lucide-react";
import { getAccessibleModules } from "@/utils/modulePermissions";

const logo = "/logo.png";

interface NavModule {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: { label: string; path: string }[];
}

const allModules: NavModule[] = [
  {
    id: "patient",
    title: "Patient",
    icon: <User size={20} />,
    items: [
      { label: "Patient Registration", path: "/patient/registration" },
      { label: "Search for Test", path: "/patient/search-booking" },
    ],
  },
  {
    id: "master",
    title: "Master",
    icon: <Database size={20} />,
    items: [
      { label: "Tests", path: "/master/testlist" },
      { label: "Test Template", path: "/master/test-templets" },
      { label: "Department", path: "/master/departmentlist" },
      { label: "Packages", path: "/master/packagelist" },
      { label: "Charges", path: "/master/charges" },
      { label: "Roles", path: "/master/rolelist" },
      { label: "Users", path: "/master/userlist" },
      { label: "Referral Doctors", path: "/master/referral-doctor-list" },
      { label: "Organization", path: "/master/organization" },
      { label: "Specimen Type", path: "/master/specimen-type" },
      { label: "Units", path: "/master/units" },
    ],
  },
  {
    id: "report",
    title: "Report",
    icon: <FileBarChart2 size={20} />,
    items: [
      { label: "Dashboard", path: "/reports/report-dashboard" },
      { label: "Collection Report", path: "/reports/collection" },
      { label: "Patient List", path: "/reports/patient-list" },
      { label: "Referral Doctor Revenue", path: "/reports/referral-doctor-revenue" },
      { label: "Test Report", path: "/reports/test-report" },
      { label: "Turn Around Time", path: "/reports/turn-around-time" },
    ],
  },
  {
    id: "configuration",
    title: "Configuration",
    icon: <Settings size={20} />,
    items: [
      { label: "Signature", path: "/config/signature" },
    ],
  },
  {
    id: "help",
    title: "Help",
    icon: <HelpCircle size={20} />,
    items: [
      { label: "User Manual", path: "#" },
      { label: "Download Ultraviewer", path: "#" },
      { label: "Download Anydesk", path: "#" },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: <Package size={20} />,
    items: [
      { label: "Item Master",         path: "/inventory/item-master" },
      { label: "Stock Transactions",  path: "/inventory/stock-transactions" },
      { label: "Stock Transfers",     path: "/inventory/transfers" },
      { label: "Expiry Tracker",      path: "/inventory/expiry-tracker" },
    ],
  },
  {
    id: "result",
    title: "Result",
    icon: <ClipboardCheck size={20} />,
    items: [],
  },
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dateTime, setDateTime] = useState(new Date());
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [modules, setModules] = useState<NavModule[]>(allModules);

  // Check if on public route
  const publicRoutes = ["/", "/login", "/seed-data"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // All hooks must be called BEFORE any conditional returns
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("admin") || "{}");
    setCurrentUser(user);
    console.log('🔍 Header - Initial user load:', user);

    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for storage changes and custom login event
  useEffect(() => {
    // Handle custom userLoggedIn event (same tab login)
    const handleUserLoggedIn = (e: any) => {
      const user = e.detail || JSON.parse(localStorage.getItem("admin") || "{}");
      setCurrentUser(user);
      console.log('🔍 Header - User logged in (custom event):', user);
    };

    // Handle storage changes (other tabs/windows)
    const handleStorageChange = (e?: StorageEvent) => {
      if (e?.key === 'admin') {
        const user = JSON.parse(localStorage.getItem("admin") || "{}");
        setCurrentUser(user);
        console.log('🔍 Header - Storage changed (other tab), user updated:', user);
        
        // If user logged out (empty object), navigate to login
        if (!user.id) {
          console.log('🔍 Header - User logged out, redirecting to login');
          router.push('/login');
        }
      }
    };

    // Check immediately when component mounts (for initial sync)
    const user = JSON.parse(localStorage.getItem("admin") || "{}");
    setCurrentUser(user);

    // Listen for custom login event (same tab)
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  // Filter modules based on user module allocation
  useEffect(() => {
    const filterModulesByAllocation = () => {
      const user = JSON.parse(localStorage.getItem("admin") || "{}");
      const moduleAllocation = user.moduleAllocation;

      console.log('🔍 Header - User:', user);
      console.log('🔍 Header - moduleAllocation (raw):', moduleAllocation);
      console.log('🔍 Header - moduleAllocation type:', typeof moduleAllocation);

      // Only filter if moduleAllocation exists and is not empty
      if (moduleAllocation && (typeof moduleAllocation === 'string' || typeof moduleAllocation === 'object')) {
      try {
        const accessible = getAccessibleModules(moduleAllocation);
        console.log('🔍 Header - accessible (parsed):', accessible);
        console.log('🔍 Header - accessible.masters:', accessible.masters);
        console.log('🔍 Header - accessible.masters.hasAccess:', accessible.masters.hasAccess);
        
        const filteredModules = allModules.map(module => {
          if (module.id === "patient") {
            const filtered = {
              ...module,
              items: module.items.filter(item => {
                if (item.path.includes("registration")) return accessible.patient.registration;
                if (item.path.includes("search-booking")) return accessible.patient.tests;
                return false;
              })
            };
            console.log('🔍 Header - patient filtered:', filtered);
            return filtered;
          }
          
          if (module.id === "master") {
            const filtered = {
              ...module,
              items: module.items.filter(item => {
                if (item.path.includes("testlist")) return accessible.masters.testlist;
                if (item.path.includes("units")) return accessible.masters.units;
                if (item.path.includes("referral-doctor")) return accessible.masters.referralDoctorList;
                if (item.path.includes("specimen-type")) return accessible.masters.specimenType;
                if (item.path.includes("test-templets")) return accessible.masters.testTemplates;
                if (item.path.includes("departmentlist")) return accessible.masters.departmentlist;
                if (item.path.includes("packagelist")) return accessible.masters.packagelist;
                if (item.path.includes("rolelist")) return accessible.masters.rolelist;
                if (item.path.includes("userlist")) return accessible.masters.userlist;
                if (item.path.includes("charges")) return accessible.masters.charges;
                if (item.path.includes("organization")) return accessible.masters.organization;
                return false;
              })
            };
            console.log('🔍 Header - master filtered:', filtered);
            console.log('🔍 Header - master items count:', filtered.items.length);
            return filtered;
          }
          
          if (module.id === "report") {
            const filtered = {
              ...module,
              items: module.items.filter(item => {
                if (item.path.includes("report-dashboard")) return accessible.reports.dashboard;
                if (item.path.includes("/collection")) return accessible.reports.collectionReport;
                if (item.path.includes("patient-list")) return accessible.reports.patientList;
                if (item.path.includes("referral-doctor-revenue")) return accessible.reports.referralDoctorRevenue;
                if (item.path.includes("center-wise")) return accessible.reports.centerWiseCostReport;
                if (item.path.includes("b2b-testwise")) return accessible.reports.b2bTestwiseCostReport;
                if (item.path.includes("discount-report")) return accessible.reports.discountReport;
                if (item.path.includes("test-report")) return accessible.reports.testReport;
                return false;
              })
            };
            console.log('🔍 Header - report filtered:', filtered);
            return filtered;
          }
          
          if (module.id === "configuration") {
            const filtered = {
              ...module,
              items: module.items.filter(item => {
                if (item.label === "Signature") return accessible.configuration.signature;
                return false;
              })
            };
            console.log('🔍 Header - configuration filtered:', filtered);
            return filtered;
          }
          
          if (module.id === "help") {
            const filtered = {
              ...module,
              items: module.items.filter(item => {
                if (item.label === "User Manual") return accessible.help.userManual;
                if (item.label === "Download Ultraviewer") return accessible.help.ultraviewer;
                if (item.label === "Download Anydesk") return accessible.help.anydesk;
                return false;
              })
            };
            console.log('🔍 Header - help filtered:', filtered);
            return filtered;
          }
          
          if (module.id === "result") {
            return accessible.result ? module : { ...module, items: [] };
          }
          
          // Inventory — always visible (no allocation filter yet)
          if (module.id === "inventory") {
            return module;
          }
          
          return module;
        }).filter(module => {
          // Hide modules with no accessible items
          const shouldHide = module.items.length === 0 && ["patient", "master", "report", "configuration", "help"].includes(module.id);
          console.log(`🔍 Header - module ${module.id}: items=${module.items.length}, shouldHide=${shouldHide}`);
          if (shouldHide) {
            return false;
          }
          return true;
        });
        
        console.log('🔍 Header - filteredModules:', filteredModules);
        setModules(filteredModules);
      } catch (error) {
        console.error('🔍 Header - Error parsing moduleAllocation:', error);
        setModules(allModules);
      }
    } else {
      console.log('🔍 Header - No moduleAllocation found, showing all modules');
      setModules(allModules);
    }
    };

    // Filter modules immediately when component mounts or user changes
    filterModulesByAllocation();
  }, [currentUser]);

  // Determine active module based on current pathname
  useEffect(() => {
    // Don't close sidebar on navigation - user can manually close if needed
    // setSidebarOpen(false);  // REMOVED - sidebar should stay open

    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      let moduleId = pathSegments[0];

      // Handle path-to-module ID mapping (e.g., "reports" -> "report")
      const pathToModuleMap: { [key: string]: string } = {
        "reports": "report",
      };

      if (pathToModuleMap[moduleId]) {
        moduleId = pathToModuleMap[moduleId];
      }

      // Check if this is a valid module
      const validModule = modules.find(m => m.id === moduleId);
      if (validModule) {
        setActiveModule(moduleId);
      }
    }
  }, [pathname, modules]);

  // Load notifications from localStorage
  useEffect(() => {
    const loadCallbacks = () => {
      const stored = JSON.parse(localStorage.getItem("callbackRequests") || "[]");
      return stored.filter((r: any) => !r.called);
    };
    setNotifications(loadCallbacks());

    // Listen for new callback requests
    const handler = () => setNotifications(loadCallbacks());
    window.addEventListener("callbackRequestAdded", handler);
    return () => window.removeEventListener("callbackRequestAdded", handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (showAdminPopup && !event.target.closest('.admin-popup-container')) {
        setShowAdminPopup(false);
      }
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAdminPopup, showNotifications]);

  // Show header only on public routes - NOW AFTER ALL HOOKS
  if (isPublicRoute) {
    return null;
  }

  const isCollectionCenter = currentUser.role === "Collection Center";
  const isFranchise = currentUser.role === "Franchise";
  const isUser = currentUser.userType === "user" && !isCollectionCenter && !isFranchise;
  const isRestricted = isCollectionCenter || isFranchise;

  // Filter modules based on user role (legacy role-based filtering)
  const getVisibleModules = () => {
    return modules;
  };

  const visibleModules = getVisibleModules();
  const selectedModule = visibleModules.find((m) => m.id === activeModule);

  const handleModuleClick = (moduleId: string) => {
    // If module has no items, navigate directly to the module page
    const module = visibleModules.find(m => m.id === moduleId);
    if (module && module.items.length === 0) {
      router.push(`/${moduleId}`);
    } else {
      setActiveModule(moduleId);
    }
  };

  const handleItemClick = (path: string) => {
    router.push(path);
    // Don't close the sidebar - let the useEffect handle active module based on pathname
  };

  const handleBackClick = () => {
    // Only close sidebar if navigating away from the module
    setActiveModule(null);
    router.push("/labdashboard");
  };

  const handleLogoClick = () => {
    router.push("/labdashboard");
    setActiveModule(null);
  };

  return (
    <>
      {/* Top Header - Full Width */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white z-50 border-b border-gray-300">
        <div className="flex items-center justify-between h-full px-6 gap-4">

          {/* Logo + Brand (No Toggle Button) */}
          <div className="flex items-center gap-2">
            {/* Logo + Brand Name - Larger */}
            <div
              onClick={handleLogoClick}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Logo" className="w-12 h-12 object-contain  flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-primary-500 leading-tight underline decoration-primary-500 underline-offset-4">
                  SHRADDHA
                </span>
                <span className="text-sm text-gray-600 leading-tight">Pathology Lab</span>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-6">
            {/* Notification Bell */}
            <div className="relative notification-container">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowAdminPopup(false);
                }}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Bell size={20} className="text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                    <span className="font-semibold text-gray-700 text-sm">
                      Home Visit Requests {notifications.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{notifications.length}</span>}
                    </span>
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value)}
                      className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
                      onClick={e => e.stopPropagation()}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-6">No pending callback requests</p>
                    ) : (
                      [...notifications]
                        .sort((a: any, b: any) => sortOrder === "newest"
                          ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                          : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        )
                        .map(n => {
                          const dt = new Date(n.timestamp);
                          const dateStr = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                          const timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                          return (
                            <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <input
                                type="checkbox"
                                title="Mark as called — removes from list"
                                className="mt-1 w-4 h-4 accent-orange-600 cursor-pointer flex-shrink-0"
                                onChange={() => {
                                  const updated = JSON.parse(localStorage.getItem("callbackRequests") || "[]")
                                    .map((r: any) => r.id === n.id ? { ...r, called: true } : r);
                                  localStorage.setItem("callbackRequests", JSON.stringify(updated));
                                  setNotifications((prev: any) => prev.filter((x: any) => x.id !== n.id));
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{n.name}</p>
                                <p className="text-xs text-orange-700 font-medium">{n.phone}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{dateStr} • {timeStr}</p>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span className="text-green-500">✓</span>
                        Check the box after calling to remove from list
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Section */}
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200 relative admin-popup-container">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">
                  {(() => {
                    const user = JSON.parse(localStorage.getItem('admin') || '{}');
                    const isAdmin = user.userType === 'admin' || !user.userType;
                    if (isAdmin && user.organization) {
                      return user.organization.name;
                    }
                    const displayName = user.name || user.username || 'User';
                    return isAdmin ? 'Shraddha Admin' : displayName;
                  })()}
                </p>
                <p className="text-xs text-gray-500">
                  {dateTime.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })} {dateTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div
                className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setShowAdminPopup(!showAdminPopup)}
              >
                {(() => {
                  const user = JSON.parse(localStorage.getItem('admin') || '{}');
                  const isAdmin = user.userType === 'admin' || !user.userType;
                  if (isAdmin && user.organization) {
                    const initials = user.organization.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                    return initials || 'ORG';
                  }
                  if (isAdmin) return 'SA';
                  const name = user.name || user.username || 'U';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                  return initials || 'U';
                })()}
              </div>

              {/* Admin Popup */}
              {showAdminPopup && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border-2 border-primary-200 p-4 z-50">
                  {(() => {
                    const user = JSON.parse(localStorage.getItem('admin') || '{}');
                    const isAdmin = user.userType === 'admin' || !user.userType;
                    const displayName = user.name || user.username || 'User';
                    const username = user.username || '-';
                    const rawRole = user.role || (isAdmin ? 'Admin' : 'User');
                    const role = rawRole.toUpperCase().includes('ADMIN') || rawRole.toUpperCase().includes('SUPER') ? 'Admin' : rawRole;
                    const orgName = user.organization?.name || null;
                    const initials = orgName ? orgName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'SA';
                    return (
                      <div className="space-y-3">
                        <div className="text-center">
                          <h3 className="text-lg font-bold mb-1 text-primary-700">
                            WELCOME {isAdmin ? 'ADMIN' : role.toUpperCase()}
                          </h3>
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full mx-auto flex items-center justify-center mb-2">
                            <span className="text-xl font-bold text-primary-600">{initials}</span>
                          </div>
                        </div>

                        <div className="space-y-2 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-3 text-sm border border-primary-100">
                          {orgName && (
                            <div>
                              <p className="text-xs text-gray-600">Organization:</p>
                              <p className="font-semibold text-gray-800">{orgName}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-600">Name:</p>
                            <p className="font-semibold text-gray-800">{displayName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Username:</p>
                            <p className="font-semibold text-gray-800">{username}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Logged in as:</p>
                            <p className="font-semibold text-gray-800">{role}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to logout?")) {
                              localStorage.removeItem('token');
                              localStorage.removeItem('admin');
                              document.cookie = 'token=; path=/; max-age=0';
                              localStorage.removeItem('patientRegistrationDraft');
                              router.push("/login");
                            }
                          }}
                          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        >
                          <span>Logout</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Left Edge Hover Arrow - Toggle Sidebar */}
      <div
        className="fixed left-0 top-14 h-96 w-1 hover:w-8 z-40 transition-all duration-300 group"
        onMouseEnter={() => setSidebarOpen(true)}
      >
        {/* Arrow appears on hover */}
        {!sidebarOpen && (
          <div className="h-full bg-gradient-to-r from-primary-100 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ChevronRight size={20} className="text-primary-600 absolute left-1" />
          </div>
        )}
      </div>

      {/* Bottom-Left Corner Button - Only visible when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 left-6 z-40 w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center shadow-lg transition-all duration-300 hover:shadow-xl"
          title="Open sidebar"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Sidebar - Slides in from left */}
      <aside className={`w-48 bg-white flex flex-col overflow-hidden h-screen fixed left-0 top-14 z-40 border-r border-gray-300 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>

        {/* Sidebar Header with Close Button */}
        <div className="flex items-center justify-between px-7 py-2 border-b border-gray-200">
          <h3 className="font-bold text-primary-600">Menu</h3>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Close sidebar"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto transition-all duration-200 animate-in fade-in">
          {!activeModule ? (
            // Main Modules List
            <nav className="p-2 space-y-1" key="modules-list">
              {visibleModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => handleModuleClick(module.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left font-medium text-sm group ${activeModule === module.id
                      ? 'bg-primary-50 text-primary-600'
                      : 'hover:bg-primary-50 text-gray-700 hover:text-primary-600'
                    }`}
                >
                  <span className={`transition-colors ${activeModule === module.id
                      ? 'text-primary-600'
                      : 'text-primary-500 group-hover:text-primary-600'
                    }`}>
                    {module.icon}
                  </span>
                  <span className="flex-1">{module.title}</span>
                  <ChevronRight size={16} className={`transition-colors ${activeModule === module.id
                      ? 'text-primary-500'
                      : 'text-gray-400 group-hover:text-primary-500'
                    }`} />
                </button>
              ))}
            </nav>
          ) : selectedModule ? (
            // Sub-modules List with active module header
            <nav className="p-3 space-y-1" key={`submenu-${selectedModule.id}`}>
              {/* Active Module Header - shows even when viewing submenu */}
              <div className="bg-primary-50 text-primary-600 px-3 py-2 rounded-lg mb-2 flex items-center gap-2 border border-primary-200">
                <span className="text-primary-600">{selectedModule.icon}</span>
                <h3 className="text-xs font-bold text-primary-600 uppercase tracking-wider">
                  {selectedModule.title}
                </h3>
              </div>
              {selectedModule.items.map((item, index) => {
                // Check if this item's path matches the current pathname
                const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                return (
                  <button
                    key={`${selectedModule.id}-${index}`}
                    onClick={() => handleItemClick(item.path)}
                    className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-left text-sm group ${isActive
                        ? 'bg-primary-50 text-primary-600 font-medium'
                        : 'text-gray-600 hover:bg-primary-50'
                      }`}
                  >
                    <span className={`transition-colors ${isActive ? 'text-primary-600' : 'text-primary-400 group-hover:text-primary-600'}`}>▸</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>

        {/* Back Button - Only show when submenu is active */}
        {activeModule && (
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleBackClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 hover:bg-primary-50 rounded-lg transition-colors font-semibold text-sm text-primary-500"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="p-3 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>© 2026 Shraddha Pathology</p>
        </div>
      </aside>
    </>
  );
};

export default Header;
