"use client";

import React, { useState, useRef, useEffect } from "react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

import {
  Search,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Barcode,
  Send,
} from "lucide-react";

const DOCTORS = [
  { name: "Dr. Rajesh Sharma", specialty: "General Physician" },
  { name: "Dr. Priya Verma", specialty: "Surgeon" },
  { name: "Dr. Amit Patel", specialty: "Cardiologist" },
];

const LABS = [
  { name: "Lab-101", city: "Mumbai" },
  { name: "Lab-201", city: "Delhi" },
  { name: "Lab-301", city: "Bangalore" },
];

export default function OutsourceTests() {

  const doctorRef = useRef(null);
  const labRef = useRef(null);
  const [docInput, setDocInput] = useState("");
  const [showDoctors, setShowDoctors] = useState(false);
  const [labInput, setLabInput] = useState("");
  const [showLabs, setShowLabs] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [patientName, setPatientName] = useState("");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [data] = useState([
    {
      outsource_id: "O-1001",
      patient_name: "MR DEVDAS P.K",
      lab_name: "Universal Diagnostics",
      test_name: "MRI Scan",
      outsource_charge: 50,
      status: "Received",
    },
    {
      outsource_id: "O-1001",
      patient_name: "MR Hari P.K",
      lab_name: "shree sai diagnostics",
      test_name: "CBC",
      outsource_charge: 50,
      status: "Received",
    },
    {
      outsource_id: "O-1003",
      patient_name: "MR RAMESH K",
      lab_name: "shreeya diagnostics",
      test_name: "X-Ray",
      outsource_charge: 120,
      status: "Sample Send",
    },
    {
      outsource_id: "O-1004",
      patient_name: "MR SURESH K",
      lab_name: "om namah shivaya diagnostics",
      test_name: "sonography",
      outsource_charge: 90,
      status: "Received",
    },
    {
      outsource_id: "O-1005",
      patient_name: "MR Rakesh K",
      lab_name: "R K Diagnostics",
      test_name: "CT Scan",
      outsource_charge: 200,
      status: "Sample Send",
    },
  ]);


  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (doctorRef.current && !doctorRef.current.contains(e.target)) setShowDoctors(false);
      if (labRef.current && !labRef.current.contains(e.target)) setShowLabs(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    setFilteredData(data);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    setFilteredData(data.filter((row: any) => 
      (!fromDate || row.date >= fromDate) &&
      (!toDate || row.date <= toDate) &&
      (!status || row.status === status) &&
      (!patientName || row.patient_name.toLowerCase().includes(patientName.toLowerCase()))
    ));
  };

  const handleReset = () => {
    setFromDate(""); setToDate(""); setStatus(""); setPatientName(""); setFilteredData(data);
  };

  const handlePrint = () => window.print();

  const handleExcel = () => {
    const csv = [["Sr.No.", "Outsource ID", "Patient Name", "Lab Name", "Test Name", "Charge", "Status"], ...filteredData.map((r, i) => [i+1, r.outsource_id, r.patient_name, r.lab_name, r.test_name, r.outsource_charge, r.status])].map(r => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    link.download = "outsource_tests.csv";
    link.click();
  };

  const handlePrintBarcode = () => {
    const barcodeHtml = `<html><head><title>Print Barcodes</title><style>body{font-family:Arial;padding:20px}.barcode{margin:10px 0;padding:10px;border:1px solid #ddd;text-align:center}code{font-size:24px;font-weight:bold;letter-spacing:3px}</style></head><body>${filteredData.map(r => `<div class="barcode"><code>${r.outsource_id.replace(/O-/g, '')}</code><br>${r.patient_name}</div>`).join("")}</body></html>`;
    const newWindow = window.open("", "_blank");
    newWindow.document.write(barcodeHtml);
    newWindow.document.close();
    setTimeout(() => newWindow.print(), 500);
  };

  /* Status color */
  const getStatusColor = (status: any) => {
    switch (status) {
      case "Received":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };


  /* Responsive input style */
  const inputStyle =
    "border border-gray-300 rounded-md px-3 py-2 text-sm w-full h-10 focus:outline-none focus:ring-2 focus:ring-cyan-500";


  /* Responsive button style */
  const btnStyle =
    "flex items-center justify-center gap-2 px-4 h-10 rounded text-white text-sm shadow whitespace-nowrap";


  return (
    <>
    <Header/>

    <div className="w-full px-3 sm:px-6 mt-16">

      <PageHeader 
        title="Outsource for Test" 
        icon={Send}
        path="Patient"
      />


      {/* Filter Card */}
     

        <div className="bg-white rounded-lg shadow p-4 w-full">

          {/* FILTER ROW */}
          <div className=" flex flex-wrap gap-3 items-center w-full">

            <div className="w-full sm:w-auto">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From Date" className={`${inputStyle} sm:w-44`} />
            </div>

            <div className="w-full sm:w-auto">
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To Date" className={`${inputStyle} sm:w-44`} />
            </div>

          

            <div className="w-full sm:w-auto">
              <select className={`${inputStyle} sm:w-44`}>
                <option>Select Center</option>
                
              </select>
            </div>

             <div className="w-full sm:w-auto">
              <select className={`${inputStyle} sm:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Status</option>
                <option>Pending</option>
                <option>Received</option>
                <option>Sample Send</option>
              </select>
            </div>


            <div className="w-full sm:w-auto relative" ref={doctorRef}>
              <input
                type="text"
                placeholder="Search Referral Doctor"
                className={`${inputStyle} sm:w-56`}
                value={docInput}
                onChange={(e) => setDocInput(e.target.value)}
                onFocus={() => setShowDoctors(true)}
              />
              {showDoctors && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg mt-1 z-10 max-h-48 overflow-y-auto">
                  {DOCTORS.filter(d => d.name.toLowerCase().includes(docInput.toLowerCase())).map((doc, i) => (
                    <div key={i} onClick={() => { setDocInput(doc.name); setShowDoctors(false); }} className="p-2 hover:bg-cyan-50 cursor-pointer border-b last:border-b-0">
                      <div className="text-sm font-semibold">{doc.name}</div>
                      <div className="text-xs text-gray-500">{doc.specialty}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full sm:w-auto relative" ref={labRef}>
              <input
                type="text"
                placeholder="Search Lab"
                className={`${inputStyle} sm:w-56`}
                value={labInput}
                onChange={(e) => setLabInput(e.target.value)}
                onFocus={() => setShowLabs(true)}
              />
              {showLabs && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg mt-1 z-10 max-h-48 overflow-y-auto">
                  {LABS.filter(l => l.name.toLowerCase().includes(labInput.toLowerCase())).map((lab, i) => (
                    <div key={i} onClick={() => { setLabInput(lab.name); setShowLabs(false); }} className="p-2 hover:bg-cyan-50 cursor-pointer border-b last:border-b-0">
                      <div className="text-sm font-semibold">{lab.name}</div>
                      <div className="text-xs text-gray-500">{lab.city}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Patient Name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className={`${inputStyle} sm:w-56`}
              />
            </div>

          


            {/* Buttons */}
            <div className="flex flex-wrap gap-3 w-full sm:w-auto">

              <button onClick={handleSearch} className={`${btnStyle} bg-cyan-600`}>
                <Search size={16} />
                Search
              </button>

              <button onClick={handleReset} className={`${btnStyle} bg-red-500`}>
                <RotateCcw size={16} />
                Reset
              </button>

              <button onClick={handlePrint} className={`${btnStyle} bg-blue-700`}>
                <Printer size={16} />
                Print
              </button>

              <button onClick={handleExcel} className={`${btnStyle} bg-green-600`}>
                <FileSpreadsheet size={16} />
                Excel
              </button>

              <button onClick={handlePrintBarcode} className={`${btnStyle} bg-indigo-800`}>
                <Barcode size={16} />
                Print Barcode
              </button>

            </div>

          </div>

        </div>

      </div>



      {/* TABLE */}
      <div className="w-full px-3 sm:px-6 mt-4">

        <div className="bg-white rounded-lg shadow p-4 w-full">

          {/* Horizontal scroll wrapper */}
          <div className="w-full overflow-x-auto">

            <table className="min-w-[700px] w-full text-sm">

              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white rounded-t-lg">

                <tr>

                  <th className="p-2 text-left rounded-tl-lg">Sr.No.</th>
                  <th className="p-2 text-left">Outsource ID</th>
                  <th className="p-2 text-left">Patient Name</th>
                  <th className="p-2 text-left">Lab Name</th>
                  <th className="p-2 text-left">Test Name</th>
                  <th className="p-2 text-left">Outsource Charge</th>
                  <th className="p-2 text-left rounded-tr-lg">Status</th>

                </tr>

              </thead>


              <tbody>

                {filteredData.map((row, index) => (

                  <tr key={index} className="border-t hover:bg-gray-50">

                    <td className="p-2">{index + 1}</td>

                    <td className="p-2 font-medium">
                      {row.outsource_id}
                    </td>

                    <td className="p-2">
                      {row.patient_name}
                    </td>

                    <td className="p-2">
                      {row.lab_name}
                    </td>

                    <td className="p-2">
                      {row.test_name}
                    </td>

                    <td className="p-2 font-semibold">
                      {row.outsource_charge}.00
                    </td>

                    <td className="p-2">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>



      {/* Pagination */}
      <div className="w-full px-3 sm:px-6">

        <div className="text-center mt-4 text-sm text-gray-600 pb-6">
          « Previous &nbsp;&nbsp; Next » &nbsp;&nbsp; 1 of 1
        </div>

      </div>

     

    
    </>
  );
}
