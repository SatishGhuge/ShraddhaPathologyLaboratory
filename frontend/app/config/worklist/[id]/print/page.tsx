"use client";

import { useParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Download,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Header from "@/src/components/Header";
import { getPatientsByWorklist } from "@/src/api/worklist";
import html2pdf from "html2pdf.js";

const fmtISO = (d: any) => {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDays = (d: any, n: any) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const toGB = (iso: any) => { if (!iso) return "-"; const d = new Date(iso); return d.toLocaleDateString("en-GB"); };
const som = (d: any) => new Date(d.getFullYear(), d.getMonth(), 1);
const eom = (d: any) => new Date(d.getFullYear(), d.getMonth()+1, 0);
const dispRange = (f: any, t: any) => { if(!f) return "Select Date"; const a=toGB(f),b=t?toGB(t):a; return a===b?a:`${a} - ${b}`; };

const PRESETS = [
  { label:"Today",        fn:()=>{ const d=today0(); return [fmtISO(d),fmtISO(d)]; } },
  { label:"Yesterday",    fn:()=>{ const d=addDays(today0(),-1); return [fmtISO(d),fmtISO(d)]; } },
  { label:"Last 7 Days",  fn:()=>[fmtISO(addDays(today0(),-6)),fmtISO(today0())] },
  { label:"Last 30 Days", fn:()=>[fmtISO(addDays(today0(),-29)),fmtISO(today0())] },
  { label:"This Month",   fn:()=>[fmtISO(som(today0())),fmtISO(eom(today0()))] },
  { label:"Last Month",   fn:()=>{ const d=new Date(today0().getFullYear(),today0().getMonth()-1,1); return [fmtISO(d),fmtISO(eom(d))]; } },
  { label:"Custom Range", fn:null },
];
const MOS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Cal({ month, year, onPrev, onNext, onDay, onHover, from, to, hover, picking }: { month: number; year: number; onPrev?: () => void; onNext?: () => void; onDay?: (date: string) => void; onHover?: (date: string | null) => void; from?: string; to?: string; hover?: string | null; picking?: boolean }) {
  const first = new Date(year,month,1).getDay();
  const total = new Date(year,month+1,0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({length:total},(_,i)=>i+1)];
  const cls = (d: any) => {
    if (!d) return "";
    const c = fmtISO(new Date(year,month,d));
    if (c===from||c===to) return "bg-blue-600 text-white font-bold rounded";
    const end = picking?(hover||to):to;
    const lo=from&&end?(from<end?from:end):null, hi=from&&end?(from<end?end:from):null;
    if (lo&&hi&&c>lo&&c<hi) return "bg-blue-100 text-blue-800 rounded";
    return "hover:bg-gray-100 text-gray-700 rounded";
  };
  return (
    <div className="w-48">
      <div className="flex items-center justify-between mb-1 px-1">
        {onPrev?<button type="button" onClick={onPrev} className="p-0.5 hover:bg-gray-100 rounded"><ChevronLeft size={12}/></button>:<span className="w-4"/>}
        <span className="text-xs font-semibold">{MOS[month]} {year}</span>
        {onNext?<button type="button" onClick={onNext} className="p-0.5 hover:bg-gray-100 rounded"><ChevronRight size={12}/></button>:<span className="w-4"/>}
      </div>
      <div className="grid grid-cols-7 text-center gap-y-0.5">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} className="text-xs text-gray-400 py-0.5 font-medium">{d}</div>)}
        {cells.map((d,i)=>(
          <div key={i} onClick={()=>d&&onDay?.(fmtISO(new Date(year,month,d)))}
            onMouseEnter={()=>d&&picking&&onHover?.(fmtISO(new Date(year,month,d)))}
            className={`text-xs py-0.5 cursor-pointer transition-colors text-center ${cls(d)}`}>{d||""}</div>
        ))}
      </div>
    </div>
  );
}

const WorklistPrintPage = () => {
  const { id } = useParams() as { id: string };
  const printRef = useRef<HTMLDivElement>(null);
  const dpRef = useRef(null);

  const [worklistData, setWorklistData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state - default to today's date
  const [fromDate, setFromDate] = useState<string>(fmtISO(today0()));
  const [toDate, setToDate] = useState<string>(fmtISO(today0()));

  // Date picker state
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("Today");
  const [custom, setCustom] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState("");
  const [tFrom, setTFrom] = useState(fmtISO(today0()));
  const [tTo, setTTo] = useState(fmtISO(today0()));
  const now = new Date();
  const [cm, setCm] = useState(now.getMonth()===0?11:now.getMonth()-1);
  const [cy, setCy] = useState(now.getMonth()===0?now.getFullYear()-1:now.getFullYear());
  const rm = cm===11?0:cm+1, ry = cm===11?cy+1:cy;

  useEffect(() => {
    const h = (e: any) =>{
      if(dpRef.current && !((dpRef.current as any).contains?.(e.target))) setOpen(false);
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(() => {
    fetchWorklistData();
  }, [id, fromDate, toDate]);

  const fetchWorklistData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPatientsByWorklist(parseInt(id), fromDate, toDate);

      if (response.success) {
        setWorklistData(response.data);
      } else {
        setError("Failed to fetch worklist data");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const element = printRef.current;
    const opt = {
      margin: 10,
      filename: `worklist-${worklistData?.worklist?.name || 'report'}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
    };

    try {
      (html2pdf() as any)
        .set(opt)
        .from(element)
        .output('blob')
        .then((blob: Blob) => {
          // Create a blob URL
          const blobUrl = URL.createObjectURL(blob);
          // Open in new window for print preview
          const printWindow = window.open(blobUrl);
          if (printWindow) {
            // Wait for the PDF to load, then trigger print
            printWindow?.addEventListener('load', () => {
              setTimeout(() => {
                printWindow?.print();
              }, 500);
            });
          }
        });
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;

    const element = printRef.current;
    const opt = {
      margin: 10,
      filename: `worklist-${worklistData?.worklist?.name || 'report'}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
    };

    (html2pdf() as any).set(opt).from(element).save();
  };

  const openPicker=()=>{ setTFrom(fromDate); setTTo(toDate); setCustom(false); setPicking(false); setHover(""); setOpen(true); };
  const pickPreset = (p: any) =>{ if(!p.fn){setCustom(true);setPreset("Custom Range");setTFrom("");setTTo("");setPicking(false);return;} const result=p.fn(); setTFrom(result[0]);setTTo(result[1]);setPreset(p.label);setCustom(false); };
  const clickDay = (day: any) =>{ if(!picking){setTFrom(day);setTTo("");setPicking(true);setHover("");}else{if(day<tFrom){setTTo(tFrom);setTFrom(day);}else setTTo(day);setPicking(false);} };
  const apply=()=>{ setFromDate(tFrom);setToDate(tTo);setOpen(false);setPicking(false); };
  const cancel=()=>{ setOpen(false);setCustom(false);setPicking(false);setTFrom(fromDate);setTTo(toDate); };
  const prevM=()=>{ if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nextM=()=>{ if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading worklist data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex gap-4">
            <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
            <div>
              <p className="font-semibold text-red-800 mb-2">Error</p>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => window.history.back()}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <ArrowLeft size={18} />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!worklistData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const { worklist, patients } = worklistData;
  const columnHeaders = worklist.parameters.map((p: any) => p.columnName);

  return (
    <div className="min-h-screen bg-white">
      {/* Controls only - No Header, No Sidebar */}
      <div className="max-w-full px-6 py-3">
        <div className="bg-white p-2 rounded shadow-md mb-3 flex gap-2 items-center flex-wrap">
          {/* DATE PICKER */}
          <div className="relative flex-shrink-0" ref={dpRef}>
            <button type="button" onClick={openPicker}
              className="border border-gray-300 p-1.5 rounded text-sm text-left flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 min-w-48">
              <span className={fromDate?"text-gray-800 text-xs":"text-gray-400 text-xs"}>{dispRange(fromDate,toDate)}</span>
              <Calendar size={14} className="text-gray-400 ml-1 flex-shrink-0"/>
            </button>

            {open&&(
              <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl flex" style={{minWidth:custom?"500px":"280px"}}>
                <div className="w-32 border-r border-gray-100 py-1 flex-shrink-0">
                  {PRESETS.map(p=>(
                    <div key={p.label} onClick={()=>pickPreset(p)}
                      className={`px-3 py-2 text-xs cursor-pointer transition-colors ${preset===p.label?"bg-blue-600 text-white font-semibold":"text-gray-700 hover:bg-blue-50"}`}>
                      {p.label}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col flex-1">
                  {custom?(
                    <div className="p-3">
                      <div className="flex gap-6">
                        <Cal month={cm} year={cy} onPrev={prevM} onNext={undefined} onDay={clickDay} onHover={(date)=>setHover(date||"")} from={tFrom} to={tTo} hover={hover} picking={picking}/>
                        <Cal month={rm} year={ry} onPrev={undefined} onNext={nextM} onDay={clickDay} onHover={(date)=>setHover(date||"")} from={tFrom} to={tTo} hover={hover} picking={picking}/>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{tFrom?`${toGB(tFrom)} - ${tTo?toGB(tTo):"..."}`:"Click start date"}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={cancel} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                          <button type="button" onClick={apply} disabled={!tFrom} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Apply</button>
                        </div>
                      </div>
                    </div>
                  ):preset?(
                    <div className="p-3 flex flex-col justify-between min-h-[100px]">
                      <div><p className="text-xs text-gray-400 mb-1">Selected range</p><p className="text-xs font-semibold text-gray-800">{dispRange(tFrom,tTo)}</p></div>
                      <div className="flex gap-1 mt-2">
                        <button type="button" onClick={cancel} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
                        <button type="button" onClick={apply} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
                      </div>
                    </div>
                  ):(
                    <div className="p-3 text-xs text-gray-400 flex items-center justify-center h-full">Select a preset or Custom Range</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex-shrink-0"
          >
            <Download size={14} />
            <span>PDF</span>
          </button>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>
      </div>

      {/* Printable Content - Full Width */}
      <div ref={printRef} className="max-w-full bg-white p-4 print:p-2">
        {/* Header */}
        <div className="mb-2 print:mb-1 border-b border-gray-300 pb-1 print:pb-0.5">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-600">
              {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}
            </p>
            <h1 className="text-base print:text-xs font-bold text-gray-800 flex-1 text-center">
              {worklist.name}
            </h1>
            <p className="text-xs text-gray-600 text-right">
              Generated on {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {patients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No patients found in received stage with this test</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm print:text-xs">
              <thead>
                <tr className="bg-orange-100 print:bg-gray-200">
                  <th className="border border-gray-300 px-3 py-2 print:py-1 text-left font-semibold w-12">
                    S.No
                  </th>
                  <th className="border border-gray-300 px-3 py-2 print:py-1 text-left font-semibold" style={{ maxWidth: "180px" }}>
                    Patient Name
                  </th>
                  <th className="border border-gray-300 px-3 py-2 print:py-1 text-left font-semibold w-16">
                    Age
                  </th>
                  <th className="border border-gray-300 px-3 py-2 print:py-1 text-left font-semibold w-20">
                    Gender
                  </th>
                  {columnHeaders.map((col: string, idx: number) => (
                    <th
                      key={idx}
                      className="border border-gray-300 px-3 py-2 print:py-1 text-left font-semibold"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((patient: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 print:hover:bg-transparent">
                    <td className="border border-gray-300 px-3 py-2 print:py-1 w-12">
                      {idx + 1}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 print:py-1 font-medium truncate" style={{ maxWidth: "180px" }}>
                      {patient.patientName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 print:py-1 w-16">
                      {patient.age}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 print:py-1 w-20">
                      {patient.gender}
                    </td>
                    {columnHeaders.map((col: string, colIdx: number) => (
                      <td
                        key={colIdx}
                        className="border border-gray-300 px-3 py-2 print:py-1"
                      >
                        {patient[col] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 print:mt-3 text-sm text-gray-600">
          <p className="print:text-xs">
            Total Patients: <span className="font-semibold">{patients.length}</span>
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .no-print * {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          * {
            margin: 0;
            padding: 0;
          }
          html, body, div {
            background: white !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #999;
          }
          thead {
            display: table-header-group;
          }
          tbody {
            display: table-row-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #999;
            padding: 6px 8px;
            font-size: 10pt;
            text-align: left;
          }
          th {
            background-color: #fbbf24 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-weight: bold;
          }
          td {
            background-color: white !important;
          }
          h1 {
            font-size: 12pt;
            margin: 0;
            padding: 0;
          }
          p {
            font-size: 9pt;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default WorklistPrintPage;
