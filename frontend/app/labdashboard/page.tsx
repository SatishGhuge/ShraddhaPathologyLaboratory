"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import Header from "@/src/components/Header";
import { createAdmin } from "@/src/api/admin";
import { getTestStatistics } from "@/src/api/result";
import { getPatientStatistics } from "@/src/api/patient";
import { colorTheme, colorClasses } from "@/config/colorTheme";
import {
  FaUserCircle,
  FaCalendarAlt,
  FaHourglassHalf,
  FaCheck,
  FaVials,
  FaProjectDiagram,
} from "react-icons/fa";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Eye, EyeOff, Clock, Bell, LogOut, Rocket, FileText, Package, UserPlus, Search, TestTube, DollarSign, Lightbulb, Check } from "lucide-react";

/* ================= DATA ================= */

const staticStatCards = [
  { title: "Total", color: "blue", icon: FaCalendarAlt, link: "/reports/patient-list" },
  { title: "Registered", color: "slate", icon: FaUserCircle, link: "/result?status=REGISTERED" },
  { title: "Collected", value: "0", sub: "More info", color: "orange", icon: FaVials, link: null },
  { title: "Authenticated", color: "green", icon: FaCheck, link: "/result?status=AUTHENTICATED" },
  { title: "Delivered", color: "cyan", icon: FaProjectDiagram, link: "/result?status=DELIVERED" },
];

const YESTERDAY_GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-slate-600 to-slate-800",
  "from-orange-400 to-orange-600",
  "from-green-400 to-green-600",
  "from-cyan-400 to-cyan-600",
];

const deptData = [
  { name: "Pathology", value: 55 },
  { name: "Radiology", value: 25 },
  { name: "Microbiology", value: 20 },
];

const COLORS1 = [colorTheme.departments.pathology, colorTheme.departments.radiology, colorTheme.departments.microbiology];

/* ================= DASHBOARD ================= */

const Dashboard = () => {
  const router = useRouter();
  const [dateTime, setDateTime] = useState(new Date());
  const [todayTotalPatients, setTodayTotalPatients] = useState(0); // Add patient count state
  const [todayAuthenticated, setTodayAuthenticated] = useState(0);
  const [todayDelivered, setTodayDelivered] = useState(0);
  const [todayRegistered, setTodayRegistered] = useState(0);
  const [yesterdayBars, setYesterdayBars] = useState([
    { label: "Total",         value: 0, gradient: YESTERDAY_GRADIENTS[0] },
    { label: "Registered",    value: 0, gradient: YESTERDAY_GRADIENTS[1] },
    { label: "Authenticated", value: 0, gradient: YESTERDAY_GRADIENTS[2] },
    { label: "Delivered",     value: 0, gradient: YESTERDAY_GRADIENTS[3] },
  ]);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");

  const loadCallbacks = () => {
    const stored = JSON.parse(localStorage.getItem("callbackRequests") || "[]");
    return stored.filter((r: any) => !r.called);
  };

  const [notifications, setNotifications] = useState(loadCallbacks);

  // Listen for new callback requests from Home.jsx
  useEffect(() => {
    const handler = () => setNotifications(loadCallbacks());
    window.addEventListener("callbackRequestAdded", handler);
    return () => window.removeEventListener("callbackRequestAdded", handler);
  }, []);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [locationData, setLocationData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);

  // Daily health thoughts
  const healthThoughts = [
    "A healthy outside starts from the inside.",
    "Take care of your body. It's the only place you have to live.",
    "Your health is an investment, not an expense.",
    "Movement is medicine for creating change.",
    "Water is the driving force of all nature.",
    "Happiness is the highest form of health.",
    "Health is wealth. Invest in yourself daily.",
  ];
  const dailyThought = healthThoughts[new Date().getDay()];

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Fetch all statistics in parallel (faster than sequential)
    Promise.all([
      getTestStatistics({ fromDate: today, toDate: today }),
      getPatientStatistics({ fromDate: today, toDate: today }),
      getTestStatistics({ fromDate: yesterday, toDate: yesterday }),
      getPatientStatistics({ fromDate: yesterday, toDate: yesterday })
    ])
    .then(([todayTestStats, todayPatientStats, yesterdayTestStats, yesterdayPatientStats]) => {
      // Today's stats
      setTodayAuthenticated(todayTestStats.byStatus?.AUTHENTICATED || 0);
      setTodayDelivered(todayTestStats.byStatus?.DELIVERED || 0);
      setTodayRegistered(todayTestStats.byStatus?.REGISTERED || 0);
      setTodayTotalPatients(todayPatientStats.total || 0);

      // Yesterday's stats
      const s = yesterdayTestStats.byStatus || {};
      setYesterdayBars([
        { label: "Total",         value: yesterdayPatientStats.total || 0,  gradient: YESTERDAY_GRADIENTS[0] },
        { label: "Registered",    value: s.REGISTERED    || 0,     gradient: YESTERDAY_GRADIENTS[1] },
        { label: "Authenticated", value: s.AUTHENTICATED || 0,     gradient: YESTERDAY_GRADIENTS[2] },
        { label: "Delivered",     value: s.DELIVERED     || 0,     gradient: YESTERDAY_GRADIENTS[3] },
      ]);
      
      // Extract location data (top 5)
      if (todayPatientStats.locationStats) {
        const topLocations = todayPatientStats.locationStats.slice(0, 5).map((loc: any) => ({
          name: loc.location || 'Not Specified',
          value: loc.count,
          percentage: loc.percentage
        }));
        setLocationData(topLocations);
      }
      
      // Extract department data
      if (todayTestStats.byDepartment) {
        const depts = Object.entries(todayTestStats.byDepartment).map(([dept, count]: any) => ({
          name: dept,
          value: count
        }));
        setDepartmentData(depts);
      }
    })
    .catch((error) => {
      console.error('Error fetching statistics:', error);
    });
  }, []);

  const statCards = staticStatCards.map(card => {
    if (card.title === "Total") return { ...card, value: String(todayTotalPatients), sub: "Registered Patients" };
    if (card.title === "Registered") return { ...card, value: String(todayRegistered), sub: "More info" };
    if (card.title === "Authenticated") return { ...card, value: String(todayAuthenticated), sub: "More info" };
    if (card.title === "Delivered") return { ...card, value: String(todayDelivered), sub: "More info" };
    return card;
  });

  // Close popups when clicking outside
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

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors: any = {};
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Name must be at least 3 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.trim().length < 4) {
      errors.username = 'Username must be at least 4 characters';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm Password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Phone validation
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone number must be 10 digits';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        // Prepare data for API
        const adminData = {
          name: formData.name,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          phone: formData.phone
        };

        console.log('Submitting admin data:', adminData);
        
        // Call API to create admin
        const response = await createAdmin(adminData);
        
        console.log('Admin created successfully:', response);
        alert(`Admin created successfully!\n\nUsername: ${formData.username}\nPassword: ${formData.password}\n\nThe admin can now login with these credentials.`);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          phone: ''
        });
        setShowAddAdminForm(false);
        setShowAdminPopup(false);
      } catch (error: any) {
        console.error('Error creating admin:', error);
        alert(`Failed to create admin: ${error.message}`);
      }
    }
  };

  const handleCloseForm = () => {
    setShowAddAdminForm(false);
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      phone: ''
    });
    setFormErrors({});
  };

  return (
    <>
    <Header />
    <div className="fixed top-0 left-48 right-0 bottom-0 bg-gray-50 pt-14 overflow-hidden">
      <div className="p-3 h-full overflow-hidden flex flex-col">

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 flex-shrink-0">
        {statCards.map((item, i) => (
          <StatCard key={i} {...item} router={router} />
        ))}
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 flex-1 overflow-hidden mt-2">
        
        {/* Yesterday Summary */}
        <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200 overflow-y-auto">
          <h3 className="font-bold text-slate-900 text-sm mb-2">Yesterday Summary</h3>
          <div className="space-y-1">
            {yesterdayBars.map((item, i) => (
              <button
                key={i}
                onClick={() => {}}
                className="w-full text-left p-1.5 rounded-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-md cursor-pointer border border-transparent hover:border-gray-300"
              >
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="font-bold text-gray-900">{item.value}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${item.gradient} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(Math.max(item.value, 1), 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Top 5 Patient Locations Pie Chart */}
        <PieChartCard 
          title="Top 5 Patient Capture Locations" 
          data={locationData.length > 0 ? locationData : [{ name: "No Data", value: 1 }]} 
          colors={["#F24E1E", "#FF6B35", "#FF8C42", "#FFA500", "#FFB84D"]}
        />

        {/* Department-wise Tests Pie Chart */}
        <PieChartCard 
          title="Department-wise Tests" 
          data={departmentData.length > 0 ? departmentData : deptData} 
          colors={COLORS1}
        />

        {/* Quick Navigation Links */}
        <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-200 overflow-y-auto">
          <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
            <Rocket className="text-orange-600" size={16} />
            Quick Navigation
          </h3>
          <div className="space-y-1">
           
             <button
              onClick={() => router.push("/master/testlist")}
              className="w-full text-left px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-400 flex items-center gap-2"
            >
              <FileText size={14} className="text-blue-600" />
              Test List
            </button>
            <button
              onClick={() => router.push("/master/packagelist")}
              className="w-full text-left px-2 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200 hover:border-purple-400 flex items-center gap-2"
            >
              <Package size={14} className="text-purple-600" />
              Package List
            </button>
            <button
              onClick={() => router.push("/patient/registration")}
              className="w-full text-left px-2 py-1.5 text-xs text-green-700 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-400 flex items-center gap-2"
            >
              <UserPlus size={14} className="text-green-600" />
              Patient Registration
            </button>
            <button
              onClick={() => router.push("/patient/search-booking")}
              className="w-full text-left px-2 py-1.5 text-xs text-orange-700 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 hover:border-orange-400 flex items-center gap-2"
            >
              <Search size={14} className="text-orange-600" />
              Search Booking
            </button>
            <button
              onClick={() => router.push("/result")}
              className="w-full text-left px-2 py-1.5 text-xs text-pink-700 hover:bg-pink-50 rounded-lg transition-colors border border-pink-200 hover:border-pink-400 flex items-center gap-2"
            >
              <TestTube size={14} className="text-pink-600" />
              Result Entry
            </button>
            <button
              onClick={() => router.push("/reports/daily-collection")}
              className="w-full text-left px-2 py-1.5 text-xs text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-teal-200 hover:border-teal-400 flex items-center gap-2"
            >
              <DollarSign size={14} className="text-teal-600" />
              Daily Collection
            </button>
            <button
              onClick={() => router.push("/reports/patient-location-report")}
              className="w-full text-left px-2 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 hover:border-indigo-400 flex items-center gap-2"
            >
              <FileText size={14} className="text-indigo-600" />
              Location Report
            </button>
            <button
              onClick={() => router.push("/master/departmentlist")}
              className="w-full text-left px-2 py-1.5 text-xs text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-400 flex items-center gap-2"
            >
              <FileText size={14} className="text-red-600" />
              Department List
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Add Admin Form Modal */}
    {showAddAdminForm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-orange-300 w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 border-b-2 border-orange-300 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Add New Admin</h2>
            <button 
              onClick={handleCloseForm}
              className="text-gray-300 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className={`w-full border ${(formErrors as any).name ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Enter full name"
              />
              {(formErrors as any).name && (
                <p className="text-red-500 text-xs mt-1">{(formErrors as any).name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                className={`w-full border ${(formErrors as any).email ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Enter email address"
              />
              {(formErrors as any).email && (
                <p className="text-red-500 text-xs mt-1">{(formErrors as any).email}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleFormChange}
                className={`w-full border ${(formErrors as any).username ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Enter username"
              />
              {(formErrors as any).username && (
                <p className="text-red-500 text-xs mt-1">{(formErrors as any).username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  className={`w-full border ${(formErrors as any).password ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(formErrors as any).password && (
                <p className="text-red-500 text-xs mt-1">{(formErrors as any).password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleFormChange}
                  className={`w-full border ${(formErrors as any).confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(formErrors as any).confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{(formErrors as any).confirmPassword}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                className={`w-full border ${(formErrors as any).phone ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500`}
                placeholder="Enter 10-digit phone number"
                maxLength={10}
              />
              {(formErrors as any).phone && (
                <p className="text-red-500 text-xs mt-1">{(formErrors as any).phone}</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-2 px-4 rounded-md transition-all"
              >
                Add Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
    </>
  );
};

/* ================= COMPONENTS ================= */

const StatCard = ({ title, value, sub, color, icon: Icon, link, router }: any) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  const iconColorMap = {
    "blue": "text-blue-500",
    "slate": "text-slate-700",
    "orange": "text-orange-500",
    "purple": "text-purple-600",
    "green": "text-green-600",
    "cyan": "text-teal-600",
  };
  
  const sampleTrackingOptions = [
    { label: "Hold Results", color: "text-orange-500" },
    { label: "Verify Sample", color: "text-orange-500" },
    { label: "Track Sample", color: "text-red-500" },
    { label: "Edit Sample", color: "text-orange-500" },
    { label: "Delete Wrong Record", color: "text-gray-400" },
    { label: "Centre Work Order", color: "text-green-500" },
  ];
  
  const handleClick = () => {
    if (title === "Sample Tracking") {
      setShowDropdown(!showDropdown);
    } else if (link && router) {
      router.push(link);
    }
  };
  
  return (
    <div className="relative">
      <div 
        onClick={handleClick}
        className="bg-white rounded-lg p-2 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer min-h-[90px] flex flex-col justify-between border border-gray-100"
      >
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</p>
          {Icon && <Icon className={`text-lg ${iconColorMap[color as keyof typeof iconColorMap]}`} />}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-xs text-orange-500 font-medium">{sub}</p>
        </div>
      </div>
      
      {/* Dropdown Menu for Sample Tracking */}
      {title === "Sample Tracking" && showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl z-50 overflow-hidden border-2 border-orange-300">
          {sampleTrackingOptions.map((option, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                console.log(`Clicked: ${option.label}`);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 hover:bg-orange-50 transition-colors text-left border-b border-gray-200 last:border-b-0"
            >
              <span className="font-medium text-gray-800 text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PieChartCard = ({ title, data, colors }: any) => (
  <div className="bg-white rounded-lg shadow-lg p-2">
    <h3 className="font-bold text-slate-700 text-xs mb-1">{title}</h3>
    <div className="h-[140px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data || []} dataKey="value" innerRadius={25} outerRadius={50}>
            {(data || []).map((_: any, i: any) => (
              <Cell key={i} fill={colors?.[i] || '#cccccc'} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: '10px' }} />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>

);

export default Dashboard;

