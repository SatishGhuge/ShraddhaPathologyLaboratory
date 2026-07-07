"use client";

import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, ChevronDown, Gift } from "lucide-react";
import Header from "@/src/components/Header";

export default function TestComplimentReport() {

  const [filters, setFilters] = useState({
    date: "",
    center: "",
    corporate: "",
    referralDoctor: "",
    options: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [columnFilter, setColumnFilter] = useState("");
  const dropdownRef = useRef(null);

  // Available columns for Required Columns dropdown
  const availableColumns = [
    { id: "corporate", label: "Corporate" },
    { id: "lrNumber", label: "LR Number" },
    { id: "discount", label: "Discount" },
    { id: "complimentPercent", label: "Compliment(%)" },
    { id: "paid", label: "Paid" },
    { id: "netCompliment", label: "Net Compliment" },
  ];

  // Selected columns state - all selected by default as shown in image
  const [selectedColumns, setSelectedColumns] = useState(
    availableColumns.map(col => col.id)
  );

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
      srNo: 1,
      date: "03/02/2026", 
      center: "Main Lab",
      corporate: "ABC Corp",
      refDoctor: "Dr. SHARMA",
      patientName: "MRS KAJAL KIRANE", 
      serviceName: "USG ABDOMEN AND PELVIS",
      lrNumber: "2602149",
      totalAmount: 1200,
      discount: 0,
      paid: 1000,
      complimentPercent: 0,
      netCompliment: 200,
    },
    { 
      id: 2,
      srNo: 2,
      date: "03/02/2026", 
      center: "Collection Center",
      corporate: "XYZ Ltd",
      refDoctor: "Dr. PATEL",
      patientName: "MR VIJAY KUMAR", 
      serviceName: "HBA1C/GLYCOXYLATED",
      lrNumber: "2602088",
      totalAmount: 450,
      discount: 0,
      paid: 0,
      complimentPercent: 100,
      netCompliment: 450,
    },
    { 
      id: 3,
      srNo: 3,
      date: "04/02/2026", 
      center: "Main Lab",
      corporate: "ABC Corp",
      refDoctor: "Dr. KUMAR",
      patientName: "MR NANDKUMAR JADHAV", 
      serviceName: "HBA1C/GLYCOXYLATED",
      lrNumber: "2602099",
      totalAmount: 450,
      discount: 245,
      paid: 205,
      complimentPercent: 54.44,
      netCompliment: 245,
    },
    { 
      id: 4,
      srNo: 4,
      date: "04/02/2026", 
      center: "Branch Office",
      corporate: "PQR Industries",
      refDoctor: "Dr. SINGH",
      patientName: "MR NANDKUMAR JADHAV", 
      serviceName: "BLOOD SUGAR FASTING & PP (BSF & PP)",
      lrNumber: "2602099",
      totalAmount: 100,
      discount: 55,
      paid: 45,
      complimentPercent: 55,
      netCompliment: 55,
    },
    { 
      id: 5,
      srNo: 5,
      date: "04/02/2026", 
      center: "Main Lab",
      corporate: "ABC Corp",
      refDoctor: "Dr. MEHTA",
      patientName: "MR SURESH JADHAV", 
      serviceName: "HBA1C/GLYCOXYLATED",
      lrNumber: "2602100",
      totalAmount: 450,
      discount: 245,
      paid: 205,
      complimentPercent: 54.44,
      netCompliment: 245,
    },
  ];

  const [data, setData] = useState(dummyData);

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

    if (!filters.date) err.date = "Date is required";
    if (!filters.center) err.center = "Center is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;

    let filtered = dummyData;

    if (filters.corporate) {
      filtered = filtered.filter((item) =>
        item.center.toLowerCase().includes(filters.corporate.toLowerCase())
      );
    }

    if (filters.referralDoctor) {
      filtered = filtered.filter((item) =>
        item.refDoctor.toLowerCase().includes(filters.referralDoctor.toLowerCase())
      );
    }

    setData(filtered);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFilters({
      date: "",
      center: "",
      corporate: "",
      referralDoctor: "",
      options: "",
    });

    setErrors({});
    setData(dummyData);
    setSelectedColumns([]);
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

  const calculateTotal = (columnId: any) => {
    return data.reduce((sum, row) => sum + (row[columnId] || 0), 0);
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">

        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">

          {/* FILTER GRID - Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2 sm:mb-3">

            <div>
              <input
                type="date"
                name="date"
                placeholder="Search by date"
                value={filters.date}
                onChange={handleChange}
                className={`border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  errors.date && "border-red-500"
                }`}
              />
              {errors.date && (
                <p className="text-red-600 text-xs mt-0.5">{errors.date}</p>
              )}
            </div>

            <div>
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
                <option>Collection Center</option>
                <option>Branch Office</option>
              </select>
              {errors.center && (
                <p className="text-red-600 text-xs mt-0.5">{errors.center}</p>
              )}
            </div>

            <select
              name="corporate"
              value={filters.corporate}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select Corporate</option>
              <option>Corporate A</option>
              <option>Corporate B</option>
              <option>Corporate C</option>
            </select>

            <select
              name="referralDoctor"
              value={filters.referralDoctor}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select Referral Doctor</option>
              <option>Dr. Sharma</option>
              <option>Dr. Patel</option>
              <option>Dr. Kumar</option>
            </select>

          </div>

          {/* FILTER GRID - Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:mb-3">

            <select
              name="options"
              value={filters.options}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select options</option>
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>

            {/* Required Columns Multi-Select Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-white text-gray-700 text-left flex items-center justify-between"
              >
                <span>
                  Required Columns
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

          </div>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">

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

          </div>

        </div>

        {/* TABLE SECTION */}
        <div className="bg-white rounded shadow-md overflow-hidden">

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">

              <thead className="bg-slate-900 text-white shadow-xl">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr.No.</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Center</th>
                  {selectedColumns.includes("corporate") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Corporate</th>
                  )}
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Ref. doctor</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Service Name</th>
                  {selectedColumns.includes("lrNumber") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">LR Number</th>
                  )}
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Total Amount</th>
                  {selectedColumns.includes("discount") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Discount</th>
                  )}
                  {selectedColumns.includes("paid") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Paid</th>
                  )}
                  {selectedColumns.includes("complimentPercent") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Compliment(%)</th>
                  )}
                  {selectedColumns.includes("netCompliment") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Net Compliment</th>
                  )}
                </tr>
              </thead>

              <tbody className="bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={7 + selectedColumns.length} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm">
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.srNo}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.date}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.center}</td>
                      {selectedColumns.includes("corporate") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.corporate}</td>
                      )}
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.refDoctor}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.serviceName}</td>
                      {selectedColumns.includes("lrNumber") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.lrNumber}</td>
                      )}
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right whitespace-nowrap border border-gray-300">{row.totalAmount}</td>
                      {selectedColumns.includes("discount") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.discount}</td>
                      )}
                      {selectedColumns.includes("paid") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.paid}</td>
                      )}
                      {selectedColumns.includes("complimentPercent") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.complimentPercent}</td>
                      )}
                      {selectedColumns.includes("netCompliment") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.netCompliment}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>

              {/* TOTAL ROW */}
              <tfoot className="bg-slate-900 text-white font-semibold shadow-xl">
                <tr>
                  <td 
                    colSpan={
                      6 + // Always visible: Sr.No., Date, Center, Ref. doctor, Patient Name, Service Name
                      (selectedColumns.includes("corporate") ? 1 : 0) +
                      (selectedColumns.includes("lrNumber") ? 1 : 0)
                    } 
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm"
                  >
                    Total
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm whitespace-nowrap border border-gray-300">{calculateTotal("totalAmount").toFixed(2)}</td>
                  {selectedColumns.includes("discount") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("discount").toFixed(2)}</td>
                  )}
                  {selectedColumns.includes("paid") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("paid").toFixed(2)}</td>
                  )}
                  {selectedColumns.includes("complimentPercent") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">-</td>
                  )}
                  {selectedColumns.includes("netCompliment") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("netCompliment").toFixed(2)}</td>
                  )}
                </tr>
              </tfoot>

            </table>
          </div>

        </div>

      </div>

      {/* PRINT ONLY SECTION - Hidden on screen, visible when printing */}
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

        {/* Report Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SHRADDHA PATHOLOGY LABORATORY</h1>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@shraddha.com | Ph. 8779295302</p>
          <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Test Wise Complement Report</h2>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Date: {filters.date || new Date().toLocaleDateString('en-GB')}</p>
          <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
        </div>

        {/* Report Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Sr.No.</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Date</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Center</th>
              {selectedColumns.includes("corporate") && (
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Corporate</th>
              )}
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Ref. Doctor</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Patient Name</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Service Name</th>
              {selectedColumns.includes("lrNumber") && (
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>LR Number</th>
              )}
              <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Total Amount</th>
              {selectedColumns.includes("discount") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Discount</th>
              )}
              {selectedColumns.includes("paid") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Paid</th>
              )}
              {selectedColumns.includes("complimentPercent") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Compliment(%)</th>
              )}
              {selectedColumns.includes("netCompliment") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Net Compliment</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.srNo}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.date}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.center}</td>
                {selectedColumns.includes("corporate") && (
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.corporate}</td>
                )}
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.refDoctor}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.patientName}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.serviceName}</td>
                {selectedColumns.includes("lrNumber") && (
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.lrNumber}</td>
                )}
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.totalAmount}</td>
                {selectedColumns.includes("discount") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.discount}</td>
                )}
                {selectedColumns.includes("paid") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.paid}</td>
                )}
                {selectedColumns.includes("complimentPercent") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.complimentPercent}</td>
                )}
                {selectedColumns.includes("netCompliment") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.netCompliment}</td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', borderTop: '2px solid #000' }}>
              <td colSpan={
                6 + 
                (selectedColumns.includes("corporate") ? 1 : 0) +
                (selectedColumns.includes("lrNumber") ? 1 : 0)
              } style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Total</td>
              <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("totalAmount").toFixed(2)}</td>
              {selectedColumns.includes("discount") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("discount").toFixed(2)}</td>
              )}
              {selectedColumns.includes("paid") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("paid").toFixed(2)}</td>
              )}
              {selectedColumns.includes("complimentPercent") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>-</td>
              )}
              {selectedColumns.includes("netCompliment") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("netCompliment").toFixed(2)}</td>
              )}
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: '30px', textAlign: 'right' }}>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Generated on: {new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>

    </>
  );
}




