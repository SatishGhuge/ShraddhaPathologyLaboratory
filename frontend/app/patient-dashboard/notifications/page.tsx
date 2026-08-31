"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  MapPin,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Notification {
  id: string;
  type: "lab" | "home";
  bookingId: string;
  title: string;
  message: string;
  date: string;
  daysUntil: number;
  status: string;
  read: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "lab" | "home">("all");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = () => {
    // Get all bookings
    const labBookings = JSON.parse(localStorage.getItem("labBookings") || "[]");
    const homeVisits = JSON.parse(localStorage.getItem("patientHomeVisits") || "[]");

    const now = new Date();
    const allNotifications: Notification[] = [];

    // Check lab bookings
    labBookings.forEach((booking: any) => {
      const visitDate = new Date(booking.visitDate);
      const daysUntil = Math.ceil((visitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Show notifications for visits within 7 days
      if (daysUntil > 0 && daysUntil <= 7) {
        allNotifications.push({
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
        allNotifications.push({
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
    allNotifications.sort((a, b) => a.daysUntil - b.daysUntil);

    setNotifications(allNotifications);
    setLoading(false);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "all") return true;
    return n.type === filterType;
  });

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const deleteAllNotifications = () => {
    if (confirm("Are you sure you want to delete all notifications?")) {
      setNotifications([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(45%_0.085_224.283)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay updated on your upcoming visits
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={deleteAllNotifications}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 border-b border-gray-200">
        {[
          { value: "all" as const, label: "All Notifications" },
          { value: "lab" as const, label: "Lab Visits" },
          { value: "home" as const, label: "Home Visits" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              filterType === tab.value
                ? "border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)]"
                : "border-transparent text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Icon */}
                  <div className={`p-3 rounded-lg flex-shrink-0 ${
                    notification.type === "home"
                      ? "bg-orange-100"
                      : "bg-blue-100"
                  }`}>
                    {notification.type === "home" ? (
                      <MapPin size={24} className="text-orange-600" />
                    ) : (
                      <Calendar size={24} className="text-blue-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {notification.title}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        notification.type === "home"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {notification.type === "home" ? "Home Visit" : "Lab Visit"}
                      </span>
                    </div>

                    <p className="text-gray-600 mb-3">{notification.message}</p>

                    {/* Status and Time */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {notification.daysUntil === 0 && (
                          <span className="text-red-600 font-medium">Today</span>
                        )}
                        {notification.daysUntil === 1 && (
                          <span className="text-red-600 font-medium">Tomorrow</span>
                        )}
                        {notification.daysUntil > 1 && (
                          <span>In {notification.daysUntil} days</span>
                        )}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.status === "Scheduled"
                          ? "bg-blue-100 text-blue-700"
                          : notification.status === "In Progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {notification.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      router.push("/patient-dashboard/bookings");
                    }}
                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    View Booking
                  </button>
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
          <Bell size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium">No notifications</p>
          <p className="text-sm text-gray-500 mt-2">
            {filterType === "all"
              ? "You don't have any upcoming visits"
              : `You don't have any ${filterType === "lab" ? "lab" : "home"} visits scheduled`}
          </p>
          <button
            onClick={() => router.push("/patient-dashboard/tests")}
            className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Book a Test
          </button>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">About Notifications</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• You'll receive notifications for visits scheduled within the next 7 days</li>
              <li>• Notifications appear here and in the notification bell at the top</li>
              <li>• Click "View Booking" to see full booking details</li>
              <li>• Upcoming reminders help you prepare for your visits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
