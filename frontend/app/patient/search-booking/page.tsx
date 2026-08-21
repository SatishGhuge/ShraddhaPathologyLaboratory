"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useRef, useEffect } from "react";
import BarcodeModal, { generateBarcodeLabels, getSampleTypeId, getSampleTypeName, getTestName } from "@/app/components/BarcodeModal";
import BillReceipt from "@/app/components/BillReceipt";
import BookingDetailsModal from "@/app/components/BookingDetailsModal";
import API_BASE_URL from "@/src/api/config";
import { generateCompactBarcodePrintHtml } from "@/app/utils/barcodePrintUtils";
import JsBarcode from "jsbarcode";

import { 
  Search, RotateCcw, Eye, Pencil, Trash2, Printer,
  Download, ChevronDown,
  RefreshCcw, Plus, X, RefreshCw,
  ChevronLeft, ChevronRight, CalendarDays, AlertCircle, Barcode, AlertTriangle
} from "lucide-react";
import { getAllPatients, updatePayment, updatePatient, updatePatientTestDetails, getVisitBill } from "@/src/api/patient";
import { getDoctors, getTests, getPackages, getSpecimenTypes, getOrganizations } from "@/src/api/master";
import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
const LetterHead = "/LetterHead.jpeg";
import { generateBillPDF, printBill } from "@/src/utils/billPdfGenerator.js";

/* ─────────────────── Print Styles ─────────────────── */
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      [data-no-print],
      .no-print {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  `;
  if (document.head) {
    document.head.appendChild(style);
  }
}

/* ─────────────────── helpers ─────────────────── */
const getSampleColor = (sample: any, specimenTypes: any) => {
  if (!Array.isArray(specimenTypes)) return '#cccccc';
  const found = specimenTypes.find((s: any) => s.Sample_Type === sample);
  return found?.Sample_Color || '#cccccc';
};

const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function numberToWords(n: any) {
  n = Math.round(n);
  if (n === 0) return "Zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " " + ones[n%10] : "");
  if (n < 1000) return ones[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + numberToWords(n%100) : "");
  if (n < 100000) return numberToWords(Math.floor(n/1000)) + " Thousand" + (n%1000 ? " " + numberToWords(n%1000) : "");
  if (n < 10000000) return numberToWords(Math.floor(n/100000)) + " Lakh" + (n%100000 ? " " + numberToWords(n%100000) : "");
  return numberToWords(Math.floor(n/10000000)) + " Crore" + (n%10000000 ? " " + numberToWords(n%10000000) : "");
}
const fmt = (d: any) => d ? `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}` : "";
const sameDay = (a: any, b: any) => a && b && a.toDateString()===b.toDateString();
const startOfDay = (d: any) => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const DAYS=["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ─────────────────── DateRangePicker ─────────────────── */
function DateRangePicker({ value, onChange }: { value?: { start: Date; end: Date } | null; onChange?: (range: { start: Date; end: Date } | null) => void }) {
  const [open, setOpen]       = useState(false);
  const [hoverDate, setHover] = useState<Date | null>(null);
  const [leftMonth, setLeft]  = useState(() => { const d=new Date(); d.setDate(1); return d; });
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd,   setTempEnd]   = useState<Date | null>(null);
  const [selecting, setSelecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth()+1, 1);

  useEffect(() => {
    const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const today      = startOfDay(new Date());
  const yesterday  = new Date(today); yesterday.setDate(today.getDate()-1);

  const presets = [
    { label:"Today",        fn:() => apply(today, today) },
    { label:"Yesterday",    fn:() => apply(yesterday, yesterday) },
    { label:"Last 7 Days",  fn:() => { const s=new Date(today); s.setDate(today.getDate()-6); apply(s,today); } },
    { label:"Last 30 Days", fn:() => { const s=new Date(today); s.setDate(today.getDate()-29); apply(s,today); } },
    { label:"This Month",   fn:() => { const s=new Date(today.getFullYear(),today.getMonth(),1); const e=new Date(today.getFullYear(),today.getMonth()+1,0); apply(s,e); } },
    { label:"Last Month",   fn:() => { const s=new Date(today.getFullYear(),today.getMonth()-1,1); const e=new Date(today.getFullYear(),today.getMonth(),0); apply(s,e); } },
    { label:"Custom Range", fn:() => { setTempStart(null); setTempEnd(null); setSelecting(false); } },
  ];

  const [activePreset, setActivePreset] = useState("Last 7 Days");

  function apply(s: Date, e: Date) {
    setTempStart(s); setTempEnd(e);
    onChange?.({ start:s, end:e });
    setOpen(false);
  }

  function handleDayClick(d: Date) {
    if (!selecting) {
      setTempStart(d); setTempEnd(null); setSelecting(true);
    } else {
      if (d < tempStart!) { setTempStart(d); setTempEnd(tempStart); }
      else               { setTempEnd(d); }
      setSelecting(false);
    }
  }

  function handleApply() {
    if (tempStart && tempEnd) {
      onChange?.({ start:tempStart, end:tempEnd });
      setOpen(false);
    }
  }

  function buildCalendar(monthDate: Date): Array<{ date: Date; cur: boolean }> {
    const year = monthDate.getFullYear(), month = monthDate.getMonth();
    const first = new Date(year, month, 1).getDay();
    const days  = new Date(year, month+1, 0).getDate();
    const cells: Array<{ date: Date; cur: boolean }> = [];
    for (let i=0; i<first; i++) {
      const prev = new Date(year, month, -first+i+1);
      cells.push({ date:prev, cur:false });
    }
    for (let d=1; d<=days; d++) cells.push({ date:new Date(year,month,d), cur:true });
    while (cells.length%7!==0) {
      const next = new Date(year, month+1, cells.length-first-days+1);
      cells.push({ date:next, cur:false });
    }
    return cells;
  }

  function dayClass(date: Date): string {
    const s = tempStart, e = tempEnd || hoverDate;
    const isStart  = s && sameDay(date,s);
    const isEnd    = e && sameDay(date,e);
    const inRange  = s && e && date>s && date<e;
    const isToday  = sameDay(date, today);
    let cls = "w-8 h-8 flex items-center justify-center text-xs cursor-pointer select-none transition-all ";
    if (isStart || isEnd) cls += "bg-orange-500 text-white rounded-full font-bold ";
    else if (inRange)     cls += "bg-orange-100 text-orange-800 ";
    else if (isToday)     cls += "border border-orange-400 rounded-full text-orange-700 font-semibold ";
    else                  cls += "hover:bg-orange-50 rounded-full ";
    return cls;
  }

  const displayLabel = value?.start && value?.end
    ? `${fmt(value.start)} - ${fmt(value.end)}`
    : "Select date range";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o=>!o)}
        className="flex items-center gap-2 border rounded px-3 py-1 text-sm bg-white hover:border-orange-400 transition-colors min-w-[200px]"
      >
        <CalendarDays size={15} className="text-orange-600 shrink-0"/>
        <span className={value?.start ? "text-gray-800" : "text-gray-400"}>{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 flex"
          style={{ minWidth: 660 }}>
          <div className="w-36 border-r bg-gray-50 rounded-l-lg py-2 flex flex-col">
            {presets.map(p => (
              <button key={p.label}
                onClick={() => { setActivePreset(p.label); p.fn(); }}
                className={`text-left px-4 py-2 text-sm transition-colors
                  ${activePreset===p.label ? "bg-orange-500 text-white font-semibold" : "text-gray-700 hover:bg-orange-50"}`}
              >{p.label}</button>
            ))}
          </div>

          <div className="flex-1 p-4">
            <div className="flex gap-6">
              {[leftMonth, rightMonth].map((monthDate, mi) => {
                const cells = buildCalendar(monthDate);
                return (
                  <div key={mi} className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      {mi===0
                        ? <button onClick={() => setLeft(new Date(leftMonth.getFullYear(), leftMonth.getMonth()-1,1))}
                            className="p-1 hover:bg-gray-100 rounded"><ChevronLeft size={16}/></button>
                        : <span/>
                      }
                      <span className="text-sm font-semibold text-gray-700">
                        {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
                      </span>
                      {mi===1
                        ? <button onClick={() => setLeft(new Date(leftMonth.getFullYear(), leftMonth.getMonth()+1,1))}
                            className="p-1 hover:bg-gray-100 rounded"><ChevronRight size={16}/></button>
                        : <span/>
                      }
                    </div>

                    <div className="grid grid-cols-7 mb-1">
                      {DAYS.map(d => (
                        <div key={d} className="w-8 h-6 flex items-center justify-center text-xs font-semibold text-gray-500">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {cells.map((c,i) => (
                        <div key={i}
                          className={`${dayClass(c.date)} ${!c.cur?"opacity-30":""}`}
                          onClick={() => c.cur && handleDayClick(startOfDay(c.date))}
                          onMouseEnter={() => selecting && c.cur && setHover(startOfDay(c.date))}
                          onMouseLeave={() => setHover(null)}
                        >
                          {c.date.getDate()}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <span className="text-xs text-gray-500">
                {tempStart && tempEnd ? `${fmt(tempStart)} - ${fmt(tempEnd)}` : tempStart ? `${fmt(tempStart)} - ...` : ""}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setTempStart(null); setTempEnd(null); setSelecting(false); setOpen(false); onChange?.(null); }}
                  className="px-4 py-1 border rounded text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleApply} disabled={!tempStart||!tempEnd}
                  className="px-4 py-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded text-sm font-semibold">Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── sample data ─────────────────── */
// Tests and packages are fetched from API — see state: allTests, packagesList

const INIT_FORM: FormDataType = {
  visitDate:"", location:"SHRADDHA",
  reportMode:"By hand", mobile:"", title:"MR", firstName:"", lastName:"",
  age:"", ageUnit:"Year", gender:"Male", referralDoctor:"",
  referralDoctorChecked:false, patient_history:"", email:"", address:"", organizationCode:""
};

const INIT_BOOKING: Booking[] = [];

const style = {
  input:    "border px-3 py-1 rounded text-sm",
  header:   "bg-orange-500 text-white",
  btn:      "text-white px-4 py-1 rounded flex items-center gap-1 text-sm",
  formGrid: "grid grid-cols-12 gap-4 items-center"
};

const numInput = "w-full border rounded px-2 py-1 text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/* ─────────────────── Type Definitions ─────────────────── */
interface PatientData {
  visitDate: string;
  location: string;
  reportMode: string;
  mobile: string;
  title: string;
  firstName: string;
  lastName: string;
  age: string;
  ageUnit: string;
  gender: string;
  referralDoctor: string;
  referralDoctorChecked: boolean;
  patient_history: string;
  email: string;
  address: string;
  organizationCode: string;
  organizationId?: string;
  remark?: string;
}

interface Test {
  id?: string;
  name: string;
  sample?: string;
  testId?: string;
  sampleTypeId?: string;
  departmentId?: string;
  organizationId?: string;
  b2cCharge?: number;
  b2bCharge?: number;
  charge?: number;
  isExisting?: boolean;
  visitId?: string;
  status?: string;
  barcode_status?: string;
  reportMode?: string;
  referralDoctor?: string;
  paymentMode?: string;
  businessType?: string;
  fromPackage?: string;
  isPackage?: boolean;
  packageTests?: Test[];
  testCode?: string;
  categories?: any[];
  charges?: any[];
  group?: string;
  department?: any;
  isEmergency?: boolean;  // NEW: Emergency flag
}

interface Booking {
  bookingId: string;
  name: string;
  patientId: string;
  date: string;
  tests: Test[];
  paymentStatus: string;
  rawDate: any;
  balanceAmount: number;
  paidAmount: number;
  totalAmount: number;
  visitId: string;
  discountAmount: number;
  discountPercent: number;
  discountRemark: string;
  patientData: PatientData;
}

interface FormDataType {
  visitDate: string;
  location: string;
  reportMode: string;
  mobile: string;
  title: string;
  firstName: string;
  lastName: string;
  age: string;
  ageUnit: string;
  gender: string;
  referralDoctor: string;
  referralDoctorChecked: boolean;
  patient_history: string;
  email: string;
  address: string;
  organizationCode: string;
  dob?: string;
}

interface BillingData {
  advance: string;
  discount: string;
  discountPercent: string;
  refund: string;
  balAmt: string;
  payment: string;
  remarks: string;
  paymentMode: string;
}

interface ReferralData {
  type: string;
  name: string;
  degree: string;
  compliment: string;
  mobile: string;
  email: string;
  address: string;
  allowSendReport: boolean;
}

interface BarcodePatientInfo {
  patientName: string;
  visitId: string;
  age: string;
  gender: string;
  ageGender: string;
  organizationCode: string;
}

// Generate Code128 barcode bars as SVG path data
const buildCode128Svg = (text: any) => {
  // Code128B encoding table (char code 32-127)
  const CODE128B = [
    '11011001100','11001101100','11001100110','10010011000','10010001100',
    '10001001100','10011001000','10011000100','10001100100','11001001000',
    '11001000100','11000100100','10110011100','10011011100','10011001110',
    '10111001100','10011101100','10011100110','11001110010','11001011100',
    '11001001110','11011100100','11001110100','11101101110','11101001100',
    '11100101100','11100100110','11101100100','11100110100','11100110010',
    '11011011000','11011000110','11000110110','10100011000','10001011000',
    '10001000110','10110001000','10001101000','10001100010','11010001000',
    '11000101000','11000100010','10110111000','10110001110','10001101110',
    '10111011000','10111000110','10001110110','11101110110','11010001110',
    '11000101110','11011101000','11011100010','11011101110','11101011000',
    '11101000110','11100010110','11101101000','11101100010','11100011010',
    '11101111010','11001000010','11110001010','10100110000','10100001100',
    '10010110000','10010000110','10000101100','10000100110','10110010000',
    '10110000100','10011010000','10011000010','10000110100','10000110010',
    '11000010010','11001010000','11110111010','11000010100','10001111010',
    '10100111100','10010111100','10010011110','10111100100','10011110100',
    '10011110010','11110100100','11110010100','11110010010','11011011110',
    '11011110110','11110110110','10101111000','10100011110','10001011110',
    '10111101000','10111100010','11110101000','11110100010','10111011110',
    '10111101110','11101011110','11110101110','11010000100','11010010000',
    '11010011100','1100011101011'
  ];
  const START_B = 104;
  const STOP = 106;

  const codes = [START_B];
  let checksum = START_B;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 32;
    codes.push(c);
    checksum += c * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(STOP);

  const barWidth = 2;
  let x = 0;
  let bars = '';
  const height = 60;

  codes.forEach(code => {
    const pattern = CODE128B[code];
    if (!pattern) return;
    for (let i = 0; i < pattern.length; i++) {
      const w = parseInt(pattern[i]) * barWidth;
      if (i % 2 === 0) {
        bars += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="black"/>`;
      }
      x += w;
    }
  });

  return { svg: bars, width: x, height };
};

/* ─────────────────── main page ─────────────────── */
export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookings,        setBookings]        = useState<Booking[]>(INIT_BOOKING);
  const [allBookings,     setAllBookings]     = useState<Booking[]>([]);
  const [deletedIds,      setDeletedIds]      = useState<Set<string>>(new Set());
  const [doctorsList,     setDoctorsList]     = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Barcode states
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeLabels, setBarcodeLabels] = useState<any[]>([]);
  const [barcodePatientInfo, setBarcodePatientInfo] = useState<BarcodePatientInfo | null>(null);
  const [selectedBarcodeIndices, setSelectedBarcodeIndices] = useState<Set<number>>(new Set());
  const [barcodeSelectedTests, setBarcodeSelectedTests] = useState<Set<number>>(new Set());
  const [barcodeLockedPatientUid, setBarcodeLockedPatientUid] = useState<string | null>(null);
  const [barcodeLockedVisitId, setBarcodeLockedVisitId] = useState<string | null>(null);
  const [barcodesPrinting, setBarcodesPrinting] = useState(false);
  
  const [editingPatient,  setEditingPatient]  = useState<Booking | null>(null);
  const [formData,        setFormData]        = useState<FormDataType>(INIT_FORM);
  const [testView,        setTestView]        = useState("all");
  const [searchTest,      setSearchTest]      = useState("");
  const [allTests,        setAllTests]        = useState<Test[]>([]);
  const [packagesList,    setPackagesList]    = useState<any[]>([]);
  const [specimenTypes,   setSpecimenTypes]   = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packageSearch,   setPackageSearch]   = useState("");
  const [showPkgDropdown, setShowPkgDropdown] = useState(false);
  const [businessType,    setBusinessType]    = useState("B2C");
  const [editingCharge,   setEditingCharge]   = useState<any>(null);
  const [dateRange,       setDateRange]       = useState<{ start: Date; end: Date } | null>(null);
  const [patientNameSearch, setPatientNameSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [showOutstanding, setShowOutstanding] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);
  const [searchBarDoctorSearch, setSearchBarDoctorSearch] = useState("");
  const [showSearchBarDoctorDropdown, setShowSearchBarDoctorDropdown] = useState(false);
  const searchBarDoctorDropdownRef = useRef<HTMLDivElement>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [searchBarOrganizationSearch, setSearchBarOrganizationSearch] = useState("");
  const [showSearchBarOrganizationDropdown, setShowSearchBarOrganizationDropdown] = useState(false);
  const searchBarOrganizationDropdownRef = useRef<HTMLDivElement>(null);
  const [appliedOrganization, setAppliedOrganization] = useState("");
  
  // Applied filters (only updated when Search button is clicked)
  const [appliedPatientName, setAppliedPatientName] = useState("");
  const [appliedMobile, setAppliedMobile] = useState("");
  const [appliedDoctor, setAppliedDoctor] = useState("");
  const [appliedOutstanding, setAppliedOutstanding] = useState(false);

  /* ===== ADD REFERRAL MODAL STATES ===== */
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [referralData, setReferralData] = useState<ReferralData>({
    type: "Doctor",
    name: "",
    degree: "",
    compliment: "",
    mobile: "",
    email: "",
    address: "",
    allowSendReport: false
  });
  const [referralErrors, setReferralErrors] = useState<Record<string, string>>({});

  const [billing, setBilling] = useState<BillingData>({
    advance:"", discount:"", discountPercent:"",
    refund:"", balAmt:"", payment:"", remarks:"", paymentMode:"Cash"
  });

  const [showRefundModal,  setShowRefundModal]  = useState(false);
  const [refundAmount,     setRefundAmount]     = useState("");
  const [refundRemark,     setRefundRemark]     = useState("");
  const [showBillModal,    setShowBillModal]    = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<any>(null);
  
  /* ===== PAGINATION STATES ===== */
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [successPopup,     setSuccessPopup]     = useState("");

  useEffect(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Last 7 days (today - 6 = 7 days total)
    // Default to show last 7 days of patients (to ensure newly registered patients appear)
    setDateRange({ start: sevenDaysAgo, end: today });
  }, []);

  // Helper function to transform patients data to bookings format
  const transformPatientsToBookings = (patients: any[], orgs: any[]): Booking[] => {
    const mapped: Booking[] = [];
    
    patients.forEach((p) => {
      const patientTests = p.tests || [];

      // Group tests by visitId
      const visitMap: any = {};
      patientTests.forEach((t: any) => {
        const vid = t.visitId || "";
        if (!visitMap[vid]) {
          visitMap[vid] = {
            visitId:         vid,
            visitDate:       t.visitDate,
            location:        t.organization?.location || "",
            referralDoctor:  t.referralDoctor || "",
            patient_history: t.patient_history || "",
            organizationId:  t.organizationId || "",
            totalAmount:     0,
            paidAmount:      t.paidAmount    || 0,
            balanceAmount:   t.balanceAmount || 0,
            paymentMode:     t.paymentMode   || "Cash",
            discountAmount:  t.discountAmount  || 0,
            discountPercent: t.discountPercent || 0,
            discountRemark:  t.discountRemark || "",
            tests: []
          };
        }
        visitMap[vid].totalAmount += t.totalAmount || 0;
        visitMap[vid].paidAmount      = Math.max(visitMap[vid].paidAmount,      t.paidAmount      || 0);
        visitMap[vid].balanceAmount   = Math.max(visitMap[vid].balanceAmount,   t.balanceAmount   || 0);
        visitMap[vid].discountAmount  = Math.max(visitMap[vid].discountAmount,  t.discountAmount  || 0);
        visitMap[vid].discountPercent = Math.max(visitMap[vid].discountPercent, t.discountPercent || 0);
        if (t.discountRemark) visitMap[vid].discountRemark = t.discountRemark;
        
        visitMap[vid].tests.push({
          id: t.id,  // ✅ IMPORTANT: Include the PatientTest ID
          name: t.test?.name || "",
          sample: t.test?.sample_type?.Sample_Type || t.sample || "N/A",  // Use sample_type relationship if available, fallback to PatientTest.sample
          testId: t.testId,
          sampleTypeId: t.test?.sampleTypeId,  // ✅ CRITICAL: Include sampleTypeId from test relationship
          departmentId: t.departmentId,
          organizationId: t.organizationId,
          b2cCharge: t.charge || 0,
          b2bCharge: t.charge || 0,
          isExisting: true,
          visitId: t.visitId,
          status: t.status || "Registered",
          barcode_status: t.barcode_status || "Unprinted",
          reportMode: t.reportMode || "",
          referralDoctor: t.referralDoctor || "",
          paymentMode: t.paymentMode || "Cash",
          businessType: t.businessType || "B2C",
          isEmergency: t.isEmergency || false,  // NEW: Include emergency flag
        });
      });

      const visits = Object.values(visitMap);

      visits.forEach((visit: any) => {
        const visitDate = visit.visitDate || p.createdAt;
        const paymentStatus = visit.balanceAmount > 0 ? "Due" : "Paid";
        
        console.log('🔍 VISIT DATA:', {
          visitId: visit.visitId,
          balanceAmount: visit.balanceAmount,
          paidAmount: visit.paidAmount,
          discountAmount: visit.discountAmount,
          grossAmount: visit.totalAmount
        });
        
        mapped.push({
          bookingId: `${p.patientId}-${visit.visitId}`,
          name: `${p.title || ""} ${p.firstName || ""} ${p.lastName || ""}`.trim().toUpperCase(),
          patientId: p.patientId,
          date: visitDate
            ? new Date(visitDate).toLocaleDateString("en-GB")
            : new Date(p.createdAt).toLocaleDateString("en-GB"),
          tests: visit.tests,
          paymentStatus,
          rawDate: visitDate || p.createdAt,
          balanceAmount: visit.balanceAmount,
          paidAmount:    visit.paidAmount,
          totalAmount:   visit.totalAmount,
          visitId:       visit.visitId,
          discountAmount:  visit.discountAmount,
          discountPercent: visit.discountPercent,
          discountRemark:  visit.discountRemark,
          patientData: {
            ...INIT_FORM,
            title: p.title || "MR",
            firstName: p.firstName || "",
            lastName: p.lastName || "",
            mobile: p.mobile || "",
            email: p.email || "",
            age: String(p.age || ""),
            gender: p.gender || "Male",
            address: p.address || "",
            location: visit.location || "SHRADDHA",
            patient_history: visit.patient_history || "",
            remark: visit.remarks,
            referralDoctor: visit.referralDoctor,
            referralDoctorChecked: !!visit.referralDoctor,
            visitDate: visitDate || "",
            organizationId: visit.organizationId || "",
            organizationCode: "",
          },
        });
      });
    });
    
    mapped.sort((a, b) => {
      const dateA = new Date(a.rawDate);
      const dateB = new Date(b.rawDate);
      return dateB.getTime() - dateA.getTime(); // Descending order (most recent first)
    });
    
    const updatedBookings = mapped.map(booking => {
      if (booking.patientData?.organizationId && orgs.length > 0) {
        const org = orgs.find((o: any) => o.id === booking.patientData.organizationId);
        if (org && org.code) {
          booking.patientData.organizationCode = org.code;
        }
      }
      return booking;
    });
    
    return updatedBookings;
  };

  // Fetch real patients and doctors from API
  useEffect(() => {
    Promise.all([getAllPatients(1, 1000), getDoctors(), getOrganizations()])
      .then(([patientsRes, doctorsRes, orgsRes]: any) => {
        const patients = Array.isArray(patientsRes) ? patientsRes : (patientsRes?.data ? patientsRes.data : []);
        const doctors = Array.isArray(doctorsRes) ? doctorsRes : [];
        const orgs = Array.isArray(orgsRes) ? orgsRes : (orgsRes?.data ? orgsRes.data : []);
        
        setOrganizations(orgs);
        
        const updatedBookings = transformPatientsToBookings(patients, orgs);
        setAllBookings(updatedBookings);
        setBookings(updatedBookings.filter(b => !deletedIds.has(b.bookingId)));
        setDoctorsList(doctors.map((d: any) => ({
          id: d.id,
          name: `Dr. ${d.name}`,
          degree: d.degree || "",
          specialization: d.type || "",
        })));
      })
      .catch(console.error)
      .finally(() => setLoadingBookings(false));
  }, []);

  // Auto-select patient when navigated from result.jsx with a searchQuery (patient UID)
  useEffect(() => {
    const incomingUid = searchParams?.get('searchQuery');
    if (!incomingUid || allBookings.length === 0) return;

    // Find the matching booking
    const match = allBookings.find(b => b.patientId === incomingUid);
    if (match) {
      setPatientNameSearch(match.name);
      setSelectedBooking(match);
      // Widen date range to show this patient regardless of date
      setDateRange(null);
      setBookings(allBookings.filter(b => !deletedIds.has(b.bookingId)));
    }
  }, [allBookings, searchParams?.get('searchQuery')]);

  // Fetch tests and packages for the middle panel
  useEffect(() => {
    Promise.all([getTests(), getPackages(), getSpecimenTypes()])
      .then(([testsRes, packagesRes, specimens]) => {
        // Handle getTests response which returns { data, pagination }
        const testsData = testsRes?.data ? testsRes.data : (Array.isArray(testsRes) ? testsRes : []);
        const tests = Array.isArray(testsData) ? testsData : [];
        const packages = Array.isArray(packagesRes) ? packagesRes : [];
        setSpecimenTypes(specimens);
        
        // Map tests with all database fields for proper editing
        const mappedTests = tests.map(t => ({
          id: t.id,
          name: t.name,
          testCode: t.testCode || "",
          departmentId: t.departmentId || null,
          department: t.department || null,
          sampleTypeId: t.sampleTypeId || null,
          sample: t.sampleTypeId ? "Sample" : "N/A", // Show based on whether sampleTypeId exists
          group: t.group || "",
          b2cCharge: t.charges?.[0]?.b2cCharge ?? 0,
          b2bCharge: t.charges?.[0]?.b2bCharge ?? 0,
          categories: t.categories || [],
          charges: t.charges || [],
        }));
        setAllTests(mappedTests);
        
        setPackagesList(packages.map(pkg => ({
          id: pkg.id,
          name: pkg.name,
          b2cCharge: pkg.b2cCharge || 0,
          b2bCharge: pkg.b2bCharge || 0,
          // keep full test objects for display
          tests: (pkg.tests || []).map(pt => {
            const full = mappedTests.find(t => t.id === pt.id) || { sample: "N/A", b2cCharge: 0, b2bCharge: 0, testCode: "", departmentId: null, sampleTypeId: null };
            return {
              id: pt.id,
              name: pt.name,
              testCode: full.testCode || "",
              departmentId: full.departmentId || null,
              sampleTypeId: full.sampleTypeId || null,
              sample: full.sample || "N/A",
              b2cCharge: full.b2cCharge ?? 0,
              b2bCharge: full.b2bCharge ?? 0,
            };
          }),
        })));
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(e.target)) {
        setShowDoctorDropdown(false);
      }
      if (searchBarDoctorDropdownRef.current && !searchBarDoctorDropdownRef.current.contains(e.target)) {
        setShowSearchBarDoctorDropdown(false);
      }
      if (searchBarOrganizationDropdownRef.current && !searchBarOrganizationDropdownRef.current.contains(e.target)) {
        setShowSearchBarOrganizationDropdown(false);
      }
      // Close print/download dropdowns when clicking outside
      if (showPrintDropdown || showDownloadDropdown) {
        const printBtn = document.querySelector('.print-dropdown-container');
        const downloadBtn = document.querySelector('.download-dropdown-container');
        if (printBtn && !printBtn.contains(e.target)) {
          setShowPrintDropdown(false);
        }
        if (downloadBtn && !downloadBtn.contains(e.target)) {
          setShowDownloadDropdown(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPrintDropdown, showDownloadDropdown]);

  // When a booking is selected, pre-fill billing fields from stored amounts
  useEffect(() => {
    if (selectedBooking) {
      // Fetch fresh VisitBill data from backend to get the latest balance
      const refreshBookingBalance = async () => {
        try {
          console.log('🔍 [Search Booking] Attempting to fetch fresh VisitBill for visitId:', selectedBooking.visitId);
          const response = await getVisitBill(selectedBooking.visitId);
          
          console.log('📥 [Search Booking] API Response:', response);
          
          if (response.success && response.data) {
            // Update the selected booking with fresh data
            const freshBalance = response.data.balanceAmount || 0;
            const freshPaid = response.data.totalPaid || 0;
            
            console.log('✅ [Search Booking] Fresh VisitBill fetched:', {
              visitId: selectedBooking.visitId,
              balanceAmount: freshBalance,
              totalPaid: freshPaid,
              grossAmount: response.data.grossAmount,
              status: response.data.status
            });
            
            // Update the selectedBooking in the bookings array and state
            const updatedBookings = bookings.map(b => 
              b.visitId === selectedBooking.visitId 
                ? {
                    ...b,
                    balanceAmount: freshBalance,
                    paidAmount: freshPaid,
                    paymentStatus: freshBalance <= 0.01 ? "Paid" : "Due"
                  }
                : b
            );
            
            setBookings(updatedBookings);
            
            // Update selectedBooking state - this will trigger the setBilling below
            const updatedSelected = updatedBookings.find(b => b.visitId === selectedBooking.visitId);
            if (updatedSelected) {
              console.log('🔄 [Search Booking] Updating selectedBooking with fresh data');
              setSelectedBooking(updatedSelected);
            }
          } else {
            console.warn('⚠️ [Search Booking] API response was not successful:', response);
          }
        } catch (error) {
          console.error('❌ [Search Booking] Failed to refresh booking balance:', error);
          // Continue anyway - fallback to existing data
        }
      };
      
      refreshBookingBalance();
    } else {
      // Reset billing when no booking is selected
      setBilling({
        advance: "", discount: "", discountPercent: "",
        refund: "", balAmt: "", payment: "", remarks: "", paymentMode: "Cash"
      });
    }
  }, [selectedBooking?.bookingId]); // Changed from patientId to bookingId

  // Separate useEffect to update billing form with current selectedBooking data (fresh OR original)
  useEffect(() => {
    if (selectedBooking) {
      console.log('📋 [Search Booking] Updating billing form with selectedBooking:', {
        balanceAmount: selectedBooking.balanceAmount,
        paidAmount: selectedBooking.paidAmount,
        paymentStatus: selectedBooking.paymentStatus
      });
      
      setBilling(prev => ({
        ...prev,
        advance:         String(Math.round(selectedBooking.paidAmount      || 0)),
        balAmt:          String(Math.round(selectedBooking.balanceAmount   || 0)),
        discount:        String(Math.round(selectedBooking.discountAmount  || 0)),
        discountPercent: String(Math.round(selectedBooking.discountPercent || 0)),
        remarks:         selectedBooking.discountRemark || "",
        payment:         "",
      }));
    }
  }, [selectedBooking?.balanceAmount, selectedBooking?.paidAmount, selectedBooking?.bookingId]); // Re-run when balance changes

  const handleMobileChange = (value: any) => {
    if (/^\d{0,10}$/.test(value)) {
      setMobileSearch(value);
    }
  };

  // Format datetime for display
  const formatDateTime = (datetimeStr: any) => {
    if (!datetimeStr) return "";
    const date = new Date(datetimeStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // names of tests in the currently selected package (to hide from all-tests view)
  const selectedPackageTestNames = new Set((selectedPackage?.tests || []).map(t => t.name));

  const displayTests = (
    testView==="packages"
      ? (selectedPackage?.tests || [])
      : allTests.filter(t => !selectedPackageTestNames.has(t.name))
  ).filter(t => t.name.toLowerCase().includes(searchTest.toLowerCase()));

  const filteredBookings = bookings.filter(booking => {
    const matchesName = booking.name.toLowerCase().includes(patientNameSearch.toLowerCase());
    const matchesMobile = booking.patientData?.mobile?.includes(mobileSearch) ?? true;
    const matchesOutstanding = showOutstanding ? booking.paymentStatus === "Due" : true;
    const matchesReferralDoctor = searchBarDoctorSearch 
      ? booking.patientData?.referralDoctor?.toLowerCase().includes(searchBarDoctorSearch.toLowerCase()) 
      : true;
    const matchesOrganization = appliedOrganization
      ? booking.patientData?.organizationId === appliedOrganization
      : true;
    return matchesName && matchesMobile && matchesOutstanding && matchesReferralDoctor && matchesOrganization;
  });

  const filteredDoctors = doctorsList.filter(doctor => 
    doctor.name.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  const searchBarFilteredDoctors = doctorsList.filter(doctor => 
    doctor.name.toLowerCase().includes(searchBarDoctorSearch.toLowerCase())
  );

  const total = selectedBooking?.tests.reduce(
    (s,t) => s+(businessType==="B2C"?(t.b2cCharge||t.charge||0):(t.b2bCharge||t.charge||0)), 0
  ) || 0;

  const discountAmount = (parseFloat(billing.discountPercent) > 0)
    ? (total * parseFloat(billing.discountPercent) / 100)
    : (parseFloat(billing.discount) || 0);
  const currentPaidAmount = selectedBooking?.paidAmount || 0;
  // Use balance from database (VisitBill) directly - this is the source of truth
  const currentBalanceAmount = selectedBooking?.balanceAmount || 0;
  // Net Amount = currentBalanceAmount (fresh from DB after any settlement)
  // This shows what's actually owed, not a recalculation
  const netAmount = currentBalanceAmount;

  const handleBillingChange = (field: any, value: any) => setBilling(prev=>({...prev,[field]:value}));

  /* ===== AUTO-FILTER ON DATE RANGE CHANGE (ONLY) ===== */
  useEffect(() => {
    setCurrentPage(1); // Reset to first page on filter change
    let filtered = allBookings.filter(b => !deletedIds.has(b.bookingId));

    // Date range filter - applies automatically
    if (dateRange?.start && dateRange?.end) {
      filtered = filtered.filter(b => {
        if (!b.rawDate) return true;
        const d = startOfDay(new Date(b.rawDate));
        return d >= startOfDay(dateRange.start) && d <= startOfDay(dateRange.end);
      });
    }
    
    // Other filters - only apply when Search button is clicked (using applied* states)
    if (appliedPatientName) {
      filtered = filtered.filter(b => b.name.toLowerCase().includes(appliedPatientName.toLowerCase()));
    }
    if (appliedMobile) {
      filtered = filtered.filter(b => b.patientData?.mobile?.includes(appliedMobile));
    }
    if (appliedDoctor) {
      filtered = filtered.filter(b => b.patientData?.referralDoctor?.toLowerCase().includes(appliedDoctor.toLowerCase()));
    }
    if (appliedOutstanding) {
      filtered = filtered.filter(b => b.paymentStatus === "Due");
    }
    setBookings(filtered);
  }, [dateRange, appliedPatientName, appliedMobile, appliedDoctor, appliedOutstanding, allBookings, deletedIds]);

  /* ===== BARCODE SELECTION HANDLER ===== */
  const handleBarcodeToggle = (index: number) => {
    setSelectedBarcodeIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  /* ===== SEARCH HANDLER ===== */
  const handleSearch = () => {
    setAppliedPatientName(patientNameSearch);
    setAppliedMobile(mobileSearch);
    setAppliedDoctor(searchBarDoctorSearch);
    setAppliedOutstanding(showOutstanding);
    setCurrentPage(1); // Reset to first page
  };

  /* ===== HANDLE ENTER KEY IN SEARCH FIELDS ===== */
  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  /* ===== RESET HANDLER ===== */
  const handleReset = () => {
    const today = new Date(); 
    today.setHours(0,0,0,0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    // Reset to show last 7 days of patients
    setDateRange({ start: sevenDaysAgo, end: today });
    setPatientNameSearch('');
    setMobileSearch('');
    setSearchBarDoctorSearch('');
    setShowOutstanding(false);
    setShowSearchBarDoctorDropdown(false);
    setSelectedBooking(null);
    setCurrentPage(1); // Reset to first page
    // Clear applied filters
    setAppliedPatientName('');
    setAppliedMobile('');
    setAppliedDoctor('');
    setAppliedOutstanding(false);
  };

  /* ===== REFERRAL VALIDATION & SAVE ===== */
  const validateReferral = () => {
    const errors: any = {};
    
    // Name validation
    if (!referralData.name.trim()) {
      errors.name = "Name is required";
    } else if (/\bdr\.?|doctor\b/i.test(referralData.name)) {
      errors.name = "Do not add Dr. or DR in name";
    }

    // Mobile validation (if provided)
    if (referralData.mobile && !/^\d{10}$/.test(referralData.mobile)) {
      errors.mobile = "Mobile must be exactly 10 digits";
    }

    // Email validation (if provided)
    if (referralData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referralData.email)) {
      errors.email = "Invalid email format";
    }

    // Compliment validation (if provided)
    if (referralData.compliment && (isNaN(parseFloat(referralData.compliment)) || parseFloat(referralData.compliment) < 0 || parseFloat(referralData.compliment) > 100)) {
      errors.compliment = "Compliment must be between 0-100%";
    }

    setReferralErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveReferral = () => {
    if (validateReferral()) {
      // Here you would typically save to a database or state
      console.log("Saving referral:", referralData);
      alert(`Referral ${referralData.type} "${referralData.name}" added successfully!`);
      
      // Reset and close
      setReferralData({
        type: "Doctor",
        name: "",
        degree: "",
        compliment: "",
        mobile: "",
        email: "",
        address: "",
        allowSendReport: false
      });
      setReferralErrors({});
      setShowAddReferral(false);
    }
  };

  const handleReferralChange = (field: any, value: any) => {
    setReferralData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (referralErrors[field]) {
      setReferralErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleClickTest = async (t: any, pkg: any) => {
    if (!selectedBooking) return alert("Please select a booking first");
    if (selectedBooking.tests.find(x => x.name === t.name && !x.isExisting)) return;
    
    let testEntry = { ...t };
    if (pkg) {
      // divide package total across all its tests
      const count = pkg.tests.length || 1;
      testEntry = {
        ...t,
        b2cCharge: Math.round(pkg.b2cCharge / count),
        b2bCharge: Math.round(pkg.b2bCharge / count),
        fromPackage: pkg.name,
      };
    }
    
    // Add to local state first
    const updated = bookings.map(b=>
      b.bookingId===selectedBooking.bookingId ? {...b,tests:[...b.tests,testEntry]} : b
    );
    setBookings(updated);
    const updatedSelected = updated.find(b=>b.bookingId===selectedBooking!.bookingId);
    if (updatedSelected) {
      setSelectedBooking(updatedSelected);
    }
    
    // Save to backend if this is an existing visit (has visitId)
    if (selectedBooking.visitId) {
      try {
        const { addTestToVisit } = await import('@/src/api/patient');
        await addTestToVisit(selectedBooking.patientId, selectedBooking.visitId, {
          testId: t.id,
          testName: t.name,
          charge: testEntry.b2cCharge || testEntry.b2bCharge || 0,
          sampleType: t.sample,
          businessType: businessType
        });
        
        // Check if new test has a different sample type than existing tests
        const existingSamples = selectedBooking.tests.map(test => test.sample);
        const newSampleType = t.sample;
        const hasDifferentSample = !existingSamples.includes(newSampleType);
        
        // If different sample type, automatically show barcode modal
        if (hasDifferentSample && updatedSelected) {
          setTimeout(() => handlePrintBarcode(updatedSelected), 500);
        }
      } catch (err) {
        console.error('Failed to save test to backend:', err);
        // Still keep it in local state even if backend save fails
      }
    }
  };

  const handleClickPackage = (pkg: any) => {
    if (!selectedBooking) return alert("Please select a booking first");
    if (selectedBooking.tests.find(x=>x.name===pkg.name)) return;
    const packageEntry = { name:pkg.name, sample:"N/A",
      b2cCharge:pkg.b2cCharge, b2bCharge:pkg.b2bCharge,
      isPackage:true, packageTests:pkg.tests };
    const updated = bookings.map(b=>
      b.bookingId===selectedBooking.bookingId ? {...b,tests:[...b.tests,packageEntry]} : b
    );
    setBookings(updated);
    const updatedBooking = updated.find(b=>b.bookingId===selectedBooking!.bookingId);
    if (updatedBooking) {
      setSelectedBooking(updatedBooking);
    }
  };

  const handleInputChange = (e: any) => {
    const {name,value,type,checked}=e.target;
    setFormData(prev=>({...prev,[name]:type==='checkbox'?checked:value}));
  };

  const handleSaveEdit = async () => {
    if (!editingPatient) return;
    try {
      const res = await updatePatient(editingPatient.patientId, {
        title:     formData.title,
        firstName: formData.firstName,
        lastName:  formData.lastName,
        dob:       (formData as any).dob || null,
        age:       formData.age,
        gender:    formData.gender,
        mobile:    formData.mobile,
        email:     formData.email,
        address:   formData.address,
      });
      if (!res.success) { alert('Failed to update patient: ' + res.message); return; }

      // Update patient_history for the visit if present
      if (editingPatient.visitId && formData.patient_history !== undefined) {
        try {
          const historyRes = await updatePatientTestDetails(
            editingPatient.patientId,
            editingPatient.visitId,
            formData.patient_history
          );
          if (!historyRes.success) {
            console.warn('Failed to update patient history:', historyRes.message);
          }
        } catch (e) {
          console.warn('Error updating patient history:', e);
        }
      }
    } catch (e) {
      alert('Failed to update patient: ' + (e instanceof Error ? e.message : 'Unknown error')); return;
    }

    const updated = bookings.map(b=>
      b.patientId===editingPatient.patientId
        ? {...b, name:`${formData.title} ${formData.firstName} ${formData.lastName || ''}`.trim().toUpperCase(), patientData:formData} : b
    );
    setBookings(updated);
    if (selectedBooking?.patientId===editingPatient.patientId) {
      const updatedBooking = updated.find(b=>b.patientId===editingPatient.patientId);
      if (updatedBooking) {
        setSelectedBooking(updatedBooking);
      }
    }
    setEditingPatient(null);
    setShowDateTimePicker(false);
    setSuccessPopup("Patient updated successfully!");
    setTimeout(() => setSuccessPopup(""), 3000);
  };

  const handleDeleteBooking = (b: any) => {
    if (window.confirm(`Delete ${b.name}?`)) {
      setDeletedIds(prev => new Set([...prev, b.bookingId]));
      setBookings(bookings.filter(x=>x.bookingId!==b.bookingId));
      if (selectedBooking?.bookingId===b.bookingId) setSelectedBooking(null);
    }
  };

  // Get booking row background color based on minimum test status
  const getBookingRowColor = (booking: any) => {
    // If selected, use orange
    if (selectedBooking?.bookingId === booking.bookingId) {
      return "bg-orange-50";
    }

    // Get minimum status from tests (lowest in workflow order)
    const statusOrder = {
      'Registered': 0,
      'Received': 1,
      'Entered': 2,
      'Validation': 3,
      'Authorized': 4,
      'Delivered': 5,
      'Rectified': 6
    };

    const tests = booking.tests || [];
    if (tests.length === 0) {
      return ""; // Default
    }

    // Find the minimum status (earliest in workflow)
    let minStatus = tests[0]?.status || 'Registered';
    let minOrder = statusOrder[minStatus] ?? 0;

    for (const test of tests) {
      const testStatus = test.status || 'Registered';
      const order = statusOrder[testStatus] ?? 0;
      if (order < minOrder) {
        minOrder = order;
        minStatus = testStatus;
      }
    }

    // Map status to color
    switch (minStatus) {
      case 'Registered':
        return "bg-cyan-50"; // Light cyan for gray status
      case 'Received':
        return "bg-orange-50"; // Light orange for Received
      case 'Entered':
        return "bg-green-50"; // Light green for Entered
      case 'Validation':
        return "bg-yellow-50"; // Light yellow for Validation
      case 'Authorized':
        return "bg-blue-50"; // Light blue for Authorized
      case 'Delivered':
        return "bg-purple-50"; // Light purple for Delivered
      case 'Rectified':
        return "bg-red-50"; // Light red for Rectified
      default:
        return "";
    }
  };

  const handlePrintBooking = (b: any) => {
    const invoiceId = b.visitId || b.bookingId;
    const html=`<html><head><title>${invoiceId}</title>
    <style>body{font-family:Arial;padding:20px}h1{color:#0891b2}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#0891b2;color:white}</style></head>
    <body><h1>SHRADDHA PATHOLOGY LABORATORY - ${invoiceId}</h1>
    <p><b>Patient:</b> ${b.name} | <b>ID:</b> ${b.patientId}</p>
    <p><b>Date:</b> ${b.date} | <b>Mobile:</b> ${b.patientData.mobile}</p>
    <table><tr><th>Sr</th><th>Test</th><th>Charge</th></tr>
    ${b.tests.map((t,i)=>`<tr><td>${i+1}</td><td>${t.name}</td><td>₹${t.b2cCharge||t.charge}</td></tr>`).join('')}
    </table><h3>Total: ₹${total}</h3></body></html>`;
    const w=window.open("","_blank");
    if (w) {
      w.document.write(html); w.document.close(); w.print();
    }
  };

  const handleDeleteTest = (testToDelete: any) => {
    if (!selectedBooking) return;
    if (window.confirm(`Delete ${testToDelete.name}?`)) {
      const updated = bookings.map(b=>
        b.bookingId===selectedBooking.bookingId
          ? {...b, tests: b.tests.filter(t => !(t.name===testToDelete.name && !!t.isExisting===!!testToDelete.isExisting))} : b
      );
      setBookings(updated);
      const updatedBooking = updated.find(b=>b.bookingId===selectedBooking.bookingId);
      if (updatedBooking) {
        setSelectedBooking(updatedBooking);
      }
      // Clear discount when test is removed
      setBilling(prev => ({
        ...prev,
        discount: "0",
        discountPercent: "0"
      }));
    }
  };

  const handleSaveCharge = (testName: any) => {
    if (!selectedBooking) return;
    const newCharge = parseInt(editingCharge.value)||0;
    const updated = bookings.map(b=>
      b.bookingId===selectedBooking.bookingId
        ? { ...b, tests:b.tests.map(t=>
            t.name===testName
              ? businessType==="B2C" ? {...t,b2cCharge:newCharge} : {...t,b2bCharge:newCharge}
              : t
          )}
        : b
    );
    setBookings(updated);
    const updatedBooking = updated.find(b=>b.bookingId===selectedBooking.bookingId);
    if (updatedBooking) {
      setSelectedBooking(updatedBooking);
    }
    setEditingCharge(null);
  };

  const handleBill    = () => setShowBillModal(true);
  const handleReceipt = () => setShowReceiptModal(true);
  const handleRefund  = () => setShowRefundModal(true);

  // Print functions for bill modal
  const handlePrintWithHeader = async () => {
    setShowPrintDropdown(false);
    if (!selectedBooking) return;
    const result = await printBill(selectedBooking, billing, businessType, true);
    if (!result.success) {
      alert('Failed to print: ' + result.error);
    }
  };

  const handlePrintWithoutHeader = async () => {
    setShowPrintDropdown(false);
    if (!selectedBooking) return;
    const result = await printBill(selectedBooking, billing, businessType, false);
    if (!result.success) {
      alert('Failed to print: ' + result.error);
    }
  };

  const handleDownloadWithHeader = async () => {
    setShowDownloadDropdown(false);
    if (!selectedBooking) return;
    const result = await generateBillPDF(selectedBooking, billing, businessType, true);
    if (!result.success) {
      alert('Failed to generate PDF: ' + result.error);
    }
  };

  const handleDownloadWithoutHeader = async () => {
    setShowDownloadDropdown(false);
    if (!selectedBooking) return;
    const result = await generateBillPDF(selectedBooking, billing, businessType, false);
    if (!result.success) {
      alert('Failed to generate PDF: ' + result.error);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedBooking) return;
    const payment = parseFloat(billing.payment) || 0;
    if (payment <= 0) return alert("Please enter a payment amount");

    // Calculate net amount after discount
    const discountAmt = (parseFloat(billing.discountPercent) > 0)
      ? (total * parseFloat(billing.discountPercent) / 100)
      : (parseFloat(billing.discount) || 0);
    const netAmt = Math.max(0, total - discountAmt);
    
    // Validate payment doesn't exceed net amount
    const currentPaid = selectedBooking.paidAmount || 0;
    const remainingBalance = netAmt - currentPaid;
    
    if (payment > remainingBalance) {
      return alert(`Payment amount (₹${payment}) cannot exceed remaining balance (₹${remainingBalance})`);
    }

    try {
      console.log('💾 Saving payment transaction...');
      console.log('  visitId:', selectedBooking.visitId);
      console.log('  patientId:', selectedBooking.patientId);
      console.log('  paymentMode:', billing.paymentMode);
      console.log('  paymentAmount:', payment);
      console.log('  API URL:', `${API_BASE_URL}/patients/payment-transaction`);
      
      // First, save the payment transaction
      const txResponse = await fetch(`${API_BASE_URL}/patients/payment-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: selectedBooking.visitId,
          patientId: selectedBooking.patientId,
          paymentMode: billing.paymentMode,
          paymentAmount: payment,
          remarks: billing.remarks || null
        })
      });
      
      const txData = await txResponse.json();
      console.log('📥 Transaction Response:', txData);
      
      if(!txResponse.ok){
        console.error('❌ Failed to save payment transaction:', txResponse.status, txData);
      } else {
        console.log('✅ Payment transaction saved successfully');
      }

      // Then update the main payment record
      const res = await updatePayment(selectedBooking.patientId, selectedBooking.visitId, {
        paymentAmount:   payment,
        paymentMode:     billing.paymentMode,
        discountAmount:  discountAmt,
        discountPercent: parseFloat(billing.discountPercent) || 0,
        discountRemark:  billing.remarks,
        netAmount:       netAmt,
      });

      const { paidAmount, balanceAmount, fullyPaid } = res.data;

      // Update local state - only update the specific booking (visitId)
      const updatedBookings = allBookings.map(b =>
        b.bookingId === selectedBooking.bookingId
          ? { 
              ...b, 
              paidAmount, 
              balanceAmount, 
              paymentStatus: fullyPaid ? "Paid" : "Due",
              discountAmount: discountAmt,
              discountPercent: parseFloat(billing.discountPercent) || 0,
              discountRemark: billing.remarks || ""
            }
          : b
      );
      setAllBookings(updatedBookings);
      setBookings(updatedBookings);

      const updatedSelected = { 
        ...selectedBooking, 
        paidAmount, 
        balanceAmount, 
        paymentStatus: fullyPaid ? "Paid" : "Due",
        discountAmount: discountAmt,
        discountPercent: parseFloat(billing.discountPercent) || 0,
        discountRemark: billing.remarks || ""
      };
      setSelectedBooking(updatedSelected);

      setBilling(prev => ({
        ...prev,
        advance: String(Math.round(paidAmount)),
        balAmt:  String(Math.round(balanceAmount)),
        payment: "",
      }));

      const message = fullyPaid 
        ? "Payment saved. Bill fully paid!" 
        : `Payment saved. Remaining balance: ₹${balanceAmount}`;
      
      setSuccessPopup(message);
      setTimeout(() => setSuccessPopup(""), 3000);
    } catch (err) {
      alert("Failed to save payment: " + err.message);
    }
  };

  const handleRebooking = (booking: any) => {
    // Store rebooking data in localStorage with patient details AND tests (WITHOUT discount)
    localStorage.setItem('rebookingData', JSON.stringify({
      patientData: booking.patientData,
      tests: booking.tests.map(t => ({
        id: t.id || t.test?.id,
        name: t.name || t.test?.name,
        testId: t.testId || t.test?.id,
        departmentId: t.departmentId || t.test?.departmentId,
        sample: t.sample || t.test?.sample_type?.Sample_Type,
        charge: t.charge,
        b2cCharge: t.b2cCharge || t.charge,
        b2bCharge: t.b2bCharge || t.charge,
        isOutsourced: t.isOutsourced || false,
        outsourcedTo: t.outsourcedTo || null
        // ⚠️ NO discount fields - clean slate
      })),
      isRebooking: true,
      previousBookingId: booking.visitId || booking.bookingId,
      previousVisitDate: booking.date
    }));
    router.push('/patient/registration');
  };

  // Show barcode modal for booking
  const handlePrintBarcode = (booking: any) => {
    if (!booking.tests || booking.tests.length === 0) {
      alert('No tests in this booking');
      return;
    }

    // 🔴 DEBUG: Log what we're sending to barcode generation
    console.log('🔴 Search-Booking Page - handlePrintBarcode DEBUG:');
    console.log('   booking.tests.length:', booking.tests.length);
    booking.tests.forEach((test, idx) => {
      console.log(`   Test ${idx} keys:`, Object.keys(test).slice(0, 15));
      console.log(`   Test ${idx} data:`, {
        id: test?.id,
        visitId: booking?.visitId,
        sampleTypeId: test?.sampleTypeId,
        'test.sampleTypeId': test?.test?.sampleTypeId,
        'patientTest.sampleTypeId': test?.patientTest?.sampleTypeId,
        'test object exists': !!test?.test,
        testKeys: test?.test ? Object.keys(test.test).slice(0, 10) : 'NO TEST OBJECT'
      });
    });

    // ✅ Use centralized generateBarcodeLabels function
    const labels = generateBarcodeLabels(booking.tests, booking.visitId || booking.bookingId, booking.patientData?.organizationCode || '');
    
    console.log('✅ Generated barcode labels using centralized function:', labels);

    const genderInitial = booking.patientData?.gender ? booking.patientData.gender.charAt(0).toUpperCase() : '';
    const age = booking.patientData?.age || '';
    const ageGender = genderInitial && age ? `${genderInitial}/${age} Yrs` : genderInitial || (age ? `${age} Yrs` : '');

    setBarcodePatientInfo({
      patientName: booking.name || '',
      visitId: booking.visitId || booking.bookingId,
      age,
      gender: booking.patientData?.gender || '',
      ageGender,
      organizationCode: booking.patientData?.organizationCode || '',
    });
    setBarcodeLabels(labels);
    setSelectedBarcodeIndices(new Set(labels.map((_, idx) => idx)));
    setShowBarcodeModal(true);
  };

  // Print bill with header for booking
  const handlePrintBillWithHeader = async () => {
    setShowPrintDropdown(false);
    if (!selectedBooking) return;

    const billBooking = {
      bookingId: selectedBooking.bookingId,
      visitId: selectedBooking.visitId || selectedBooking.bookingId,
      patientId: selectedBooking.patientId,
      name: selectedBooking.name,
      date: selectedBooking.date,
      tests: selectedBooking.tests.map((t: any) => ({
        name: t.name,
        sample: t.sample,
        charge: businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0),
        b2cCharge: t.b2cCharge || t.charge || 0,
        b2bCharge: t.b2bCharge || t.charge || 0
      })),
      paidAmount: selectedBooking.paidAmount || 0,
      balanceAmount: selectedBooking.balanceAmount || 0,
      patientData: {
        title: selectedBooking.patientData?.title || 'MR',
        firstName: selectedBooking.patientData?.firstName || '',
        lastName: selectedBooking.patientData?.lastName || '',
        age: selectedBooking.patientData?.age || '',
        gender: selectedBooking.patientData?.gender || 'Male',
        mobile: selectedBooking.patientData?.mobile || '',
        referralDoctor: selectedBooking.patientData?.referralDoctor || '',
        remark: selectedBooking.patientData?.remark || ''
      }
    };

    const billingInfo = {
      discount: String(selectedBooking.discountAmount || 0),
      discountPercent: String(selectedBooking.discountPercent || 0),
      remarks: selectedBooking.discountRemark || '',
      paymentMode: billing.paymentMode || 'Cash'
    };

    const result = await printBill(billBooking, billingInfo, businessType, true);
    if (!result.success) {
      alert('Failed to print: ' + result.error);
    }
  };

  // Print bill without header for booking
  const handlePrintBillWithoutHeader = async () => {
    setShowPrintDropdown(false);
    if (!selectedBooking) return;

    const billBooking = {
      bookingId: selectedBooking.bookingId,
      visitId: selectedBooking.visitId || selectedBooking.bookingId,
      patientId: selectedBooking.patientId,
      name: selectedBooking.name,
      date: selectedBooking.date,
      tests: selectedBooking.tests.map((t: any) => ({
        name: t.name,
        sample: t.sample,
        charge: businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0),
        b2cCharge: t.b2cCharge || t.charge || 0,
        b2bCharge: t.b2bCharge || t.charge || 0
      })),
      paidAmount: selectedBooking.paidAmount || 0,
      balanceAmount: selectedBooking.balanceAmount || 0,
      patientData: {
        title: selectedBooking.patientData?.title || 'MR',
        firstName: selectedBooking.patientData?.firstName || '',
        lastName: selectedBooking.patientData?.lastName || '',
        age: selectedBooking.patientData?.age || '',
        gender: selectedBooking.patientData?.gender || 'Male',
        mobile: selectedBooking.patientData?.mobile || '',
        referralDoctor: selectedBooking.patientData?.referralDoctor || '',
        remark: selectedBooking.patientData?.remark || ''
      }
    };

    const billingInfo = {
      discount: String(selectedBooking.discountAmount || 0),
      discountPercent: String(selectedBooking.discountPercent || 0),
      remarks: selectedBooking.discountRemark || '',
      paymentMode: billing.paymentMode || 'Cash'
    };

    const result = await printBill(billBooking, billingInfo, businessType, false);
    if (!result.success) {
      alert('Failed to print: ' + result.error);
    }
  };

  // Download bill with header for booking
  const handleDownloadBillWithHeader = async () => {
    setShowDownloadDropdown(false);
    if (!selectedBooking) return;

    const billBooking = {
      bookingId: selectedBooking.bookingId,
      visitId: selectedBooking.visitId || selectedBooking.bookingId,
      patientId: selectedBooking.patientId,
      name: selectedBooking.name,
      date: selectedBooking.date,
      tests: selectedBooking.tests.map((t: any) => ({
        name: t.name,
        sample: t.sample,
        charge: businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0),
        b2cCharge: t.b2cCharge || t.charge || 0,
        b2bCharge: t.b2bCharge || t.charge || 0
      })),
      paidAmount: selectedBooking.paidAmount || 0,
      balanceAmount: selectedBooking.balanceAmount || 0,
      patientData: {
        title: selectedBooking.patientData?.title || 'MR',
        firstName: selectedBooking.patientData?.firstName || '',
        lastName: selectedBooking.patientData?.lastName || '',
        age: selectedBooking.patientData?.age || '',
        gender: selectedBooking.patientData?.gender || 'Male',
        mobile: selectedBooking.patientData?.mobile || '',
        referralDoctor: selectedBooking.patientData?.referralDoctor || '',
        remark: selectedBooking.patientData?.remark || ''
      }
    };

    const billingInfo = {
      discount: String(selectedBooking.discountAmount || 0),
      discountPercent: String(selectedBooking.discountPercent || 0),
      remarks: selectedBooking.discountRemark || '',
      paymentMode: billing.paymentMode || 'Cash'
    };

    const result = await generateBillPDF(billBooking, billingInfo, businessType, true);
    if (!result.success) {
      alert('Failed to download PDF: ' + result.error);
    }
  };

  // Download bill without header for booking
  const handleDownloadBillWithoutHeader = async () => {
    setShowDownloadDropdown(false);
    if (!selectedBooking) return;

    const billBooking = {
      bookingId: selectedBooking.bookingId,
      visitId: selectedBooking.visitId || selectedBooking.bookingId,
      patientId: selectedBooking.patientId,
      name: selectedBooking.name,
      date: selectedBooking.date,
      tests: selectedBooking.tests.map((t: any) => ({
        name: t.name,
        sample: t.sample,
        charge: businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0),
        b2cCharge: t.b2cCharge || t.charge || 0,
        b2bCharge: t.b2bCharge || t.charge || 0
      })),
      paidAmount: selectedBooking.paidAmount || 0,
      balanceAmount: selectedBooking.balanceAmount || 0,
      patientData: {
        title: selectedBooking.patientData?.title || 'MR',
        firstName: selectedBooking.patientData?.firstName || '',
        lastName: selectedBooking.patientData?.lastName || '',
        age: selectedBooking.patientData?.age || '',
        gender: selectedBooking.patientData?.gender || 'Male',
        mobile: selectedBooking.patientData?.mobile || '',
        referralDoctor: selectedBooking.patientData?.referralDoctor || '',
        remark: selectedBooking.patientData?.remark || ''
      }
    };

    const billingInfo = {
      discount: String(selectedBooking.discountAmount || 0),
      discountPercent: String(selectedBooking.discountPercent || 0),
      remarks: selectedBooking.discountRemark || '',
      paymentMode: billing.paymentMode || 'Cash'
    };

    const result = await generateBillPDF(billBooking, billingInfo, businessType, false);
    if (!result.success) {
      alert('Failed to download PDF: ' + result.error);
    }
  };

  return (
    <>
    <style>{`
      input[type=number]::-webkit-outer-spin-button,
      input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
      input[type=number] { -moz-appearance:textfield; }
    `}</style>

    <div className="w-full px-3 sm:px-6 mt-2">

      {/* SEARCH BAR - Single line filters with auto-search */}
      <div className="bg-white rounded shadow p-3 mb-0">
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          
          {/* Organization Filter */}
          <div className="relative" ref={searchBarOrganizationDropdownRef}>
            <div className="flex items-center border rounded px-3 py-1 text-sm bg-white hover:border-orange-400 transition-colors min-w-[150px]">
              <input
                type="text"
                placeholder="Organization"
                value={searchBarOrganizationSearch}
                onChange={(e) => {
                  setSearchBarOrganizationSearch(e.target.value);
                  setShowSearchBarOrganizationDropdown(true);
                }}
                onFocus={() => setShowSearchBarOrganizationDropdown(true)}
                className="outline-none bg-transparent flex-1 text-xs"
              />
              {appliedOrganization && (
                <button
                  onClick={() => {
                    setAppliedOrganization("");
                    setSearchBarOrganizationSearch("");
                  }}
                  className="text-gray-400 hover:text-gray-600 ml-1"
                  title="Clear selection"
                >
                  <X size={14} />
                </button>
              )}
              {!appliedOrganization && !searchBarOrganizationSearch && (
                <ChevronDown size={14} className="text-gray-400 pointer-events-none ml-1" />
              )}
            </div>
            
            {/* Organization Dropdown */}
            {showSearchBarOrganizationDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                {organizations.length === 0 ? (
                  <div className="p-2 text-gray-500 text-xs">No organizations found</div>
                ) : (
                  <>
                    <div
                      onClick={() => {
                        setAppliedOrganization("");
                        setSearchBarOrganizationSearch("");
                        setShowSearchBarOrganizationDropdown(false);
                      }}
                      className="p-2 cursor-pointer hover:bg-orange-50 border-b border-gray-100 text-xs"
                    >
                      <div className="font-medium">All Organizations</div>
                    </div>
                    {organizations
                      .filter(org => 
                        org.name.toLowerCase().includes(searchBarOrganizationSearch.toLowerCase()) ||
                        (org.code && org.code.toLowerCase().includes(searchBarOrganizationSearch.toLowerCase()))
                      )
                      .map((org) => (
                        <div
                          key={org.id}
                          onClick={() => {
                            setAppliedOrganization(org.id);
                            setSearchBarOrganizationSearch(org.name);
                            setShowSearchBarOrganizationDropdown(false);
                          }}
                          className="p-2 cursor-pointer hover:bg-orange-50 border-b border-gray-100 text-xs"
                        >
                          <div className="font-medium">{org.name}</div>
                          {org.code && <div className="text-xs text-gray-500">{org.code}</div>}
                        </div>
                      ))}
                  </>
                )}
              </div>
            )}
          </div>
          
          <input 
            placeholder="Patient Name" 
            value={patientNameSearch}
            onChange={(e) => {
              setPatientNameSearch(e.target.value);
              setAppliedPatientName(e.target.value);
            }}
            className={style.input} 
          />
          <input 
            placeholder="Mobile" 
            value={mobileSearch}
            onChange={(e) => {
              handleMobileChange(e.target.value);
              setAppliedMobile(e.target.value);
            }}
            maxLength={10}
            className={style.input}
            title="Enter 10 digit mobile number"
          />
          
          {/* Referral Doctor Search with Dropdown */}
          <div className="relative" ref={searchBarDoctorDropdownRef}>
            <input 
              placeholder="Referral Doctor" 
              value={searchBarDoctorSearch}
              onChange={(e) => {
                setSearchBarDoctorSearch(e.target.value);
                setAppliedDoctor(e.target.value);
                setShowSearchBarDoctorDropdown(true);
              }}
              onFocus={() => setShowSearchBarDoctorDropdown(true)}
              className={style.input}
            />
            
            {showSearchBarDoctorDropdown && searchBarFilteredDoctors.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchBarFilteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    onClick={() => {
                      setSearchBarDoctorSearch(doctor.name);
                      setShowSearchBarDoctorDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-800 text-sm">{doctor.name}</div>
                    <div className="text-xs text-gray-500">{doctor.degree} - {doctor.specialization}</div>
                  </div>
                ))}
              </div>
            )}
            
            {showSearchBarDoctorDropdown && searchBarDoctorSearch && searchBarFilteredDoctors.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500 text-sm">
                No doctors found
              </div>
            )}
          </div>
          
          <label className="flex items-center gap-2 border px-3 py-1 rounded text-sm bg-orange-50 cursor-pointer hover:bg-orange-100">
            <input 
              type="checkbox" 
              checked={showOutstanding}
              onChange={(e) => {
                setShowOutstanding(e.target.checked);
                setAppliedOutstanding(e.target.checked);
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-orange-700">Outstandings</span>
          </label>
          
          <button 
            onClick={handleReset}
            className={`${style.btn} bg-red-500 hover:bg-red-600 transition-colors`}>
            <RotateCcw size={15}/> Reset
          </button>
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-180px)]">

        {/* LEFT - BOOKING LIST - FULL WIDTH */}
        <div className="col-span-12 bg-white rounded shadow flex flex-col overflow-hidden">
          <div className="overflow-y-auto overflow-x-hidden flex-1">
            <table className="w-full text-xs">
              <thead className="bg-cyan-900 text-white sticky top-0">
                <tr>
                  <th className="px-2 py-1 w-12 text-center">No</th>
                  <th className="px-2 py-1 text-left min-w-40">Patient Name</th>
                  <th className="px-2 py-1 text-left min-w-24">Patient ID</th>
                  <th className="px-2 py-1 text-left min-w-24">Visit ID</th>
                  <th className="px-2 py-1 text-left min-w-24">Date</th>
                  <th className="px-2 py-1 text-center min-w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingBookings ? (
                  <tr><td colSpan={6} className="px-2 py-1 text-center text-gray-400">Loading...</td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-2 py-1 text-center text-gray-400">No records found</td></tr>
                ) : (() => {
                  // Sort by emergency first, then by visitId
                  const sortedBookings = [...filteredBookings].sort((a, b) => {
                    // Check if any test in booking is emergency
                    const aHasEmergency = a.tests?.some((t: any) => t.isEmergency);
                    const bHasEmergency = b.tests?.some((t: any) => t.isEmergency);
                    
                    // Emergency tests first
                    if (aHasEmergency && !bHasEmergency) return -1;
                    if (!aHasEmergency && bHasEmergency) return 1;
                    
                    // Then by visitId
                    return (b.visitId || '').localeCompare(a.visitId || '');
                  });
                  
                  // Pagination logic
                  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                  const endIndex = startIndex + ITEMS_PER_PAGE;
                  const paginatedBookings = sortedBookings.slice(startIndex, endIndex);
                  
                  return paginatedBookings.map((b,i) => {
                    // Check if any test is emergency AND NOT delivered
                    const hasActiveEmergency = b.tests?.some((t: any) => t.isEmergency && t.status !== 'Delivered');
                    return (
                    <tr key={i} className={`border-b hover:bg-gray-50 ${hasActiveEmergency ? 'bg-red-50' : ''} ${getBookingRowColor(b)}`}>
                      <td className="px-2 py-1 text-center font-medium text-xs">{startIndex + i + 1}</td>
                      <td className="px-2 py-1">
                        <div className={`font-semibold flex items-center gap-2 group text-xs ${hasActiveEmergency ? 'text-red-700' : 'text-gray-800'}`}>
                          {hasActiveEmergency && (
                            <AlertTriangle size={16} className="text-yellow-500 flex-shrink-0" />
                          )}
                          <span>{b.name}</span>
                          {b.balanceAmount > 0 && b.billStatus !== 'PAID' && (
                            <div className="relative inline-flex items-center cursor-help">
                              <span className="text-red-600 font-bold text-sm hover:text-red-700 transition-colors">₹</span>
                              <div className="absolute left-0 bottom-full mb-1 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg font-semibold">
                                Balance: ₹{Math.round(b.balanceAmount)}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent border-t-red-600"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="text-gray-600 text-xs">{b.patientId}</div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="text-orange-600 font-semibold text-xs">{b.visitId}</div>
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs">{b.date}</td>
                      <td className="px-2 py-1">
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          <button onClick={() => {
                            setSelectedBookingForModal(b);
                            setShowBookingDetailsModal(true);
                          }} className="text-slate-900 hover:bg-orange-400 p-0.5 rounded" title="View Details"><Eye size={14}/></button>
                          <button onClick={()=>{setEditingPatient(b);setFormData(b.patientData);}} className="text-blue-900 hover:bg-orange-400 p-0.5 rounded" title="Edit"><Pencil size={14}/></button>
                          <button onClick={()=>handlePrintBooking(b)} className="text-red-900 hover:bg-orange-400 p-0.5 rounded" title="Print"><Printer size={12}/></button>
                          <button onClick={()=>handlePrintBarcode(b)} className="bg-white text-slate-900 hover:bg-orange-400 p-0.5 rounded" title="Barcode"><Barcode size={14}/></button>
                          <button onClick={()=>handleRebooking(b)} className="text-green-600 hover:bg-orange-400 p-0.5 rounded" title="Rebook"><RefreshCw size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                  });
                })()}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION CONTROLS */}
          {filteredBookings.length > ITEMS_PER_PAGE && (
            <div className="border-t p-2 bg-gray-50 flex items-center justify-between text-xs">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-orange-600 text-white'}`}>
                <ChevronLeft size={14} />
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {(() => {
                  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
                  const pages: (number | string)[] = [];
                  
                  // Show page numbers with ellipsis
                  if (totalPages <= 5) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 3) {
                      pages.push(1, 2, 3, 4, '...', totalPages);
                    } else if (currentPage >= totalPages - 2) {
                      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                    }
                  }
                  
                  return pages.map((page, idx) => (
                    page === '...' ? (
                      <span key={idx} className="px-2 text-gray-400">...</span>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(typeof page === 'number' ? page : 1)}
                        className={`w-7 h-7 rounded ${typeof page === 'number' && currentPage === page ? 'bg-orange-500 text-white font-bold' : 'bg-white border hover:bg-gray-100'}`}>
                        {page}
                      </button>
                    )
                  ));
                })()}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredBookings.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)}
                className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === Math.ceil(filteredBookings.length / ITEMS_PER_PAGE) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-orange-600 text-white'}`}>
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT - TEST & BILLING - HIDDEN (Modal shows this now) */}
        <div className="hidden">
          {selectedBooking ? (
            <>
              <div className="bg-white rounded shadow">
                <div className="bg-slate-900 text-white p-2 flex justify-between items-center">
                  <div>{selectedBooking.name} <span className="text-yellow-300">UID: {selectedBooking.visitId || selectedBooking.bookingId}</span></div>
                  <div className="flex gap-1">
                    <button onClick={() => setShowBillModal(true)}    className="bg-orange-100 text-black px-3 py-1 rounded text-xs font-semibold">Bill</button>
                    <button onClick={() => alert('Receipt functionality to be implemented')} className="bg-orange-100 text-black px-3 py-1 rounded text-xs font-semibold">Receipts</button>
                    <button onClick={() => setShowRefundModal(true)}  className="bg-orange-100 text-black px-3 py-1 rounded text-xs font-semibold">Refund</button>
                    <button onClick={()=>setSelectedBooking(null)} className="bg-red-500 p-1 rounded"><X size={16}/></button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">

                {/* TEST SELECTION */}
                <div className="bg-white rounded shadow flex flex-col">
                  <div className="p-2 flex gap-2 border-b items-center">
                    {testView === "packages" ? (
                      <div className="relative flex-1">
                        <input
                          autoFocus
                          placeholder="Search package..."
                          value={packageSearch}
                          onChange={e => { setPackageSearch(e.target.value); setSelectedPackage(null); }}
                          onFocus={() => setShowPkgDropdown(true)}
                          onBlur={() => setTimeout(() => setShowPkgDropdown(false), 150)}
                          className={`${style.input} w-full`}
                        />
                        {showPkgDropdown && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-56 overflow-y-auto">
                            {packagesList
                              .filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase()))
                              .map(pkg => (
                                <div
                                  key={pkg.id}
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setSelectedPackage(pkg); setPackageSearch(pkg.name); setShowPkgDropdown(false); setSearchTest(""); }}
                                  className={`px-3 py-2 cursor-pointer border-b last:border-b-0 text-sm transition-colors
                                    ${selectedPackage?.id === pkg.id ? "bg-orange-100 font-semibold" : "hover:bg-orange-50"}`}
                                >
                                  <div className="font-medium text-gray-800">{pkg.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {pkg.tests.length} test{pkg.tests.length !== 1 ? "s" : ""} · B2C ₹{pkg.b2cCharge} · B2B ₹{pkg.b2bCharge}
                                  </div>
                                </div>
                              ))
                            }
                            {packagesList.filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase())).length === 0 && (
                              <div className="p-3 text-center text-gray-400 text-sm">No packages found</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input placeholder="Search for test" value={searchTest}
                        onChange={e=>setSearchTest(e.target.value)} className={`${style.input} flex-1`} />
                    )}
                    <button onClick={()=>{
                      setTestView("all");
                      setSearchTest("");
                      setSelectedPackage(null);
                      setPackageSearch("");
                      setShowPkgDropdown(false);
                      if (selectedBooking) {
                        const updated = bookings.map(b =>
                          b.bookingId === selectedBooking!.bookingId
                            ? { ...b, tests: b.tests.filter(t => t.isExisting) }
                            : b
                        );
                        setBookings(updated);
                        const updatedBooking = updated.find(b => b.bookingId === selectedBooking!.bookingId);
                        if (updatedBooking) setSelectedBooking(updatedBooking);
                      }
                    }}
                      className={`${testView==="all"?"bg-orange-600":"bg-slate-900"} text-white px-2 py-1 rounded shrink-0`}><RefreshCcw size={16}/></button>
                    <button onClick={()=>{setTestView("packages");setSearchTest("");setPackageSearch("");setSelectedPackage(null);setTimeout(()=>setShowPkgDropdown(true),50);}}
                      className={`${testView==="packages"?"bg-orange-600":"bg-slate-900"} text-white px-2 py-1 rounded shrink-0`} title="Packages"><Plus size={16}/></button>
                  </div>

                  <div className="p-2 border-b bg-gray-50 flex gap-3 items-center">
                    {/* Category section removed - B2C/B2B selection removed */}
                  </div>
                  <div className="grid grid-cols-12 bg-slate-900 text-white text-xs font-semibold px-2 py-1 items-center">
                    <div className="col-span-5 flex items-center gap-2">
                      {testView==="packages" && selectedPackage && (
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-white cursor-pointer"
                          checked={displayTests.length > 0 && displayTests.every(t => !!selectedBooking?.tests.find(x=>x.name===t.name && !x.isExisting))}
                          onChange={e => {
                            if (e.target.checked) {
                              // add all not-yet-added (in new tests) with divided package charges
                              const count = selectedPackage.tests.length || 1;
                              const toAdd = displayTests
                                .filter(t => !selectedBooking.tests.find(x=>x.name===t.name && !x.isExisting))
                                .map(t => ({
                                  ...t,
                                  b2cCharge: Math.round(selectedPackage.b2cCharge / count),
                                  b2bCharge: Math.round(selectedPackage.b2bCharge / count),
                                  fromPackage: selectedPackage.name,
                                }));
                              const updated = bookings.map(b =>
                                b.bookingId===selectedBooking!.bookingId ? {...b, tests:[...b.tests, ...toAdd]} : b
                              );
                              setBookings(updated);
                              const updatedBooking = updated.find(b=>b.bookingId===selectedBooking!.bookingId);
                              if (updatedBooking) setSelectedBooking(updatedBooking);
                            } else {
                              // remove only from new tests
                              const names = new Set(displayTests.map(t=>t.name));
                              const updated = bookings.map(b =>
                                b.bookingId===selectedBooking!.bookingId ? {...b, tests: b.tests.filter(t=>!(names.has(t.name) && !t.isExisting))} : b
                              );
                              setBookings(updated);
                              const updatedBooking = updated.find(b=>b.bookingId===selectedBooking!.bookingId);
                              if (updatedBooking) setSelectedBooking(updatedBooking);
                            }
                          }}
                          title="Select / Deselect all"
                        />
                      )}
                      Test Name
                    </div>
                    <div className="col-span-3 text-center flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" style={{transform:'rotate(45deg)'}}>
                        <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill="white" stroke="white" strokeWidth="1.2"/>
                        <rect x="8" y="2" width="8" height="2" rx="1" fill="white" stroke="white" strokeWidth="0.8"/>
                      </svg>
                      Specimen
                    </div>
                    <div className="col-span-2 text-right">Charges</div>
                  </div>
                  <div className="overflow-y-auto flex-1" style={{maxHeight:"calc(100vh - 340px)"}}>
                    {testView==="packages" && !selectedPackage ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-xs">Select a package to view its tests</div>
                    ) : displayTests.length > 0 ? displayTests.map((t,i) => {
                      const alreadyAdded = !!selectedBooking?.tests.find(x=>x.name===t.name && !x.isExisting);
                      const isPackageView = testView==="packages" && selectedPackage;
                      return (
                        <div key={i}
                          onClick={() => {
                            if (isPackageView) {
                              if (alreadyAdded) {
                                const updated = bookings.map(b =>
                                  b.bookingId===selectedBooking!.bookingId ? {...b, tests: b.tests.filter(x=>!(x.name===t.name && !x.isExisting))} : b
                                );
                                setBookings(updated);
                                const updatedBooking = updated.find(b=>b.bookingId===selectedBooking!.bookingId);
                                if (updatedBooking) setSelectedBooking(updatedBooking);
                              } else {
                                handleClickTest(t, isPackageView ? selectedPackage : null);
                              }
                            } else {
                              handleClickTest(t, null);
                            }
                          }}
                          className={`grid grid-cols-12 border-b px-2 py-2 items-center text-xs cursor-pointer transition-colors hover:bg-gray-50`}
                          title="Click to add test"
                        >
                          <div className="col-span-5 font-medium text-gray-800 flex items-center gap-2">
                            {isPackageView ? (
                              <input
                                type="checkbox"
                                checked={alreadyAdded}
                                onChange={()=>{}}
                                onClick={e=>e.stopPropagation()}
                                className="w-3.5 h-3.5 accent-orange-500 cursor-pointer shrink-0"
                              />
                            ) : (
                              <Plus size={13} className="text-orange-500 shrink-0"/>
                            )}
                            <span>{t.name}</span>
                          </div>
                          <div className="col-span-3 flex items-center justify-center gap-1 text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" style={{transform:'rotate(45deg)',flexShrink:0}}>
                              <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={getSampleColor(t.sample, specimenTypes)} stroke="#555" strokeWidth="1.2"/>
                              <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                              <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                            </svg>
                            <span>{t.sample}</span>
                          </div>
                          <div className="col-span-2 text-right text-gray-700">{isPackageView ? "" : `₹${t.b2cCharge}`}</div>
                        </div>
                      );
                    }) : <div className="flex items-center justify-center h-full text-gray-400 text-xs">No tests found</div>}
                  </div>
                  {(testView==="packages" && selectedPackage) && (
                    <div className="grid grid-cols-12 border-t-2 border-gray-300 px-2 py-1.5 bg-white text-xs font-semibold">
                      <div className="col-span-5 text-slate-900">Package Total</div>
                      <div className="col-span-3"></div>
                      <div className="col-span-2 text-right text-slate-900">₹{selectedPackage.b2cCharge}</div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN — merged investigation table with new tests */}
                <div className="flex flex-col gap-2 overflow-hidden">

                  {/* MERGED — all tests (new + existing) */}
                  {(() => {
                    const allTests = selectedBooking.tests;
                    return (
                      <div className="bg-white rounded shadow flex flex-col flex-1 overflow-hidden">
                        <div className="bg-slate-900 text-white px-1 py-0.5 font-semibold text-xs flex justify-between items-center">
                          <span>Test(s)</span>
                          <span className="text-yellow-300 text-xs">{allTests.length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-900 text-white sticky top-0">
                              <tr>
                                <th className="p-1 text-left text-xs">#</th>
                                <th className="p-1 text-left text-xs">Test</th>
                                <th className="p-1 text-center text-xs">Date</th>
                                <th className="p-1 text-center text-xs">Amt</th>
                                <th className="p-1 text-center text-xs" title="Barcode: Red=Unprinted, Blue=Printed">🔖</th>
                                <th className="p-1 text-center text-xs">Act</th>
                              </tr>
                            </thead>
                            <tbody>
                              {allTests.length === 0 ? (
                                <tr><td colSpan={6} className="p-1 text-center text-gray-400 text-xs">No tests added</td></tr>
                              ) : allTests.map((t,i) => {
                                const charge    = businessType==="B2C"?(t.b2cCharge||t.charge||0):(t.b2bCharge||t.charge||0);
                                const isEditing = editingCharge?.testName===t.name;
                                const isNewTest = !t.isExisting;
                                // Barcode status: RED if Unprinted, BLUE if Printed
                                const barcodeStatus = t.barcode_status || "Unprinted";
                                const isBarcodePrinted = barcodeStatus === "Printed";
                                // No background color - just plain white
                                const rowBackgroundClass = "";
                                return (
                                  <tr key={i} className={`border-b text-xs border-gray-200`}>
                                    <td className="p-1 text-center">
                                      <div className="flex items-center justify-center gap-0.5 text-xs">
                                        <span>{i+1}</span>
                                        {isNewTest && (
                                          <span className="text-blue-600 font-bold text-xs" title="New">N</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-1 text-xs">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        {(t.fromPackage||t.isPackage) && <span className="bg-orange-500 text-white text-xs px-1 py-0 rounded font-semibold shrink-0">P</span>}
                                        <span className="text-xs">{t.name}</span>
                                        {barcodeStatus === "Unprinted" && (
                                          <span className="bg-red-100 text-red-700 text-xs px-1 py-0 rounded font-semibold shrink-0" title="Unprinted">⚠</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-1 text-center text-xs">{selectedBooking.date}</td>
                                    <td className="p-1 text-center text-xs">
                                      <div className="flex items-center justify-center gap-0.5 text-xs">
                                        {isEditing ? (
                                          <input type="number" autoFocus value={editingCharge.value}
                                            onChange={e=>setEditingCharge({...editingCharge,value:e.target.value})}
                                            onBlur={()=>handleSaveCharge(t.name)}
                                            onKeyDown={e=>{if(e.key==="Enter")handleSaveCharge(t.name);if(e.key==="Escape")setEditingCharge(null);}}
                                            className="w-12 border border-gray-300 rounded px-0.5 py-0 text-center text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"/>
                                        ) : <span className="font-semibold text-xs">₹{charge}</span>}
                                        <button onClick={()=>setEditingCharge({testName:t.name,value:charge})}
                                          className="text-primary-600 hover:text-primary-700" title="Edit"><Pencil size={11}/></button>
                                      </div>
                                    </td>
                                    <td className="p-1 text-center text-xs">
                                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center mx-auto text-xs" 
                                        title={isBarcodePrinted ? "Printed" : "Unprinted"}
                                        style={isBarcodePrinted 
                                          ? { borderColor: '#3b82f6', backgroundColor: '#eff6ff', color: '#1e40af' }
                                          : { borderColor: '#ef4444', backgroundColor: '#fef2f2', color: '#dc2626' }
                                        }>
                                        {isBarcodePrinted ? '✓' : '○'}
                                      </div>
                                    </td>
                                    <td className="p-1 text-center">
                                      <button onClick={()=>handleDeleteTest(t)} className="text-red-600 hover:text-red-800"><X size={12}/></button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                </div>

              </div>

              {/* BILLING DETAILS */}
              <div className="bg-white rounded shadow p-3">
                <div className="grid grid-cols-9 gap-2 mb-3 text-xs">
                  {[
                    {label:"Total",         field:"",              val:total,                      ro:true,  color:"text-orange-600"},
                    {label:"Advance",       field:"advance",       val:billing.advance,            ro:false, color:"text-blue-600"},
                    {label:"Discount",      field:"discount",      val:billing.discount,           ro:false, color:"text-gray-600"},
                    {label:"Refund",        field:"refund",        val:billing.refund,             ro:false, color:"text-gray-600"},
                    {label:"Bal Amt",       field:"balAmt",        val:currentBalanceAmount,       ro:true,  color:"text-red-600"},
                    {label:"Dis (%)",       field:"discountPercent",val:billing.discountPercent,   ro:false, color:"text-gray-600"},
                    {label:"Discount Amt",  field:"",              val:discountAmount.toFixed(0),  ro:true,  color:"text-green-600"},
                    {label:"Payment",       field:"payment",       val:billing.payment,            ro:false, color:"text-green-700"},
                    {label:"Net Amt",       field:"",              val:netAmount.toFixed(0),       ro:true,  color:"text-purple-600"},
                  ].map((item,i) => (
                    <div key={i} className="text-center">
                      <div className={`${item.color} font-semibold mb-1`}>{item.label}</div>
                      <input type="number" value={item.val} readOnly={item.ro} placeholder="0"
                        onChange={item.ro ? undefined : e=>handleBillingChange(item.field,e.target.value)}
                        className={`${numInput} ${item.ro?"bg-gray-50 font-bold cursor-not-allowed":""}`}/>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs font-semibold text-red-600 mb-1 block">Payment Mode</label>
                    <select value={billing.paymentMode} onChange={e=>setBilling({...billing,paymentMode:e.target.value})}
                      className={`${style.input} w-full bg-white`}>
                      <option>Cash</option>
                      <option>Debit Card</option>
                      <option>Credit Card</option>
                      <option>UPI</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Discount Remark</label>
                    <input type="text" value={billing.remarks} onChange={e=>setBilling({...billing,remarks:e.target.value})}
                      placeholder="Discount Remark" className="w-full border rounded px-2 py-1 text-xs"/>
                  </div>
                  <div>
                    <button onClick={handleSavePayment} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded w-full font-semibold text-sm">Save</button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div></div>
          )}
        </div>
      </div>

      {/* ===== EDIT PATIENT MODAL ===== */}
      {editingPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-100 p-4 flex justify-between items-center border-b sticky top-0">
              <h2 className="text-lg font-semibold">Edit Patient ({editingPatient.patientId})</h2>
              <button onClick={()=>{
                setEditingPatient(null);
                setShowDateTimePicker(false);
              }} className="text-gray-600"><X size={24}/></button>
            </div>
            <div className="p-4 space-y-2 text-sm">
              {/* Registration Date with DateTime Picker */}
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Registration Date</label>
                {showDateTimePicker ? (
                  <input 
                    type="datetime-local" 
                    name="visitDate" 
                    value={formData.visitDate} 
                    onChange={handleInputChange}
                    onBlur={() => setShowDateTimePicker(false)}
                    autoFocus
                    className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  />
                ) : (
                  <input 
                    type="text" 
                    value={formatDateTime(formData.visitDate)}
                    onClick={() => setShowDateTimePicker(true)}
                    readOnly
                    placeholder="Click to select date and time"
                    className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white cursor-pointer"
                  />
                )}
              </div>
              
              {[
                ["Location","location","select",null],
                ["Report Mode","reportMode","select",["By hand","Email","WhatsApp"]]
              ].map((f,i) => (
                <div key={i} className={style.formGrid}>
                  <label className="col-span-3 font-semibold text-xs">{f[0]}</label>
                  {f[2]==="text"
                    ? <input type="text" name={f[1] as string} value={formData[f[1] as keyof typeof formData] as any} onChange={handleInputChange} className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white"/>
                    : <select name={f[1] as string} value={formData[f[1] as keyof typeof formData] as any} onChange={handleInputChange} className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                        {(Array.isArray(f[3]) ? f[3] : [formData[f[1] as keyof typeof formData]]).map((opt,j)=><option key={j}>{opt}</option>)}
                      </select>}
                </div>
              ))}
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Mobile</label>
                <input 
                  type="text" 
                  name="mobile" 
                  value={formData.mobile} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d{0,10}$/.test(value)) {
                      handleInputChange(e);
                    }
                  }}
                  maxLength={10}
                  placeholder="10 digits"
                  className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  title="Enter exactly 10 digits"
                />
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Organization</label>
                <select name="organizationCode" value={formData.organizationCode || ""} onChange={(e) => setFormData(prev => ({...prev, organizationCode: e.target.value}))} className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.code || org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Patient Name</label>
                <select name="title" value={formData.title} onChange={handleInputChange} className="col-span-2 border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                  <option>MR</option><option>MRS</option><option>MS</option><option>BABY</option>
                </select>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="col-span-4 border border-gray-300 rounded px-2 py-1 text-xs bg-white" placeholder="First"/>
                <input type="text" name="lastName"  value={formData.lastName}  onChange={handleInputChange} placeholder="Last" className="col-span-3 border border-gray-300 rounded px-2 py-1 text-xs bg-white"/>
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Age/Gender</label>
                <input type="text" name="age" value={formData.age} onChange={handleInputChange} className="col-span-2 border border-gray-300 rounded px-2 py-1 text-xs bg-white" placeholder="Age"/>
                <select name="ageUnit" value={formData.ageUnit} onChange={handleInputChange} className="col-span-3 border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                  <option>Year</option><option>Month</option><option>Day</option>
                </select>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="col-span-4 border border-gray-300 rounded px-2 py-1 text-xs bg-white">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Referral Doctor</label>
                <div className="col-span-9 flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    name="referralDoctorChecked" 
                    checked={formData.referralDoctorChecked} 
                    onChange={(e) => {
                      handleInputChange(e);
                      if (!e.target.checked) {
                        setDoctorSearch("");
                        setShowDoctorDropdown(false);
                      }
                    }}
                    className="w-4 h-4"
                  />
                  
                  {formData.referralDoctorChecked ? (
                    // When checked: Show text input to type doctor name
                    <input 
                      type="text" 
                      name="referralDoctor" 
                      value={formData.referralDoctor} 
                      onChange={handleInputChange} 
                      placeholder="Type doctor name"
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                    />
                  ) : (
                    // When unchecked: Show searchable dropdown
                    <div className="flex-1 relative" ref={doctorDropdownRef}>
                      <input 
                        type="text" 
                        value={doctorSearch}
                        onChange={(e) => {
                          setDoctorSearch(e.target.value);
                          setShowDoctorDropdown(true);
                        }}
                        onFocus={() => setShowDoctorDropdown(true)}
                        placeholder="Search..."
                        className="w-full border rounded px-2 py-1 text-xs bg-white"
                      />
                      
                      {showDoctorDropdown && filteredDoctors.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {filteredDoctors.map((doctor) => (
                            <div
                              key={doctor.id}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, referralDoctor: doctor.name }));
                                setDoctorSearch(doctor.name);
                                setShowDoctorDropdown(false);
                              }}
                              className="px-2 py-1 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors text-xs"
                            >
                              <div className="font-semibold text-gray-800">{doctor.name}</div>
                              <div className="text-xs text-gray-500">{doctor.degree}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {showDoctorDropdown && doctorSearch && filteredDoctors.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 text-center text-gray-500 text-xs">
                          No doctors found
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* ===== ADD DOCTOR BUTTON ===== */}
                  <button 
                    onClick={() => setShowAddReferral(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white rounded-full p-1"
                    title="Add Referral Doctor">
                    <Plus size={14}/>
                  </button>
                </div>
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Patient History</label>
                <input type="text" name="patient_history" value={formData.patient_history} onChange={handleInputChange} className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white" placeholder="History"/>
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white" placeholder="Email"/>
              </div>
              <div className={style.formGrid}>
                <label className="col-span-3 font-semibold text-xs">Address</label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className="col-span-9 border border-gray-300 rounded px-2 py-1 text-xs bg-white" placeholder="Address"/>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setEditingPatient(null)} className="border border-gray-300 text-gray-700 px-4 py-1 rounded text-xs hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveEdit} className="bg-orange-500 text-white px-6 py-1 rounded text-xs font-semibold hover:bg-orange-600">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD REFERRAL MODAL ===== */}
      {showAddReferral && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-2xl w-[95%] max-w-md">
            <div className="bg-slate-900 px-4 py-3 flex justify-between items-center rounded-t-lg">
              <h2 className="text-lg font-bold text-white">Add Referral</h2>
              <button onClick={()=>{setShowAddReferral(false); setReferralData({type:"Doctor",name:"",degree:"",compliment:"",mobile:"",email:"",address:"",allowSendReport:false}); setReferralErrors({});}} 
                className="text-white hover:text-gray-200 transition-colors">
                <X size={22}/>
              </button>
            </div>
            
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Referral Type */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Referral Type<span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={referralData.type === "Doctor"} 
                      onChange={() => handleReferralChange("type", "Doctor")}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <span className="text-sm">Doctor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={referralData.type === "Hospital"} 
                      onChange={() => handleReferralChange("type", "Hospital")}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm">Hospital</span>
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Name<span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={referralData.name}
                  onChange={(e) => handleReferralChange("name", e.target.value)}
                  placeholder="Please Enter Name"
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${referralErrors.name ? 'border-red-500 focus:ring-red-200' : 'focus:ring-indigo-200'}`}
                />
                {referralErrors.name ? (
                  <p className="text-red-600 text-xs mt-1 font-semibold">{referralErrors.name}</p>
                ) : (
                  <p className="text-red-600 text-xs mt-1">Do not add Dr. or DR in name</p>
                )}
              </div>

              {/* Degree */}
              <div>
                <label className="block text-sm font-semibold mb-1">Degree</label>
                <input 
                  type="text"
                  value={referralData.degree}
                  onChange={(e) => handleReferralChange("degree", e.target.value)}
                  placeholder="e.g., MBBS, MD"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Compliment % */}
              <div>
                <label className="block text-sm font-semibold mb-1">Compliment %</label>
                <input 
                  type="number"
                  value={referralData.compliment}
                  onChange={(e) => handleReferralChange("compliment", e.target.value)}
                  placeholder="0-100"
                  min="0"
                  max="100"
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${referralErrors.compliment ? 'border-red-500 focus:ring-red-200' : 'focus:ring-indigo-200'}`}
                />
                {referralErrors.compliment && (
                  <p className="text-red-600 text-xs mt-1">{referralErrors.compliment}</p>
                )}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-semibold mb-1">Mobile</label>
                <input 
                  type="text"
                  value={referralData.mobile}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d{0,10}$/.test(val)) {
                      handleReferralChange("mobile", val);
                    }
                  }}
                  placeholder="10 digit mobile number"
                  maxLength={10}
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${referralErrors.mobile ? 'border-red-500 focus:ring-red-200' : 'focus:ring-indigo-200'}`}
                />
                {referralErrors.mobile && (
                  <p className="text-red-600 text-xs mt-1">{referralErrors.mobile}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input 
                  type="email"
                  value={referralData.email}
                  onChange={(e) => handleReferralChange("email", e.target.value)}
                  placeholder="email@example.com"
                  className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 ${referralErrors.email ? 'border-red-500 focus:ring-red-200' : 'focus:ring-indigo-200'}`}
                />
                {referralErrors.email && (
                  <p className="text-red-600 text-xs mt-1">{referralErrors.email}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold mb-1">Address</label>
                <textarea 
                  value={referralData.address}
                  onChange={(e) => handleReferralChange("address", e.target.value)}
                  placeholder="Address"
                  rows={3}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Allow Send Report Checkbox */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={referralData.allowSendReport}
                    onChange={(e) => handleReferralChange("allowSendReport", e.target.checked)}
                    className="mt-1 w-4 h-4 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">Allow To Send Report on balance amount</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end">
              <button 
                onClick={handleSaveReferral}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-lg font-semibold text-sm transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RECEIPT MODAL ===== */}
      {showReceiptModal && selectedBooking && (() => {
        const paymentDate = selectedBooking.patientData?.visitDate
          ? new Date(selectedBooking.patientData.visitDate).toLocaleString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).replace(",","")
          : selectedBooking.date + " 00:00:00";
        const paidAmt = parseFloat(billing.payment) || total;

        const printReceipt = () => {
          const html = `<html><head><title>Receipt</title>
          <style>body{font-family:Arial;padding:20px}h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#5b5ea6;color:white}</style></head>
          <body><h2>SHRADDHA PATHOLOGY LABORATORY</h2><h3 style="text-align:center">Receipt - ${selectedBooking.name}</h3>
          <table><tr><th>Payment Date</th><th>Amount</th><th>Received By</th></tr>
          <tr><td>${paymentDate}</td><td>${paidAmt}</td><td>SHRADDHA PATHOLOGY LABORATORY</td></tr></table>
          </body></html>`;
          const w = window.open("","_blank");
          if (w) {
            w.document.write(html); w.document.close(); w.print();
          }
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-lg shadow-2xl w-[95%] max-w-2xl">
              {/* Header */}
              <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b rounded-t-lg">
                <h2 className="text-base font-bold text-gray-800">Receipts - {selectedBooking.name}</h2>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-gray-500 hover:text-gray-800 border rounded px-2 py-0.5 text-sm"
                >✕</button>
              </div>

              {/* Table */}
              <div className="p-4">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-indigo-600 text-white">
                      <th className="px-3 py-2 text-left font-semibold">Payment Date</th>
                      <th className="px-3 py-2 text-left font-semibold">Amount</th>
                      <th className="px-3 py-2 text-left font-semibold">Received By</th>
                      <th className="px-3 py-2 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{paymentDate}</td>
                      <td className="px-3 py-2 font-semibold">{paidAmt}</td>
                      <td className="px-3 py-2">SHRADDHA PATHOLOGY LABORATORY</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={printReceipt}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold"
                          >Print Receipt</button>
                          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold">Whatsapp</button>
                          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs font-semibold">Edit</button>
                          <button
                            onClick={() => {
                              if (window.confirm("Delete this receipt?")) setShowReceiptModal(false);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-semibold"
                          >Delete</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== BILL MODAL ===== */}
      {showBillModal && selectedBooking && (() => {
        // Calculate proper amounts for bill display
        const billTotal = selectedBooking.tests.reduce(
          (s,t) => s+(businessType==="B2C"?(t.b2cCharge||t.charge||0):(t.b2bCharge||t.charge||0)), 0
        );
        
        // Get discount from current billing state (includes stored + any manual changes)
        const currentDiscountPercent = parseFloat(billing.discountPercent) || 0;
        const currentDiscountAmount = parseFloat(billing.discount) || 0;
        
        // Calculate discount amount - prioritize percentage over fixed amount
        const billDiscountAmount = currentDiscountPercent > 0 
          ? Math.round(billTotal * currentDiscountPercent / 100)
          : Math.round(currentDiscountAmount);
        
        const billNetAmount = Math.max(0, billTotal - billDiscountAmount);
        const billPaidAmount = selectedBooking.paidAmount || 0;
        // Calculate balance as: billNetAmount - billPaidAmount (not from database)
        const billBalanceAmount = Math.max(0, billNetAmount - billPaidAmount);
        const isFullyPaid = billBalanceAmount <= 0;
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-lg shadow-2xl w-[95%] max-w-3xl max-h-[95vh] flex flex-col">

              {/* Action buttons */}
              <div className="flex items-center gap-2 p-3 border-b bg-gray-50 rounded-t-lg">
                {/* Print Dropdown */}
                <div className="relative print-dropdown-container">
                  <button
                    onClick={() => {
                      setShowPrintDropdown(!showPrintDropdown);
                      setShowDownloadDropdown(false);
                    }}
                    className="text-Red px-5 py-2.5 rounded text-sm font-semibold flex items-center gap-2"
                  >
                    <Printer size={16} />
                    Print
                    <ChevronDown size={14} />
                  </button>
                  
                  {showPrintDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                      <button
                        onClick={handlePrintWithHeader}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg border-b border-gray-100"
                      >
                        With Header
                      </button>
                      <button
                        onClick={handlePrintWithoutHeader}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
                      >
                        Without Header
                      </button>
                    </div>
                  )}
                </div>

                {/* Download Dropdown */}
                <div className="relative download-dropdown-container">
                  <button
                    onClick={() => {
                      setShowDownloadDropdown(!showDownloadDropdown);
                      setShowPrintDropdown(false);
                    }}
                    className="bg-slate-900 hover:bg-orange-600 text-white px-5 py-2.5 rounded text-sm font-semibold flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download PDF
                    <ChevronDown size={14} />
                  </button>
                  
                  {showDownloadDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                      <button
                        onClick={handleDownloadWithHeader}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-t-lg border-b border-gray-100"
                      >
                        With Header
                      </button>
                      <button
                        onClick={handleDownloadWithoutHeader}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 rounded-b-lg"
                      >
                        Without Header
                      </button>
                    </div>
                  )}
                </div>

                <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded text-sm font-semibold">Whatsapp To Patient</button>
                <button className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded text-sm font-semibold">Direct WA to Patient</button>
                <button 
                  onClick={() => {
                    setShowBillModal(false);
                    setShowPrintDropdown(false);
                    setShowDownloadDropdown(false);
                  }} 
                  className="ml-auto text-gray-500 hover:text-gray-800 text-xl font-bold px-2"
                >✕</button>
              </div>

              {/* Bill content */}
              <div className="overflow-y-auto flex-1 p-6" id="bill-print-area">
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold tracking-wide">SHRADDHA PATHOLOGY LABORATORY</h1>
                  <p className="text-xs text-gray-600">Plot No-38, Sector-1, D-Mart Road, New Panvel - 410 206</p>
                  <p className="text-xs text-gray-600">+91 8779295302, 022-2745 1122</p>
                  <p className="text-xs text-gray-600">info@shraddha.com | www.shraddha.com</p>
                  <h2 className="text-sm font-bold underline mt-3 tracking-widest">
                    {isFullyPaid ? 'INVOICE-CUM-RECEIPT' : 'INVOICE'}
                  </h2>
                  {!isFullyPaid && billBalanceAmount > 0 && (
                    <div className="mt-2 inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                      BALANCE DUE: Rs.{Math.round(billBalanceAmount).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Patient info grid */}
                <div className="grid grid-cols-[2fr_1fr_2fr] gap-x-4 text-xs mb-4 border-t border-b py-3">
                  <div className="space-y-1">
                    <div className="flex gap-2"><span className="w-20 font-semibold">Name</span><span>: {selectedBooking.name}</span></div>
                    <div className="flex gap-2"><span className="w-20 font-semibold">Age/Sex</span><span>: {selectedBooking.patientData?.age} Yrs/{selectedBooking.patientData?.gender}</span></div>
                    <div className="flex gap-2"><span className="w-20 font-semibold">Ref Dr.</span><span>: {selectedBooking.patientData?.referralDoctor || "—"}</span></div>
                    <div className="flex gap-2"><span className="w-20 font-semibold">Center</span><span>: SHRADDHA PATHOLOGY LABORATORY</span></div>
                  </div>
                  <div></div>
                  <div className="space-y-1">
                    <div className="flex gap-2"><span className="w-24 font-semibold">Patient ID</span><span>: {selectedBooking.patientId}</span></div>
                    <div className="flex gap-2"><span className="w-24 font-semibold">Date</span><span>: {selectedBooking.date}</span></div>
                    <div className="flex gap-2"><span className="w-24 font-semibold">Mobile No</span><span>: {selectedBooking.patientData?.mobile}</span></div>
                    <div className="flex gap-2"><span className="w-24 font-semibold">Invoice No</span><span>: {selectedBooking.visitId || selectedBooking.bookingId}</span></div>
                  </div>
                </div>

                {/* Tests table */}
                <table className="w-full text-xs mb-4 border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-left py-1 w-10">Sr.No</th>
                      <th className="text-left py-1">Investigation(s)</th>
                      <th className="text-left py-1 w-28">Date</th>
                      <th className="text-right py-1 w-20">Charges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooking.tests.map((t, i) => {
                      const charge = businessType==="B2C" ? (t.b2cCharge||t.charge||0) : (t.b2bCharge||t.charge||0);
                      return (
                        <tr key={i} className="border-b border-gray-200">
                          <td className="py-1 align-top">{i+1}</td>
                          <td className="py-1 align-top font-medium">{t.name}</td>
                          <td className="py-1 align-top">{selectedBooking.date}</td>
                          <td className="py-1 align-top text-right">Rs.{Math.round(charge).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="border-b-2 border-gray-800">
                      <td colSpan={3} className="py-1 font-bold text-right">TOTAL:</td>
                      <td className="py-1 font-bold text-right">Rs.{Math.round(billTotal).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Amount in words + summary */}
                <div className="flex justify-between items-start text-xs mt-2">
                  <div className="max-w-xs">
                    <p className="font-bold">
                      {isFullyPaid ? 'Total Paid' : 'Net Amount'}: {numberToWords(isFullyPaid ? billPaidAmount : billNetAmount)} Rupees Only
                    </p>
                  </div>
                  <div className="text-right space-y-0.5 min-w-[200px]">
                    <div className="flex justify-between gap-8">
                      <span className="font-semibold">Total Bill:</span>
                      <span className="font-semibold">Rs.{Math.round(billTotal).toLocaleString()}</span>
                    </div>
                    
                    {billDiscountAmount > 0 && (
                      <div className="flex justify-between gap-8">
                        <span>Discount {currentDiscountPercent > 0 ? `(${currentDiscountPercent}%)` : ''}:</span>
                        <span className="font-semibold text-green-600">
                          - Rs.{Math.round(billDiscountAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between gap-8 border-t border-gray-300 pt-0.5">
                      <span className="font-bold">Net Amount:</span>
                      <span className="font-bold">Rs.{Math.round(billNetAmount).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between gap-8">
                      <span>Amount Paid:</span>
                      <span className="font-semibold text-orange-600">Rs.{Math.round(billPaidAmount).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between gap-8">
                      <span>Balance Amount:</span>
                      <span className={`font-semibold ${billBalanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rs.{Math.round(billBalanceAmount).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="border-t border-gray-400 my-1"/>
                    
                    <div className="flex justify-between gap-8">
                      <span className="font-semibold">Payment Status:</span>
                      <span className={`font-bold ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                        {isFullyPaid ? 'FULLY PAID' : 'PENDING'}
                      </span>
                    </div>
                    
                    {billPaidAmount > 0 && (
                      <div className="flex justify-between gap-8">
                        <span>Payment Mode:</span>
                        <span className="font-semibold">{billing.paymentMode || "CASH"}</span>
                      </div>
                    )}
                    
                    {billDiscountAmount > 0 && billing.remarks && (
                      <div className="flex justify-between gap-8">
                        <span>Discount Remark:</span>
                        <span className="font-semibold text-gray-600">{billing.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-3 border-t text-xs text-gray-600">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="mb-2">Thank you for choosing SHRADDHA PATHOLOGY LABORATORY</p>
                      <p>For any queries, please contact us at +91 8779295302</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-2">Authorised Signatory</p>
                      <p>SHRADDHA PATHOLOGY LABORATORY</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== BILL MODAL ===== */}
      {showBillModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-2xl w-[95%] max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex justify-between items-center border-b border-slate-700">
              <h2 className="text-xl font-bold">INVOICE - {selectedBooking.name}</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintBillWithHeader()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
                  title="Print with letterhead"
                >
                  <Printer size={16} /> Print Header
                </button>
                <button
                  onClick={() => handlePrintBillWithoutHeader()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
                  title="Print without letterhead"
                >
                  <Printer size={16} /> Print
                </button>
                <button
                  onClick={() => handleDownloadBillWithHeader()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
                  title="Download PDF with letterhead"
                >
                  <Download size={16} /> PDF Header
                </button>
                <button
                  onClick={() => handleDownloadBillWithoutHeader()}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-2 transition-colors"
                  title="Download PDF without letterhead"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-semibold transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body - Bill Receipt */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <BillReceipt
                booking={selectedBooking}
                billing={billing}
                businessType={businessType}
                numberToWords={numberToWords}
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== REFUND MODAL ===== */}
      {showRefundModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-lg shadow-2xl w-[95%] max-w-md">
            {/* Header */}
            <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b rounded-t-lg">
              <h2 className="text-base font-bold text-gray-800">Refund - {selectedBooking.name}</h2>
              <button
                onClick={() => { setShowRefundModal(false); setRefundAmount(""); setRefundRemark(""); }}
                className="text-gray-500 hover:text-gray-800 border rounded px-2 py-0.5 text-sm"
              >✕</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-36 text-sm font-semibold text-gray-700">Total Amount</label>
                <span className="text-sm font-bold text-gray-900">{total}</span>
              </div>

              <div className="flex items-center gap-4">
                <label className="w-36 text-sm font-semibold text-gray-700">Refund Amount</label>
                <input
                  autoFocus
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  placeholder=""
                  className="flex-1 border-2 border-gray-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-300"
                />
              </div>

              <div className="flex items-start gap-4">
                <label className="w-36 text-sm font-semibold text-gray-700 pt-1">Remark</label>
                <textarea
                  value={refundRemark}
                  onChange={e => setRefundRemark(e.target.value)}
                  rows={4}
                  className="flex-1 border-2 border-red-400 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-300 resize-y"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                onClick={() => {
                  const amt = parseFloat(refundAmount);
                  if (!refundAmount || isNaN(amt) || amt <= 0) {
                    alert("Please enter a valid refund amount.");
                    return;
                  }
                  if (amt > total) {
                    alert(`Refund amount cannot exceed total ₹${total}.`);
                    return;
                  }
                  setBookings(bookings.map(b =>
                    b.bookingId === selectedBooking.bookingId
                      ? { ...b, paymentStatus: "Refunded" }
                      : b
                  ));
                  setShowRefundModal(false);
                  setRefundAmount("");
                  setRefundRemark("");
                  alert(`Refund of ₹${amt} processed for ${selectedBooking.name}.`);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-semibold text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {successPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-80 text-center">
            <div className="text-green-500 text-5xl mb-3">✓</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Success</h3>
            <p className="text-sm text-gray-600 mb-5">{successPopup}</p>
            <button
              onClick={() => setSuccessPopup("")}
              className="bg-orange-500 text-white px-8 py-2 rounded-lg hover:bg-orange-600 text-sm font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Barcode Preview Modal */}
    </div>

    {/* Barcode Modal */}
    {barcodePatientInfo && (
    <BarcodeModal
      isOpen={showBarcodeModal}
      onClose={() => setShowBarcodeModal(false)}
      onPrintOnly={async () => {
        // Trigger iframe print - it's handled by BarcodeModal component
        const iframe = document.getElementById('barcode-print-frame') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          setTimeout(() => {
            iframe.contentWindow?.print();
          }, 100);
        }
      }}
      onPrintAndUpdate={async () => {
        let successCount = 0;
        
        try {
          // Only process selected barcodes - collect test IDs from selected barcode labels
          const selectedTestIds = new Set<number>();
          
          for (const idx of selectedBarcodeIndices) {
            if (idx < barcodeLabels.length) {
              const label = barcodeLabels[idx];
              if (label.testIds && Array.isArray(label.testIds)) {
                label.testIds.forEach((id: number) => selectedTestIds.add(id));
              }
            }
          }
          
          console.log('📝 Selected Test IDs:', Array.from(selectedTestIds));
          console.log(`🖨️ Printing ${selectedBarcodeIndices.size}/${barcodeLabels.length} barcodes`);
          
          // Update status for selected tests
          for (const testId of selectedTestIds) {
            console.log(`🔄 Transitioning test ${testId} to Received status...`);
            try {
              const response = await fetch(`${API_BASE_URL}/results/${testId}/auto-transition/barcode-printed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ changedBy: 'search_booking' })
              });
              const data = await response.json();
              if (data.success) {
                console.log(`✅ Test ${testId} transitioned to Received`);
                successCount++;
              } else {
                console.error(`❌ Test ${testId} failed:`, data.message);
              }
            } catch (error) {
              console.error(`❌ Test ${testId} error:`, error);
            }
          }
        } catch (error) {
          console.error('⚠️ Status transition failed:', error);
        }
        
        // ✅ USE SAME PRINT ONLY APPROACH - NO MODAL
        setTimeout(() => {
          console.log('📄 Status updated, now printing barcodes using Print Only method...');
          
          // Filter only selected barcode labels for printing
          const selectedLabels = barcodeLabels.filter((_, idx) => selectedBarcodeIndices.has(idx));
          
          if (!barcodePatientInfo) {
            console.error('Barcode patient info is missing');
            return;
          }
          
          // Generate same barcode print HTML as Print Only button
          const printHtml = generateCompactBarcodePrintHtml(
            selectedLabels,
            {
              patientName: barcodePatientInfo.patientName,
              gender: barcodePatientInfo.gender,
              age: barcodePatientInfo.age,
              visitId: barcodePatientInfo.visitId
            },
            (value: string) => {
              try {
                const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                
                JsBarcode(svgElement, value, {
                  format: 'CODE128',
                  width: 2,
                  height: 40,
                  margin: 0,
                  lineColor: '#000000',
                  displayValue: false,
                  background: '#ffffff'
                });
                
                return svgElement.innerHTML;
              } catch (error) {
                console.error('❌ Barcode generation error:', error);
                return '';
              }
            }
          );
          
          // Print using window.open approach (same as Print Only)
          const win = window.open('', '_blank');
          if (!win) {
            console.error('Could not open print window');
            return;
          }
          win.document.write(printHtml);
          win.document.close();
          win.focus();
          win.print();
          
          // Close modal and reset state
          setShowBarcodeModal(false);
          setBarcodeSelectedTests(new Set());
          setBarcodeLockedPatientUid(null);
          setBarcodeLockedVisitId(null);
          setSelectedBarcodeIndices(new Set());
          
          if (successCount > 0) {
            setTimeout(() => {
              alert(`✅ ${successCount} test(s) marked as Received and ${selectedBarcodeIndices.size} barcode(s) printed!`);
              // Reload to refresh barcode status
              window.location.reload();
            }, 800);
          }
        }, 500);
      }}
      barcodeLabels={barcodeLabels}
      barcodePatientInfo={barcodePatientInfo}
      selectedBarcodes={selectedBarcodeIndices}
      onBarcodeToggle={handleBarcodeToggle}
      isPrinting={barcodesPrinting}
    />
    )}

    {/* Booking Details Modal - Full Right Panel in Modal */}
    <BookingDetailsModal
      booking={selectedBookingForModal}
      isOpen={showBookingDetailsModal}
      onClose={() => {
        setShowBookingDetailsModal(false);
        setSelectedBookingForModal(null);
      }}
      businessType={businessType}
      allTests={allTests}
      packagesList={packagesList}
      onBookingUpdate={(updatedBooking) => {
        // Update the selected booking in state
        setSelectedBookingForModal(updatedBooking);
        
        // Update all bookings list with the updated booking
        setAllBookings(prevBookings =>
          prevBookings.map(b =>
            b.bookingId === updatedBooking.bookingId ? updatedBooking : b
          )
        );
        
        // Update filtered bookings
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b.bookingId === updatedBooking.bookingId ? updatedBooking : b
          )
        );
        
        console.log('✅ Booking updated successfully:', {
          bookingId: updatedBooking.bookingId,
          newTestsCount: updatedBooking.tests?.length,
          balanceAmount: updatedBooking.balanceAmount,
          discountAmount: updatedBooking.discountAmount
        });
      }}
    />
    </>
  );
}



