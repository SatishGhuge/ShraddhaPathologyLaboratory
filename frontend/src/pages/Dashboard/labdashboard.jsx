import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { createAdmin } from "../../api/admin.js";
import { getTestStatistics } from "../../api/result.js";
import { getPatientStatistics } from "../../api/patient.js";
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
import { Eye, EyeOff, Clock, Bell, LogOut, ArrowRight, Rocket, FileText, Package, UserPlus, Search, TestTube, DollarSign, Lightbulb, Check } from "lucide-react";

/* ================= DATA ================= */

const staticStatCards = [
  { title: "Total", color: "pink-coral", icon: FaCalendarAlt, link: "/reports/patient-list" },
  { title: "Registered", color: "slate-blue", icon: FaUserCircle, link: "/result?status=REGISTERED" },
  { title: "Collected", value: "0", sub: "More info", color: "purple-magenta", icon: FaVials, link: null },
  { title: "Sample Tracking", value: "0", sub: "More info", color: "blue-teal", icon: FaHourglassHalf, link: null },
  { title: "Authenticated", color: "yellow-orange", icon: FaCheck, link: "/result?status=AUTHENTICATED" },
  { title: "Delivered", color: "green-emerald", icon: FaProjectDiagram, link: "/result?status=DELIVERED" },
];

const YESTERDAY_GRADIENTS = [
  "from-pink-400 to-orange-300",
  "from-slate-600 to-slate-400",
  "from-purple-500 to-purple-300",
  "from-blue-400 to-cyan-300",
  "from-orange-400 to-yellow-300",
];

const deptData = [
  { name: "Pathology", value: 55 },
  { name: "Radiology", value: 25 },
  { name: "Microbiology", value: 20 },
];

const COLORS1 = ["#0891b2", "#16a34a", "#4f46e5"];

/* ================= DASHBOARD ================= */

const Dashboard = () => {
  const navigate = useNavigate();
  const [dateTime, setDateTime] = useState(new Date());
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayTotalPatients, setTodayTotalPatients] = useState(0); // Add patient count state
  const [yesterdayTotalPatients, setYesterdayTotalPatients] = useState(0); // Add yesterday patient count
  const [todayAuthenticated, setTodayAuthenticated] = useState(0);
  const [todayDelivered, setTodayDelivered] = useState(0);
  const [todayRegistered, setTodayRegistered] = useState(0);
  const [yesterdayBars, setYesterdayBars] = useState([
    { label: "Total",         value: 0, gradient: YESTERDAY_GRADIENTS[0] },
    { label: "Registered",    value: 0, gradient: YESTERDAY_GRADIENTS[1] },
    { label: "Provisional",   value: 0, gradient: YESTERDAY_GRADIENTS[2] },
    { label: "Authenticated", value: 0, gradient: YESTERDAY_GRADIENTS[3] },
    { label: "Delivered",     value: 0, gradient: YESTERDAY_GRADIENTS[4] },
  ]);
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [showAddAdminForm, setShowAddAdminForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest");

  const loadCallbacks = () => {
    const stored = JSON.parse(localStorage.getItem("callbackRequests") || "[]");
    return stored.filter(r => !r.called);
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

    // Fetch test statistics for test-related cards
    getTestStatistics({ fromDate: today, toDate: today })
      .then(stats => {
        setTodayTotal(stats.total);
        setTodayAuthenticated(stats.byStatus?.AUTHENTICATED || 0);
        setTodayDelivered(stats.byStatus?.DELIVERED || 0);
        setTodayRegistered(stats.byStatus?.REGISTERED || 0);
      })
      .catch(() => {});

    // Fetch patient statistics for patient count
    getPatientStatistics({ fromDate: today, toDate: today })
      .then(stats => {
        setTodayTotalPatients(stats.total || 0);
      })
      .catch(() => {});

    // Fetch yesterday's statistics (both test and patient)
    Promise.all([
      getTestStatistics({ fromDate: yesterday, toDate: yesterday }),
      getPatientStatistics({ fromDate: yesterday, toDate: yesterday })
    ]).then(([testStats, patientStats]) => {
      const s = testStats.byStatus || {};
      setYesterdayTotalPatients(patientStats.total || 0);
      setYesterdayBars([
        { label: "Total",         value: patientStats.total || 0,  gradient: YESTERDAY_GRADIENTS[0], link: "/reports/patient-list" },
        { label: "Registered",    value: s.REGISTERED    || 0,     gradient: YESTERDAY_GRADIENTS[1], link: "/result?status=REGISTERED" },
        { label: "Provisional",   value: s.PROVISIONAL   || 0,     gradient: YESTERDAY_GRADIENTS[2], link: "/result?status=PROVISIONAL" },
        { label: "Authenticated", value: s.AUTHENTICATED || 0,     gradient: YESTERDAY_GRADIENTS[3], link: "/result?status=AUTHENTICATED" },
        { label: "Delivered",     value: s.DELIVERED     || 0,     gradient: YESTERDAY_GRADIENTS[4], link: "/result?status=DELIVERED" },
      ]);
    }).catch(() => {});
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
    const handleClickOutside = (event) => {
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
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

  const handleSubmit = async (e) => {
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
      } catch (error) {
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
    <div className="p-4 bg-cyan-100 min-h-screen space-y-3">

      {/* ===== MERGED HEADER WITH HEALTH THOUGHT ===== */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-xl shadow-lg p-3 border-2 border-green-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Date & Time */}
          <div className="flex items-center gap-2">
            <Clock className="text-cyan-600" size={24} />
            <p className="text-base font-bold text-slate-800">
              {dateTime.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })} • {dateTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Daily Health Thought */}
          <div className="flex items-center gap-1 flex-1 min-w-[200px]">
            <Lightbulb className="text-yellow-500" size={24} />
               <p className="text-base font-semibold text-green-700 italic">{dailyThought}</p>
          
          </div>

          {/* Notification Bell + Admin */}
          <div className="flex items-center gap-4">

            {/* Bell Notification */}
            <div className="relative notification-container">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowAdminPopup(false);
                }}
                className="relative p-1 rounded-full hover:bg-cyan-100 transition-colors"
              >
                <Bell
                  size={24}
                  className={`text-cyan-700 ${notifications.length > 0 ? "animate-bounce" : ""}`}
                />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-cyan-200 z-50">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-cyan-50 rounded-t-lg">
                    <span className="font-semibold text-cyan-700 text-sm">
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
                        .sort((a, b) => sortOrder === "newest"
                          ? new Date(b.timestamp) - new Date(a.timestamp)
                          : new Date(a.timestamp) - new Date(b.timestamp)
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
                                className="mt-1 w-4 h-4 accent-cyan-600 cursor-pointer flex-shrink-0"
                                onChange={() => {
                                  const updated = JSON.parse(localStorage.getItem("callbackRequests") || "[]")
                                    .map(r => r.id === n.id ? { ...r, called: true } : r);
                                  localStorage.setItem("callbackRequests", JSON.stringify(updated));
                                  setNotifications(prev => prev.filter(x => x.id !== n.id));
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{n.name}</p>
                                <p className="text-xs text-cyan-700 font-medium">{n.phone}</p>
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
                        <Check size={12} className="text-green-500" />
                        Check the box after calling to remove from list
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Icon */}
            <div className="flex items-center gap-2 relative admin-popup-container">
              <span className="text-xl font-semibold text-slate-700">
                {(() => { const u = JSON.parse(localStorage.getItem('admin') || '{}'); const r = u.role || (u.userType === 'admin' ? 'Admin' : 'User'); return r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('SUPER') ? 'Admin' : r; })()}
              </span>
              <FaUserCircle 
                className="text-3xl text-cyan-700 cursor-pointer hover:text-cyan-800 transition-colors" 
                onClick={() => setShowAdminPopup(!showAdminPopup)}
              />
          
              {/* Admin Popup */}
              {showAdminPopup && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border-2 border-cyan-200 p-4 z-50">
                  {(() => {
                    const currentUser = JSON.parse(localStorage.getItem('admin') || '{}');
                    const isAdmin = currentUser.userType === 'admin' || !currentUser.userType;
                    const displayName = currentUser.name || currentUser.username || 'User';
                    const username = currentUser.username || '-';
                    const rawRole = currentUser.role || (isAdmin ? 'Admin' : 'User');
                    const role = rawRole.toUpperCase().includes('ADMIN') || rawRole.toUpperCase().includes('SUPER') ? 'Admin' : rawRole;
                    return (
                      <div className="space-y-3">
                        <div className="text-center">
                          <h3 className="text-lg font-bold mb-1 text-cyan-700">
                            WELCOME {isAdmin ? 'ADMIN' : role.toUpperCase()}
                          </h3>
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-full mx-auto flex items-center justify-center mb-2">
                            <FaUserCircle className="text-3xl text-cyan-600" />
                          </div>
                        </div>

                        <div className="space-y-2 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-3 text-sm border border-cyan-100">
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

                        {/* Only admins can add new admin */}
                        {isAdmin && (
                          <button
                            onClick={() => { setShowAddAdminForm(true); setShowAdminPopup(false); }}
                            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                          >
                            <span className="text-xl">+</span>
                            <span>Add New Admin</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to logout?")) {
                              localStorage.removeItem('token');
                              localStorage.removeItem('admin');
                              // Clear all form drafts
                              localStorage.removeItem('patientRegistrationDraft');
                              window.location.href = "/";
                            }
                          }}
                          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                        >
                          <LogOut size={18} />
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
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {statCards.map((item, i) => (
          <StatCard key={i} {...item} navigate={navigate} />
        ))}
      </div>

      {/* ===== CHARTS ROW ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Yesterday Summary */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h3 className="font-bold text-slate-700 text-base mb-3">Yesterday Summary</h3>
          <div className="space-y-2">
            {yesterdayBars.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  if (item.link) {
                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                    // Add yesterday date filter to the URL
                    const url = item.link.includes('?') 
                      ? `${item.link}&date=${yesterday}`
                      : `${item.link}?date=${yesterday}`;
                    navigate(url);
                  }
                }}
                className={`w-full text-left p-2 rounded-lg transition-all duration-200 ${
                  item.link 
                    ? 'hover:bg-gray-50 hover:shadow-md cursor-pointer border border-transparent hover:border-gray-200' 
                    : 'cursor-default'
                }`}
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="font-bold text-gray-800">{item.value}</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full bg-gradient-to-r ${item.gradient} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(Math.max(item.value, 1), 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Department-wise Tests Pie Chart */}
        <PieChartCard title="Department-wise Tests" data={deptData} colors={COLORS1} />

        {/* Quick Navigation Links */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-bold text-slate-700 text-lg mb-3 flex items-center gap-2">
            <Rocket className="text-cyan-600" size={20} />
            Quick Navigation
          </h3>
          <div className="space-y-2">
           
             <button
              onClick={() => navigate("/master/testlist")}
              className="w-full text-left px-3 py-2 text-sm text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors border border-cyan-200 hover:border-cyan-400 flex items-center gap-2"
            >
              <FileText size={16} className="text-cyan-600" />
              Test List
            </button>
            <button
              onClick={() => navigate("/master/packagelist")}
              className="w-full text-left px-3 py-2 text-sm text-purple-700 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200 hover:border-purple-400 flex items-center gap-2"
            >
              <Package size={16} className="text-purple-600" />
              Package List
            </button>
            <button
              onClick={() => navigate("/patient/registration")}
              className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-400 flex items-center gap-2"
            >
              <UserPlus size={16} className="text-green-600" />
              Patient Registration
            </button>
            <button
              onClick={() => navigate("/patient/search-booking")}
              className="w-full text-left px-3 py-2 text-sm text-orange-700 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 hover:border-orange-400 flex items-center gap-2"
            >
              <Search size={16} className="text-orange-600" />
              Search Booking
            </button>
            <button
              onClick={() => navigate("/result")}
              className="w-full text-left px-3 py-2 text-sm text-pink-700 hover:bg-pink-50 rounded-lg transition-colors border border-pink-200 hover:border-pink-400 flex items-center gap-2"
            >
              <TestTube size={16} className="text-pink-600" />
              Result Entry
            </button>
            <button
              onClick={() => navigate("/reports/daily-collection")}
              className="w-full text-left px-3 py-2 text-sm text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-teal-200 hover:border-teal-400 flex items-center gap-2"
            >
              <DollarSign size={16} className="text-teal-600" />
              Daily Collection
            </button>
          </div>
        </div>

      </div>
    </div>

    {/* Add Admin Form Modal */}
    {showAddAdminForm && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-cyan-200 w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-gradient-to-r from-cyan-50 to-blue-50 border-b-2 border-cyan-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-cyan-700">Add New Admin</h2>
            <button 
              onClick={handleCloseForm}
              className="text-gray-500 hover:text-gray-700 text-2xl"
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
                className={`w-full border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                placeholder="Enter full name"
              />
              {formErrors.name && (
                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
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
                className={`w-full border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
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
                className={`w-full border ${formErrors.username ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                placeholder="Enter username"
              />
              {formErrors.username && (
                <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
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
                  className={`w-full border ${formErrors.password ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
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
              {formErrors.password && (
                <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
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
                  className={`w-full border ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
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
              {formErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
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
                className={`w-full border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500`}
                placeholder="Enter 10-digit phone number"
                maxLength="10"
              />
              {formErrors.phone && (
                <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
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
                className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold py-2 px-4 rounded-md transition-all"
              >
                Add Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

/* ================= COMPONENTS ================= */

const StatCard = ({ title, value, sub, color, icon: Icon, link, navigate }) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  const map = {
    "pink-coral": "from-pink-400 to-orange-400",
    "slate-blue": "from-slate-600 to-blue-700",
    "purple-magenta": "from-purple-600 to-pink-600",
    "blue-teal": "from-blue-600 to-teal-500",
    "yellow-orange": "from-yellow-400 to-orange-500",
    "green-emerald": "from-green-600 to-emerald-500",
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
    } else if (link && navigate) {
      navigate(link);
    }
  };
  
  return (
    <div className="relative">
      <div 
        onClick={handleClick}
        className={`bg-gradient-to-br ${map[color]} rounded-lg p-3 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold opacity-90">{title}</p>
            {Icon && <Icon className="text-2xl opacity-80" />}
          </div>
          <p className="text-3xl font-bold mb-1">{value}</p>
          <p className="text-sm opacity-80">{sub}</p>
        </div>
      </div>
      
      {/* Dropdown Menu for Sample Tracking */}
      {title === "Sample Tracking" && showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl z-50 overflow-hidden border-2 border-cyan-200">
          {sampleTrackingOptions.map((option, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                console.log(`Clicked: ${option.label}`);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 hover:bg-cyan-50 transition-colors text-left border-b border-gray-200 last:border-b-0"
            >
              <span className="font-medium text-gray-800 text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PieChartCard = ({ title, data, colors }) => (
  <div className="bg-white rounded-lg shadow-lg p-4">
    <h3 className="font-bold text-slate-700 text-base mb-2">{title}</h3>
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={35} outerRadius={70}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>

);

export default Dashboard;
