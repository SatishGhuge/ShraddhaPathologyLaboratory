"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  ChevronRight,
  Filter,
  Search,
  Eye,
  Download,
  X,
  ChevronLeft,
  Clock,
  TestTube,
  Package,
  CreditCard,
} from "lucide-react";

interface Booking {
  id: string;
  testIds: number[];
  testNames: string[];
  bookingDate: string;
  visitDate: string;
  visitTime: string;
  address?: string;
  reportMode: string;
  status: "Scheduled" | "In Progress" | "Report Ready" | "Completed" | "Cancelled";
  amount: number;
  method: "Lab" | "Home";
  createdAt: string;
  paymentStatus?: "Paid" | "Pending" | "Failed";
  paymentMethod?: string;
}

interface SelectedItem {
  id?: number;
  name: string;
  b2cCharge?: number;
}

export default function PatientBookingsHistoryPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pendingBooking, setPendingBooking] = useState(false);
  const [selectedTests, setSelectedTests] = useState<SelectedItem[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<SelectedItem[]>([]);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    visitDate: "",
    visitTime: "",
    reportMode: "Email",
  });
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [testCharges, setTestCharges] = useState<Map<number, number>>(new Map());
  const [allTests, setAllTests] = useState<any[]>([]);

  useEffect(() => {
    // Check if there are newly selected tests/packages to book
    const savedTests = localStorage.getItem("selectedTests");
    const savedPackages = localStorage.getItem("selectedPackages");

    if (savedTests || savedPackages) {
      // Show new booking form
      const tests = JSON.parse(savedTests || "[]");
      const packages = JSON.parse(savedPackages || "[]");
      
      setSelectedTests(tests);
      setSelectedPackages(packages);
      
      // Fetch all tests to get detailed charge info
      fetchTestCharges(tests, packages);
      
      setPendingBooking(true);
      setLoading(false);
      return;
    }

    // Otherwise load bookings history
    // Load bookings from localStorage
    const labBookings = JSON.parse(localStorage.getItem("labBookings") || "[]");
    const homeVisits = JSON.parse(localStorage.getItem("patientHomeVisits") || "[]");

    // Convert home visits to booking format
    const homeBookings = homeVisits.map((visit: any) => ({
      id: visit.id,
      testIds: visit.testIds,
      testNames: [], // Will populate from tests
      bookingDate: visit.createdAt.split("T")[0],
      visitDate: visit.date,
      visitTime: visit.time,
      address: visit.address,
      reportMode: "Email",
      status: visit.status || "Scheduled",
      amount: visit.amount || 0,
      method: "Home" as const,
      createdAt: visit.createdAt,
    }));

    // Combine all bookings
    const allBookings: Booking[] = [
      ...labBookings.map((b: any) => ({ ...b, method: "Lab" as const })),
      ...homeBookings,
    ];

    // Sort by date (newest first)
    allBookings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setBookings(allBookings);
    setLoading(false);
  }, []);

  // Filter bookings
  useEffect(() => {
    let filtered = bookings;

    // Tab filter
    const now = new Date();
    if (activeTab === "upcoming") {
      filtered = filtered.filter((b) => new Date(b.visitDate) >= now);
    } else {
      filtered = filtered.filter((b) => new Date(b.visitDate) < now);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== "all") {
      filtered = filtered.filter((b) => b.method === methodFilter);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (b) =>
          b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.testNames.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, activeTab, searchTerm, statusFilter, methodFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "bg-blue-100 text-blue-700";
      case "In Progress":
        return "bg-amber-100 text-amber-700";
      case "Report Ready":
        return "bg-green-100 text-green-700";
      case "Completed":
        return "bg-gray-100 text-gray-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "◯";
      case "In Progress":
        return "◐";
      case "Report Ready":
        return "✓";
      case "Completed":
        return "✓";
      case "Cancelled":
        return "✕";
      default:
        return "◯";
    }
  };

  const fetchTestCharges = async (tests: SelectedItem[], packages: SelectedItem[]) => {
    try {
      // Fetch all tests from API to get charge information
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
      const response = await fetch(`${API_BASE_URL}/master/tests?page=1&limit=100`);
      
      if (response.ok) {
        const data = await response.json();
        const allTestsData = data.data || data;
        setAllTests(Array.isArray(allTestsData) ? allTestsData : []);
        
        // Build charge map for selected tests
        const chargeMap = new Map();
        tests.forEach((test) => {
          const testData = Array.isArray(allTestsData) 
            ? allTestsData.find((t: any) => t.id === test.id)
            : null;
          if (testData?.charges?.[0]?.b2cCharge) {
            chargeMap.set(test.id, testData.charges[0].b2cCharge);
          }
        });
        
        setTestCharges(chargeMap);
      }
    } catch (error) {
      console.error("Error fetching test charges:", error);
    }
  };

  const calculateTotal = () => {
    // Calculate from fetched charges for tests
    let testsTotal = 0;
    selectedTests.forEach((test) => {
      const charge = testCharges.get(test.id || 0);
      testsTotal += charge || (test.b2cCharge || 0);
    });
    
    // Calculate from packages (these already have charges)
    const packagesTotal = selectedPackages.reduce((sum, p) => sum + (p.b2cCharge || 0), 0);
    
    return testsTotal + packagesTotal;
  };

  const handleProcessPayment = async () => {
    setProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessingPayment(false);
      setBookingStep(3);
    }, 2000);
  };

  const handleConfirmBooking = () => {
    if (!bookingData.visitDate || !bookingData.visitTime) {
      alert("Please select date and time");
      return;
    }

    const booking: Booking = {
      id: `LAB${Date.now()}`,
      testIds: selectedTests.map((t) => t.id || 0),
      testNames: [...selectedTests.map((t) => t.name), ...selectedPackages.map((p) => p.name)],
      bookingDate: new Date().toISOString().split("T")[0],
      visitDate: bookingData.visitDate,
      visitTime: bookingData.visitTime,
      reportMode: bookingData.reportMode,
      status: "Scheduled",
      amount: calculateTotal(),
      method: "Lab",
      createdAt: new Date().toISOString(),
      paymentStatus: "Paid",
      paymentMethod: paymentMethod,
    };

    // Save booking
    const existingBookings = JSON.parse(localStorage.getItem("labBookings") || "[]");
    existingBookings.push(booking);
    localStorage.setItem("labBookings", JSON.stringify(existingBookings));

    // Clear selected items
    localStorage.removeItem("selectedTests");
    localStorage.removeItem("selectedPackages");

    // Show success
    setPendingBooking(false);
    setSelectedTests([]);
    setSelectedPackages([]);
    setBookingStep(1);
    setBookingData({ visitDate: "", visitTime: "", reportMode: "Email" });
    setPaymentMethod("online");

    // Reload bookings
    setTimeout(() => {
      fetchBookings();
    }, 1000);
  };

  const fetchBookings = () => {
    const labBookings = JSON.parse(localStorage.getItem("labBookings") || "[]");
    const homeVisits = JSON.parse(localStorage.getItem("patientHomeVisits") || "[]");

    const homeBookings = homeVisits.map((visit: any) => ({
      id: visit.id,
      testIds: visit.testIds,
      testNames: [],
      bookingDate: visit.createdAt.split("T")[0],
      visitDate: visit.date,
      visitTime: visit.time,
      address: visit.address,
      reportMode: "Email",
      status: visit.status || "Scheduled",
      amount: visit.amount || 0,
      method: "Home" as const,
      createdAt: visit.createdAt,
    }));

    const allBookings: Booking[] = [
      ...labBookings.map((b: any) => ({ ...b, method: "Lab" as const })),
      ...homeBookings,
    ];

    allBookings.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setBookings(allBookings);
  };

  const upcomingCount = bookings.filter(
    (b) => new Date(b.visitDate) >= new Date()
  ).length;
  const pastCount = bookings.filter((b) => new Date(b.visitDate) < new Date()).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(45%_0.085_224.283)]"></div>
      </div>
    );
  }

  // New Booking Form
  if (pendingBooking) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Confirm Your Booking</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review your selection and schedule your lab visit
            </p>
          </div>
          <button
            onClick={() => {
              setPendingBooking(false);
              localStorage.removeItem("selectedTests");
              localStorage.removeItem("selectedPackages");
              setSelectedTests([]);
              setSelectedPackages([]);
              fetchBookings();
            }}
            className="text-gray-600 hover:text-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
            bookingStep >= 1
              ? "bg-[oklch(45%_0.085_224.283)] text-white"
              : "bg-gray-200 text-gray-600"
          }`}>
            1
          </div>
          <div className={`flex-1 h-1 ${bookingStep >= 2 ? "bg-[oklch(45%_0.085_224.283)]" : "bg-gray-200"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
            bookingStep >= 2
              ? "bg-[oklch(45%_0.085_224.283)] text-white"
              : "bg-gray-200 text-gray-600"
          }`}>
            2
          </div>
          <div className={`flex-1 h-1 ${bookingStep >= 3 ? "bg-[oklch(45%_0.085_224.283)]" : "bg-gray-200"}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
            bookingStep >= 3
              ? "bg-[oklch(45%_0.085_224.283)] text-white"
              : "bg-gray-200 text-gray-600"
          }`}>
            3
          </div>
        </div>

        <div className="flex gap-4 text-xs text-gray-600 mb-4">
          <span>Review Items</span>
          <span>Schedule Visit</span>
          <span className="ml-auto">Payment</span>
        </div>

        {/* Step 1: Review Items */}
        {bookingStep === 1 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Order Summary</h2>
            <p className="text-sm text-gray-600">Review your selected tests and packages with final charges</p>

            {selectedTests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Individual Tests</h3>
                <div className="space-y-2">
                  {selectedTests.map((test) => {
                    const charge = testCharges.get(test.id || 0) || test.b2cCharge || 0;
                    return (
                      <div key={test.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-3">
                          <TestTube size={20} className="text-[oklch(45%_0.085_224.283)]" />
                          <div>
                            <p className="font-medium text-gray-800">{test.name}</p>
                            <p className="text-xs text-gray-500">Test ID: {test.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600 text-lg">₹{charge}</p>
                          <p className="text-xs text-gray-500">per test</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedPackages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Packages</h3>
                <div className="space-y-2">
                  {selectedPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="flex items-center gap-3">
                        <Package size={20} className="text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-800">{pkg.name}</p>
                          <p className="text-xs text-gray-500">Package ID: {pkg.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600 text-lg">₹{pkg.b2cCharge || 0}</p>
                        <p className="text-xs text-gray-500">package price</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Breakdown */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-5 rounded-lg border-2 border-orange-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Subtotal ({selectedTests.length + selectedPackages.length} items)</span>
                <span className="font-semibold text-gray-800">₹{calculateTotal()}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-orange-200">
                <span className="text-lg font-bold text-gray-800">Total Amount</span>
                <span className="text-2xl font-bold text-orange-600">₹{calculateTotal()}</span>
              </div>
              <p className="text-xs text-gray-600 pt-2">
                ✓ All prices are inclusive of applicable taxes
              </p>
            </div>

            <button
              onClick={() => setBookingStep(2)}
              className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
            >
              Continue to Schedule
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Schedule Visit */}
        {bookingStep === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Schedule Your Visit</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date *</label>
              <div className="relative">
                <Calendar size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={bookingData.visitDate}
                  onChange={(e) => setBookingData({ ...bookingData, visitDate: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
                />
              </div>
            </div>

            {bookingData.visitDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Time Slot *</label>
                <div className="grid grid-cols-3 gap-2">
                  {["09:00-10:00", "10:00-11:00", "11:00-12:00", "13:00-14:00", "14:00-15:00", "15:00-16:00"].map(
                    (slot) => (
                      <button
                        key={slot}
                        onClick={() => setBookingData({ ...bookingData, visitTime: slot })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          bookingData.visitTime === slot
                            ? "bg-orange-600 text-white"
                            : "border border-gray-200 text-gray-700 hover:border-orange-300"
                        }`}
                      >
                        <Clock size={14} className="inline mr-1" />
                        {slot}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Delivery Mode</label>
              <select
                value={bookingData.reportMode}
                onChange={(e) => setBookingData({ ...bookingData, reportMode: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
              >
                <option value="Email">Email</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="Download">Download</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBookingStep(1)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} />
                Back
              </button>
              <button
                onClick={() => setBookingStep(3)}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {bookingStep === 3 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Payment Details</h2>

            {/* Order Summary */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <h3 className="font-bold text-gray-800">Order Summary</h3>
              
              {selectedTests.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Tests:</p>
                  {selectedTests.map((test) => (
                    <div key={test.id} className="flex justify-between text-sm text-gray-600 ml-2">
                      <span>{test.name}</span>
                      <span>₹{test.b2cCharge}</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedPackages.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Packages:</p>
                  {selectedPackages.map((pkg) => (
                    <div key={pkg.id} className="flex justify-between text-sm text-gray-600 ml-2">
                      <span>{pkg.name}</span>
                      <span>₹{pkg.b2cCharge}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-blue-200 pt-3 flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span className="text-orange-600">₹{calculateTotal()}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Payment Method</label>
              <div className="space-y-2">
                {[
                  { id: "online", label: "Online Payment (Credit/Debit Card, UPI, Net Banking)", icon: "💳" },
                  { id: "wallet", label: "Digital Wallet (Google Pay, Apple Pay)", icon: "📱" },
                  { id: "cod", label: "Pay at Lab (Cash on Collection)", icon: "💵" },
                ].map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === method.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-5 h-5 accent-orange-600"
                    />
                    <span className="text-2xl">{method.icon}</span>
                    <span className="text-gray-800 font-medium">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>✓ Secure Payment:</strong> Your payment is encrypted and secure. We use industry-standard SSL encryption.
              </p>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-2">
              <input type="checkbox" defaultChecked className="mt-1 w-5 h-5 accent-orange-600" />
              <span className="text-sm text-gray-600">
                I agree to the <a href="#" className="text-orange-600 font-medium">terms and conditions</a> and <a href="#" className="text-orange-600 font-medium">privacy policy</a>
              </span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setBookingStep(2)}
                disabled={processingPayment}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ChevronLeft size={20} />
                Back
              </button>
              <button
                onClick={handleProcessPayment}
                disabled={processingPayment}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  `Pay ₹${calculateTotal()}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {bookingStep === 4 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Payment Successful!</h2>
            <p className="text-gray-600">Your booking has been confirmed.</p>

            <div className="bg-blue-50 p-4 rounded-lg text-left space-y-2">
              <div>
                <p className="text-sm text-gray-500">Booking ID</p>
                <p className="font-bold text-gray-800">LAB{Date.now()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-bold text-orange-600 text-lg">₹{calculateTotal()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Visit Date</p>
                <p className="font-bold text-gray-800">{new Date(bookingData.visitDate).toLocaleDateString("en-GB")}</p>
              </div>
            </div>

            <button
              onClick={() => {
                handleConfirmBooking();
              }}
              className="w-full px-6 py-3 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg font-semibold hover:bg-[oklch(40%_0.075_224.283)] transition-colors"
            >
              View My Bookings
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage all your test bookings
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "upcoming"
              ? "border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)]"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Upcoming
          {upcomingCount > 0 && (
            <span className="bg-[oklch(45%_0.085_224.283)] text-white text-xs font-bold px-2 py-1 rounded-full">
              {upcomingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-4 py-3 font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "past"
              ? "border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)]"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Past
          {pastCount > 0 && (
            <span className="bg-[oklch(45%_0.085_224.283)] text-white text-xs font-bold px-2 py-1 rounded-full">
              {pastCount}
            </span>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by booking ID or test name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)] focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium"
        >
          <Filter size={18} />
          Filters
        </button>
      </div>

      <div
        className={`${
          showFilters ? "block" : "hidden"
        } lg:block space-y-4 bg-white rounded-lg p-4 border border-gray-200`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
            >
              <option value="all">All Status</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Report Ready">Report Ready</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Collection Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
            >
              <option value="all">All Methods</option>
              <option value="Lab">Lab Visit</option>
              <option value="Home">Home Visit</option>
            </select>
          </div>
        </div>

        {(searchTerm || statusFilter !== "all" || methodFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setMethodFilter("all");
            }}
            className="w-full px-3 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-3">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      Booking #{booking.id}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)} {booking.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(booking.visitDate).toLocaleDateString("en-GB")} at {booking.visitTime}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      booking.method === "Lab"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}>
                      {booking.method} Visit
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    {booking.testNames?.length || booking.testIds.length} test(s) • Amount: ₹{booking.amount}
                  </p>

                  {booking.method === "Home" && booking.address && (
                    <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                      <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{booking.address}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBooking(booking);
                    }}
                    className="p-2 bg-blue-50 text-[oklch(45%_0.085_224.283)] rounded-lg hover:bg-blue-100 transition-colors"
                    title="View Details"
                  >
                    <Eye size={18} />
                  </button>
                  {booking.status === "Report Ready" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert("Downloading booking receipt...");
                      }}
                      className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                      title="Download Receipt"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 font-medium">No bookings found</p>
          <p className="text-sm text-gray-500 mt-2">
            {activeTab === "upcoming"
              ? "You don't have any upcoming bookings"
              : "You don't have any past bookings"}
          </p>
          <button
            onClick={() => router.push("/patient-dashboard/tests")}
            className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            Browse Tests
          </button>
        </div>
      )}

      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Booking Details</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Booking Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Booking ID</p>
                  <p className="font-bold text-gray-800">#{selectedBooking.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-bold ${getStatusColor(selectedBooking.status)}`}>
                    {getStatusIcon(selectedBooking.status)} {selectedBooking.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Booking Date</p>
                  <p className="font-bold text-gray-800">
                    {new Date(selectedBooking.bookingDate).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Collection Method</p>
                  <p className="font-bold text-gray-800">{selectedBooking.method} Visit</p>
                </div>
              </div>

              {/* Visit Details */}
              <div className="space-y-3 pb-4 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">Visit Information</h3>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="font-medium text-gray-800">
                    {new Date(selectedBooking.visitDate).toLocaleDateString("en-GB")} at{" "}
                    {selectedBooking.visitTime}
                  </p>
                </div>
                {selectedBooking.method === "Home" && selectedBooking.address && (
                  <div>
                    <p className="text-sm text-gray-500">Collection Address</p>
                    <p className="font-medium text-gray-800">{selectedBooking.address}</p>
                  </div>
                )}
                {selectedBooking.reportMode && (
                  <div>
                    <p className="text-sm text-gray-500">Report Delivery</p>
                    <p className="font-medium text-gray-800">{selectedBooking.reportMode}</p>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Total Amount</span>
                  <span className="font-bold text-orange-600 text-lg">₹{selectedBooking.amount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedBooking.status === "Scheduled" && (
                  <button
                    onClick={() => {
                      alert("Reschedule functionality would redirect to reschedule form");
                      setSelectedBooking(null);
                    }}
                    className="flex-1 px-4 py-2 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg font-medium hover:bg-[oklch(40%_0.075_224.283)] transition-colors"
                  >
                    Reschedule
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

