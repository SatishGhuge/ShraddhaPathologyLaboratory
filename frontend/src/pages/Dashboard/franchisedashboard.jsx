import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import {
  Home, Users, TrendingUp, DollarSign, MapPin, Settings,
  Search, Bell, Plus, Filter, MoreVertical, Eye, Edit,
  Trash2, Calendar, Activity, Award, AlertCircle,
  ChevronDown, Building2, TestTube, FileText, Clock,
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight,
  Menu, X, LogOut, User, Package, Truck, FileCheck,
  CreditCard, BarChart3, TrendingDown, Users2, CalendarDays,
  ClipboardList, Download, Printer, RefreshCw, MessageSquare,
  Send, Phone, Mail, Paperclip
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

const FranchiseDashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // QMS States
  const [qmsMessage, setQmsMessage] = useState('');
  const [qmsSubject, setQmsSubject] = useState('');
  const [qmsAttachment, setQmsAttachment] = useState(null);
  const [qmsCategory, setQmsCategory] = useState('General Query');
  const [qmsPriority, setQmsPriority] = useState('Normal');

  // Sample raised queries data
  const [raisedQueries, setRaisedQueries] = useState([
    {
      id: 'EG11127',
      status: 'IN PROCESS',
      type: 'Online Query',
      subject: 'Sample awaiting',
      message: 'SAMPLE ID 14439603 BARCODE 834627908 THIS SAMPLE ENTRY DONE ON YESTERDAY BUT MISTAKELY FORGOT TO VERIFY SAMPLE.IN YESTERDAY EVENING SAMPLE IS VERIFY BUT NOT ANYTHING SHOW NOW. TO BE PROCESSED AND LAB MAY STILL SAMPLE IS SHOWING PENDING. PLEASE DO IT FROM ON URGENT BASIS & PLEASE RELEASED REPORT ON URGENT BASIS. PLEASE KINDLY CO-ORDINATE AS SOON AS POSSIBLE THANKING YOU.',
      date: '12-02-2025 03:28 PM',
      franchise: 'Silverleaf diagnostic'
    },
    {
      id: 'EG11461',
      status: 'RESOLVED',
      type: 'Online Query',
      subject: 'Sample verification',
      message: 'SAMPLE ID 34452373 BARCODE ID 8305751897 SAMPLE IS VERIFY PLEASE NOW THIS IS...',
      date: '12-01-2025 03:04 PM',
      franchise: 'Silverleaf diagnostic'
    }
  ]);

  // Sample offers data
  const testOffers = [
    { id: 1, name: 'CBC (Complete Blood Count)', originalPrice: 350, offerPrice: 250, discount: 28, validTill: '28/02/2026', description: 'Comprehensive blood analysis' },
    { id: 2, name: 'Lipid Profile', originalPrice: 800, offerPrice: 600, discount: 25, validTill: '28/02/2026', description: 'Cholesterol and triglycerides test' },
    { id: 3, name: 'Thyroid Profile', originalPrice: 600, offerPrice: 450, discount: 25, validTill: '28/02/2026', description: 'T3, T4, TSH levels' },
    { id: 4, name: 'Liver Function Test (LFT)', originalPrice: 450, offerPrice: 350, discount: 22, validTill: '28/02/2026', description: 'Complete liver health check' },
    { id: 5, name: 'Kidney Function Test (KFT)', originalPrice: 500, offerPrice: 400, discount: 20, validTill: '28/02/2026', description: 'Renal health assessment' },
    { id: 6, name: 'HbA1c (Diabetes)', originalPrice: 400, offerPrice: 300, discount: 25, validTill: '28/02/2026', description: '3-month blood sugar average' },
  ];

  const packageOffers = [
    { id: 1, name: 'Basic Health Package', originalPrice: 1500, offerPrice: 999, discount: 33, validTill: '28/02/2026', tests: ['CBC', 'ESR', 'Blood Sugar', 'Urine Routine'], description: 'Essential health screening' },
    { id: 2, name: 'Executive Health Package', originalPrice: 3500, offerPrice: 2499, discount: 28, validTill: '28/02/2026', tests: ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid', 'Vitamin D'], description: 'Comprehensive health checkup' },
    { id: 3, name: 'Cardiac Care Package', originalPrice: 2500, offerPrice: 1799, discount: 28, validTill: '28/02/2026', tests: ['ECG', 'Lipid Profile', 'Cardiac Markers', 'Blood Pressure'], description: 'Heart health monitoring' },
    { id: 4, name: 'Diabetes Care Package', originalPrice: 1800, offerPrice: 1299, discount: 27, validTill: '28/02/2026', tests: ['HbA1c', 'Fasting Sugar', 'PP Sugar', 'Kidney Function'], description: 'Complete diabetes management' },
    { id: 5, name: 'Women Wellness Package', originalPrice: 2800, offerPrice: 1999, discount: 28, validTill: '28/02/2026', tests: ['CBC', 'Thyroid', 'Vitamin D', 'Iron Studies', 'Calcium'], description: 'Specialized for women health' },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sample data
  const revenueData = [
    { month: 'Jan', revenue: 45000, target: 40000 },
    { month: 'Feb', revenue: 52000, target: 45000 },
    { month: 'Mar', revenue: 48000, target: 50000 },
    { month: 'Apr', revenue: 65000, target: 55000 },
    { month: 'May', revenue: 71000, target: 60000 },
    { month: 'Jun', revenue: 78000, target: 65000 }
  ];

  const monthlyGrowthData = [
    { month: 'Jan', tests: 1200, revenue: 45000 },
    { month: 'Feb', tests: 1450, revenue: 52000 },
    { month: 'Mar', tests: 1380, revenue: 48000 },
    { month: 'Apr', tests: 1890, revenue: 65000 },
    { month: 'May', tests: 2100, revenue: 71000 },
    { month: 'Jun', tests: 2350, revenue: 78000 }
  ];

  const franchisePerformanceData = [
    { name: 'Active', value: 45, color: '#10b981' },
    { name: 'Pending', value: 8, color: '#f59e0b' },
    { name: 'Inactive', value: 3, color: '#ef4444' }
  ];

  const paymentStatusData = [
    { name: 'Paid', value: 35, color: '#10b981' },
    { name: 'Pending', value: 12, color: '#f59e0b' },
    { name: 'Overdue', value: 5, color: '#ef4444' }
  ];

  const franchiseList = [
    {
      id: 'FC001',
      name: 'Mumbai Central',
      location: 'Mumbai, Maharashtra',
      owner: 'Rajesh Kumar',
      revenue: 125000,
      tests: 450,
      status: 'active',
      growth: 12.5,
      rating: 4.8,
      paymentStatus: 'paid'
    },
    {
      id: 'FC002',
      name: 'Pune City Center',
      location: 'Pune, Maharashtra',
      owner: 'Priya Sharma',
      revenue: 98000,
      tests: 380,
      status: 'active',
      growth: 8.3,
      rating: 4.6,
      paymentStatus: 'paid'
    },
    {
      id: 'FC003',
      name: 'Bangalore North',
      location: 'Bangalore, Karnataka',
      owner: 'Amit Patel',
      revenue: 156000,
      tests: 520,
      status: 'active',
      growth: 15.7,
      rating: 4.9,
      paymentStatus: 'paid'
    },
    {
      id: 'FC004',
      name: 'Delhi NCR',
      location: 'New Delhi, Delhi',
      owner: 'Sneha Reddy',
      revenue: 89000,
      tests: 290,
      status: 'pending',
      growth: -2.1,
      rating: 4.2,
      paymentStatus: 'pending'
    },
    {
      id: 'FC005',
      name: 'Hyderabad East',
      location: 'Hyderabad, Telangana',
      owner: 'Vikram Singh',
      revenue: 112000,
      tests: 410,
      status: 'active',
      growth: 9.8,
      rating: 4.7,
      paymentStatus: 'overdue'
    }
  ];

  // Sample tracking data
  const sampleTrackingData = [
    { id: 'SMP001', franchise: 'Mumbai Central', tests: 'CBC, Lipid Profile', status: 'Collected', time: '09:30 AM', date: '18/02/2026' },
    { id: 'SMP002', franchise: 'Pune City Center', tests: 'Thyroid Panel, Vitamin D', status: 'In Transit', time: '10:15 AM', date: '18/02/2026' },
    { id: 'SMP003', franchise: 'Bangalore North', tests: 'Cardiac Markers', status: 'Received at Lab', time: '11:30 AM', date: '18/02/2026' },
    { id: 'SMP004', franchise: 'Delhi NCR', tests: 'Iron Studies, CBC', status: 'Pending', time: '10:45 AM', date: '18/02/2026' },
    { id: 'SMP005', franchise: 'Hyderabad East', tests: 'Liver Function Test', status: 'Collected', time: '02:08 PM', date: '18/02/2026' }
  ];

  // Billing data
  const billingData = [
    { id: 'INV001', franchise: 'Mumbai Central', amount: 125000, date: '15/02/2026', status: 'Paid', dueDate: '25/02/2026' },
    { id: 'INV002', franchise: 'Pune City Center', amount: 98000, date: '14/02/2026', status: 'Paid', dueDate: '24/02/2026' },
    { id: 'INV003', franchise: 'Bangalore North', amount: 156000, date: '16/02/2026', status: 'Pending', dueDate: '26/02/2026' },
    { id: 'INV004', franchise: 'Delhi NCR', amount: 89000, date: '10/02/2026', status: 'Overdue', dueDate: '20/02/2026' },
    { id: 'INV005', franchise: 'Hyderabad East', amount: 112000, date: '08/02/2026', status: 'Overdue', dueDate: '18/02/2026' }
  ];

  const topPerformers = [
    { name: 'Bangalore North', revenue: 156000, growth: 15.7 },
    { name: 'Mumbai Central', revenue: 125000, growth: 12.5 },
    { name: 'Hyderabad East', revenue: 112000, growth: 9.8 }
  ];

  const recentActivities = [
    { action: 'New franchise registered', location: 'Chennai South', time: '2 hours ago', type: 'success' },
    { action: 'Monthly report submitted', location: 'Mumbai Central', time: '5 hours ago', type: 'info' },
    { action: 'Payment pending', location: 'Delhi NCR', time: '1 day ago', type: 'warning' },
    { action: 'License renewal required', location: 'Kolkata West', time: '2 days ago', type: 'alert' }
  ];

  const getSampleStatusColor = (status) => {
    switch(status) {
      case 'Collected': return 'bg-blue-100 text-blue-700';
      case 'In Transit': return 'bg-purple-100 text-purple-700';
      case 'Received at Lab': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getBillingStatusColor = (status) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, gradient, trend }) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium opacity-90 mb-2">{title}</p>
          <h3 className="text-4xl font-bold mb-2">{value}</h3>
          <div className="flex items-center gap-2">
            {trend === 'up' ? (
              <ArrowUpRight size={16} className="text-white" />
            ) : (
              <ArrowDownRight size={16} className="text-white" />
            )}
            <span className={`text-sm font-semibold ${trend === 'up' ? 'text-white' : 'text-red-200'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
          <Icon size={32} className="text-white" />
        </div>
      </div>
    </div>
  );

  const NavItem = ({ icon: Icon, label, badge, active, onClick }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
        active
          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {badge && (
        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
          {badge}
        </span>
      )}
    </button>
  );

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed lg:static
        w-72 h-full
        bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl
        transition-transform duration-300 ease-in-out z-40
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain bg-white rounded-lg p-1" />
            <div>
              <h1 className="text-xl font-bold">SilverLeaf Daignostics</h1>
            
              <p className="text-sm text-gray-400">Franchise Network</p>
            </div>
          </div>
        </div>

        {/* Center Info */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <p className="font-semibold">Admin Dashboard</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavItem 
            icon={Home} 
            label="Dashboard" 
            active={activeNav === 'Dashboard'} 
            onClick={() => setActiveNav('Dashboard')} 
          />
          <NavItem 
            icon={Users2} 
            label="Franchises" 
            active={activeNav === 'Franchises'} 
            onClick={() => setActiveNav('Franchises')} 
          />
          <NavItem 
            icon={Package} 
            label="Tests & Packages" 
            active={activeNav === 'Tests & Packages'} 
            onClick={() => setActiveNav('Tests & Packages')} 
          />
          <NavItem 
            icon={Award} 
            label="Offers" 
            active={activeNav === 'Offers'} 
            onClick={() => setActiveNav('Offers')} 
          />
          <NavItem 
            icon={MessageSquare} 
            label="QMS" 
            active={activeNav === 'QMS'} 
            onClick={() => setActiveNav('QMS')} 
          />
          <NavItem 
            icon={Truck} 
            label="Sample Tracking" 
            badge="5"
            active={activeNav === 'Sample Tracking'} 
            onClick={() => setActiveNav('Sample Tracking')} 
          />
          <NavItem 
            icon={CreditCard} 
            label="Billing" 
            active={activeNav === 'Billing'} 
            onClick={() => setActiveNav('Billing')} 
          />
          <NavItem 
            icon={FileCheck} 
            label="Patient Registration" 
            active={activeNav === 'Patient Registration'} 
            onClick={() => setActiveNav('Patient Registration')} 
          />
          <NavItem 
            icon={BarChart3} 
            label="Reports" 
            active={activeNav === 'Reports'} 
            onClick={() => setActiveNav('Reports')} 
          />
          <NavItem 
            icon={Settings} 
            label="Settings" 
            active={activeNav === 'Settings'} 
            onClick={() => setActiveNav('Settings')} 
          />
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              AD
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Admin User</p>
              <p className="text-xs text-gray-400">admin@silverleaf.com</p>
            </div>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-400">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="px-4 lg:px-8 py-4 mt-16 lg:mt-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeNav === 'Dashboard' && 'Franchise Dashboard'}
                  {activeNav === 'Franchises' && 'All Franchises'}
                  {activeNav === 'Tests & Packages' && 'Tests & Packages'}
                  {activeNav === 'Offers' && 'Special Offers'}
                  {activeNav === 'QMS' && 'Query Management System'}
                  {activeNav === 'Sample Tracking' && 'Sample Tracking'}
                  {activeNav === 'Billing' && 'Billing & Payments'}
                  {activeNav === 'Patient Registration' && 'Patient Registration'}
                  {activeNav === 'Reports' && 'Reports'}
                  {activeNav === 'Settings' && 'Settings'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {currentTime.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} • {currentTime.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Period Selector */}
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>

                {/* Notifications */}
                <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell size={22} className="text-gray-600" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8">
          {/* Dashboard View */}
          {activeNav === 'Dashboard' && (
            <>
              {/* Top Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Franchises"
                  value="56"
                  change="+8 this month"
                  icon={Building2}
                  gradient="from-blue-500 to-blue-600"
                  trend="up"
                />
                <StatCard
                  title="Total Revenue"
                  value="₹8.5M"
                  change="+12.5%"
                  icon={DollarSign}
                  gradient="from-emerald-500 to-emerald-600"
                  trend="up"
                />
                <StatCard
                  title="Active Franchises"
                  value="45"
                  change="89% active"
                  icon={Activity}
                  gradient="from-purple-500 to-purple-600"
                  trend="up"
                />
                <StatCard
                  title="Total Tests"
                  value="12.4K"
                  change="+18.2%"
                  icon={TestTube}
                  gradient="from-orange-500 to-orange-600"
                  trend="up"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Revenue Overview</h3>
                      <p className="text-sm text-gray-500">Monthly performance vs target</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Revenue</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-gray-600">Target</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="target" fill="#e5e7eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Franchise Status Pie Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Franchise Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={franchisePerformanceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {franchisePerformanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-6 space-y-3">
                    {franchisePerformanceData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tests & Revenue Trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Tests & Revenue Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area yAxisId="left" type="monotone" dataKey="tests" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                      <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {paymentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-6 space-y-3">
                    {paymentStatusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Performers & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Top Performers</h3>
                    <Award className="text-yellow-500" size={24} />
                  </div>
                  <div className="space-y-4">
                    {topPerformers.map((franchise, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{franchise.name}</h4>
                            <p className="text-sm text-gray-500">Revenue: ₹{franchise.revenue.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-emerald-600">
                            <TrendingUp size={16} />
                            <span className="font-bold">{franchise.growth}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Activities</h3>
                  <div className="space-y-4">
                    {recentActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            activity.type === 'success'
                              ? 'bg-emerald-100'
                              : activity.type === 'warning'
                              ? 'bg-yellow-100'
                              : activity.type === 'alert'
                              ? 'bg-red-100'
                              : 'bg-blue-100'
                          }`}
                        >
                          {activity.type === 'success' && <CheckCircle size={20} className="text-emerald-600" />}
                          {activity.type === 'warning' && <AlertCircle size={20} className="text-yellow-600" />}
                          {activity.type === 'alert' && <XCircle size={20} className="text-red-600" />}
                          {activity.type === 'info' && <FileText size={20} className="text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-600">{activity.location}</p>
                          <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Franchise Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">All Franchises</h3>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        <span className="text-sm font-medium">Filter</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all">
                        <Plus size={18} />
                        <span className="text-sm font-medium">Add Franchise</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Franchise Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tests</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Growth</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {franchiseList.map((franchise) => (
                        <tr key={franchise.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{franchise.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                                {franchise.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-900">{franchise.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-600">{franchise.location}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{franchise.owner}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-900">
                              ₹{franchise.revenue.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{franchise.tests}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className={`flex items-center gap-1 ${
                                franchise.growth > 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {franchise.growth > 0 ? (
                                <ArrowUpRight size={14} />
                              ) : (
                                <ArrowDownRight size={14} />
                              )}
                              <span className="text-sm font-semibold">{franchise.growth}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                franchise.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : franchise.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {franchise.status.charAt(0).toUpperCase() + franchise.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Eye size={16} className="text-gray-600" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Edit size={16} className="text-gray-600" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Trash2 size={16} className="text-red-500" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <MoreVertical size={16} className="text-gray-600" />
                              </button>
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

          {/* QMS View */}
          {activeNav === 'QMS' && (
            <>
              {/* Contact Lab 24/7 Banner */}
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl p-6 mb-8 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">Contact Main Lab 24/7</h2>
                    <p className="text-cyan-100 mb-4">We're here to help you anytime, anywhere. Reach out to us for any queries or support.</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                        <Phone size={20} />
                        <span className="font-semibold">+91 98765 43210</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                        <Mail size={20} />
                        <span className="font-semibold">support@silverleaf.com</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                        <Clock size={20} />
                        <span className="font-semibold">24/7 Available</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <MessageSquare size={64} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Write Message Section */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Send size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Write Message to Main Lab</h3>
                        <p className="text-sm text-gray-500">Send your queries, concerns, or feedback</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Category and Priority */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                          <select 
                            value={qmsCategory}
                            onChange={(e) => setQmsCategory(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option>General Query</option>
                            <option>Sample Issue</option>
                            <option>Report Delay</option>
                            <option>Technical Support</option>
                            <option>Billing Query</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                          <select 
                            value={qmsPriority}
                            onChange={(e) => setQmsPriority(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option>Normal</option>
                            <option>High</option>
                            <option>Urgent</option>
                          </select>
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                        <input
                          type="text"
                          value={qmsSubject}
                          onChange={(e) => setQmsSubject(e.target.value)}
                          placeholder="Enter subject of your query"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                        <textarea
                          value={qmsMessage}
                          onChange={(e) => setQmsMessage(e.target.value)}
                          placeholder="Type your message here..."
                          rows="8"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                        />
                      </div>

                      {/* Attachment */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (Optional)</label>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <Paperclip size={18} className="text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Choose File</span>
                            <input
                              type="file"
                              onChange={(e) => setQmsAttachment(e.target.files[0])}
                              className="hidden"
                            />
                          </label>
                          {qmsAttachment && (
                            <span className="text-sm text-gray-600">{qmsAttachment.name}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
                      </div>

                      {/* Send Button */}
                      <div className="flex gap-3 pt-4">
                        <button 
                          onClick={() => {
                            if (!qmsSubject || !qmsMessage) {
                              alert('Please fill in subject and message');
                              return;
                            }
                            alert('Message sent successfully!');
                            setQmsMessage('');
                            setQmsSubject('');
                            setQmsAttachment(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                        >
                          <Send size={20} />
                          Send Message
                        </button>
                        <button 
                          onClick={() => {
                            setQmsMessage('');
                            setQmsSubject('');
                            setQmsAttachment(null);
                            setQmsCategory('General Query');
                            setQmsPriority('Normal');
                          }}
                          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raised Queries Section */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">Raised Queries</h3>
                      <button className="text-cyan-600 hover:text-cyan-700 text-sm font-semibold">
                        View All
                      </button>
                    </div>

                    <div className="space-y-4">
                      {raisedQueries.map((query) => (
                        <div key={query.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="text-sm font-bold text-gray-900">{query.id}</span>
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full font-semibold ${
                                query.status === 'IN PROCESS' 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {query.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">{query.subject}</p>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{query.message}</p>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{query.franchise}</span>
                            <span>{query.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Stats */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">Query Statistics</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Queries</span>
                          <span className="text-sm font-bold text-gray-900">24</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">In Process</span>
                          <span className="text-sm font-bold text-orange-600">8</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Resolved</span>
                          <span className="text-sm font-bold text-green-600">16</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Offers View */}
          {activeNav === 'Offers' && (
            <>
              {/* Offers Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Active Offers</p>
                      <p className="text-3xl font-bold">{testOffers.length + packageOffers.length}</p>
                    </div>
                    <Award size={32} className="opacity-80" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Test Offers</p>
                      <p className="text-3xl font-bold">{testOffers.length}</p>
                    </div>
                    <TestTube size={32} className="opacity-80" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Package Offers</p>
                      <p className="text-3xl font-bold">{packageOffers.length}</p>
                    </div>
                    <Package size={32} className="opacity-80" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Avg. Discount</p>
                      <p className="text-3xl font-bold">26%</p>
                    </div>
                    <TrendingDown size={32} className="opacity-80" />
                  </div>
                </div>
              </div>

              {/* Test Offers Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Test Offers</h2>
                    <p className="text-sm text-gray-500 mt-1">Special discounts on individual tests</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-lg transition-all">
                    <Plus size={18} />
                    <span className="text-sm font-medium">Add Test Offer</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testOffers.map((offer) => (
                    <div key={offer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-1">{offer.name}</h3>
                            <p className="text-sm opacity-90">{offer.description}</p>
                          </div>
                          <div className="bg-white text-orange-600 px-3 py-1 rounded-full text-sm font-bold">
                            {offer.discount}% OFF
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm text-gray-500 line-through">₹{offer.originalPrice}</p>
                            <p className="text-2xl font-bold text-gray-900">₹{offer.offerPrice}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Valid till</p>
                            <p className="text-sm font-semibold text-gray-900">{offer.validTill}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium">
                            Book Now
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <Edit size={16} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Offers Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Package Offers</h2>
                    <p className="text-sm text-gray-500 mt-1">Combo packages with special pricing</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all">
                    <Plus size={18} />
                    <span className="text-sm font-medium">Add Package Offer</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {packageOffers.map((offer) => (
                    <div key={offer.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4 text-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-xl mb-1">{offer.name}</h3>
                            <p className="text-sm opacity-90">{offer.description}</p>
                          </div>
                          <div className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-bold">
                            {offer.discount}% OFF
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Includes:</p>
                          <div className="flex flex-wrap gap-2">
                            {offer.tests.map((test, idx) => (
                              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                {test}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b">
                          <div>
                            <p className="text-sm text-gray-500 line-through">₹{offer.originalPrice}</p>
                            <p className="text-3xl font-bold text-gray-900">₹{offer.offerPrice}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Valid till</p>
                            <p className="text-sm font-semibold text-gray-900">{offer.validTill}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-md transition-all text-sm font-medium">
                            Book Package
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <Edit size={16} className="text-gray-600" />
                          </button>
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <Eye size={16} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Sample Tracking View */}
          {activeNav === 'Sample Tracking' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Sample Tracking</h3>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <RefreshCw size={18} />
                      <span className="text-sm font-medium">Refresh</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Download size={18} />
                      <span className="text-sm font-medium">Export</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Sample ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Franchise</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tests</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Time</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sampleTrackingData.map((sample) => (
                      <tr key={sample.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{sample.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{sample.franchise}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{sample.tests}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{sample.date}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{sample.time}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSampleStatusColor(sample.status)}`}>
                            {sample.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Billing View */}
          {activeNav === 'Billing' && (
            <>
              {/* Billing Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Invoices</p>
                      <p className="text-3xl font-bold text-gray-900">52</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-blue-600" size={24} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-3xl font-bold text-gray-900">₹5.8M</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="text-green-600" size={24} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Paid</p>
                      <p className="text-3xl font-bold text-emerald-600">₹3.2M</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-emerald-600" size={24} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Outstanding</p>
                      <p className="text-3xl font-bold text-red-600">₹2.6M</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="text-red-600" size={24} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Billing & Invoices</h3>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        <Filter size={18} />
                        <span className="text-sm font-medium">Filter</span>
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all">
                        <Plus size={18} />
                        <span className="text-sm font-medium">Create Invoice</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Invoice ID</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Franchise</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Invoice Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {billingData.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">{invoice.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{invoice.franchise}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-gray-900">₹{invoice.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{invoice.date}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{invoice.dueDate}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getBillingStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Eye size={16} className="text-gray-600" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Printer size={16} className="text-gray-600" />
                              </button>
                              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Download size={16} className="text-gray-600" />
                              </button>
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

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            Last updated: {currentTime.toLocaleString()} | © 2026 SilverLeaf Diagnostics
          </div>
        </div>
      </main>
    </div>
  );
};

export default FranchiseDashboard;