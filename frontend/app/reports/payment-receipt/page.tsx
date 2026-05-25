"use client";

import { useState } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, Receipt } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

export default function ReceiptReport() {

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    receiptSearch: "",
  });

  const [errors, setErrors] = useState<any>({});

  const dummyData = [
    { id: 1, date: "07/02/2026", receipt1: "BL/12453", receipt2: "BL/12462", amount: 4200 },
    { id: 2, date: "06/02/2026", receipt1: "BL/12410", receipt2: "BL/12422", amount: 3100 },
    { id: 3, date: "05/02/2026", receipt1: "BL/12380", receipt2: "BL/12392", amount: 2650 },
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
    
    if (filters.receiptSearch) {
      filtered = filtered.filter((item) =>
        item.receipt1.toLowerCase().includes(filters.receiptSearch.toLowerCase()) ||
        item.receipt2.toLowerCase().includes(filters.receiptSearch.toLowerCase())
      );
    }
    
    setData(filtered);
  };

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      receiptSearch: "",
    });

    setErrors({});
    setData(dummyData);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalAmount = data.reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-white min-h-screen">

        {/* PAGE HEADING */}
        <PageHeader 
          title="Payment Receipt Report" 
          icon={Receipt}
          path="Reports / MIS Reports"
        />

        {/* FILTER CARD */}
        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">

          {/* FILTER GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-2 sm:mb-3">

            <div>
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

            <div>
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

            <input
              type="text"
              name="receiptSearch"
              placeholder="Receipt Search"
              value={filters.receiptSearch}
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
            <table className="w-full text-sm border-collapse">

              <thead className="bg-slate-900 text-white shadow-xl">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-sm whitespace-nowrap border border-gray-300">Sr.No</th>
                  <th className="px-3 py-2 text-left font-semibold text-sm whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-3 py-2 text-center font-semibold text-sm whitespace-nowrap border border-gray-300">Receipts</th>
                  <th className="px-3 py-2 text-right font-semibold text-sm whitespace-nowrap border border-gray-300">Amount</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-500 border border-gray-300">
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-left border border-gray-300">{i + 1}</td>
                      <td className="px-3 py-2 text-left whitespace-nowrap border border-gray-300">{row.date}</td>
                      <td className="px-3 py-2 text-center border border-gray-300">
                        <div className="flex flex-col sm:flex-row sm:gap-8 justify-center items-center">
                          <span>{row.receipt1}</span>
                          <span>{row.receipt2}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap border border-gray-300">{row.amount}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* TOTAL ROW */}
              <tfoot className="bg-slate-900 text-white font-semibold shadow-xl">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-left text-sm border border-gray-300">
                    <span className="hidden sm:inline">Total Receipt Amount</span>
                    <span className="sm:hidden">Total</span>
                  </td>
                  <td className="px-3 py-2 text-right text-sm whitespace-nowrap border border-gray-300">{totalAmount}</td>
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

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SILVERLEAF DIAGNOSTICS</h1>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@silverleafdiagnostics.com | Ph. 8779295302</p>
          <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>Payment Receipt Report</h2>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Period: {filters.fromDate || 'N/A'} to {filters.toDate || 'N/A'}</p>
          <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #000' }}>Sr.No</th>
              <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #000' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #000' }}>Receipts</th>
              <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                <td style={{ padding: '8px', border: '1px solid #000' }}>{i + 1}</td>
                <td style={{ padding: '8px', border: '1px solid #000' }}>{row.date}</td>
                <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #000' }}>
                  {row.receipt1} | {row.receipt2}
                </td>
                <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>{row.amount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', borderTop: '2px solid #000' }}>
              <td colSpan={3} style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>Total Receipt Amount</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #000' }}>{totalAmount}</td>
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




