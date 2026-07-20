"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X, Home, FileText, Calendar, User, Settings } from "lucide-react";

export default function PatientDashboard() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get patient data from localStorage
    try {
      const patient = localStorage.getItem("patient");
      if (!patient) {
        router.push("/login");
        return;
      }
      const parsedPatient = JSON.parse(patient);
      setPatientData(parsedPatient);
      setLoading(false);
    } catch (error) {
      console.error("Error loading patient data:", error);
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "#" },
    { label: "My Tests", icon: FileText, path: "#" },
    { label: "Book Test", icon: Calendar, path: "#" },
    { label: "Profile", icon: User, path: "#" },
    { label: "Settings", icon: Settings, path: "#" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-slate-900 text-white transition-all duration-300 flex flex-col`}
      >
        {/* Logo/Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-orange-500">SHRADDHA</h1>
              <p className="text-xs text-gray-400">Patient Portal</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => item.path !== "#" && router.push(item.path)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-sm"
            >
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Patient Dashboard</h2>
            <p className="text-sm text-gray-500">Welcome back!</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-700">{patientData?.firstName} {patientData?.lastName}</p>
            <p className="text-xs text-gray-500">ID: {patientData?.patientId}</p>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {/* Card 1 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Patient ID</p>
                  <h3 className="text-2xl font-bold text-gray-900">{patientData?.patientId}</h3>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <User className="text-orange-600" size={24} />
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Email</p>
                  <h3 className="text-lg font-bold text-gray-900 truncate">{patientData?.email}</h3>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="text-blue-600" size={24} />
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Phone</p>
                  <h3 className="text-2xl font-bold text-gray-900">{patientData?.phone || "N/A"}</h3>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Calendar className="text-green-600" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to Your Dashboard</h3>
            <p className="text-gray-600 mb-6">
              Manage your tests, book appointments, and view your results all in one place.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">
                View My Tests
              </button>
              <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                Book a Test
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Getting Started</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Your account has been created successfully</li>
              <li>✓ Use "My Tests" to view your registered tests</li>
              <li>✓ Use "Book Test" to schedule a new appointment</li>
              <li>✓ Check "Profile" to update your information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
