import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import video1 from "../../assets/1.mp4";
import image2 from "../../assets/2.png";
import image3 from "../../assets/3.png";
import image4 from "../../assets/4.png";
import image5 from "../../assets/5.png";
import {
  User,
  Calendar,
  FileText,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  LogOut,
  Home,
  History,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ================= DATA ================= */

const labSlides = [
  {
    id: 1,
    image: video1,
    title: "Our Laboratory",
    description: "Experience our world-class facilities",
    type: "video",
  },
  {
    id: 2,
    image: image2,
    title:  "Quality Testing",
    description: "State-of-the-art diagnostic technology",
    type: "image",
  },
  {
    id: 3,
    image: image3,
    title: "Professional Services",
    description: "Comprehensive healthcare solutions",
    type: "image",
  },
  {
    id: 4,
    image: image4,
    title:"Advanced Diagnostics",
    description: "Accurate and reliable results",
    type: "image",
  },
  {
    id: 5,
    image: image5,
    title: "Expert Care",
    description: "Trusted by thousands of patients",
    type: "image",
  },
];

const patientInfo = {
  name: "John Doe",
  id: "PAT-2024-001",
  age: 35,
  gender: "Male",
  phone: "9876543210",
  email: "john.doe@email.com",
};

const testPackages = [
  {
    id: 1,
    name: "Complete Blood Count (CBC)",
    price: "₹500",
    tests: 25,
    description: "Comprehensive blood analysis",
    popular: true,
    category: "blood",
  },
  {
    id: 2,
    name: "Diabetes Package",
    price: "₹800",
    tests: 8,
    description: "Blood sugar & HbA1c tests",
    popular: true,
    category: "diabetes",
  },
  {
    id: 3,
    name: "Thyroid Profile",
    price: "₹600",
    tests: 5,
    description: "T3, T4, TSH analysis",
    popular: false,
    category: "hormone",
  },
  {
    id: 4,
    name: "Liver Function Test",
    price: "₹700",
    tests: 12,
    description: "Complete liver health check",
    popular: false,
    category: "organ",
  },
  {
    id: 5,
    name: "Kidney Function Test",
    price: "₹650",
    tests: 10,
    description: "Renal health assessment",
    popular: false,
    category: "organ",
  },
  {
    id: 6,
    name: "Lipid Profile",
    price: "₹550",
    tests: 8,
    description: "Cholesterol & triglycerides",
    popular: true,
    category: "blood",
  },
  {
    id: 7,
    name: "Vitamin Profile",
    price: "₹1200",
    tests: 15,
    description: "Vitamin D, B12, and more",
    popular: false,
    category: "vitamin",
  },
  {
    id: 8,
    name: "Full Body Checkup",
    price: "₹2500",
    tests: 50,
    description: "Comprehensive health screening",
    popular: true,
    category: "comprehensive",
  },
];

const sampleTracking = [
  {
    id: "SMP-001",
    testName: "CBC",
    status: "Collected",
    date: "2024-02-18",
    time: "09:30 AM",
    color: "blue",
  },
  {
    id: "SMP-002",
    testName: "Thyroid Profile",
    status: "Processing",
    date: "2024-02-18",
    time: "10:15 AM",
    color: "yellow",
  },
  {
    id: "SMP-003",
    testName: "Lipid Profile",
    status: "Completed",
    date: "2024-02-17",
    time: "11:00 AM",
    color: "green",
  },
];

const testHistory = [
  {
    id: 1,
    date: "2024-02-15",
    testName: "Complete Blood Count",
    status: "Completed",
    result: "Normal",
    doctor: "Dr. Smith",
  },
  {
    id: 2,
    date: "2024-02-10",
    testName: "Diabetes Package",
    status: "Completed",
    result: "Normal",
    doctor: "Dr. Johnson",
  },
  {
    id: 3,
    date: "2024-02-05",
    testName: "Thyroid Profile",
    status: "Completed",
    result: "Abnormal",
    doctor: "Dr. Williams",
  },
  {
    id: 4,
    date: "2024-01-28",
    testName: "Liver Function Test",
    status: "Completed",
    result: "Normal",
    doctor: "Dr. Brown",
  },
];

const testStatusData = [
  { name: "Completed", value: 45, color: "#10b981" },
  { name: "Pending", value: 15, color: "#f59e0b" },
  { name: "In Progress", value: 10, color: "#3b82f6" },
];

const monthlyTestData = [
  { month: "Jan", tests: 4 },
  { month: "Feb", tests: 7 },
  { month: "Mar", tests: 5 },
  { month: "Apr", tests: 8 },
  { month: "May", tests: 6 },
  { month: "Jun", tests: 9 },
];

/* ================= PATIENT DASHBOARD ================= */

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [dateTime, setDateTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const timer = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-slide effect
  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % labSlides.length);
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(slideTimer);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      navigate("/");
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % labSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + labSlides.length) % labSlides.length);
  };

  // Filter packages based on search and category
  const filteredPackages = testPackages.filter((pkg) => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || pkg.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-cyan-50 to-blue-50 relative overflow-hidden">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-cyan-600 text-white p-3 rounded-lg shadow-lg hover:bg-cyan-700 transition-colors"
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`
        fixed lg:relative
        w-64 sm:w-64 lg:w-56
        h-screen
        bg-gradient-to-b from-slate-800 via-cyan-700 to-cyan-600
        text-white
        flex flex-col
        shadow-2xl
        z-40
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="p-3 border-b border-white/20">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-base truncate">SilverLeaf</h2>
              <p className="text-xs text-cyan-100 truncate">Diagnostic Center</p>
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="p-3 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{patientInfo.name}</p>
              <p className="text-xs text-cyan-100 truncate">{patientInfo.id}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-2 flex flex-col overflow-y-auto">
          <button
            onClick={() => {
              setActiveMenu("dashboard");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm whitespace-nowrap ${
              activeMenu === "dashboard"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("packages");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm whitespace-nowrap ${
              activeMenu === "packages"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Test Packages</span>
          </button>

          <button
            onClick={() => {
              setActiveMenu("history");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all text-sm whitespace-nowrap ${
              activeMenu === "history"
                ? "bg-white/20 shadow-lg"
                : "hover:bg-white/10"
            }`}
          >
            <History className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Test History</span>
          </button>
        </nav>

       {/* Logout Button */}
        <div className="p-3 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all shadow-lg border-2 border-red-500 font-semibold text-sm w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-4 pt-20 sm:pt-6 lg:pt-4">
          {/* Welcome Header - Compressed */}
          <div className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 rounded-lg shadow-lg p-4 lg:p-4 mb-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="w-full sm:w-auto">
                <h1 className="text-xl sm:text-xl lg:text-2xl font-bold mb-1">
                  Welcome, {patientInfo.name}! 👋
                </h1>
                <p className="text-xs sm:text-sm text-cyan-100">
                  {dateTime.toLocaleDateString()} • {dateTime.toLocaleTimeString()}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 lg:p-3 w-full sm:w-auto">
                <p className="text-sm sm:text-sm text-center sm:text-left">Age: {patientInfo.age} | {patientInfo.gender}</p>
              </div>
            </div>
          </div>

          {/* Image Slider */}
          <div className="relative bg-white rounded-lg shadow-lg mb-4 overflow-hidden h-48 sm:h-56 md:h-64 lg:h-80">
            {/* Slides */}
            <div className="relative h-full overflow-hidden">
              {labSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {slide.type === "video" ? (
                    <video
                      src={slide.image}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {/* Text Overlay - Bottom Only with Light Background */}
                  <div className="absolute bottom-0 left-0 right-0">
                    <div className="p-2 lg:p-3">
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-800 mb-0.5">{slide.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{slide.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 lg:p-3 shadow-lg transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 lg:p-3 shadow-lg transition-all z-10"
            >
              <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
            </button>

           
          </div>

          {/* Quick Stats - Compressed */}
          {activeMenu === "dashboard" && (
            <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mb-4">
            <StatCard
              title="Total Tests"
              value="45"
              icon={FileText}
              color="from-blue-500 to-blue-600"
            />
            <StatCard
              title="Pending"
              value="3"
              icon={Clock}
              color="from-yellow-500 to-orange-500"
            />
            <StatCard
              title="Completed"
              value="42"
              icon={CheckCircle}
              color="from-green-500 to-emerald-600"
            />
            <StatCard
              title="Abnormal"
              value="2"
              icon={AlertCircle}
              color="from-red-500 to-pink-600"
            />
          </div>

          {/* Main Content Grid - Compressed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Test Packages */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-3 lg:p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base lg:text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-cyan-600 w-[18px] h-[18px] lg:w-5 lg:h-5" />
                    Available Test Packages
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] lg:max-h-[400px] overflow-y-auto">
                  {testPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="border-2 border-gray-200 rounded-lg p-3 lg:p-4 hover:border-cyan-500 hover:shadow-md transition-all cursor-pointer relative"
                    >
                      {pkg.popular && (
                        <span className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Popular
                        </span>
                      )}
                      <h3 className="font-bold text-sm lg:text-base text-gray-800 mb-1 pr-16">{pkg.name}</h3>
                      <p className="text-xs lg:text-sm text-gray-600 mb-3">{pkg.description}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-lg lg:text-xl font-bold text-cyan-600">{pkg.price}</p>
                          <p className="text-xs text-gray-500">{pkg.tests} tests</p>
                        </div>
                        <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-semibold transition-colors">
                          Book
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Test Status Chart - Compressed */}
            <div className="bg-white rounded-lg shadow-lg p-3 lg:p-4">
              <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Activity className="text-cyan-600 w-[18px] h-[18px] lg:w-5 lg:h-5" />
                Test Status
              </h2>
              <div className="h-[200px] lg:h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={testStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                    >
                      {testStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2">
                {testStatusData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs lg:text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800 text-sm lg:text-base">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sample Tracking & Monthly Tests - Compressed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* Sample Tracking */}
            <div className="bg-white rounded-lg shadow-lg p-3 lg:p-4">
              <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Clock className="text-cyan-600 w-[18px] h-[18px] lg:w-5 lg:h-5" />
                Sample Tracking
              </h2>
              <div className="space-y-2 lg:space-y-3">
                {sampleTracking.map((sample) => (
                  <div
                    key={sample.id}
                    className="border-l-4 border-cyan-500 bg-gray-50 rounded-r-lg p-3 lg:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm lg:text-base text-gray-800">{sample.testName}</p>
                        <p className="text-xs lg:text-sm text-gray-600">ID: {sample.id}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {sample.date} • {sample.time}
                        </p>
                      </div>
                      <span
                        className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-semibold whitespace-nowrap ${
                          sample.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : sample.status === "Processing"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {sample.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Test Trend */}
            <div className="bg-white rounded-lg shadow-lg p-3 lg:p-4">
              <h2 className="text-base lg:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp className="text-cyan-600 w-[18px] h-[18px] lg:w-5 lg:h-5" />
                Monthly Test Trend
              </h2>
              <div className="h-[200px] lg:h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTestData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="tests" fill="#0891b2" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Test History - Compressed */}
          <div className="bg-white rounded-lg shadow-lg p-3 lg:p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base lg:text-lg font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-cyan-600 w-[18px] h-[18px] lg:w-5 lg:h-5" />
                Previous Test History
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs lg:text-sm min-w-[600px]">
                <thead className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
                  <tr>
                    <th className="px-2 lg:px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-2 lg:px-3 py-2 text-left font-semibold">Test Name</th>
                    <th className="px-2 lg:px-3 py-2 text-left font-semibold">Doctor</th>
                    <th className="px-2 lg:px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-2 lg:px-3 py-2 text-left font-semibold">Result</th>
                    <th className="px-2 lg:px-3 py-2 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {testHistory.map((test, index) => (
                    <tr
                      key={test.id}
                      className={`border-b hover:bg-gray-50 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <td className="px-2 lg:px-3 py-2">{test.date}</td>
                      <td className="px-2 lg:px-3 py-2 font-medium">{test.testName}</td>
                      <td className="px-2 lg:px-3 py-2">{test.doctor}</td>
                      <td className="px-2 lg:px-3 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          {test.status}
                        </span>
                      </td>
                      <td className="px-2 lg:px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            test.result === "Normal"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {test.result}
                        </span>
                      </td>
                      <td className="px-2 lg:px-3 py-2">
                        <button className="text-cyan-600 hover:text-cyan-700 font-semibold text-xs">
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}

          {/* Test Packages Browse View */}
          {activeMenu === "packages" && (
            <div className="space-y-4">
              {/* Search and Filter Section */}
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="text-cyan-600" />
                  Browse Test Packages
                </h2>
                
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search tests or packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none text-sm lg:text-base"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "all"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    All Tests
                  </button>
                  <button
                    onClick={() => setSelectedCategory("blood")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "blood"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Blood Tests
                  </button>
                  <button
                    onClick={() => setSelectedCategory("diabetes")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "diabetes"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Diabetes
                  </button>
                  <button
                    onClick={() => setSelectedCategory("hormone")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "hormone"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Hormones
                  </button>
                  <button
                    onClick={() => setSelectedCategory("organ")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "organ"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Organ Tests
                  </button>
                  <button
                    onClick={() => setSelectedCategory("vitamin")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "vitamin"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Vitamins
                  </button>
                  <button
                    onClick={() => setSelectedCategory("comprehensive")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedCategory === "comprehensive"
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Full Checkup
                  </button>
                </div>
              </div>

              {/* Packages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPackages.length > 0 ? (
                  filteredPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-all border-2 border-transparent hover:border-cyan-500 relative group"
                    >
                      {pkg.popular && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
                          ⭐ Popular
                        </div>
                      )}
                      
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 pr-12">{pkg.name}</h3>
                        <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                          <FileText size={16} />
                          <span>{pkg.tests} tests included</span>
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-cyan-600">{pkg.price}</span>
                        </div>
                      </div>

                      <button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white py-3 rounded-lg font-semibold transition-all transform group-hover:scale-105">
                        View Details
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No packages found matching your search</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ================= STAT CARD COMPONENT ================= */

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-lg shadow-lg p-3 lg:p-4 text-white transition-shadow hover:shadow-xl`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs lg:text-sm opacity-90 mb-1">{title}</p>
          <p className="text-xl lg:text-2xl font-bold">{value}</p>
        </div>
        <Icon className="w-6 h-6 lg:w-7 lg:h-7 opacity-80" />
      </div>
    </div>
  );
};

export default PatientDashboard;
