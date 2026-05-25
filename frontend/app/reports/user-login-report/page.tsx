"use client";

import { useState } from "react";
import {
  Search,
  FileSpreadsheet,
  Printer,
  UserCheck,
} from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

export default function UserLoginReport() {
  const [filters, setFilters] = useState({
    searchDate: "",
    userId: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [searched, setSearched] = useState(true); // Changed to true to show table by default

  const dummyData = [
    {
      id: 1,
      srNo: 1,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 07:06:45",
    },
    {
      id: 2,
      srNo: 2,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 09:31:55",
    },
    {
      id: 3,
      srNo: 3,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 10:02:12",
    },
    {
      id: 4,
      srNo: 4,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "152.59.63.250",
      loginTime: "2026-02-08 11:06:48",
    },
    {
      id: 5,
      srNo: 5,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "152.59.63.250",
      loginTime: "2026-02-08 11:06:51",
    },
    {
      id: 6,
      srNo: 6,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "152.59.63.250",
      loginTime: "2026-02-08 11:08:46",
    },
    {
      id: 7,
      srNo: 7,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "152.59.63.250",
      loginTime: "2026-02-08 11:08:48",
    },
    {
      id: 8,
      srNo: 8,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "152.59.63.250",
      loginTime: "2026-02-08 11:14:59",
    },
    {
      id: 9,
      srNo: 9,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "152.59.63.250",
      loginTime: "2026-02-08 11:21:44",
    },
    {
      id: 10,
      srNo: 10,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 11:24:10",
    },
    {
      id: 11,
      srNo: 11,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 11:36:57",
    },
    {
      id: 12,
      srNo: 12,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 11:57:20",
    },
    {
      id: 13,
      srNo: 13,
      center: "",
      username: "sd173",
      userId: "8",
      ip: "45.251.238.15",
      loginTime: "2026-02-08 11:57:28",
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

    if (!filters.searchDate) err.searchDate = "Date Required";

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;
    setSearched(true);
    
    // Filter data based on userId if provided
    let filteredData = dummyData;
    if (filters.userId) {
      filteredData = dummyData.filter(item => 
        item.userId.includes(filters.userId)
      );
    }
    
    setData(filteredData);
  };

  const handleReset = () => {
    setFilters({
      searchDate: "",
      userId: "",
    });
    setErrors({});
    setSearched(false);
    setData([]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-primary-50 min-h-screen">
        {/* PAGE HEADING */}
        <PageHeader 
          title="User Login Report" 
          icon={UserCheck}
          path="Reports / Other Reports"
        />

        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">
          {/* FILTER GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:mb-3">
            <div>
              <input
                type="date"
                name="searchDate"
                placeholder="Search by Date"
                value={filters.searchDate}
                onChange={handleChange}
                className={`border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                  errors.searchDate && "border-red-500"
                }`}
              />
              {errors.searchDate && (
                <p className="text-red-600 text-xs mt-0.5">{errors.searchDate}</p>
              )}
            </div>

            <input
              type="text"
              name="userId"
              placeholder="User Id"
              value={filters.userId}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* BUTTONS */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={handleSearch}
              className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
            >
              <Search size={14} className="sm:w-4 sm:h-4"/> 
              <span>Search</span>
            </button>

            {searched && (
              <>
                <button 
                  onClick={handlePrint}
                  className="flex gap-1 sm:gap-1.5 items-center bg-primary-600 hover:bg-primary-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
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
            {/* TABLE HEADER */}
            <div className="bg-white text-black px-3 py-1.5 border-b border-gray-300">
              <h2 className="text-sm font-bold">User Login Report</h2>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead className="bg-gradient-to-r from-slate-800 via-primary-700 to-primary-600 shadow-xl text-white">
                  <tr>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Sr.No
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Center
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Username
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      User Id
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Ip
                    </th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">
                      Login Time
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white">
                  {data.length > 0 ? (
                    data.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.srNo}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.center || "-"}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.username}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.userId}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.ip}</td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.loginTime}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-2 sm:px-3 py-3 sm:py-4 text-center text-gray-500 text-xs sm:text-sm border border-gray-300">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!searched && (
          <div className="bg-white p-3 sm:p-4 rounded shadow-md text-center text-gray-500 text-xs sm:text-sm">
            Please select date and click search to view the user login report.
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
              size: A4;
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
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>User Login Report</h2>
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
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Duration:</strong> {filters.searchDate || '09/02/2026'}</p>
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
                Towards Lab Service charges ({filters.searchDate || '09-02-2026'})
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
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>User Login Report</h2>
            <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginTop: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Sr.No</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Center</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Username</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>User Id</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Ip</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Login Time</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.srNo}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.center || "-"}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.username}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.userId}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.ip}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.loginTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

