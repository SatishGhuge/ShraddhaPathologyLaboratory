"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TestTube,
  Calendar,
  FileText,
  MapPin,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function PatientDashboardHomePage() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedTests: 0,
    pendingReports: 0,
    upcomingVisits: 0,
  });

  useEffect(() => {
    const patientData = localStorage.getItem("patient");
    if (patientData) {
      setPatient(JSON.parse(patientData));
    }
    
    // TODO: Fetch patient statistics from API
    // For now using dummy data
    setStats({
      totalBookings: 12,
      completedTests: 35,
      pendingReports: 2,
      upcomingVisits: 1,
    });
  }, []);

  const quickActions = [
    {
      title: "Browse Tests",
      description: "View all available tests and packages",
      icon: TestTube,
      color: "blue",
      href: "/patient-dashboard/tests",
    },
    {
      title: "Book Home Visit",
      description: "Schedule sample collection at home",
      icon: MapPin,
      color: "orange",
      href: "/patient-dashboard/home-visit",
    },
    {
      title: "View Reports",
      description: "Access your test reports",
      icon: FileText,
      color: "green",
      href: "/patient-dashboard/reports",
    },
    {
      title: "My Bookings",
      description: "Check booking history and status",
      icon: Calendar,
      color: "purple",
      href: "/patient-dashboard/bookings",
    },
  ];

  const statCards = [
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      color: "bg-[oklch(45%_0.085_224.283)]",
      textColor: "text-[oklch(45%_0.085_224.283)]",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completed Tests",
      value: stats.completedTests,
      icon: CheckCircle,
      color: "bg-orange-500",
      textColor: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      label: "Pending Reports",
      value: stats.pendingReports,
      icon: Clock,
      color: "bg-amber-500",
      textColor: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Upcoming Visits",
      value: stats.upcomingVisits,
      icon: MapPin,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(45%_0.085_224.283)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner - Mobile Optimized */}
      <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="space-y-2 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              Welcome back, {patient.firstName}!
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Your health, our priority. Access all your lab services in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-2 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User size={14} className="sm:w-4 sm:h-4" />
                <span className="truncate">Patient ID: {patient.patientId}</span>
              </div>
              {patient.location && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="sm:w-4 sm:h-4" />
                  <span className="truncate">{patient.location}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push("/patient-dashboard/tests")}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold transition-colors shadow-md whitespace-nowrap flex-shrink-0"
          >
            Book Test Now
          </button>
        </div>
      </div>

      {/* Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-start gap-2 sm:gap-3">
                <div className={`${stat.bgColor} p-2 sm:p-3 rounded-lg`}>
                  <Icon className={`${stat.textColor} sm:w-6 sm:h-6`} size={20} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500 mb-0.5">{stat.label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Mobile Optimized */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            const colorClasses = {
              blue: {
                bg: "bg-blue-50",
                text: "text-[oklch(45%_0.085_224.283)]",
                hover: "hover:bg-blue-100",
                border: "border-blue-200",
                icon: "text-[oklch(45%_0.085_224.283)]",
              },
              orange: {
                bg: "bg-orange-50",
                text: "text-orange-600",
                hover: "hover:bg-orange-100",
                border: "border-orange-200",
                icon: "text-orange-600",
              },
              green: {
                bg: "bg-green-50",
                text: "text-green-600",
                hover: "hover:bg-green-100",
                border: "border-green-200",
                icon: "text-green-600",
              },
              purple: {
                bg: "bg-purple-50",
                text: "text-purple-600",
                hover: "hover:bg-purple-100",
                border: "border-purple-200",
                icon: "text-purple-600",
              },
            };
            const colors = colorClasses[action.color as keyof typeof colorClasses];

            return (
              <button
                key={index}
                onClick={() => router.push(action.href)}
                className={`${colors.bg} ${colors.hover} border ${colors.border} rounded-lg p-3 sm:p-4 text-left transition-all hover:shadow-md cursor-pointer flex flex-col gap-2`}
              >
                <div className={`${colors.icon} mb-1`}>
                  <Icon size={24} className="sm:w-8 sm:h-8" />
                </div>
                <h3 className={`text-sm sm:text-base font-semibold ${colors.text} line-clamp-2`}>
                  {action.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-800">Recent Bookings</h3>
            <button
              onClick={() => router.push("/patient-dashboard/bookings")}
              className="text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-orange-50 rounded-lg">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white border border-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <TestTube size={16} className="sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                  Complete Blood Count (CBC)
                </p>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
              <span className="px-2 py-0.5 sm:px-2 sm:py-1 bg-green-100 text-green-700 text-xs font-medium rounded whitespace-nowrap">
                Completed
              </span>
            </div>
            <div className="text-center py-6 text-gray-400">
              <p className="text-xs sm:text-sm">More bookings will appear here</p>
            </div>
          </div>
        </div>

        {/* Upcoming Visits */}
        <div className="bg-white rounded-lg p-4 sm:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-800">Upcoming Visits</h3>
            <button
              onClick={() => router.push("/patient-dashboard/home-visit")}
              className="text-xs sm:text-sm text-[oklch(45%_0.085_224.283)] hover:text-[oklch(40%_0.075_224.283)] font-medium"
            >
              Book →
            </button>
          </div>
          <div className="text-center py-8 sm:py-12 text-gray-400">
            <MapPin size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">No upcoming home visits</p>
            <button
              onClick={() => router.push("/patient-dashboard/home-visit")}
              className="mt-3 px-3 py-1.5 sm:px-4 sm:py-2 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[oklch(40%_0.075_224.283)] transition-colors"
            >
              Schedule a Visit
            </button>
          </div>
        </div>
      </div>

      {/* Help & Support - Mobile Optimized */}
      <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
        <div className="flex items-start gap-3 sm:gap-4 flex-col sm:flex-row">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle size={20} className="sm:w-6 sm:h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2">
              Need Help?
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              Our support team is here to assist you with any questions about your tests,
              reports, or bookings.
            </p>
            <div className="flex gap-2 sm:gap-3 flex-col sm:flex-row">
              <a
                href="tel:+919876543210"
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-700 transition-colors text-center"
              >
                Call Support
              </a>
              <a
                href="mailto:support@shraddhalab.com"
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-white text-orange-600 border border-orange-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-50 transition-colors text-center"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
