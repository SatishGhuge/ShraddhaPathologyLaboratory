"use client";

import { useState } from "react";
import { Search, RotateCcw, Building2 } from "lucide-react";
import Header from "@/src/components/Header";

export default function HospitalBills() {

  const [filters, setFilters] = useState({
    searchDate: "",
    center: "",
    corporates: "",
    referralDoctor: "",
    patientName: "",
  });

  const [errors, setErrors] = useState<any>({});

  const dummyData = [
    { 
      id: 1, 
      srNo: 1,
      date: "09/02/2026",
      patientName: "MR PRAMOD GANPAT GAIKWAD", 
      labNumber: "2602244",
      patientUid: "SD25/1000",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "9969770741",
      totalBill: 1499
    },
    { 
      id: 2, 
      srNo: 2,
      date: "09/02/2026",
      patientName: "MR SANTAWAN SINGH", 
      labNumber: "2602245",
      patientUid: "SD26/744",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "9028496307",
      totalBill: 100
    },
    { 
      id: 3, 
      srNo: 3,
      date: "09/02/2026",
      patientName: "MR SUDHAKAR ALEKAR", 
      labNumber: "2602246",
      patientUid: "SD26/100",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "7977127697",
      totalBill: 1999
    },
    { 
      id: 4, 
      srNo: 4,
      date: "09/02/2026",
      patientName: "MR AKRAM ANSARI", 
      labNumber: "2602247",
      patientUid: "SD26/1058",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "7021131295",
      totalBill: 750
    },
    { 
      id: 5, 
      srNo: 5,
      date: "09/02/2026",
      patientName: "MR KAVITA DUGHD", 
      labNumber: "2602248",
      patientUid: "SD26/1059",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "9137144243",
      totalBill: 850
    },
    { 
      id: 6, 
      srNo: 6,
      date: "09/02/2026",
      patientName: "MR ATHARV RAUT", 
      labNumber: "2602249",
      patientUid: "SD26/1060",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "8767666851",
      totalBill: 300
    },
    { 
      id: 7, 
      srNo: 7,
      date: "09/02/2026",
      patientName: "MRS DR SNEHA SRAVYA", 
      labNumber: "2602250",
      patientUid: "SD26/1061",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "8879006687",
      totalBill: 700
    },
    { 
      id: 8, 
      srNo: 8,
      date: "09/02/2026",
      patientName: "MR RAJESH MHATRE", 
      labNumber: "2602251",
      patientUid: "SD26/845",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "8858825877",
      totalBill: 150
    },
    { 
      id: 9, 
      srNo: 9,
      date: "09/02/2026",
      patientName: "MRS MANDA GAWAND", 
      labNumber: "2602252",
      patientUid: "SD25/10474",
      corporate: "Walkin",
      center: "SD",
      refDr: "",
      mobile: "9594046826",
      totalBill: 650
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

    if (!filters.searchDate) err.searchDate = "Date is required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;
    
    let filtered = dummyData;
    
    if (filters.center) {
      filtered = filtered.filter((item) =>
        item.center.toLowerCase().includes(filters.center.toLowerCase())
      );
    }

    if (filters.corporates) {
      filtered = filtered.filter((item) =>
        item.corporate.toLowerCase().includes(filters.corporates.toLowerCase())
      );
    }

    if (filters.patientName) {
      filtered = filtered.filter((item) =>
        item.patientName.toLowerCase().includes(filters.patientName.toLowerCase())
      );
    }
    
    setData(filtered);
  };

  const handleReset = () => {
    setFilters({
      searchDate: "",
      center: "",
      corporates: "",
      referralDoctor: "",
      patientName: "",
    });

    setErrors({});
    setData(dummyData);
  };

  const totalBill = data.reduce((sum, row) => sum + row.totalBill, 0);

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">

        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">

          {/* FILTER GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-2 sm:mb-3">

            <div>
              <input
                type="date"
                name="searchDate"
                placeholder="Search by Date"
                value={filters.searchDate}
                onChange={handleChange}
                className={`border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  errors.searchDate && "border-red-500"
                }`}
              />
              {errors.searchDate && (
                <p className="text-red-600 text-xs mt-0.5">{errors.searchDate}</p>
              )}
            </div>

            <select
              name="center"
              value={filters.center}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Select Center</option>
              <option>SD</option>
              <option>Main Lab</option>
              <option>Collection Center</option>
            </select>

            <select
              name="corporates"
              value={filters.corporates}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Corporates</option>
              <option>Walkin</option>
              <option>Corporate A</option>
              <option>Corporate B</option>
            </select>

            <input
              name="referralDoctor"
              placeholder="Referral Doctor"
              value={filters.referralDoctor}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <input
              name="patientName"
              placeholder="Patient Name"
              value={filters.patientName}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

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
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Lab Number</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient UID</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Corporate</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Center</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Ref.Dr</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Mobile</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Total Bill</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.srNo}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.date}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.labNumber}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientUid}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.corporate}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.center}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.refDr}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.mobile}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.totalBill}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* TOTAL ROW */}
              <tfoot className="bg-slate-900 text-white font-semibold shadow-xl">
                <tr>
                  <td colSpan={9} className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">
                    Total
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{totalBill}</td>
                </tr>
              </tfoot>

            </table>
          </div>

        </div>

      </div>
    </>
  );
}
