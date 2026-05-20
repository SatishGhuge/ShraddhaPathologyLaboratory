"use client";

import { useState } from "react";
import { Search, RotateCcw, FileSpreadsheet, XCircle } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

export default function SampleRejectionReport() {

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    status: "",
  });

  const [errors, setErrors] = useState<any>({});

  const dummyData = [
    { 
      id: 1, 
      srNo: 1,
      patientName: "MRS POOJA KAMBLE", 
      patientId: "P12345",
      ageGender: "35/F",
      testName: "Complete Blood Count",
      lrNumber: "LR001234",
      status: "Rejected",
      remark: "Hemolyzed sample",
      date: "09/02/2026"
    },
    { 
      id: 2, 
      srNo: 2,
      patientName: "MR RAJESH KUMAR", 
      patientId: "P12346",
      ageGender: "42/M",
      testName: "Lipid Profile",
      lrNumber: "LR001235",
      status: "Rejected",
      remark: "Insufficient quantity",
      date: "09/02/2026"
    },
    { 
      id: 3, 
      srNo: 3,
      patientName: "MRS SUNITA SHARMA", 
      patientId: "P12347",
      ageGender: "28/F",
      testName: "Thyroid Function Test",
      lrNumber: "LR001236",
      status: "Rejected",
      remark: "Clotted sample",
      date: "08/02/2026"
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

    if (!filters.fromDate) err.fromDate = "From Date Required";
    if (!filters.toDate) err.toDate = "To Date Required";

    if (
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      err.dateRange = "Invalid Date Range";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;
    
    let filtered = dummyData;
    
    if (filters.status) {
      filtered = filtered.filter((item) =>
        item.status.toLowerCase().includes(filters.status.toLowerCase())
      );
    }
    
    setData(filtered);
  };

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      status: "",
    });

    setErrors({});
    setData(dummyData);
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-cyan-50 min-h-screen">

        {/* PAGE HEADING */}
        <PageHeader 
          title="Sample Rejection Report" 
          icon={XCircle}
          path="Reports / Other Reports"
        />

        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">

          {/* FILTER GRID */}
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
              {errors.dateRange && (
                <p className="text-red-600 text-xs mt-0.5">{errors.dateRange}</p>
              )}
            </div>

            <div className="flex-1">
              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Select Status</option>
                <option>Rejected</option>
                <option>Pending</option>
                <option>Approved</option>
              </select>
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
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Sr.No</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient ID</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Age/Gender</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Test Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">LR Number</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Status</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Remark</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.srNo}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientId}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.ageGender}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.testName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.lrNumber}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          row.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.remark}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.date}</td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>

        </div>

      </div>
    </>
  );
}
