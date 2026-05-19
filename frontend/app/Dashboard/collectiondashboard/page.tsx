"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const logo = "/logo.png";
import { 
  TestTube, 
  Truck, 
  Hourglass, 
  ClipboardCheck, 
  Home, 
  Building2, 
  Clock, 
  User,
  ChevronDown,
  LogOut,
  FileText,
  Settings,
  Bell,
  Search,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Menu,
  X
} from "lucide-react";

const CollectionDashboard = () => {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const patientListData = [
    { 
      id: 1, 
      srNo: 1,
      date: "09/02/2026",
      patientName: "MR PRAMOD GANPAT GAIKWAD", 
      ageGender: "62 Yrs / Male",
      testPerformed: "GOLD HEALTH PACKAGE"
    },
    { 
      id: 2, 
      srNo: 2,
      date: "09/02/2026",
      patientName: "MR SANTAWAN SINGH", 
      ageGender: "69 Yrs / Male",
      testPerformed: "BSF PP"
    },
    { 
      id: 3, 
      srNo: 3,
      date: "09/02/2026",
      patientName: "MR SUDHAKAR ALEKAR", 
      ageGender: "62 Yrs / Male",
      testPerformed: "PLATINUM HEALTH PACKAGE"
    },
    { 
      id: 4, 
      srNo: 4,
      date: "09/02/2026",
      patientName: "MR AKRAM ANSARI", 
      ageGender: "40 Yrs / Male",
      testPerformed: "CBC, MP, ESR, WIDAL, Bilirubin"
    },
    { 
      id: 5, 
      srNo: 5,
      date: "09/02/2026",
      patientName: "MR KAVITA DUGHD", 
      ageGender: "40 Yrs / Male",
      testPerformed: "CBC, LIPID"
    },
    { 
      id: 6, 
      srNo: 6,
      date: "09/02/2026",
      patientName: "MR ATHARV RAUT", 
      ageGender: "22 Yrs / Male",
      testPerformed: "X CHEST"
    },
    { 
      id: 7, 
      srNo: 7,
      date: "09/02/2026",
      patientName: "MRS DR SNEHA SRAVYA", 
      ageGender: "30 Yrs / Female",
      testPerformed: "X- ANKLE"
    },
    { 
      id: 8, 
      srNo: 8,
      date: "09/02/2026",
      patientName: "MR RAJESH MHATRE", 
      ageGender: "42 Yrs / Male",
      testPerformed: "Creat"
    },
    { 
      id: 9, 
      srNo: 9,
      date: "09/02/2026",
      patientName: "MRS MANDA GAWAND", 
      ageGender: "55 Yrs / Female",
      testPerformed: "CBC, ESR, FBS, SGOT, PT"
    },
  ];

  // Demo data for recent samples
  const recentSamples = [
    {
      id: "DEMO500001",
      patient: { name: "Rajesh Kumar", age: 45, id: "PID408001" },
      tests: "CBC, Lipid Profile, HbA1c",
      date: "18/2/2026",
      time: "09:02 AM",
      collectedBy: "Yash Raj Kumar",
      center: "Silverleaf Main Centre",
      location: "Main",
      priority: "Normal",
      status: "Sent to Main Lab"
    },
    {
      id: "DEMO500002",
      patient: { name: "Priya Sharma", age: 32, id: "PID408002" },
      tests: "Thyroid Panel, Vitamin D",
      date: "18/2/2026",
      time: "10:15 AM",
      collectedBy: "Dr. Sarah Wilson",
      center: "Silverleaf North Branch",
      location: "North",
      priority: "Normal",
      status: "Collected"
    },
    {
      id: "DEMO500003",
      patient: { name: "Amit Singh", age: 58, id: "PID408003" },
      tests: "Cardiac Markers, Troponin",
      date: "18/2/2026",
      time: "11:30 AM",
      collectedBy: "Dr. Amit Sharma",
      center: "Silverleaf Main Centre",
      location: "Main",
      priority: "Critical",
      status: "Sent to Main Lab"
    },
    {
      id: "DEMO500004",
      patient: { name: "Sunita Patel", age: 28, id: "PID408004" },
      tests: "Iron Studies, CBC",
      date: "18/2/2026",
      time: "10:45 PM",
      collectedBy: "Dr. Anita Singh",
      center: "Silverleaf South Branch",
      location: "South",
      priority: "Normal",
      status: "Pending Pickup"
    },
    {
      id: "DEMO500005",
      patient: { name: "Vikram Mehta", age: 41, id: "PID408005" },
      tests: "Liver Function, Bilirubin",
      date: "18/2/2026",
      time: "02:08 PM",
      collectedBy: "",
      center: "Silverleaf East Branch",
      location: "East",
      priority: "Urgent",
      status: "Collected"
    }
  ];

  const getPriorityColor = (priority: any) => {
    switch(priority) {
      case "Critical": return "bg-red-100 text-red-700 border-red-300";
      case "Urgent": return "bg-orange-100 text-orange-700 border-orange-300";
      default: return "bg-green-100 text-green-700 border-green-300";
    }
  };

  const getStatusColor = (status: any) => {
    switch(status) {
      case "Sent to Main Lab": return "bg-blue-100 text-blue-700";
      case "Collected": return "bg-green-100 text-green-700";
      case "Pending Pickup": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      document.cookie = 'token=; path=/; max-age=0';
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 to-blue-50 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gradient-to-b from-slate-800 via-cyan-700 to-cyan-600 text-white p-2 rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:static
        w-64 h-full
        bg-gradient-to-b from-slate-800 via-cyan-700 to-cyan-600 
        text-white flex flex-col shadow-2xl
        transition-transform duration-300 ease-in-out
        z-40
      `}>
        {/* Logo Section */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-3 mb-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => router.push("/labdashboard")}>
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h2 className="font-bold text-lg">SilverLeaf</h2>
              <p className="text-xs text-cyan-100">Collection Center</p>
            </div>
          </div>
        </div>

        {/* Center Info */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <div>
              <p className="font-semibold">Main Collection Center</p>
              <p className="text-xs text-cyan-100">Active</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveMenu("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeMenu === "dashboard"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("registration");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeMenu === "registration"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <User size={20} />
            <span className="font-medium">Patient Registration</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("reports");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeMenu === "reports"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <FileText size={20} />
            <span className="font-medium">Reports</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("samples");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeMenu === "samples"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <TestTube size={20} />
            <span className="font-medium">Sample Collection</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("notifications");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeMenu === "notifications"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <Bell size={20} />
            <span className="font-medium">Notifications</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("settings");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeMenu === "settings"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all shadow-lg border-2 border-red-500 font-semibold"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto w-full lg:w-auto">
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 mt-16 lg:mt-0">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-lg p-3 sm:p-4 text-white">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-1">
              {activeMenu === "reports" ? "Patient List Report" : "Collection Center Dashboard"}
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100">
              {activeMenu === "reports" ? "View and manage patient records" : "Manage patient registrations and sample collections"}
            </p>
          </div>

          {/* Conditional Content Based on Active Menu */}
          {activeMenu === "reports" ? (
            /* PATIENT LIST CONTENT */
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              {/* Filters Section */}
              <div className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  <input
                    type="date"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
                    placeholder="Search Date"
                  />
                  <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full">
                    <option value="">Select Center</option>
                    <option>Main Center</option>
                    <option>Branch 1</option>
                  </select>
                  <input
                    type="text"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
                    placeholder="Patient Name"
                  />
                  <input
                    type="text"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
                    placeholder="Referral Doctor"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-lg transition-all">
                    <Search size={16} />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-lg transition-all">
                    <RotateCcw size={16} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-lg transition-all">
                    <FileSpreadsheet size={16} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm font-semibold shadow-lg transition-all">
                    <Printer size={16} />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                </div>
              </div>

              {/* Patient List Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Sr. No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Patient Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Age / Gender</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Test Performed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientListData.map((patient, index) => (
                      <tr key={patient.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-4 py-3 border border-gray-300 text-sm">{patient.srNo}</td>
                        <td className="px-4 py-3 border border-gray-300 text-sm">{patient.date}</td>
                        <td className="px-4 py-3 border border-gray-300 text-sm font-semibold">{patient.patientName}</td>
                        <td className="px-4 py-3 border border-gray-300 text-sm">{patient.ageGender}</td>
                        <td className="px-4 py-3 border border-gray-300 text-sm">{patient.testPerformed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeMenu === "registration" ? (
            /* PATIENT REGISTRATION CONTENT */
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Patient Registration</h2>
                  <p className="text-sm text-gray-600">Register new patients for sample collection</p>
                </div>
                <button
                  onClick={() => router.push('/patient/registration')}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  Go to Registration
                </button>
              </div>
            </div>
          ) : activeMenu === "samples" ? (
            /* SAMPLE COLLECTION CONTENT */
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Sample Collection</h2>
                <p className="text-sm text-gray-600">Manage sample collection and tracking</p>
              </div>
              
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Coming Soon:</span> Sample collection management features will be available here.
                </p>
              </div>
            </div>
          ) : (
            /* DASHBOARD CONTENT */
            <>
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Samples Collected */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl shadow-lg p-6 text-white hover:scale-105 transition-transform">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Samples Collected</p>
                  <p className="text-5xl font-bold mt-2">2</p>
                  <p className="text-xs mt-2 opacity-80">Updated in real-time</p>
                </div>
                <TestTube size={40} className="opacity-80" />
              </div>
            </div>

            {/* Samples Sent to Main Lab */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white hover:scale-105 transition-transform">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Samples Sent to Main Lab</p>
                  <p className="text-5xl font-bold mt-2">2</p>
                  <p className="text-xs mt-2 opacity-80">Updated in real-time</p>
                </div>
                <Truck size={40} className="opacity-80" />
              </div>
            </div>

            {/* Pending Pickup */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white hover:scale-105 transition-transform">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">Pending Pickup</p>
                  <p className="text-5xl font-bold mt-2">1</p>
                  <p className="text-xs mt-2 opacity-80">Updated in real-time</p>
                </div>
                <Hourglass size={40} className="opacity-80" />
              </div>
            </div>
          </div>

          {/* TODAY'S OVERVIEW */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">Today's Overview</h3>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                Live Data
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Total Patients Today */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <ClipboardCheck className="mx-auto text-pink-500 mb-2" size={28} />
                <p className="text-3xl font-bold text-gray-800">127</p>
                <p className="text-xs text-gray-600 mt-1">Total Patients Today</p>
                <p className="text-xs text-green-600 font-semibold mt-1">+12%</p>
              </div>

              {/* Home Collections */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <Home className="mx-auto text-purple-500 mb-2" size={28} />
                <p className="text-3xl font-bold text-gray-800">34</p>
                <p className="text-xs text-gray-600 mt-1">Home Collections</p>
                <p className="text-xs text-green-600 font-semibold mt-1">+8%</p>
              </div>

              {/* Reports Generated */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <ClipboardCheck className="mx-auto text-red-500 mb-2" size={28} />
                <p className="text-3xl font-bold text-gray-800">89</p>
                <p className="text-xs text-gray-600 mt-1">Reports Generated</p>
                <p className="text-xs text-green-600 font-semibold mt-1">+5%</p>
              </div>

              {/* Average TAT */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <Clock className="mx-auto text-blue-500 mb-2" size={28} />
                <p className="text-3xl font-bold text-gray-800">2.4h</p>
                <p className="text-xs text-gray-600 mt-1">Average TAT</p>
                <p className="text-xs text-red-600 font-semibold mt-1">-5%</p>
              </div>

              {/* Collection Centers */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <Building2 className="mx-auto text-cyan-500 mb-2" size={28} />
                <p className="text-3xl font-bold text-gray-800">4</p>
                <p className="text-xs text-gray-600 mt-1">Collection Centers</p>
                <p className="text-xs text-gray-600 font-semibold mt-1">0%</p>
              </div>

              {/* Active Staff */}
              <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200 hover:shadow-md transition-shadow">
                <User className="mx-auto text-orange-500 mb-2" size={28} />
                <p className="text-3xl font-bold text-gray-800">18</p>
                <p className="text-xs text-gray-600 mt-1">Active Staff</p>
                <p className="text-xs text-green-600 font-semibold mt-1">+2</p>
              </div>
            </div>

            <div className="mt-4 text-right text-xs text-gray-500">
              Last updated: 4:52:12 PM
              <span className="ml-4 text-blue-600 flex items-center justify-end gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Demo metrics included
              </span>
            </div>
          </div>

          {/* RECENT SAMPLES TABLE */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Recent Samples</h3>
                  <p className="text-sm text-blue-600 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      Demo data is included for dashboard demonstration
                    </span>
                  </p>
                </div>
                <p className="text-sm text-gray-600">Total: 5 samples</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Sample ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Patient Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Tests Collected</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Collection Info</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Center</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border border-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSamples.map((sample, index) => (
                    <tr key={sample.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-3 border border-gray-300">
                        <div>
                          <p className="font-bold text-gray-800">{sample.id}</p>
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded mt-1">DEMO</span>
                          <p className="text-xs text-gray-500 mt-1">API: {sample.patient.id.replace('PID', 'API')}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 border border-gray-300">
                        <p className="font-semibold text-gray-800">{sample.patient.name}</p>
                        <p className="text-xs text-gray-600">Age: {sample.patient.age}</p>
                        <p className="text-xs text-gray-500">ID: {sample.patient.id}</p>
                      </td>
                      <td className="px-4 py-3 border border-gray-300">
                        <p className="text-sm text-gray-700">{sample.tests}</p>
                      </td>
                      <td className="px-4 py-3 border border-gray-300">
                        <p className="text-sm text-gray-700">{sample.date}</p>
                        <p className="text-xs text-gray-600">{sample.time}</p>
                        {sample.collectedBy && (
                          <p className="text-xs text-gray-500 mt-1">By: {sample.collectedBy}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 border border-gray-300">
                        <p className="text-sm text-gray-700">{sample.center}</p>
                        <p className="text-xs text-gray-500">{sample.location}</p>
                      </td>
                      <td className="px-4 py-3 border border-gray-300">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(sample.priority)}`}>
                          {sample.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 border border-gray-300">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(sample.status)}`}>
                            {sample.status}
                          </span>
                          <ChevronDown size={14} className="text-gray-400 cursor-pointer hover:text-gray-600" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectionDashboard;
