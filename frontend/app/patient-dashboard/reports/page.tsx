"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Eye,
  Share2,
  Search,
  Calendar,
  ChevronLeft,
  Filter,
  X,
} from "lucide-react";

interface Report {
  id: string;
  testName: string;
  testDate: string;
  reportDate: string;
  status: "Completed" | "Processing" | "Pending";
  department: string;
  reportUrl?: string;
}

export default function PatientReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [patient, setPatient] = useState<any>(null);

  // Initialize mock reports
  useEffect(() => {
    const patientData = localStorage.getItem("patient");
    if (patientData) {
      setPatient(JSON.parse(patientData));
    }

    // Load or create mock reports
    const storedReports = localStorage.getItem("patientReports");
    if (storedReports) {
      setReports(JSON.parse(storedReports));
    } else {
      // Create mock reports
      const mockReports: Report[] = [
        {
          id: "RPT001",
          testName: "Complete Blood Count (CBC)",
          testDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          reportDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "Completed",
          department: "Hematology",
        },
        {
          id: "RPT002",
          testName: "Lipid Profile",
          testDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          reportDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "Completed",
          department: "Biochemistry",
        },
        {
          id: "RPT003",
          testName: "Thyroid Profile (TSH)",
          testDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          reportDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          status: "Completed",
          department: "Endocrinology",
        },
        {
          id: "RPT004",
          testName: "Liver Function Test",
          testDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          reportDate: "",
          status: "Processing",
          department: "Biochemistry",
        },
        {
          id: "RPT005",
          testName: "Urine Routine",
          testDate: new Date().toISOString().split("T")[0],
          reportDate: "",
          status: "Pending",
          department: "Microbiology",
        },
      ];
      setReports(mockReports);
      localStorage.setItem("patientReports", JSON.stringify(mockReports));
    }
    setLoading(false);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = reports;

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      let startDate = new Date();
      if (dateFilter === "7days") startDate.setDate(today.getDate() - 7);
      if (dateFilter === "30days") startDate.setDate(today.getDate() - 30);
      if (dateFilter === "3months") startDate.setMonth(today.getMonth() - 3);

      filtered = filtered.filter((report) => {
        const reportDate = new Date(report.reportDate || report.testDate);
        return reportDate >= startDate;
      });
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((r) => r.department === departmentFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by report date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.reportDate || a.testDate);
      const dateB = new Date(b.reportDate || b.testDate);
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredReports(filtered);
  }, [reports, searchTerm, dateFilter, departmentFilter]);

  const handleDownload = (report: Report) => {
    // In real app, this would download PDF
    alert(`Downloaded: ${report.testName}`);
  };

  const handleShare = (report: Report) => {
    alert(`Share options for: ${report.testName}\nEmail | WhatsApp | Print`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-700";
      case "Processing":
        return "bg-amber-100 text-amber-700";
      case "Pending":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const departments = Array.from(new Set(reports.map((r) => r.department)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(45%_0.085_224.283)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Mobile Optimized */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Reports</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Access and download all your test reports
        </p>
      </div>

      {/* Search Bar - Mobile Optimized */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-200 rounded-lg bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)] focus:border-transparent"
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

      {/* Filter Panel */}
      <div
        className={`${
          showFilters ? "block" : "hidden"
        } lg:block space-y-4 bg-white rounded-lg p-4 border border-gray-200`}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="space-y-2">
            {[
              { value: "all", label: "All Time" },
              { value: "7days", label: "Last 7 Days" },
              { value: "30days", label: "Last 30 Days" },
              { value: "3months", label: "Last 3 Months" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dateFilter"
                  value={option.value}
                  checked={dateFilter === option.value}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {departments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        )}

        {(searchTerm || dateFilter !== "all" || departmentFilter !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setDateFilter("all");
              setDepartmentFilter("all");
            }}
            className="w-full px-3 py-2 border border-orange-300 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Reports List - Mobile Optimized */}
      {filteredReports.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-4 flex-col sm:flex-row">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <FileText size={16} className="text-orange-600 flex-shrink-0 sm:w-5 sm:h-5" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800 break-words">{report.testName}</h3>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 flex-wrap mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(report.testDate).toLocaleDateString("en-GB")}
                    </span>
                    {report.reportDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(report.reportDate).toLocaleDateString("en-GB")}
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {report.department}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                  {report.status === "Completed" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewReport(report)}
                        className="p-1.5 sm:p-2 bg-blue-50 text-[oklch(45%_0.085_224.283)] rounded-lg hover:bg-blue-100 transition-colors"
                        title="View"
                      >
                        <Eye size={16} className="sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(report)}
                        className="p-1.5 sm:p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                        title="Download"
                      >
                        <Download size={16} className="sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleShare(report)}
                        className="p-1.5 sm:p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                        title="Share"
                      >
                        <Share2 size={16} className="sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 sm:p-12 border border-gray-200 text-center">
          <FileText size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-600 font-medium">No reports found</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            Your test reports will appear here once completed
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">{previewReport.testName}</h2>
              <button
                onClick={() => setPreviewReport(null)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Report ID</p>
                  <p className="font-medium text-gray-800">{previewReport.id}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className={`font-medium ${getStatusColor(previewReport.status)}`}>
                    {previewReport.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Test Date</p>
                  <p className="font-medium text-gray-800">
                    {new Date(previewReport.testDate).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Report Date</p>
                  <p className="font-medium text-gray-800">
                    {previewReport.reportDate
                      ? new Date(previewReport.reportDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> In the live version, this section would display the actual PDF report viewer.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(previewReport)}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
