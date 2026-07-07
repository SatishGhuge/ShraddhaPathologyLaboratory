"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  FileText,
} from "lucide-react";
import Header from "@/src/components/Header";

export default function DetailedWorksheet() {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    center: "",
    corporate: "",
    referralDoctor: "",
    excludeTest: "",
  });

  const [excludeOutsource, setExcludeOutsource] = useState(false);
  const [formula, setFormula] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [searched, setSearched] = useState(true); // Changed to true to show table by default
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [columnFilter, setColumnFilter] = useState("");
  const dropdownRef = useRef(null);

  // Available columns for Required Column dropdown
  const availableColumns = [
    { id: "location", label: "Location" },
    { id: "corporate", label: "Corporate" },
    { id: "refDoctor", label: "Ref.Dr" },
    { id: "mobile", label: "Mobile" },
    { id: "lrNumber", label: "LR Number" },
    { id: "remark", label: "Remark" },
  ];

  // Selected columns state - none selected by default
  const [selectedColumns, setSelectedColumns] = useState<any[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dummyData = [
    {
      id: 1,
      patientName: "PRAMOD GANPAT GAIKWAD",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "ELE,ESR,BSF PP,BS,IRON,TFT,LFT,LIPID,RFT,HbA1c,CBC",
      refDoctor: "Dr. Sharma",
      mobile: "9369770741",
      lrNumber: "2602244",
      remark: "",
    },
    {
      id: 2,
      patientName: "SANTAWAN SINGH",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "BSF PP,FBS,BSPP",
      refDoctor: "Dr. Patel",
      mobile: "9028496307",
      lrNumber: "2602245",
      remark: "",
    },
    {
      id: 3,
      patientName: "SUDHAKAR ALEKAR",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "BSF PP,FBS,BSP,CUE,VITD,VIT B12,IRON PROFILE,TFT,LFT,RFT,LIPID,HbA1c,ESR,CBC",
      refDoctor: "Dr. Kumar",
      mobile: "7977127697",
      lrNumber: "2602246",
      remark: "",
    },
    {
      id: 4,
      patientName: "AKRAM ANSARI",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "CBC,MP,ESR,WIDAL,Bilirubin",
      refDoctor: "Dr. Singh",
      mobile: "7021131295",
      lrNumber: "2602247",
      remark: "",
    },
    {
      id: 5,
      patientName: "KAVITA DUGHD",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "CBC,LIPID",
      refDoctor: "Dr. Mehta",
      mobile: "9137144243",
      lrNumber: "2602248",
      remark: "",
    },
    {
      id: 6,
      patientName: "ATHARAV RAUT",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "X CHEST",
      refDoctor: "Dr. Desai",
      mobile: "8767666851",
      lrNumber: "2602249",
      remark: "",
    },
    {
      id: 7,
      patientName: "DR SNEHA SRAVYA",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "X- ANKLE",
      refDoctor: "Dr. Joshi",
      mobile: "8879006687",
      lrNumber: "2602250",
      remark: "",
    },
    {
      id: 8,
      patientName: "RAJESH MHATRE",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "Creat",
      refDoctor: "Dr. Verma",
      mobile: "8898825877",
      lrNumber: "2602251",
      remark: "",
    },
    {
      id: 9,
      patientName: "MANDA GAWAND",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "CBC,ESR,FBS,SGOT,PT",
      refDoctor: "Dr. Rao",
      mobile: "9594046826",
      lrNumber: "2602252",
      remark: "",
    },
    {
      id: 10,
      patientName: "KAMLESH KUMAR",
      location: "SD",
      corporate: "Walk in",
      testPerformed: "CBC",
      refDoctor: "Dr. Gupta",
      mobile: "9503595719",
      lrNumber: "2602253",
      remark: "",
    },
  ];

  const [data, setData] = useState(dummyData); // Initialize with dummy data to show table by default

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    let err: any = {};

    if (!filters.fromDate) err.fromDate = "From Date Required";
    if (!filters.toDate) err.toDate = "To Date Required";
    if (!filters.center) err.center = "Center Required";

    if (filters.fromDate && filters.toDate) {
      if (new Date(filters.fromDate) > new Date(filters.toDate)) {
        err.dateRange = "From Date cannot be greater than To Date";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;
    setSearched(true);
    setData(dummyData);
  };

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      center: "",
      corporate: "",
      referralDoctor: "",
      excludeTest: "",
    });
    setExcludeOutsource(false);
    setFormula(false);
    setErrors({});
    setSearched(false);
    setData([]);
    setSelectedColumns([]);
  };

  const handlePrint = () => {
    window.print();
  };

  // Toggle column selection
  const toggleColumn = (columnId: any) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  // Check all columns
  const handleCheckAll = () => {
    setSelectedColumns(availableColumns.map(col => col.id));
  };

  // Uncheck all columns
  const handleUncheckAll = () => {
    setSelectedColumns([]);
  };

  // Filter columns based on search
  const filteredColumns = availableColumns.filter(col =>
    col.label.toLowerCase().includes(columnFilter.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">
        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">
          {/* FILTER ROW 1 */}
          <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
            <div className="flex-1">
              <input
                type="date"
                name="fromDate"
                placeholder="From Date"
                value={filters.fromDate}
                onChange={handleChange}
                className={`border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  errors.fromDate && "border-red-500"
                }`}
              />
              {errors.fromDate && (
                <p className="text-red-600 text-xs mt-0.5">{errors.fromDate}</p>
              )}
            </div>

            <div className="flex-1">
              <input
                type="date"
                name="toDate"
                placeholder="To Date"
                value={filters.toDate}
                onChange={handleChange}
                className={`border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  errors.toDate && "border-red-500"
                }`}
              />
              {errors.toDate && (
                <p className="text-red-600 text-xs mt-0.5">{errors.toDate}</p>
              )}
            </div>

            <div className="flex-1">
              <select
                name="center"
                value={filters.center}
                onChange={handleChange}
                className={`border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  errors.center && "border-red-500"
                }`}
              >
                <option value="">Select Center</option>
                <option>Main Lab</option>
                <option>Collection Center 1</option>
                <option>Collection Center 2</option>
              </select>
              {errors.center && (
                <p className="text-red-600 text-xs mt-0.5">{errors.center}</p>
              )}
            </div>

            <div className="flex-1">
              <select
                name="corporate"
                value={filters.corporate}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Corporate</option>
                <option>Walk in</option>
                <option>Franchise 1</option>
                <option>Franchise 2</option>
                <option>Franchise 3</option>
              </select>
            </div>

            <div className="flex-1">
              <input
                name="referralDoctor"
                placeholder="Referral Doctor"
                value={filters.referralDoctor}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* FILTER ROW 2 */}
          <div className="flex flex-col sm:flex-row gap-2 mb-2 sm:mb-3">
            {/* Required Column Multi-Select Dropdown */}
            <div className="flex-1 relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-white text-gray-700 text-left flex items-center justify-between"
              >
                <span>
                  Select options {selectedColumns.length > 0 && `(${selectedColumns.length})`}
                </span>
                <ChevronDown size={16} className={`transition-transform ${showColumnDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Panel */}
              {showColumnDropdown && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-80 overflow-hidden">
                  
                  {/* Filter Input */}
                  <div className="p-2 border-b border-gray-200">
                    <input
                      type="text"
                      placeholder="Filter: Enter keywords"
                      value={columnFilter}
                      onChange={(e) => setColumnFilter(e.target.value)}
                      className="w-full p-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  {/* Check All / Uncheck All */}
                  <div className="p-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <button
                      type="button"
                      onClick={handleCheckAll}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      ✓ Check all
                    </button>
                    <button
                      type="button"
                      onClick={handleUncheckAll}
                      className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      ✕ Uncheck all
                    </button>
                  </div>

                  {/* Column List */}
                  <div className="max-h-60 overflow-y-auto">
                    {filteredColumns.map((column) => (
                      <label
                        key={column.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column.id)}
                          onChange={() => toggleColumn(column.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs sm:text-sm text-gray-700">{column.label}</span>
                      </label>
                    ))}
                  </div>

                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                name="excludeTest"
                placeholder="Exclude Test (, separated)"
                value={filters.excludeTest}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex-1 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs sm:text-sm">
                <input
                  type="checkbox"
                  checked={excludeOutsource}
                  onChange={(e) => setExcludeOutsource(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                Exclude Outsource
              </label>

              <label className="flex items-center gap-2 text-xs sm:text-sm">
                <input
                  type="checkbox"
                  checked={formula}
                  onChange={(e) => setFormula(e.target.checked)}
                  className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                />
                Formula
              </label>
            </div>
          </div>

          {errors.dateRange && (
            <p className="text-red-600 text-xs mb-2 sm:mb-3">{errors.dateRange}</p>
          )}

          {/* BUTTONS */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleSearch}
              className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
            >
              <Search size={14} className="sm:w-4 sm:h-4"/> 
              <span>Search</span>
            </button>

            <button
              onClick={handleReset}
              className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
            >
              <RotateCcw size={14} className="sm:w-4 sm:h-4"/> 
              <span>Reset</span>
            </button>

            {searched && (
              <>
                <button 
                  onClick={handlePrint}
                  className="flex gap-1 sm:gap-1.5 items-center bg-orange-600 hover:bg-orange-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                  <Printer size={14} className="sm:w-4 sm:h-4"/> 
                  <span>Print</span>
                </button>

                <button className="flex gap-1 sm:gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                  <FileSpreadsheet size={14} className="sm:w-4 sm:h-4"/> 
                  <span>Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* REPORT DATA SECTION */}
        {searched && (
          <div className="bg-white rounded shadow-md overflow-hidden">
            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-slate-900 text-white shadow-xl">
                  <tr>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      <input type="checkbox" className="w-4 h-4" />
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Patient Name
                    </th>
                    {selectedColumns.includes("location") && (
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        Location
                      </th>
                    )}
                    {selectedColumns.includes("corporate") && (
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        Corporate
                      </th>
                    )}
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Test Performed
                    </th>
                    {selectedColumns.includes("refDoctor") && (
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        Ref. doctor
                      </th>
                    )}
                    {selectedColumns.includes("mobile") && (
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        Mobile
                      </th>
                    )}
                    {selectedColumns.includes("lrNumber") && (
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        LR Number
                      </th>
                    )}
                    {selectedColumns.includes("remark") && (
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                        Remark
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {data.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">
                        <input type="checkbox" className="w-4 h-4" />
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientName}</td>
                      {selectedColumns.includes("location") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.location}</td>
                      )}
                      {selectedColumns.includes("corporate") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.corporate}</td>
                      )}
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.testPerformed}</td>
                      {selectedColumns.includes("refDoctor") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.refDoctor}</td>
                      )}
                      {selectedColumns.includes("mobile") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.mobile}</td>
                      )}
                      {selectedColumns.includes("lrNumber") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.lrNumber}</td>
                      )}
                      {selectedColumns.includes("remark") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.remark || "-"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!searched && (
          <div className="bg-white p-3 sm:p-4 rounded shadow-md text-center text-gray-500 text-xs sm:text-sm">
            Please select filters and click search to view the detailed worksheet.
          </div>
        )}
      </div>

      {/* PRINT ONLY SECTION */}
      <div className="print-only">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-only, .print-only * {
              visibility: visible;
            }
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
            }
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
          }
          @media screen {
            .print-only {
              display: none;
            }
          }
        `}</style>

        {/* Invoice Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@shraddha.com</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Ph. 8779295302</p>
          <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Detailed Worksheet Report</h2>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>()</p>
          <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
        </div>

        {/* Invoice Details */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', margin: '20px 0' }}>INVOICE</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice To</strong></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice No:</strong> /1-202602 202602</p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Duration:</strong> {filters.fromDate || '09/02/2026'} - {filters.toDate || '09/02/2026'}</p>
            </div>
          </div>
        </div>

        {/* Description Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '8px', textAlign: 'left', borderRight: '1px solid #000' }}>Description</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>Amount(Rs.)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <td style={{ padding: '8px', borderRight: '1px solid #000' }}>
                Towards Lab Service charges between ({filters.fromDate || '09-02-2026'})
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
          <tbody>
            <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <td style={{ padding: '8px', width: '50%', borderRight: '1px solid #000' }}>
                <strong>(In Words)</strong><br />
                Rupees - Only
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>
                <strong>Payment At</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right', marginTop: '40px', marginBottom: '20px' }}>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Thanking you</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Your Truly,</p>
        </div>

        {/* Page Break */}
        <div style={{ pageBreakAfter: 'always' }}></div>

        {/* Second Page - Data Table */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SHRADDHA PATHOLOGY LABORATORY</h1>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@shraddha.com</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Ph. 8779295302</p>
            <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Detailed Worksheet Report</h2>
            <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Patient Name</th>
                {selectedColumns.includes("location") && (
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Location</th>
                )}
                {selectedColumns.includes("corporate") && (
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Corporate</th>
                )}
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Test Performed</th>
                {selectedColumns.includes("refDoctor") && (
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Ref. doctor</th>
                )}
                {selectedColumns.includes("mobile") && (
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Mobile</th>
                )}
                {selectedColumns.includes("lrNumber") && (
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>LR Number</th>
                )}
                {selectedColumns.includes("remark") && (
                  <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Remark</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.patientName}</td>
                  {selectedColumns.includes("location") && (
                    <td style={{ padding: '6px', border: '1px solid #000' }}>{row.location}</td>
                  )}
                  {selectedColumns.includes("corporate") && (
                    <td style={{ padding: '6px', border: '1px solid #000' }}>{row.corporate}</td>
                  )}
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.testPerformed}</td>
                  {selectedColumns.includes("refDoctor") && (
                    <td style={{ padding: '6px', border: '1px solid #000' }}>{row.refDoctor}</td>
                  )}
                  {selectedColumns.includes("mobile") && (
                    <td style={{ padding: '6px', border: '1px solid #000' }}>{row.mobile}</td>
                  )}
                  {selectedColumns.includes("lrNumber") && (
                    <td style={{ padding: '6px', border: '1px solid #000' }}>{row.lrNumber}</td>
                  )}
                  {selectedColumns.includes("remark") && (
                    <td style={{ padding: '6px', border: '1px solid #000' }}>{row.remark || "-"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
