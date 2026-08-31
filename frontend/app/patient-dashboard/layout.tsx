"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  TestTube,
  Calendar,
  FileText,
  User,
  LogOut,
  Bell,
  MapPin,
  Menu,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Check if patient is logged in
    const patientData = localStorage.getItem("patient");
    const token = localStorage.getItem("patientToken");
    
    if (!patientData || !token) {
      // Redirect to patient login
      if (typeof window !== "undefined") {
        router.push("/patient-auth/login");
      }
    } else {
      try {
        setPatient(JSON.parse(patientData));
      } catch (error) {
        console.error("Error parsing patient data:", error);
        localStorage.removeItem("patient");
        localStorage.removeItem("patientToken");
        router.push("/patient-auth/login");
      }
    }

    // Load and generate notifications for upcoming visits
    loadNotifications();
  }, [router]);

  const loadNotifications = () => {
    // Get all bookings
    const labBookings = JSON.parse(localStorage.getItem("labBookings") || "[]");
    const homeVisits = JSON.parse(localStorage.getItem("patientHomeVisits") || "[]");

    const now = new Date();
    const upcomingNotifications: any[] = [];

    // Check lab bookings
    labBookings.forEach((booking: any) => {
      const visitDate = new Date(booking.visitDate);
      const daysUntil = Math.ceil((visitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Show notifications for visits within 7 days
      if (daysUntil > 0 && daysUntil <= 7) {
        upcomingNotifications.push({
          id: `lab-${booking.id}`,
          type: "lab",
          bookingId: booking.id,
          title: "Lab Visit Scheduled",
          message: `Your lab visit is scheduled for ${new Date(booking.visitDate).toLocaleDateString("en-GB")} at ${booking.visitTime}`,
          date: booking.visitDate,
          daysUntil,
          status: booking.status,
          read: false,
        });
      }
    });

    // Check home visits
    homeVisits.forEach((visit: any) => {
      const visitDate = new Date(visit.date);
      const daysUntil = Math.ceil((visitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Show notifications for visits within 7 days
      if (daysUntil > 0 && daysUntil <= 7) {
        upcomingNotifications.push({
          id: `home-${visit.id}`,
          type: "home",
          bookingId: visit.id,
          title: "Home Visit Scheduled",
          message: `Sample collection scheduled for ${new Date(visit.date).toLocaleDateString("en-GB")} at ${visit.time}`,
          date: visit.date,
          daysUntil,
          status: visit.status,
          read: false,
        });
      }
    });

    // Sort by days until visit (soonest first)
    upcomingNotifications.sort((a, b) => a.daysUntil - b.daysUntil);

    setNotifications(upcomingNotifications);
    setUnreadCount(upcomingNotifications.filter((n) => !n.read).length);

    // Save to localStorage for persistence
    localStorage.setItem("notificationsSeen", JSON.stringify(upcomingNotifications));
  };

  const handleLogout = () => {
    localStorage.removeItem("patient");
    localStorage.removeItem("patientToken");
    router.push("/patient-dashboard/login");
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/patient-dashboard",
      icon: Home,
    },
    {
      name: "Browse Tests",
      href: "/patient-dashboard/tests",
      icon: TestTube,
    },
    {
      name: "My Bookings",
      href: "/patient-dashboard/bookings",
      icon: Calendar,
    },
    {
      name: "My Reports",
      href: "/patient-dashboard/reports",
      icon: FileText,
    },
    {
      name: "Home Visit",
      href: "/patient-dashboard/home-visit",
      icon: MapPin,
    },
    {
      name: "Notifications",
      href: "/patient-dashboard/notifications",
      icon: Bell,
    },
    {
      name: "My Profile",
      href: "/patient-dashboard/profile",
      icon: User,
    },
  ];

  // Redirect to main homepage if not logged in
  if (!patient && typeof window !== "undefined") {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
          </button>
          <h1 className="text-lg font-bold text-gray-800">Patient Portal</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors relative"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 shadow-lg ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:shadow-none`}
      >
        {/* Logo */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[oklch(45%_0.085_224.283)] rounded-full flex items-center justify-center">
              <TestTube size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">Patient Portal</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-blue-50 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Patient Info */}
        {patient && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-[oklch(45%_0.085_224.283)]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={24} className="text-[oklch(45%_0.085_224.283)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {patient.title} {patient.firstName} {patient.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{patient.mobile}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[oklch(45%_0.085_224.283)] text-white shadow-md"
                    : "text-gray-700 hover:bg-blue-50 hover:text-[oklch(45%_0.085_224.283)]"
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Page Content */}
        <main className="p-4 lg:p-8 pt-20 lg:pt-8 bg-white">{children}</main>
      </div>

      {/* Notification Panel */}
      {showNotificationPanel && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"
            onClick={() => setShowNotificationPanel(false)}
          />
          <div className="fixed top-16 right-0 w-96 max-w-[calc(100vw-1rem)] bg-white border-l border-gray-200 shadow-2xl z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-800">Notifications</h2>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-2 p-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      markNotificationAsRead(notification.id);
                      router.push("/patient-dashboard/bookings");
                      setShowNotificationPanel(false);
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      !notification.read
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50 border border-gray-200"
                    } hover:bg-blue-100`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${
                        notification.type === "home"
                          ? "bg-orange-100"
                          : "bg-blue-100"
                      }`}>
                        {notification.type === "home" ? (
                          <MapPin size={18} className="text-orange-600" />
                        ) : (
                          <Calendar size={18} className="text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800 text-sm">
                            {notification.title}
                          </p>
                          {notification.daysUntil === 1 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                              Tomorrow
                            </span>
                          )}
                          {notification.daysUntil === 0 && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>In {notification.daysUntil} day{notification.daysUntil !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">No upcoming visits</p>
                <p className="text-sm text-gray-500 mt-2">
                  You'll be notified when new visits are scheduled
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
