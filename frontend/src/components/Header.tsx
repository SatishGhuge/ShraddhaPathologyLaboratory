"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
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
} from "lucide-react";

const logo = "/logo.png";

interface NavModule {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: { label: string; path: string }[];
}

const modules: NavModule[] = [
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
      { label: "Roles", path: "/master/rolelist" },
      { label: "Users", path: "/master/userlist" },
      { label: "Charges", path: "/master/charges" },
      { label: "Referral Doctors", path: "/master/referral-doctor-list" },
      { label: "Centers", path: "/master/centerlist" },
      { label: "Corporates", path: "/master/corporatelist" },
      { label: "Franchise List", path: "/master/franchise" },
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
      { label: "Daily Collection", path: "/reports/daily-collection" },
      { label: "Monthly Collection Summary", path: "/reports/monthly-collection-summary" },
      { label: "Patient List", path: "/reports/patient-list" },
      { label: "Center wise cost Report", path: "/reports/center-wise-cost-report" },
      { label: "B2B Testwise Cost Report", path: "/reports/b2b-testwise-cost-report" },
      { label: "Discount Report", path: "/reports/discount-report" },
      { label: "Test Report", path: "/reports/test-report" },
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
    id: "result",
    title: "Result",
    icon: <ClipboardCheck size={20} />,
    items: [],
  },
];

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dateTime, setDateTime] = useState(new Date());
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");
  const [notifications, setNotifications] = useState<any[]>([]);

  // Check if on public route
  const publicRoutes = ["/", "/login", "/seed-data"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // All hooks must be called BEFORE any conditional returns
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("admin") || "{}");
    setCurrentUser(user);
    
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Filter modules based on user role
  const getVisibleModules = () => {
    return modules.filter((module) => {
      if (module.id === "master" && (isRestricted || isUser)) {
        return false;
      }
      return true;
    });
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
  };

  const handleBackClick = () => {
    setActiveModule(null);
  };

  const handleLogoClick = () => {
    router.push("/labdashboard");
    setActiveModule(null);
  };

  return (
    <>
      {/* Top Header */}
      <header className="fixed top-0 left-48 right-0 h-14 bg-white z-50 border-b border-gray-300">
        <div className="flex items-center justify-between h-full px-6 gap-4">
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Patient, Sample ID, Report..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
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
                <p className="text-sm font-semibold text-gray-800">Shraddha Admin</p>
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
                SA
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
                    return (
                      <div className="space-y-3">
                        <div className="text-center">
                          <h3 className="text-lg font-bold mb-1 text-primary-700">
                            WELCOME {isAdmin ? 'ADMIN' : role.toUpperCase()}
                          </h3>
                          <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full mx-auto flex items-center justify-center mb-2">
                            <span className="text-xl font-bold text-primary-600">SA</span>
                          </div>
                        </div>

                        <div className="space-y-2 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-3 text-sm border border-primary-100">
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

      {/* Sidebar */}
      <aside className="w-48 bg-white flex flex-col overflow-hidden h-screen fixed left-0 top-0 z-40 border-r border-gray-300">
        
        {/* Sidebar Header */}
        <div 
          onClick={handleLogoClick}
          className="p-6 border-b border-gray-300 flex items-center gap-2 h-14 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primary-500 leading-tight">SHRADDHA</span>
            <span className="text-xs text-gray-600 leading-tight">Pathology Lab</span>
          </div>
        </div>
        
        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto">
          {!activeModule ? (
            // Main Modules List
            <nav className="p-2 space-y-1">
              {visibleModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => handleModuleClick(module.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-50 transition-all duration-200 text-left font-medium text-sm group text-gray-700 hover:text-primary-600"
                >
                  <span className="text-primary-500 group-hover:text-primary-600 transition-colors">
                    {module.icon}
                  </span>
                  <span className="flex-1">{module.title}</span>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-primary-500" />
                </button>
              ))}
            </nav>
          ) : selectedModule ? (
            // Sub-modules List
            <nav className="p-3 space-y-1">
              <h3 className="px-2 py-2 text-xs font-bold text-primary-500 uppercase tracking-wider mb-2">
                {selectedModule.title}
              </h3>
              {selectedModule.items.map((item, index) => (
                <button
                  key={`${selectedModule.id}-${index}`}
                  onClick={() => handleItemClick(item.path)}
                  className="w-full flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-primary-50 transition-colors text-left text-sm text-gray-600 hover:text-primary-600 group"
                >
                  <span className="text-primary-400 group-hover:text-primary-600">▸</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
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
