"use client";

import { useState, useEffect } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, Percent, ChevronLeft, ChevronRight } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getDiscountReport } from "@/src/api/admin";

export default function DiscountReport() {
  const today = new Date().toISOString().split("T")[0];

  const [filters, setFilters] = useState({
    fromDate: today,
    toDate: today,
    corporate: "",
    nameUsername: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [searched, setSearched] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  const fetchData = async (fromDate, toDate, corporate, nameUsername, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDiscountReport({ fromDate, toDate, corporate, nameUsername }, page, ITEMS_PER_PAGE);
      if (res.success) {
        setData(res.data || []);
        setPagination(res.pagination || null);
      } else {
        setError(res.message || "Failed to fetch report");
      }
      setSearched(true);
    } catch (err) {
      setError(err.message || "Failed to fetch report");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch today's data on mount
  useEffect(() => {
    fetchData(today, today, "", "", 1);
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const err: any = {};
    if (!filters.fromDate) err.fromDate = "From date required";
    if (!filters.toDate) err.toDate = "To date required";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = async () => {
    if (!validate()) return;
    setCurrentPage(1);
    fetchData(filters.fromDate, filters.toDate, filters.corporate, filters.nameUsername, 1);
  };

  const handleReset = () => {
    setFilters({ fromDate: today, toDate: today, corporate: "", nameUsername: "" });
    setErrors({});
    setError(null);
    setCurrentPage(1);
    fetchData(today, today, "", "", 1);
  };

  const totalAmount = data.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalDiscount = data.reduce((sum, r) => sum + (r.discountAmount || 0), 0);

  const columns = ["Date", "Visit ID", "Patient Name", "Mobile", "Created By", "Center", "Visit Type", "Business Type", "Total Amount", "Discount", "Discount %", "Remark"];

  return (
    <>
      <Header />
      <div className="p-3 bg-white min-h-screen">
        <PageHeader title="Patient Discount List" icon={Percent} path="Reports / Other Reports" />

        {/* FILTERS */}
        <div className="bg-white p-3 rounded shadow-md mb-3">
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            <span className="font-semibold">Note:</span> Today's discount report is shown automatically. Change dates to view other periods.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleChange}
                className={`border p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.fromDate ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.fromDate && <p className="text-red-600 text-xs mt-0.5">{errors.fromDate}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                onChange={handleChange}
                className={`border p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${errors.toDate ? "border-red-500" : "border-gray-300"}`}
              />
              {errors.toDate && <p className="text-red-600 text-xs mt-0.5">{errors.toDate}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Corporate / Visit Type</label>
              <input
                type="text"
                name="corporate"
                placeholder="e.g. Walk-in"
                value={filters.corporate}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Name / Mobile</label>
              <input
                type="text"
                name="nameUsername"
                placeholder="Patient name or mobile"
                value={filters.nameUsername}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 rounded w-full text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={handleSearch} disabled={loading}
              className="flex gap-1.5 items-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded text-sm transition-colors">
              <Search size={14} /> {loading ? "Searching..." : "Search"}
            </button>
            <button onClick={handleReset}
              className="flex gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors">
              <RotateCcw size={14} /> Reset
            </button>
            <button onClick={() => window.print()}
              className="flex gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm transition-colors">
              <Printer size={14} /> Print
            </button>
            <button className="flex gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition-colors">
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 text-sm px-3 py-2 rounded mb-3">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="bg-white p-6 rounded shadow-md text-center">
            <div className="text-gray-500 text-sm mb-2">Loading discount report...</div>
            <div className="inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* TABLE */}
        {searched && !loading && (
          <div className="bg-white rounded shadow-md overflow-hidden">
            <div className="px-3 py-1.5 border-b border-gray-300 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">Patient Discount Report</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Showing data for: {filters.fromDate === filters.toDate ? filters.fromDate : `${filters.fromDate} to ${filters.toDate}`}
                  {filters.fromDate === today && filters.toDate === today && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Today</span>
                  )}
                </p>
              </div>
              <span className="text-xs text-gray-500">{data.length} record(s)</span>
            </div>

            {data.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No discount records found for the selected date range.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      {columns.map((h) => (
                        <th key={h} className="px-3 py-1.5 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={row.visitId} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">{row.visitId}</td>
                        <td className="px-3 py-1.5 border border-gray-200">{row.patientName}</td>
                        <td className="px-3 py-1.5 border border-gray-200 whitespace-nowrap">{row.mobile || "-"}</td>
                        <td className="px-3 py-1.5 border border-gray-200">{row.createdBy || "-"}</td>
                        <td className="px-3 py-1.5 border border-gray-200">{row.createdAtLocation || "-"}</td>
                        <td className="px-3 py-1.5 border border-gray-200">{row.visitType || "-"}</td>
                        <td className="px-3 py-1.5 border border-gray-200">{row.businessType || "-"}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right">{row.totalAmount?.toFixed(2)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right">{row.discountAmount?.toFixed(2)}</td>
                        <td className="px-3 py-1.5 border border-gray-200 text-right">{row.discountPercent}%</td>
                        <td className="px-3 py-1.5 border border-gray-200">{row.discountRemark || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <td colSpan={8} className="px-3 py-1.5 text-right text-xs border border-gray-300">Total</td>
                      <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-right text-xs border border-gray-300">{totalDiscount.toFixed(2)}</td>
                      <td colSpan={2} className="px-3 py-1.5 border border-gray-300"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {!searched && !loading && (
          <div className="bg-white p-6 rounded shadow-md text-center text-gray-500 text-sm">
            Loading today's discount report...
          </div>
        )}

        {/* PAGINATION CONTROLS */}
        {searched && !loading && data.length > 0 && pagination && (
          <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
            <div className="text-gray-600">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{' '}
              {pagination.total} records
            </div>

            <div className="flex gap-2 items-center">
              <button
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1);
                  setCurrentPage(newPage);
                  fetchData(filters.fromDate, filters.toDate, filters.corporate, filters.nameUsername, newPage);
                }}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span className="px-3 py-1">
                Page {currentPage} of {pagination.totalPages}
              </span>

              <button
                onClick={() => {
                  const newPage = Math.min(pagination.totalPages, currentPage + 1);
                  setCurrentPage(newPage);
                  fetchData(filters.fromDate, filters.toDate, filters.corporate, filters.nameUsername, newPage);
                }}
                disabled={currentPage === pagination.totalPages}
                className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            <div className="text-gray-600">
              Total: {pagination.total} records
            </div>
          </div>
        )}
      </div>

      {/* PRINT */}
      <div className="print-only">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-only, .print-only * { visibility: visible; }
            .print-only { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
            @page { size: A4 landscape; margin: 10mm; }
          }
          @media screen { .print-only { display: none; } }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{ margin: "4px 0", fontSize: "11px" }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p style={{ margin: "4px 0", fontSize: "11px" }}>Email: info@shraddha.com | Ph. 8779295302</p>
          <hr style={{ margin: "8px 0", border: "1px solid #000" }} />
          <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#0066cc", margin: "8px 0" }}>Patient Discount Report</h2>
          <p style={{ margin: "4px 0", fontSize: "11px" }}>
            Period: {filters.fromDate} to {filters.toDate}
            {filters.fromDate === today && filters.toDate === today && (
              <span style={{ marginLeft: "8px", backgroundColor: "#d1fae5", color: "#065f46", fontSize: "10px", padding: "2px 6px", borderRadius: "4px" }}>Today</span>
            )}
          </p>
          <hr style={{ margin: "8px 0", border: "1px dashed #000" }} />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              {columns.map((h) => (
                <th key={h} style={{ padding: "5px", textAlign: "left", border: "1px solid #000" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.visitId}>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.date}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.visitId}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.patientName}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.mobile || "-"}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.createdBy || "-"}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.createdAtLocation || "-"}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.visitType || "-"}</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.businessType || "-"}</td>
                <td style={{ padding: "5px", textAlign: "right", border: "1px solid #000" }}>{row.totalAmount?.toFixed(2)}</td>
                <td style={{ padding: "5px", textAlign: "right", border: "1px solid #000" }}>{row.discountAmount?.toFixed(2)}</td>
                <td style={{ padding: "5px", textAlign: "right", border: "1px solid #000" }}>{row.discountPercent}%</td>
                <td style={{ padding: "5px", border: "1px solid #000" }}>{row.discountRemark || "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
              <td colSpan={8} style={{ padding: "5px", textAlign: "right", border: "1px solid #000" }}>Total</td>
              <td style={{ padding: "5px", textAlign: "right", border: "1px solid #000" }}>{totalAmount.toFixed(2)}</td>
              <td style={{ padding: "5px", textAlign: "right", border: "1px solid #000" }}>{totalDiscount.toFixed(2)}</td>
              <td colSpan={2} style={{ padding: "5px", border: "1px solid #000" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
