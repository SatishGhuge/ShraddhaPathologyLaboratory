"use client";

import { useEffect, useState } from "react";
import { TestTube, Search, ChevronRight, ShoppingCart, Filter, Package, Clock, Droplet } from "lucide-react";
import API_BASE_URL from "@/src/api/config";

interface Test {
  id: number;
  name: string;
  shortName?: string;
  department?: { id: number; name: string };
  sample_type?: { Sample_Type: string };
  charges?: Array<{ b2cCharge: number; b2bCharge: number }>;
  isActive: boolean;
}

interface PackageItem {
  id: number;
  name: string;
  b2cCharge: number;
  testCount: number;
  department?: { name: string };
}

export default function PatientTestsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [tests, setTests] = useState<Test[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  const [selectedPackages, setSelectedPackages] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchTestsAndPackages();
  }, []);

  const fetchTestsAndPackages = async () => {
    setLoading(true);
    try {
      const [testsRes, packagesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/master/tests?page=1&limit=100`),
        fetch(`${API_BASE_URL}/master/packages?page=1&limit=100`),
      ]);

      if (testsRes.ok) {
        const testsData = await testsRes.json();
        // Handle both response formats
        const testsList = testsData.data || testsData;
        setTests(Array.isArray(testsList) ? testsList : []);
      }

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        // Handle both response formats
        const packagesList = packagesData.data || packagesData;
        setPackages(Array.isArray(packagesList) ? packagesList : []);
      }
    } catch (error) {
      console.error("Error fetching tests and packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(
    (test) =>
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPackages = packages.filter(
    (pkg) => pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTestPrice = (test: Test) => {
    return test.charges?.[0]?.b2cCharge || "N/A";
  };

  const toggleTestSelection = (testId: number) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  const togglePackageSelection = (packageId: number) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(packageId)) {
      newSelected.delete(packageId);
    } else {
      newSelected.add(packageId);
    }
    setSelectedPackages(newSelected);
  };

  const handleProceedToBooking = () => {
    if (selectedTests.size === 0 && selectedPackages.size === 0) {
      alert("Please select at least one test or package");
      return;
    }
    
    // Store selection in localStorage
    const selectedTestsList = Array.from(selectedTests).map(id => 
      tests.find(t => t.id === id)
    ).filter(Boolean);
    
    const selectedPackagesList = Array.from(selectedPackages).map(id =>
      packages.find(p => p.id === id)
    ).filter(Boolean);

    localStorage.setItem("selectedTests", JSON.stringify(selectedTestsList));
    localStorage.setItem("selectedPackages", JSON.stringify(selectedPackagesList));

    // Navigate to booking page
    window.location.href = "/patient-dashboard/bookings";
  };

  return (
    <div className="space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Browse Tests & Packages</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Select tests and book your appointments
          </p>
        </div>
        {(selectedTests.size > 0 || selectedPackages.size > 0) && (
          <div className="bg-white border border-orange-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 shadow-sm w-full sm:w-auto">
            <ShoppingCart size={18} className="text-orange-600 flex-shrink-0" />
            <div className="flex-1 sm:flex-none">
              <p className="text-xs sm:text-sm font-semibold text-gray-800">
                {selectedTests.size + selectedPackages.size} selected
              </p>
            </div>
            <button
              onClick={handleProceedToBooking}
              className="ml-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-xs sm:text-sm whitespace-nowrap"
            >
              Proceed
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search tests or packages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)] focus:border-transparent"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 bg-white rounded-t-lg">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)]"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          All Tests
        </button>
        <button
          onClick={() => setActiveTab("packages")}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === "packages"
              ? "border-[oklch(45%_0.085_224.283)] text-[oklch(45%_0.085_224.283)]"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Packages
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(45%_0.085_224.283)]"></div>
        </div>
      )}

      {/* Tests Tab - Mobile Optimized */}
      {!loading && activeTab === "all" && (
        <div className="space-y-2 sm:space-y-3">
          {filteredTests.length > 0 ? (
            filteredTests.map((test) => (
              <div
                key={test.id}
                onClick={() => toggleTestSelection(test.id)}
                className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTests.has(test.id)
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-100 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={selectedTests.has(test.id)}
                    onChange={() => {}}
                    className="mt-1 w-5 h-5 accent-[oklch(45%_0.085_224.283)] rounded cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <TestTube size={16} className="text-orange-600 flex-shrink-0 sm:w-5 sm:h-5" />
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800 break-words">{test.name}</h3>
                      {test.shortName && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {test.shortName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                      {test.department && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          {test.department.name}
                        </span>
                      )}
                      {test.sample_type && (
                        <span className="flex items-center gap-1">
                          <Droplet size={12} className="text-blue-500" />
                          {test.sample_type.Sample_Type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      ₹{getTestPrice(test)}
                    </p>
                    <p className="text-xs text-gray-500">per test</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <TestTube size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">No tests found</p>
            </div>
          )}
        </div>
      )}

      {/* Packages Tab - Mobile Optimized */}
      {!loading && activeTab === "packages" && (
        <div className="space-y-2 sm:space-y-3">
          {filteredPackages.length > 0 ? (
            filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => togglePackageSelection(pkg.id)}
                className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedPackages.has(pkg.id)
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white hover:border-orange-100 hover:shadow-sm"
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPackages.has(pkg.id)}
                    onChange={() => {}}
                    className="mt-1 w-5 h-5 accent-[oklch(45%_0.085_224.283)] rounded cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Package size={16} className="text-[oklch(45%_0.085_224.283)] flex-shrink-0 sm:w-5 sm:h-5" />
                      <h3 className="text-sm sm:text-base font-semibold text-gray-800 break-words">{pkg.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <TestTube size={12} className="text-blue-500" />
                        {pkg.testCount} tests
                      </span>
                      {pkg.department && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          {pkg.department.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">
                      ₹{pkg.b2cCharge}
                    </p>
                    <p className="text-xs text-gray-500">package</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm sm:text-base">No packages found</p>
            </div>
          )}
        </div>
      )}

      {/* Proceed Button - Mobile Fixed at Bottom */}
      {(selectedTests.size > 0 || selectedPackages.size > 0) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 sm:hidden shadow-lg">
          <button
            onClick={handleProceedToBooking}
            className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <ShoppingCart size={18} />
            Proceed ({selectedTests.size + selectedPackages.size})
          </button>
        </div>
      )}
    </div>
  );
}
