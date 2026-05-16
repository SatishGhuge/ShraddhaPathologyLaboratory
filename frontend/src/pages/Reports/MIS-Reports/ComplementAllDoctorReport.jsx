import { useState, useRef, useEffect } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, ChevronDown, Users } from "lucide-react";
import Header from "../../../components/Header.jsx";
import PageHeader from "../../../components/BreadCrumb.jsx";

export default function ComplementAllDoctorReport() {

  const [filters, setFilters] = useState({
    date: "",
    center: "",
    options1: "",
    referralDoctor: "",
    options2: "",
    sortBy: "",
    groupBy: "",
    printIndividualDoctor: false,
  });

  const [errors, setErrors] = useState({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [columnFilter, setColumnFilter] = useState("");
  const dropdownRef = useRef(null);

  // Available columns for Select Columns dropdown
  const availableColumns = [
    { id: "discount", label: "Discount" },
    { id: "complimentPercent", label: "Compliment(%)" },
    { id: "balance", label: "Balance" },
    { id: "paid", label: "Paid" },
    { id: "costToLab", label: "Cost to Lab" },
    { id: "remark", label: "Remark" },
  ];

  // Selected columns state - none selected by default
  const [selectedColumns, setSelectedColumns] = useState([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
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
      doctorName: "Dr. Sharma", 
      date: "07/02/2026", 
      patientName: "MRS POOJA KAMBLE", 
      lrNumber: "LR12453",
      testsPerformed: "CBC, Blood Sugar",
      totalBill: 5000,
      discount: 500,
      paid: 4000,
      costToLab: 3000,
      complimentPercent: 10,
      amount: 500,
      balance: 500,
      remark: "Follow-up required"
    },
    { 
      id: 2, 
      doctorName: "Dr. Patel", 
      date: "07/02/2026", 
      patientName: "MR SUSHMA PATIL", 
      lrNumber: "LR12454",
      testsPerformed: "Lipid Profile, LFT",
      totalBill: 8000,
      discount: 800,
      paid: 7200,
      costToLab: 5000,
      complimentPercent: 10,
      amount: 800,
      balance: 0,
      remark: ""
    },
    { 
      id: 3, 
      doctorName: "Dr. Kumar", 
      date: "06/02/2026", 
      patientName: "MRS NIRMALA PRASAD", 
      lrNumber: "LR12455",
      testsPerformed: "Thyroid Profile",
      totalBill: 6500,
      discount: 650,
      paid: 5850,
      costToLab: 4000,
      complimentPercent: 10,
      amount: 650,
      balance: 0,
      remark: "Urgent"
    },
    {
        id: 4,
        doctorName: "Dr. Sharma",
        date: "06/02/2026",
        patientName: "MR RAJESH KUMAR",
        lrNumber: "LR12456",
        testsPerformed: "HbA1c, Vitamin D",
        totalBill: 7000,
        discount: 700,
        paid: 5000,
        costToLab: 4500,
        complimentPercent: 10,
        amount: 700,
        balance: 1300,
        remark: ""
    },
    {
        id: 5, 
        doctorName: "Dr. Patel",
        date: "05/02/2026",
        patientName: "MRS MEERA SINGH",
        lrNumber: "LR12457",
        testsPerformed: "KFT, Electrolytes",
        totalBill: 5500,
        discount: 550,
        paid: 4950,
        costToLab: 3500,
        complimentPercent: 10,
        amount: 550,
        balance: 0,
        remark: "Regular checkup"
    }
  ];

  const [data, setData] = useState(dummyData);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFilters({
      ...filters,
      [name]: type === "checkbox" ? checked : value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });
  };

  const validate = () => {
    let err = {};

    if (!filters.date) err.date = "Date is required";
    if (!filters.center) err.center = "Center is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;

    let filtered = dummyData;

    if (filters.referralDoctor) {
      filtered = filtered.filter((item) =>
        item.doctorName.toLowerCase().includes(filters.referralDoctor.toLowerCase())
      );
    }

    if (filters.sortBy === "doctor") {
      filtered = [...filtered].sort((a, b) => a.doctorName.localeCompare(b.doctorName));
    } else if (filters.sortBy === "date") {
      filtered = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    setData(filtered);
  };

  const handleReset = () => {
    setFilters({
      date: "",
      center: "",
      options1: "",
      referralDoctor: "",
      options2: "",
      sortBy: "",
      groupBy: "",
      printIndividualDoctor: false,
    });

    setErrors({});
    setData(dummyData);
    setSelectedColumns([]);
  };

  const handlePrint = () => {
    window.print();
  };

  // Toggle column selection
  const toggleColumn = (columnId) => {
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

  const calculateTotal = (columnId) => {
    return data.reduce((sum, row) => sum + (row[columnId] || 0), 0);
  };

  const totalBill = calculateTotal("totalBill");
  const totalAmount = calculateTotal("amount");

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-cyan-50 min-h-screen">

        {/* PAGE HEADING */}
        <PageHeader 
          title="Complement Report (All Doctors)" 
          icon={Users}
          path="Reports / MIS Reports"
        />

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
              name="options1"
              value={filters.options1}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select options</option>
              <option>All</option>
              <option>Paid</option>
              <option>Pending</option>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2 sm:mb-3">

            <select
              name="options2"
              value={filters.options2}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select options</option>
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>

            <select
              name="sortBy"
              value={filters.sortBy}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Sort By</option>
              <option value="doctor">Doctor Name</option>
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>

            <select
              name="groupBy"
              value={filters.groupBy}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Group By</option>
              <option>Doctor</option>
              <option>Date</option>
              <option>Patient</option>
            </select>

            {/* Select Columns Multi-Select Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 bg-white text-gray-700 text-left flex items-center justify-between"
              >
                <span>
                  Select Columns {selectedColumns.length > 0 && `(${selectedColumns.length})`}
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

          {/* FILTER GRID - Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-2 sm:mb-3">

            <div className="flex items-center gap-2 border border-gray-300 p-1.5 sm:p-2 rounded bg-white">
              <input
                type="checkbox"
                name="printIndividualDoctor"
                checked={filters.printIndividualDoctor}
                onChange={handleChange}
                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500"
              />
              <label className="text-xs sm:text-sm text-gray-700">Print Individual Doctor</label>
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

              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 shadow-xl text-white">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr. No.</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Doctor Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">LR Number</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Tests Performed</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Total Bill</th>
                  {selectedColumns.includes("discount") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Discount</th>
                  )}
                  {selectedColumns.includes("paid") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Paid</th>
                  )}
                  {selectedColumns.includes("costToLab") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Cost to Lab</th>
                  )}
                  {selectedColumns.includes("complimentPercent") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Compliment(%)</th>
                  )}
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Amount</th>
                  {selectedColumns.includes("balance") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Balance</th>
                  )}
                  {selectedColumns.includes("remark") && (
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Remark</th>
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
                  data.map((row, i) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{i + 1}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.doctorName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.date}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.lrNumber}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.testsPerformed}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right whitespace-nowrap border border-gray-300">{row.totalBill.toFixed(2)}</td>
                      {selectedColumns.includes("discount") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.discount.toFixed(2)}</td>
                      )}
                      {selectedColumns.includes("paid") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.paid.toFixed(2)}</td>
                      )}
                      {selectedColumns.includes("costToLab") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.costToLab.toFixed(2)}</td>
                      )}
                      {selectedColumns.includes("complimentPercent") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.complimentPercent.toFixed(2)}</td>
                      )}
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right whitespace-nowrap border border-gray-300">{row.amount.toFixed(2)}</td>
                      {selectedColumns.includes("balance") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.balance.toFixed(2)}</td>
                      )}
                      {selectedColumns.includes("remark") && (
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.remark}</td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>

              {/* TOTAL ROW */}
              <tfoot className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 shadow-xl text-white font-semibold">
                <tr>
                  <td 
                    colSpan="6" 
                    className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm"
                  >
                    Total
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm whitespace-nowrap border border-gray-300">{totalBill.toFixed(2)}</td>
                  {selectedColumns.includes("discount") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("discount").toFixed(2)}</td>
                  )}
                  {selectedColumns.includes("paid") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("paid").toFixed(2)}</td>
                  )}
                  {selectedColumns.includes("costToLab") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("costToLab").toFixed(2)}</td>
                  )}
                  {selectedColumns.includes("complimentPercent") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">-</td>
                  )}
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm whitespace-nowrap border border-gray-300">{totalAmount.toFixed(2)}</td>
                  {selectedColumns.includes("balance") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("balance").toFixed(2)}</td>
                  )}
                  {selectedColumns.includes("remark") && (
                    <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-xs sm:text-sm border border-gray-300"></td>
                  )}
                </tr>
              </tfoot>

            </table>
          </div>

        </div>

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

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SILVERLEAF DIAGNOSTICS</h1>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@silverleafdiagnostics.com | Ph. 8779295302</p>
          <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Complement Report (All Doctors)</h2>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Date: {filters.date || new Date().toLocaleDateString('en-GB')}</p>
          <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Sr. No.</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Doctor Name</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Date</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Patient Name</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>LR Number</th>
              <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Tests Performed</th>
              <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Total Bill</th>
              {selectedColumns.includes("discount") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Discount</th>
              )}
              {selectedColumns.includes("paid") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Paid</th>
              )}
              {selectedColumns.includes("costToLab") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Cost to Lab</th>
              )}
              {selectedColumns.includes("complimentPercent") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Compliment(%)</th>
              )}
              <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Amount</th>
              {selectedColumns.includes("balance") && (
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Balance</th>
              )}
              {selectedColumns.includes("remark") && (
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Remark</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{i + 1}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.doctorName}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.date}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.patientName}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.lrNumber}</td>
                <td style={{ padding: '6px', border: '1px solid #000' }}>{row.testsPerformed}</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.totalBill.toFixed(2)}</td>
                {selectedColumns.includes("discount") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.discount.toFixed(2)}</td>
                )}
                {selectedColumns.includes("paid") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.paid.toFixed(2)}</td>
                )}
                {selectedColumns.includes("costToLab") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.costToLab.toFixed(2)}</td>
                )}
                {selectedColumns.includes("complimentPercent") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.complimentPercent.toFixed(2)}</td>
                )}
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.amount.toFixed(2)}</td>
                {selectedColumns.includes("balance") && (
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.balance.toFixed(2)}</td>
                )}
                {selectedColumns.includes("remark") && (
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.remark}</td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', borderTop: '2px solid #000' }}>
              <td colSpan="6" style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Total</td>
              <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{totalBill.toFixed(2)}</td>
              {selectedColumns.includes("discount") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("discount").toFixed(2)}</td>
              )}
              {selectedColumns.includes("paid") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("paid").toFixed(2)}</td>
              )}
              {selectedColumns.includes("costToLab") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("costToLab").toFixed(2)}</td>
              )}
              {selectedColumns.includes("complimentPercent") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>-</td>
              )}
              <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{totalAmount.toFixed(2)}</td>
              {selectedColumns.includes("balance") && (
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("balance").toFixed(2)}</td>
              )}
              {selectedColumns.includes("remark") && (
                <td style={{ padding: '6px', border: '1px solid #000' }}></td>
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




