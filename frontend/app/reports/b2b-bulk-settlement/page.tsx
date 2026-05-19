"use client";

import { useState } from "react";
import { Search, RotateCcw, Printer, FileSpreadsheet, Briefcase } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

export default function B2bBulkSettlement() {

  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    center: "",
    corporate: "",
    referralDoctor: "",
    onlyOutstandings: false,
    });

  const [errors, setErrors] = useState<any>({});
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [remark, setRemark] = useState("");
  const [totalAmountReceived, setTotalAmountReceived] = useState("");

  const dummyData = [
    { 
      id: 1, 
      date: "08/02/2026",
      patientName: "MR DEVDAS P K", 
      labNo: "2602219",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 250,
      paid: 250,
      discount: 0,
      b2bRate: 0,
      balance: -250,
    },
    { 
      id: 2, 
      date: "08/02/2026",
      patientName: "MRS DHANASHREE DHAKTODE", 
      labNo: "2602220",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 950,
      paid: 650,
      discount: 350,
      b2bRate: 100,
      balance: -900,
    },
    { 
      id: 3, 
      date: "08/02/2026",
      patientName: "MRS JAYSHREE", 
      labNo: "2602221",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 650,
      paid: 0,
      discount: 0,
      b2bRate: 0,
      balance: 0,
    },
    { 
      id: 4, 
      date: "08/02/2026",
      patientName: "MRS ANITA JADHAV", 
      labNo: "2602222",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 500,
      paid: 0,
      discount: 0,
      b2bRate: 0,
      balance: 0,
    },
    { 
      id: 5, 
      date: "08/02/2026",
      patientName: "MISS POOJA NORDE", 
      labNo: "2602223",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 1500,
      paid: 0,
      discount: 0,
      b2bRate: 450,
      balance: 450,
    },
    { 
      id: 6, 
      date: "08/02/2026",
      patientName: "MR GEORGE THOMAS", 
      labNo: "2602224",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 100,
      paid: 100,
      discount: 0,
      b2bRate: 0,
      balance: -100,
    },
    { 
      id: 7, 
      date: "08/02/2026",
      patientName: "MRS SNEHA DHOBALE", 
      labNo: "2602225",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 100,
      paid: 0,
      discount: 0,
      b2bRate: 0,
      balance: 0,
    },
    { 
      id: 8, 
      date: "08/02/2026",
      patientName: "MR SACHIN BANDI", 
      labNo: "2602226",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 100,
      paid: 100,
      discount: 0,
      b2bRate: 0,
      balance: -100,
    },
    { 
      id: 9, 
      date: "08/02/2026",
      patientName: "MRS SHUBHA RAO", 
      labNo: "2602227",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 650,
      paid: 400,
      discount: 250,
      b2bRate: 100,
      balance: -550,
    },
    { 
      id: 10, 
      date: "08/02/2026",
      patientName: "MRS SUNITA PINGALE", 
      labNo: "2602228",
      center: "SILVERLEAF DIAGNOSTICS",
      refDr: "",
      totalBill: 2299,
      paid: 2299,
      discount: 0,
      b2bRate: 0,
      balance: -2299,
    },
  ];

  const [data, setData] = useState(dummyData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = (target as HTMLInputElement).checked;

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
    let err: any = {};

    if (!filters.fromDate) err.fromDate = "From Date is required";
    if (!filters.toDate) err.toDate = "To Date is required";
    if (!filters.center) err.center = "Center is required";

    if (filters.fromDate && filters.toDate) {
      const from = new Date(filters.fromDate);
      const to = new Date(filters.toDate);
      if (from > to) {
        err.toDate = "To Date must be after From Date";
      }
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSearch = () => {
    if (!validate()) return;
    
    let filtered = dummyData;

    if (filters.onlyOutstandings) {
      filtered = filtered.filter((item) => item.balance > 0);
    }
    
    setData(filtered);
  };

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      center: "",
      corporate: "",
      referralDoctor: "",
      onlyOutstandings: false,
    });

    setErrors({});
    setData(dummyData);
    setPaymentMode("");
    setPaymentDate("");
    setRemark("");
    setTotalAmountReceived("");
  };

  const handlePrint = () => {
    window.print();
  };

  const calculateTotal = (columnId: any) => {
    return data.reduce((sum, row) => sum + (row[columnId] || 0), 0);
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-cyan-50 min-h-screen">

        <PageHeader 
          title="B2B Bulk Settlement List" 
          icon={Briefcase}
          path="Reports"
        />

        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md mb-2 sm:mb-3">

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2 sm:mb-3">

            <div>
              <input
                type="date"
                name="fromDate"
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
                <option>SILVERLEAF DIAGNOSTICS</option>
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
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Walkin</option>
              <option>Corporate A</option>
              <option>Corporate B</option>
              <option>Corporate C</option>
            </select>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2 sm:mb-3">

            <input
              name="referralDoctor"
              placeholder="Search Referral Doctor"
              value={filters.referralDoctor}
              onChange={handleChange}
              className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <label className="flex items-center gap-2 text-xs sm:text-sm border border-gray-300 p-1.5 sm:p-2 rounded">
              <input
                type="checkbox"
                name="onlyOutstandings"
                checked={filters.onlyOutstandings}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <span>Only Outstandings</span>
            </label>

          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">

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

        <div className="bg-white rounded shadow-md overflow-hidden mb-2 sm:mb-3">

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">

              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 shadow-xl text-white">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Date</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Patient Name</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Lab No.</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Center</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Ref. Dr.</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Total Bill</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Paid</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Discount</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">B2b Rate</th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-semibold text-xs sm:text-sm whitespace-nowrap border border-gray-300">Balance</th>
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
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left whitespace-nowrap border border-gray-300">{row.date}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.patientName}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.labNo}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.center}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-left border border-gray-300">{row.refDr}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.totalBill}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.paid}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.discount}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.b2bRate}</td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">{row.balance}</td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 shadow-xl text-white font-semibold">
                <tr>
                  <td colSpan={5} className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">
                    TOTAL
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("totalBill").toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("paid").toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("discount").toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("b2bRate").toFixed(2)}</td>
                  <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-right text-xs sm:text-sm border border-gray-300">{calculateTotal("balance").toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={10} className="px-2 sm:px-3 py-1.5 sm:py-2 text-right border border-gray-300">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        type="text"
                        value={totalAmountReceived}
                        onChange={(e) => setTotalAmountReceived(e.target.value)}
                        placeholder="Received"
                        className="w-24 px-2 py-1 text-xs text-black border border-white rounded"
                      />
                    </div>
                  </td>
                </tr>
              </tfoot>

            </table>
          </div>

        </div>

        <div className="bg-white p-2 sm:p-3 md:p-4 rounded shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2 sm:mb-3">

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Payment Mode*</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Please select</option>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Cheque</option>
                <option>Net Banking</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Add Remark</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={2}
                className="border border-gray-300 p-1.5 sm:p-2 rounded w-full text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

          </div>

          <div className="flex justify-end">
            <button className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
              <span>Settle</span>
            </button>
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
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>B2B Bulk Settlement Report</h2>
          <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center', textDecoration: 'underline', margin: '20px 0' }}>INVOICE</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice To</strong></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
              <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Invoice Duration:</strong> {filters.fromDate || 'N/A'} - {filters.toDate || 'N/A'}</p>
            </div>
          </div>
        </div>

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
                Towards Lab Service charges
              </td>
              <td style={{ padding: '8px', textAlign: 'right' }}>{calculateTotal("totalBill").toFixed(0)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: 'right', marginTop: '40px', marginBottom: '20px' }}>
          <p style={{ margin: '5px 0', fontSize: '12px' }}>Thanking you</p>
        </div>

        <div style={{ pageBreakAfter: 'always' }}></div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>SILVERLEAF DIAGNOSTICS</h1>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
            <p style={{ margin: '5px 0', fontSize: '12px' }}>Email: info@silverleafdiagnostics.com | Ph. 8779295302</p>
            <hr style={{ margin: '10px 0', border: '1px solid #000' }} />
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc', margin: '10px 0' }}>B2B Bulk Settlement Report</h2>
            <hr style={{ margin: '10px 0', border: '1px dashed #000' }} />
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0', borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Date</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Patient Name</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Lab No.</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Center</th>
                <th style={{ padding: '6px', textAlign: 'left', border: '1px solid #000' }}>Ref. Dr.</th>
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Total Bill</th>
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Paid</th>
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Discount</th>
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>B2B Rate</th>
                <th style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px dashed #ccc' }}>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.date}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.patientName}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.labNo}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.center}</td>
                  <td style={{ padding: '6px', border: '1px solid #000' }}>{row.refDr}</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.totalBill.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.paid.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.discount.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.b2bRate.toFixed(2)}</td>
                  <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{row.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', borderTop: '2px solid #000' }}>
                <td colSpan={5} style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>Total</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("totalBill").toFixed(2)}</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("paid").toFixed(2)}</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("discount").toFixed(2)}</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("b2bRate").toFixed(2)}</td>
                <td style={{ padding: '6px', textAlign: 'right', border: '1px solid #000' }}>{calculateTotal("balance").toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </>
  );
}

