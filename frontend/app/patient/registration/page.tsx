"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

import {
  RefreshCcw,
  Star,
  X,
  Calendar,
  UserPlus,
  ChevronDown,
} from "lucide-react";
import { createPatient, searchPatient } from "@/src/api/patient.js";
import { getDoctors, createDoctor, getSpecimenTypes, getFranchises, getCollectionCenters } from "@/src/api/master.js";
import API_BASE_URL from "@/src/api/config.js";

/* ------------------ INLINE DATE PICKER ------------------ */
const DP_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DP_DAYS = ["S","M","T","W","T","F","S"];

const dpToDisplay = (v: any) => {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  return `${d}-${m}-${y}`;
};
const dpToInternal = (digits: any) => {
  if (digits.length < 8) return null;
  const d = digits.slice(0,2), m = digits.slice(2,4), y = digits.slice(4,8);
  if (parseInt(m)<1||parseInt(m)>12||parseInt(d)<1||parseInt(d)>31||parseInt(y)<1900) return null;
  return `${y}-${m}-${d}`;
};

function InlineDatePicker({ value, onChange, placeholder = "DD-MM-YYYY", maxDate, minDate, className = "" }: { value?: string; onChange?: (date: string) => void; placeholder?: string; maxDate?: string; minDate?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState<any>(null);
  const [viewMonth, setViewMonth] = useState<any>(null);
  const [showMonthYear, setShowMonthYear] = useState(false);
  const [inputText, setInputText] = useState(dpToDisplay(value));
  const [inputError, setInputError] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setInputText(dpToDisplay(value)); setInputError(false); }, [value]);
  useEffect(() => {
    if (open) {
      setShowMonthYear(false);
      const parsed = value ? value.split("-").map(Number) : null;
      const base = parsed ? { year: parsed[0], month: parsed[1]-1 } : { year: new Date().getFullYear(), month: new Date().getMonth() };
      setViewYear(base.year); setViewMonth(base.month);
    }
  }, [open]);
  useEffect(() => {
    const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleInputChange = (e: any) => {
    const digits = e.target.value.replace(/\D/g,"").slice(0,8);
    let fmt = digits;
    if (digits.length > 2) fmt = digits.slice(0,2)+"-"+digits.slice(2);
    if (digits.length > 4) fmt = digits.slice(0,2)+"-"+digits.slice(2,4)+"-"+digits.slice(4);
    setInputText(fmt);
    if (digits.length === 8) {
      const internal = dpToInternal(digits);
      if (internal) { setInputError(false); onChange(internal); }
      else setInputError(true);
    } else if (digits.length === 0) { setInputError(false); onChange(""); }
    else setInputError(false);
  };

  const handleDayClick = (day: any) => {
    const mm = String(viewMonth+1).padStart(2,"0"), dd = String(day).padStart(2,"0");
    onChange(`${viewYear}-${mm}-${dd}`); setOpen(false);
  };
  const prevMonth = () => { if (viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };
  const getDIM = (y: any, m: any) => new Date(y,m+1,0).getDate();
  const getFD = (y: any, m: any) => new Date(y,m,1).getDay();
  const isDisabled = (day: any) => {
    const d = new Date(viewYear,viewMonth,day);
    if (maxDate && d > new Date(maxDate)) return true;
    if (minDate && d < new Date(minDate)) return true;
    return false;
  };
  const sel = value ? value.split("-").map(Number) : null;
  const isSelected = (day: any) => sel && sel[0]===viewYear && sel[1]-1===viewMonth && sel[2]===day;
  const isToday = (day: any) => { const t=new Date(); return t.getFullYear()===viewYear&&t.getMonth()===viewMonth&&t.getDate()===day; };
  const daysInMonth = viewYear!==null ? getDIM(viewYear,viewMonth) : 0;
  const firstDay   = viewYear!==null ? getFD(viewYear,viewMonth)   : 0;
  const curYear = new Date().getFullYear();
  const years = Array.from({length:120},(_,i)=>curYear-i);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div className={`h-8 rounded border flex items-center bg-white overflow-hidden
        ${inputError ? "border-red-400 ring-1 ring-red-400" : "border-slate-300 focus-within:ring-1 focus-within:ring-cyan-600 focus-within:border-cyan-600"}`}>
        <input type="text" value={inputText} onChange={handleInputChange}
          onBlur={() => { const d=inputText.replace(/\D/g,""); if(d.length>0&&d.length<8) setInputError(true); else if(d.length===0){setInputError(false);onChange("");} }}
          placeholder={placeholder} maxLength={10}
          className="flex-1 min-w-0 px-2 outline-none bg-transparent text-gray-800 placeholder-gray-400 text-xs h-full" />
        <button type="button" tabIndex={-1} onClick={() => setOpen(o=>!o)}
          className="h-full px-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 border-l border-slate-200 shrink-0 flex items-center">
          <Calendar size={13} />
        </button>
      </div>
      {inputError && <p className="text-red-500 text-xs mt-0.5">Invalid date</p>}
      {open && viewYear!==null && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-3 w-64">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setShowMonthYear(v=>!v)}
              className="flex items-center gap-1 text-sm font-bold text-gray-800 hover:text-cyan-700">
              {DP_MONTHS[viewMonth]} {viewYear}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 7L1 3h8z"/></svg>
            </button>
            {!showMonthYear && (
              <div className="flex gap-1">
                <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </div>
          {showMonthYear ? (
            <div>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {DP_MONTHS.map((m,i) => (
                  <button type="button" key={m} onClick={() => { setViewMonth(i); setShowMonthYear(false); }}
                    className={`text-xs py-1.5 rounded-lg ${viewMonth===i?"bg-cyan-600 text-white font-semibold":"hover:bg-gray-100 text-gray-700"}`}>
                    {m.slice(0,3)}
                  </button>
                ))}
              </div>
              <div className="max-h-32 overflow-y-auto grid grid-cols-3 gap-1">
                {years.map(y => (
                  <button type="button" key={y} onClick={() => { setViewYear(y); setShowMonthYear(false); }}
                    className={`text-xs py-1.5 rounded-lg ${viewYear===y?"bg-cyan-600 text-white font-semibold":"hover:bg-gray-100 text-gray-700"}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-1">
                {DP_DAYS.map((d,i) => <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({length:firstDay}).map((_,i) => <div key={`e${i}`}/>)}
                {Array.from({length:daysInMonth},(_,i)=>i+1).map(day => (
                  <button type="button" key={day} disabled={isDisabled(day)} onClick={() => handleDayClick(day)}
                    className={`flex items-center justify-center text-xs rounded-full mx-auto w-7 h-7
                      ${isSelected(day)?"bg-blue-200 text-blue-800 font-semibold":""}
                      ${isToday(day)&&!isSelected(day)?"border border-cyan-500 text-cyan-700":""}
                      ${!isSelected(day)&&!isDisabled(day)?"hover:bg-gray-100":""}
                      ${isDisabled(day)?"text-gray-300 cursor-not-allowed":"text-gray-800 cursor-pointer"}`}>
                    {day}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------ INLINE CUSTOM SELECT ------------------ */
function InlineSelect({ value, onChange, options, placeholder = "Select", className = "" }: { value?: any; onChange?: (value: any) => void; options: any[]; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : null;
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen(o=>!o)}
        className="h-8 w-full rounded border border-slate-300 px-2 text-xs flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-cyan-600 focus:border-cyan-600">
        <span className={label ? "text-gray-800 truncate" : "text-gray-400"}>{label || placeholder}</span>
        <ChevronDown size={13} className={`shrink-0 ml-1 text-gray-400 transition-transform ${open?"rotate-180":""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="max-h-52 overflow-y-auto py-1">
            {options.map((opt,i) => {
              const val = opt.value ?? opt, lbl = opt.label ?? opt;
              const isSel = val === value;
              return (
                <div key={i} onClick={() => { onChange(val); setOpen(false); }}
                  className={`px-4 py-2.5 text-xs cursor-pointer transition-colors
                    ${isSel ? "bg-cyan-50 text-cyan-800 font-semibold" : "text-gray-700 hover:bg-cyan-50"}
                    ${i < options.length-1 ? "border-b border-gray-100" : ""}`}>
                  {lbl}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------ SAMPLE DATA (FALLBACK) ------------------ */

// Resolved at runtime using fetched specimen types (see specimenTypes state)
const getSampleColor = (sample: any, specimenTypes: any) => {
  if (!Array.isArray(specimenTypes)) return '#cccccc';
  const found = specimenTypes.find((s: any) => s.Sample_Type === sample);
  return found?.Sample_Color || '#cccccc';
};

/* ------------------ COMPONENT ------------------ */

export default function PatientRegistration() {
  const mobileInputRef = useRef(null);
  const doctorDropdownRef = useRef(null);
  const createdAtRef = useRef(null);
  const router = useRouter();
  const rebookingData = null; // location.state is not available in Next.js App Router
  const hideHeader = false; // Check if header should be hidden

  const [firstName, setFirstName] = useState(rebookingData?.firstName || "");
  const [lastName, setLastName] = useState(rebookingData?.lastName || "");
  const [title, setTitle] = useState("MR");
  const [createdBy, setCreatedBy] = useState(() => {
    try {
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');
      // Staff users have a 'name' field; admins only have 'role'
      return admin.name || admin.role || '';
    } catch { return ''; }
  });
  const [existingPatientId, setExistingPatientId] = useState<any>(null); // Track existing patient
  const [foundPatients, setFoundPatients] = useState<any[]>([]); // Store all found patients
  const [showPatientSelectionModal, setShowPatientSelectionModal] = useState(false); // Show patient selection
  const [dob, setDob] = useState(rebookingData?.visitDate?.split(' ')[0] || "");
  const [age, setAge] = useState(rebookingData?.age || "");
  const [mobile, setMobile] = useState(rebookingData?.mobile || "");
  const [email, setEmail] = useState(rebookingData?.email || "");
  const [address, setAddress] = useState(rebookingData?.address || "");
  const [remarks, setRemarks] = useState(rebookingData?.remark || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [selectedTests, setSelectedTests] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountRemark, setDiscountRemark] = useState("");
  const [paid, setPaid] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [printReceipt, setPrintReceipt] = useState(false);
  const [navigateToResult, setNavigateToResult] = useState(false);
  const [showDoctorList, setShowDoctorList] = useState(false);
  const [gender, setGender] = useState(rebookingData?.gender || "");
  const [refDoctor, setRefDoctor] = useState(rebookingData?.referralDoctor || "");
  const [frequentTests, setFrequentTests] = useState<any[]>([]);
  const [filterFrequent, setFilterFrequent] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showAllTests, setShowAllTests] = useState(true);
  const [businessType, setBusinessType] = useState("B2C");

  /* ---- Visit Type ---- */
  const [visitType, setVisitType] = useState("");
  const [reportMode, setReportMode] = useState("");
  const [sampleBarcodeNo, setSampleBarcodeNo] = useState("");

  const [activeTab, setActiveTab] = useState("tests");
  const [refDoctors, setRefDoctors] = useState<any[]>([]);
  const [showRefModal, setShowRefModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showSimilarPatientsDropdown, setShowSimilarPatientsDropdown] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: "", tests: [], b2cCharge: 0, b2bCharge: 0 });
  const [newRef, setNewRef] = useState({ type: "Doctor", name: "", degree: "", compliment: "", mobile: "", email: "", address: "", allowSend: false });

  /* --- Referral Doctor Checkbox Logic --- */
  const [isManualRefDoctor, setIsManualRefDoctor] = useState(false);
  const [manualRefDoctorName, setManualRefDoctorName] = useState("");

  const handleRefDoctorCheckbox = (checked: any) => {
    setIsManualRefDoctor(checked);
    setRefDoctor("");
    setManualRefDoctorName("");
    setShowDoctorList(false);
  };

  /* --- Created At States --- */
  const [showCreatedAtDropdown, setShowCreatedAtDropdown] = useState(false);
  const [createdAtType, setCreatedAtType] = useState("");
  const [selectedCreatedAt, setSelectedCreatedAt] = useState("");
  const [createdAtSearch, setCreatedAtSearch] = useState("");
  const [franchiseOptions, setFranchiseOptions] = useState<any[]>([]);
  const [collectionCenterOptions, setCollectionCenterOptions] = useState<any[]>([]);  /* --- Departments and Packages from API --- */
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [specimenTypes, setSpecimenTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch departments with tests and packages from API
  useEffect(() => {
    fetchDepartmentsData();
    getDoctors().then((res: any) => setDoctorsList(Array.isArray(res) ? res : res?.data || [])).catch(console.error);
    getSpecimenTypes().then(setSpecimenTypes).catch(console.error);
    getFranchises().then((res: any) => setFranchiseOptions(Array.isArray(res) ? res : res?.data || [])).catch(console.error);
    getCollectionCenters().then((res: any) => setCollectionCenterOptions(Array.isArray(res) ? res : res?.data || [])).catch(console.error);
  }, []);

  const fetchDepartmentsData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching departments, tests, and packages...');
      
      const [deptsResponse, testsResponse, packagesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/master/departments`),
        fetch(`${API_BASE_URL}/master/tests`),
        fetch(`${API_BASE_URL}/master/packages/all`)
      ]);

      const [deptsResult, testsResult, packagesResult] = await Promise.all([
        deptsResponse.json(),
        testsResponse.json(),
        packagesResponse.json()
      ]);

      if (deptsResult.success && testsResult.success) {
        // Group tests by department
        const deptMap = {};
        deptsResult.data.forEach(dept => {
          deptMap[dept.id] = {
            id: dept.id,
            name: dept.name,
            tests: [],
            packages: []
          };
        });

        // Add tests to their departments
        testsResult.data.forEach(test => {
          if (deptMap[test.departmentId] && test.isActive && !test.isDeleted) {
            deptMap[test.departmentId].tests.push({
              id: test.id,
              name: test.name,
              departmentId: test.departmentId, // Add departmentId
              sample: test.sampleType || "N/A",
              b2cCharge: test.charges?.[0]?.b2cCharge || 0,
              b2bCharge: test.charges?.[0]?.b2bCharge || 0,
              department: deptMap[test.departmentId].name
            });
          }
        });

        // Add packages to their departments
        if (packagesResult.success) {
          packagesResult.data.forEach(pkg => {
            if (deptMap[pkg.departmentId] && pkg.isActive) {
              const packageTests = pkg.packageTests?.map(pt => pt.test.name) || [];
              
              deptMap[pkg.departmentId].packages.push({
                id: pkg.id,
                name: pkg.name,
                departmentId: pkg.departmentId,
                tests: packageTests,
                packageTests: packageTests,
                b2cCharge: pkg.b2cCharge || 0,
                b2bCharge: pkg.b2bCharge || 0,
                packageTestCharges: pkg.packageTests || [],
                department: deptMap[pkg.departmentId].name
              });
            }
          });
        }

        const departmentsArray = Object.values(deptMap);
        setDepartments(departmentsArray);
        console.log('✅ Loaded departments:', departmentsArray.length);
      }
    } catch (error) {
      console.error('❌ Error fetching departments:', error);
      // Keep empty array, UI will show "No departments found"
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (mobileInputRef.current && !mobileInputRef.current.contains(e.target)) {
        setShowSimilarPatientsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (createdAtRef.current && !createdAtRef.current.contains(e.target)) {
        setShowCreatedAtDropdown(false);
        setCreatedAtSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(e.target)) {
        setShowDoctorList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreatedAtTypeChange = (type: any) => {
    setCreatedAtType(type);
    setCreatedAtSearch("");
    if (type === "Lab") {
      setSelectedCreatedAt("Lab");
      setShowCreatedAtDropdown(false);
    }
  };

  const handleCreatedAtSelect = (name: any) => {
    setSelectedCreatedAt(`${createdAtType === "CollectionCenter" ? "Collection Center" : createdAtType}: ${name}`);
    setShowCreatedAtDropdown(false);
    setCreatedAtSearch("");
    setCreatedAtType("");
  };

  const filteredCreatedAtOptions = () => {
    const list = createdAtType === "Franchise" ? franchiseOptions : collectionCenterOptions;
    return list.filter(o => 
      o.name.toLowerCase().includes(createdAtSearch.toLowerCase()) ||
      (o.location && o.location.toLowerCase().includes(createdAtSearch.toLowerCase()))
    );
  };

  const saveRef = async () => {
    if (!newRef.name) return alert("Please enter name");
    
    try {
      // Save to database
      const doctorData = {
        name: newRef.name,
        type: newRef.type,
        degree: newRef.degree || "",
        compliment: parseFloat(newRef.compliment) || 0,
        mobile: newRef.mobile || "",
        email: newRef.email || "",
        address: newRef.address || "",
        allowSendReport: newRef.allowSend || false
      };
      
      const result = await createDoctor(doctorData);
      
      // Refresh the doctors list for the dropdown
      const doctors = await getDoctors();
      setDoctorsList(doctors);
      
      // Auto-select the newly added doctor in the dropdown
      setRefDoctor(`Dr. ${newRef.name}`);
      setIsManualRefDoctor(false);
      
      // Reset form and close modal
      setNewRef({ type: "Doctor", name: "", degree: "", compliment: "", mobile: "", email: "", address: "", allowSend: false });
      setShowRefModal(false);
      
      alert("Referral doctor added successfully and selected!");
    } catch (error) {
      console.error("Error saving referral doctor:", error);
      alert("Failed to save referral doctor: " + (error.message || "Unknown error"));
    }
  };

  /* ============ LOCALSTORAGE PERSISTENCE ============ */
  const STORAGE_KEY = 'patientRegistrationDraft';

  // Load saved form data on component mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        
        // Check if data is not too old (e.g., older than 7 days)
        const daysSinceLastSave = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSave > 7) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        // Restore patient info
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.title) setTitle(data.title);
        if (data.dob) setDob(data.dob);
        if (data.age) setAge(data.age);
        if (data.mobile) setMobile(data.mobile);
        if (data.email) setEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.gender) setGender(data.gender);
        if (data.remarks) setRemarks(data.remarks);
        if (data.createdBy) setCreatedBy(data.createdBy);
        if (data.selectedCreatedAt) setSelectedCreatedAt(data.selectedCreatedAt);
        
        // Restore registration details
        if (data.visitType) setVisitType(data.visitType);
        if (data.reportMode) setReportMode(data.reportMode);
        if (data.sampleBarcodeNo) setSampleBarcodeNo(data.sampleBarcodeNo);
        if (data.refDoctor) setRefDoctor(data.refDoctor);
        if (data.isManualRefDoctor !== undefined) setIsManualRefDoctor(data.isManualRefDoctor);
        if (data.manualRefDoctorName) setManualRefDoctorName(data.manualRefDoctorName);
        
        // Restore selected tests
        if (data.selectedTests && Array.isArray(data.selectedTests)) {
          setSelectedTests(data.selectedTests);
        }
        
        // Restore billing
        if (data.discount !== undefined) setDiscount(data.discount);
        if (data.discountPercent !== undefined) setDiscountPercent(data.discountPercent);
        if (data.discountRemark) setDiscountRemark(data.discountRemark);
        if (data.paid !== undefined) setPaid(data.paid);
        if (data.paymentMode) setPaymentMode(data.paymentMode);
        if (data.businessType) setBusinessType(data.businessType);
        
        console.log('✅ Restored form data from localStorage');
      }
    } catch (error) {
      console.error('Error loading saved form data:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []); // Run only once on mount

  // Save form data to localStorage whenever it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        // If all key fields are empty, remove the draft instead of saving
        if (!firstName && !lastName && !mobile && selectedTests.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        const dataToSave = {
          firstName, lastName, title, dob, age, mobile, email, address,
          gender, remarks, selectedCreatedAt, visitType, reportMode,
          sampleBarcodeNo, refDoctor, isManualRefDoctor, manualRefDoctorName,
          selectedTests, discount, discountPercent, discountRemark,
          paid, paymentMode, businessType,
          timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [
    firstName, lastName, title, dob, age, mobile, email, address, gender, remarks,
    selectedCreatedAt, visitType, reportMode, sampleBarcodeNo,
    refDoctor, isManualRefDoctor, manualRefDoctorName, selectedTests,
    discount, discountPercent, discountRemark, paid, paymentMode, businessType
  ]);

  // Clear localStorage after successful registration
  const clearSavedFormData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Cleared saved form data');
    } catch (error) {
      console.error('Error clearing saved form data:', error);
    }
  };

  // Manual clear form function
  const handleClearForm = () => {
    const loggedUser = (() => {
      try {
        const a = JSON.parse(localStorage.getItem('admin') || '{}');
        return a.name || a.role || '';
      } catch { return ''; }
    })();
    setFirstName("");
    setLastName("");
    setTitle("MR");
    setDob("");
    setAge("");
    setMobile("");
    setEmail("");
    setAddress("");
    setGender("");
    setRemarks("");
    setCreatedBy(loggedUser);
    setSelectedCreatedAt("");
    setVisitType("");
    setReportMode("");
    setSampleBarcodeNo("");
    setRefDoctor("");
    setIsManualRefDoctor(false);
    setManualRefDoctorName("");
    setSelectedTests([]);
    setDiscount(0);
    setDiscountPercent(0);
    setDiscountRemark("");
    setPaid(0);
    setPaymentMode("Cash");
    setBusinessType("B2C");
    setExistingPatientId(null);
    clearSavedFormData();
  };
  /* ============ END LOCALSTORAGE PERSISTENCE ============ */
  /* ---------------- BILL ---------------- */

  const total = selectedTests.reduce((s, t) => s + (businessType === "B2C" ? t.b2cCharge : t.b2bCharge), 0);

  const handleDiscountPercentChange = (value: any) => {
    if (value === '') { setDiscountPercent(0); setDiscount(0); return; }
    const percent = parseInt(value) || 0;
    setDiscountPercent(percent);
    setDiscount(Math.round((total * percent) / 100));
  };

  const handleDiscountChange = (value: any) => {
    if (value === '') { setDiscount(0); setDiscountPercent(0); return; }
    const amount = parseInt(value) || 0;
    setDiscount(amount);
    setDiscountPercent(total > 0 ? Math.round((amount * 100) / total) : 0);
  };

  const handlePaymentChange = (value: any) => {
    if (value === '') { setPaid(0); return; }
    const amount = parseInt(value) || 0;
    setPaid(amount);
  };

  const input = "h-8 rounded border border-slate-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600 w-full";

  const handleDobChange = (value: any) => {
    setDob(value);
    if (!value) return setAge("");
    const birthDate = new Date(value);
    const today = new Date();
    let a = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
    setAge(a >= 0 ? a : "");
  };

  const handleMobileChange = async (value) => {
    if (!/^\d{0,10}$/.test(value)) return;
    setMobile(value);
    setShowSimilarPatientsDropdown(false);

    if (value.length >= 3) {
      try {
        const response = await searchPatient(value, null);
        const patients = response?.data || [];
        if (patients.length > 0) {
          setFoundPatients(patients);
          setShowSimilarPatientsDropdown(true);
        } else {
          setFoundPatients([]);
        }
      } catch (error) {
        console.error('❌ Error searching patient:', error);
      }
    } else {
      setFoundPatients([]);
    }
  };

  const handleEmailChange = async (value) => {
    setEmail(value);
    
    // Auto-fill if email is valid
    if (value && value.includes('@') && value.includes('.')) {
      try {
        const response = await searchPatient(null, value);
        const patients = response?.data || [];
        
        if (patients && patients.length > 0) {
          // Store all found patients
          setFoundPatients(patients);
          
          if (patients.length === 1) {
            // Only one patient found - show confirmation
            const patient = patients[0];
            const nameMatches = !firstName || 
              (firstName.toLowerCase() === patient.firstName?.toLowerCase() && 
               (!lastName || lastName.toLowerCase() === patient.lastName?.toLowerCase()));
            
            if (nameMatches) {
              const shouldFill = window.confirm(
                `Found existing patient with this email:\n\n` +
                `Patient ID: ${patient.patientId}\n` +
                `Name: ${patient.firstName} ${patient.lastName}\n` +
                `Mobile: ${patient.mobile}\n` +
                `Email: ${patient.email || 'N/A'}\n\n` +
                `Is this the same patient?\n\n` +
                `Click OK to add tests to existing patient record\n` +
                `Click Cancel to create a new patient with new ID`
              );
              
              if (shouldFill) {
                fillPatientData(patient);
              } else {
                setExistingPatientId(null);
                alert(
                  `New patient will be created with a new Patient ID.\n\n` +
                  `Note: This email is already registered to:\n` +
                  `${patient.firstName} ${patient.lastName} (${patient.patientId})`
                );
              }
            } else {
              const createNew = window.confirm(
                `⚠️ DIFFERENT PATIENT DETECTED\n\n` +
                `This email is registered to:\n` +
                `Patient ID: ${patient.patientId}\n` +
                `Name: ${patient.firstName} ${patient.lastName}\n\n` +
                `But you entered:\n` +
                `Name: ${firstName} ${lastName}\n\n` +
                `The names are DIFFERENT!\n\n` +
                `Click OK to create NEW patient with NEW Patient ID\n` +
                `Click Cancel to use existing patient record`
              );
              
              if (createNew) {
                setExistingPatientId(null);
                alert(
                  `✅ New patient will be created\n\n` +
                  `A new Patient ID will be generated for:\n` +
                  `${firstName} ${lastName}\n` +
                  `Email: ${value}`
                );
              } else {
                fillPatientData(patient);
              }
            }
          } else {
            // Multiple patients found - show selection modal
            setShowPatientSelectionModal(true);
          }
        }
      } catch (error) {
        console.error('Error searching patient:', error);
      }
    }
  };

  const fillPatientData = (patient: any) => {
    // Store existing patient ID
    setExistingPatientId(patient.id);
    
    // Fill ONLY Patient Identity fields
    setTitle(patient.title || "MR");
    setFirstName(patient.firstName || "");
    setLastName(patient.lastName || "");
    setDob(patient.dob ? patient.dob.split('T')[0] : "");
    setAge(patient.age?.toString() || "");
    setGender(patient.gender || "");
    setMobile(patient.mobile || "");
    setEmail(patient.email || "");
    setCreatedBy(patient.createdBy || "");
    setSelectedCreatedAt(patient.createdAtLocation || "");
    setAddress(patient.address || "");
    
    // DO NOT fill Registration Details - leave empty for new registration
    // visitType, reportMode, referralDoctor, date, time, sampleBarcodeNo, remarks
    
    // DO NOT fill Billing Details - leave empty for new registration
    // discount, discountPercent, discountRemark, paid, paymentMode
    
    // Show patient's previous tests if any
    if (patient.tests && patient.tests.length > 0) {
      alert(
        `Existing Patient Found!\n\n` +
        `Patient ID: ${patient.patientId}\n` +
        `Name: ${patient.firstName} ${patient.lastName}\n\n` +
        `Previous Tests (${patient.tests.length}):\n` +
        patient.tests.slice(0, 3).map(t => `• ${t.testName} (${t.department})`).join('\n') +
        (patient.tests.length > 3 ? `\n... and ${patient.tests.length - 3} more` : '') +
        `\n\nPatient Identity fields have been filled.\n` +
        `Please enter new Registration and Billing details for this visit.`
      );
    } else {
      alert(
        `Existing Patient Found!\n\n` +
        `Patient ID: ${patient.patientId}\n` +
        `Name: ${patient.firstName} ${patient.lastName}\n\n` +
        `This patient has no previous tests.\n\n` +
        `Patient Identity fields have been filled.\n` +
        `Please enter Registration and Billing details for this visit.`
      );
    }
  };

  const handleRegister = () => {
    // Validate ALL Patient Identity fields as mandatory
    const missingFields = [];
    if (!title) missingFields.push("Title");
    if (!firstName) missingFields.push("First Name");
    if (!lastName) missingFields.push("Last Name");
    if (!age) missingFields.push("Age");
    if (!gender) missingFields.push("Gender");
    if (!mobile) missingFields.push("Mobile");
    if (!selectedCreatedAt) missingFields.push("Created At");
    if (!address) missingFields.push("Address");
    
    if (missingFields.length > 0) {
      return alert(`Please fill the following mandatory fields:\n\n• ${missingFields.join('\n• ')}`);
    }
    
    if (mobile.length !== 10) return alert("Mobile must be 10 digits");
    if (email && !email.endsWith("@gmail.com")) return alert("Email must end with @gmail.com");
    if (selectedTests.length === 0) return alert("Add at least one test");
    setShowRegistrationModal(true);
  };

  const handleSaveRegistration = async () => {
    try {
      // Calculate billing amounts
      const totalAmt = total;
      const discAmt = discount;
      const discPct = discountPercent;
      const paidAmt = paid;
      const balAmt = (totalAmt - discAmt) - paidAmt;
      
      // Tests are already expanded (packages expanded on add)
      const expandedTests = selectedTests.map(item => ({
        id: item.id,
        departmentId: item.departmentId,
        name: item.name,
        department: item.department || "General",
        sample: item.sample || "N/A",
        charge: businessType === "B2C" ? item.b2cCharge : item.b2bCharge,
        packageName: item.fromPackage || null
      }));
      
      // Prepare patient data for backend with all fields
      const patientData = {
        // Existing patient ID (if found)
        existingPatientId: existingPatientId,
        // Patient Identity
        title: title,
        firstName: firstName,
        lastName: lastName || null,
        dob: dob || null,
        age: parseInt(age) || null,
        gender: gender,
        mobile: mobile,
        email: email || null,
        createdBy: createdBy || null,
        createdAtLocation: selectedCreatedAt || null,
        address: address || null,
        // Registration Details
        visitType: visitType || null,
        reportMode: reportMode || null,
        referralDoctor: isManualRefDoctor ? manualRefDoctorName : refDoctor || null,
        visitDate: date || null,
        visitTime: time || null,
        sampleBarcodeNo: sampleBarcodeNo || null,
        remarks: remarks || null,
        // Billing Details
        totalAmount: totalAmt,
        discountPercent: discPct,
        discountAmount: discAmt,
        discountRemark: discountRemark || null,
        paidAmount: paidAmt,
        balanceAmount: balAmt,
        paymentMode: paymentMode,
        businessType: businessType,
        // Tests (expanded from packages)
        tests: expandedTests
      };

      console.log('Sending patient data:', patientData);
      const response = await createPatient(patientData);
      
      console.log("Patient registered successfully:", response);
      
      // Clear saved form data after successful registration
      clearSavedFormData();
      
      // Handle response structure correctly - response.data contains the patient object
      const patientId = response?.data?.patientId || response?.patientId || 'N/A';
      
      // Print BEFORE showing alert if checkbox is checked
      if (printReceipt) {
        // Print immediately while modal is still visible
        console.log('Triggering print with modal visible...');
        window.print();
        
        // Show success message after print
        const message = existingPatientId 
          ? `Tests Added Successfully ✅\nPatient ID: ${patientId}\n\nNew tests have been added to existing patient record.`
          : `Patient Registered Successfully ✅\nPatient ID: ${patientId}`;
        alert(message);
        
        // Close modal and reload
        setShowRegistrationModal(false);
        if (navigateToResult) console.log("Navigating to result page...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // No print - show alert, close modal and reload
        const message = existingPatientId 
          ? `Tests Added Successfully ✅\nPatient ID: ${patientId}\n\nNew tests have been added to existing patient record.`
          : `Patient Registered Successfully ✅\nPatient ID: ${patientId}`;
        alert(message);
        
        setShowRegistrationModal(false);
        if (navigateToResult) console.log("Navigating to result page...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("Error saving registration:", error);
      alert(`Failed to register patient: ${error.message}`);
    }
  };

  /* ---------------- ADD REMOVE ---------------- */

  const addTest = (test: any) => {
    if (!selectedTests.find((t) => t.name === test.name))
      setSelectedTests([...selectedTests, test]);
    const exists = frequentTests.find(t => t.name === test.name);
    if (exists) {
      setFrequentTests(frequentTests.map(t => t.name === test.name ? {...t, count: (t.count || 1) + 1} : t).sort((a, b) => (b.count || 0) - (a.count || 0)));
    } else {
      setFrequentTests([...frequentTests, {...test, count: 1}].sort((a, b) => (b.count || 0) - (a.count || 0)));
    }
  };

  /* --- Helper: distribute package charge evenly with remainder on first tests --- */
  const distributePackageCharge = (pkg: any, tests: any) => {
    const count = tests.length;
    if (count === 0) return tests;
    const baseB2C = Math.floor((pkg.b2cCharge || 0) / count);
    const baseB2B = Math.floor((pkg.b2bCharge || 0) / count);
    const remB2C = (pkg.b2cCharge || 0) - baseB2C * count;
    const remB2B = (pkg.b2bCharge || 0) - baseB2B * count;
    return tests.map((t, i) => ({
      ...t,
      b2cCharge: baseB2C + (i < remB2C ? 1 : 0),
      b2bCharge: baseB2B + (i < remB2B ? 1 : 0),
    }));
  };

  const addPackage = (pkg: any) => {
    const deptTests = departments.flatMap(d => d.tests.map(t => ({ ...t, department: d.name })));
    const pkgTests = (pkg.tests || [])
      .map(testName => deptTests.find(t => t.name === testName))
      .filter(Boolean);
    if (pkgTests.length === 0) return;
    const newItems = pkgTests
      .filter(t => !selectedTests.find(st => st.name === t.name))
      .map(t => ({ ...t, fromPackage: pkg.name }));
    if (newItems.length > 0) {
      setSelectedTests([...selectedTests, ...distributePackageCharge(pkg, newItems)]);
    }
  };

  const saveNewPackage = () => {
    if (!newPackage.name || newPackage.tests.length === 0) return alert("Please enter package name and select tests");
    if (!selectedDept) return alert("Please select a department first");
    selectedDept.packages.push(newPackage);
    alert("Package added successfully!");
    setNewPackage({ name: "", tests: [], b2cCharge: 0, b2bCharge: 0 });
    setShowPackageModal(false);
  };

  const removeTest = (name: any) => {
    const testToRemove = selectedTests.find(t => t.name === name);
    const remaining = selectedTests.filter(t => t.name !== name);

    if (testToRemove?.fromPackage) {
      const pkgName = testToRemove.fromPackage;
      const pkg = departments.flatMap(d => d.packages).find(p => p.name === pkgName);
      const remainingPkgTests = remaining.filter(t => t.fromPackage === pkgName);

      if (pkg && remainingPkgTests.length > 0) {
        const redistributed = distributePackageCharge(pkg, remainingPkgTests);
        setSelectedTests(remaining.map(t =>
          t.fromPackage === pkgName
            ? redistributed.find(r => r.name === t.name) || t
            : t
        ));
        return;
      }
    }

    setSelectedTests(remaining);
  };
  const handlePrint = () => window.print();

  /* ---------------- FILTER ---------------- */

  const allPackages = departments.flatMap(d => d.packages.map(p => ({...p, department: d.name})));
  const displayPackages = allPackages.filter(pkg => pkg.name.toLowerCase().includes(packageSearch.toLowerCase()));

  /* ---------------- UI ---------------- */

  return (
    <>
    <style jsx>{`
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      input[type="number"] { -moz-appearance: textfield; }
      
      /* Mandatory field styling */
      input[required]::placeholder,
      select[required]:invalid {
        color: #9CA3AF;
      }
      
      input[required]::placeholder::after,
      select[required]:invalid::after {
        content: " *";
        color: #EF4444;
        font-weight: bold;
      }
    `}</style>

    {!hideHeader && <Header/>}

    <div className="w-full px-3 sm:px-6 mt-4">
      <PageHeader title="Patient Registration" icon={UserPlus} path="Patient" />

      {/* TOP BAR */}
      <div className="bg-white rounded-xl shadow p-4 mb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* LEFT - Patient Identity */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Patient Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <InlineSelect
                value={title}
                onChange={setTitle}
                options={["MR","MRS","MISS"]}
                placeholder="Title"
              />
              <input 
                className={input} 
                placeholder="First Name *" 
                value={firstName}
                autoComplete="off"
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[a-zA-Z\s]*$/.test(val)) setFirstName(val.toUpperCase());
                }} 
                style={{ textTransform: 'uppercase' }}
                required 
              />
              <input 
                className={input} 
                placeholder="Last Name *" 
                value={lastName}
                autoComplete="off"
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[a-zA-Z\s]*$/.test(val)) setLastName(val.toUpperCase());
                }} 
                style={{ textTransform: 'uppercase' }}
                required 
              />
              <InlineDatePicker value={dob} onChange={handleDobChange} placeholder="DOB" maxDate={new Date().toISOString().split("T")[0]} className="w-full" />
              <input className={input} placeholder="Age *" value={age} readOnly required />
              <InlineSelect
                value={gender}
                onChange={setGender}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                ]}
                placeholder="Gender *"
              />
              <div className="relative" ref={mobileInputRef}>
                <input className={input} placeholder="Mobile *" value={mobile} onChange={(e) => handleMobileChange(e.target.value)} maxLength={10} required />
                {showSimilarPatientsDropdown && foundPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-0.5 z-50 overflow-hidden">
                    <div className="bg-cyan-50 px-4 py-2 border-b border-cyan-100">
                      <p className="text-xs font-semibold text-cyan-800">{foundPatients.length} patient{foundPatients.length > 1 ? 's' : ''} found</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {foundPatients.map((patient, i) => (
                        <div
                          key={patient.patientId}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            fillPatientData(patient);
                            setShowSimilarPatientsDropdown(false);
                          }}
                          className={`px-4 py-2.5 cursor-pointer hover:bg-cyan-50 ${i < foundPatients.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <div className="text-xs font-semibold text-gray-800">{patient.title} {patient.firstName} {patient.lastName}</div>
                          <div className="text-xs text-gray-400">{patient.mobile}</div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const currentMobile = mobile;
                          setShowSimilarPatientsDropdown(false);
                          setFoundPatients([]);
                          setMobile(currentMobile);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 w-full text-center"
                      >
                        + Add new with this number
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <input className={input} placeholder="Email" value={email} onChange={(e) => handleEmailChange(e.target.value)} />
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-0.5">Created By</label>
                <div className="text-cyan-700 font-medium text-sm cursor-not-allowed select-none">
                  {createdBy || '—'}
                </div>
              </div>

              {/* Created At - Custom Dropdown */}
              <div className="relative" ref={createdAtRef}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatedAtDropdown(!showCreatedAtDropdown);
                    // Pre-select the type based on current selection when reopening
                    if (!showCreatedAtDropdown && selectedCreatedAt) {
                      if (selectedCreatedAt.startsWith("Franchise:")) setCreatedAtType("Franchise");
                      else if (selectedCreatedAt.startsWith("Collection Center:")) setCreatedAtType("CollectionCenter");
                      else if (selectedCreatedAt === "Lab") setCreatedAtType("Lab");
                      else setCreatedAtType("");
                    } else {
                      setCreatedAtType("");
                    }
                    setCreatedAtSearch("");
                  }}
                  className={`${input} flex items-center justify-between cursor-pointer bg-white text-left overflow-hidden`}
                >
                  <span className={`truncate ${selectedCreatedAt ? "text-gray-800" : "text-gray-400"}`}>
                    {selectedCreatedAt || "Created At *"}
                  </span>
                  <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
                </button>

                {showCreatedAtDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-xl mt-1 z-50 min-w-[260px]">
                    <div className="p-3 border-b bg-gray-50 rounded-t-lg">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Select Type</p>
                      <div className="flex flex-col gap-2">
                        {["Franchise", "CollectionCenter", "Lab"].map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                            <input
                              type="radio"
                              name="createdAtType"
                              checked={createdAtType === type}
                              onChange={() => handleCreatedAtTypeChange(type)}
                              className="accent-cyan-600"
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {type === "CollectionCenter" ? "Collection Center" : type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {(createdAtType === "Franchise" || createdAtType === "CollectionCenter") && (
                      <div className="p-2">
                        <input
                          className={`${input} mb-2`}
                          placeholder={`Search ${createdAtType === "Franchise" ? "Franchise" : "Collection Center"}...`}
                          value={createdAtSearch}
                          onChange={(e) => setCreatedAtSearch(e.target.value)}
                          autoFocus
                        />
                        <div className="max-h-40 overflow-auto py-1">
                          {filteredCreatedAtOptions().length > 0 ? (
                            filteredCreatedAtOptions().map((opt, i, arr) => {
                              const isSelected = selectedCreatedAt === `${createdAtType === "CollectionCenter" ? "Collection Center" : createdAtType}: ${opt.name}`;
                              return (
                                <div key={opt.id} onClick={() => handleCreatedAtSelect(opt.name)}
                                  className={`px-4 py-2.5 text-xs cursor-pointer transition-colors
                                    ${isSelected ? 'bg-cyan-50 text-cyan-800 font-semibold' : 'text-gray-700 hover:bg-cyan-50'}
                                    ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}
                                  `}>
                                  <div className="font-medium">{opt.name}</div>
                                  {opt.location && <div className="text-gray-400 text-[10px]">{opt.location}</div>}
                                </div>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-xs text-gray-400 text-center">No options found</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <textarea className={input} placeholder="Address *" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required></textarea>
            </div>
          </div>

          {/* RIGHT - Registration Details */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Registration Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

              <InlineSelect
                value={visitType}
                onChange={setVisitType}
                options={[
                  { value: "Walk-In", label: "Walk-In" },
                  { value: "At Home", label: "At Home" },
                ]}
                placeholder="Visit Type"
              />

              <InlineSelect
                value={reportMode}
                onChange={setReportMode}
                options={["By Hand","SMS","WhatsApp","Email","Courier"]}
                placeholder="Report Mode"
              />

              {/* Referral Doctor with Checkbox */}
              <div className="flex gap-1 items-center relative" ref={doctorDropdownRef}>
                <div className="flex items-center shrink-0">
                  <input
                    type="checkbox"
                    id="refDoctorCheckbox"
                    checked={isManualRefDoctor}
                    onChange={(e) => handleRefDoctorCheckbox(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    title={isManualRefDoctor ? "Switch to search mode" : "Switch to manual entry mode"}
                  />
                </div>
                <div className="flex-1 relative">
                  {isManualRefDoctor ? (
                    <input
                      className={input}
                      placeholder="Type Referral Doctor Name"
                      value={manualRefDoctorName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || val === "D" || val === "Dr" || val === "Dr.") {
                          setManualRefDoctorName(val);
                        } else if (!val.startsWith("Dr. ")) {
                          setManualRefDoctorName("Dr. " + val.replace(/^Dr\.?\s*/i, ""));
                        } else {
                          setManualRefDoctorName(val);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <input
                        className={input}
                        placeholder="Search Referral Doctor"
                        value={refDoctor}
                        onChange={(e) => setRefDoctor(e.target.value)}
                        onFocus={() => setShowDoctorList(true)}
                      />
                      {showDoctorList && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 z-10 overflow-hidden">
                          <div className="max-h-48 overflow-y-auto py-1">
                            {doctorsList
                              .filter(doc => `Dr. ${doc.name}`.toLowerCase().includes(refDoctor.toLowerCase()) || doc.name.toLowerCase().includes(refDoctor.toLowerCase()))
                              .map((doc, i, arr) => (
                                <div key={doc.id}
                                  onClick={() => { setRefDoctor(`Dr. ${doc.name}`); setShowDoctorList(false); }}
                                  className={`px-4 py-2.5 cursor-pointer hover:bg-cyan-50 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                                  <div className="font-semibold text-xs text-gray-800">Dr. {doc.name}</div>
                                  <div className="text-xs text-gray-400">{doc.degree}{doc.degree && doc.type ? ' · ' : ''}{doc.type}</div>
                                </div>
                              ))}
                            {doctorsList.filter(doc => `Dr. ${doc.name}`.toLowerCase().includes(refDoctor.toLowerCase()) || doc.name.toLowerCase().includes(refDoctor.toLowerCase())).length === 0 && (
                              <div className="px-4 py-3 text-xs text-gray-400 text-center">No doctors found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowRefModal(true)}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white px-3 rounded h-8 shrink-0 flex items-center justify-center font-bold"
                  title="Add New Referral Doctor"
                >+</button>
              </div>

              <InlineDatePicker value={date} onChange={setDate} placeholder="Visit Date" className="w-full" />
              <input type='time' className={input} value={time} onChange={(e) => setTime(e.target.value)} />
              <input className={input} placeholder="Sample Barcode No" value={sampleBarcodeNo} onChange={(e) => setSampleBarcodeNo(e.target.value)} />
              <textarea className={input} placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}></textarea>
            </div>
          </div>

        </div>
      </div>

      {/* Package Modal */}
      {showPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Package</h3>
              <button onClick={() => setShowPackageModal(false)} className="text-gray-500 text-2xl">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold">Package Name*</label>
                <input className={input} value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} placeholder="Enter package name" />
              </div>
              <div>
                <label className="text-sm font-semibold">Select Tests*</label>
                <div className="border rounded p-2 max-h-40 overflow-auto">
                  {selectedDept?.tests.map(test => (
                    <label key={test.name} className="flex items-center gap-2 p-1 hover:bg-gray-50">
                      <input type="checkbox" checked={newPackage.tests.includes(test.name)}
                        onChange={(e) => {
                          if (e.target.checked) setNewPackage({...newPackage, tests: [...newPackage.tests, test.name]});
                          else setNewPackage({...newPackage, tests: newPackage.tests.filter(t => t !== test.name)});
                        }} />
                      <span className="text-xs">{test.name} - B2C: ₹{test.b2cCharge} | B2B: ₹{test.b2bCharge}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">B2C Charge*</label>
                <input type="number" className={input} value={newPackage.b2cCharge} onChange={e => setNewPackage({...newPackage, b2cCharge: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-sm font-semibold">B2B Charge*</label>
                <input type="number" className={input} value={newPackage.b2bCharge} onChange={e => setNewPackage({...newPackage, b2bCharge: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowPackageModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={saveNewPackage} className="bg-cyan-700 text-white px-4 py-2 rounded">Save Package</button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showRefModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-cyan-800">Add Referral Doctor</h3>
              <button 
                onClick={() => {
                  setShowRefModal(false);
                  setNewRef({ type: "Doctor", name: "", degree: "", compliment: "", mobile: "", email: "", address: "", allowSend: false });
                }} 
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >&times;</button>
            </div>
            <div className="grid grid-cols-12 gap-3 text-sm">
              <div className="col-span-4 flex items-center">Referral Type*</div>
              <div className="col-span-8">
                <label className="mr-4 inline-flex items-center cursor-pointer">
                  <input type="radio" name="rtype" checked={newRef.type==='Doctor'} onChange={() => setNewRef({...newRef, type: 'Doctor'})} className="mr-2" /> 
                  Doctor
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="radio" name="rtype" checked={newRef.type==='Hospital'} onChange={() => setNewRef({...newRef, type: 'Hospital'})} className="mr-2" /> 
                  Hospital
                </label>
              </div>
              <div className="col-span-4 flex items-center">Name*</div>
              <div className="col-span-8">
                <input 
                  className={input} 
                  value={newRef.name} 
                  onChange={e => setNewRef({...newRef, name: e.target.value})} 
                  placeholder="Enter doctor/hospital name" 
                  required
                />
              </div>
              <div className="col-span-4 flex items-center">Degree</div>
              <div className="col-span-8">
                <input 
                  className={input} 
                  value={newRef.degree} 
                  onChange={e => setNewRef({...newRef, degree: e.target.value})} 
                  placeholder="e.g., MBBS, MD"
                />
              </div>
              <div className="col-span-4 flex items-center">Compliment %</div>
              <div className="col-span-8">
                <input 
                  type="number"
                  className={input} 
                  value={newRef.compliment} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                      setNewRef({...newRef, compliment: val});
                    }
                  }} 
                  placeholder="0-100"
                  min="0"
                  max="100"
                />
              </div>
              <div className="col-span-4 flex items-center">Mobile</div>
              <div className="col-span-8">
                <input 
                  type="tel"
                  className={input} 
                  value={newRef.mobile} 
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d{0,10}$/.test(val)) {
                      setNewRef({...newRef, mobile: val});
                    }
                  }} 
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>
              <div className="col-span-4 flex items-center">Email</div>
              <div className="col-span-8">
                <input 
                  type="email"
                  className={input} 
                  value={newRef.email} 
                  onChange={e => setNewRef({...newRef, email: e.target.value})} 
                  placeholder="email@example.com"
                />
              </div>
              <div className="col-span-4 flex items-start pt-2">Address</div>
              <div className="col-span-8">
                <textarea 
                  className={input} 
                  value={newRef.address} 
                  onChange={e => setNewRef({...newRef, address: e.target.value})} 
                  rows={3} 
                  placeholder="Enter address"
                />
              </div>
              <div className="col-span-12">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="mr-2 w-4 h-4 cursor-pointer" 
                    checked={newRef.allowSend} 
                    onChange={e => setNewRef({...newRef, allowSend: e.target.checked})} 
                  />
                  <span className="text-sm">Allow to send report on balance amount</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => {
                  setShowRefModal(false);
                  setNewRef({ type: "Doctor", name: "", degree: "", compliment: "", mobile: "", email: "", address: "", allowSend: false });
                }} 
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveRef} 
                className="bg-cyan-700 hover:bg-cyan-800 text-white px-6 py-2 rounded transition-colors font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN 3-COLUMN */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-auto md:h-[75vh]">

        {/* LEFT */}
        <div className="md:col-span-3 col-span-12 bg-white rounded-xl shadow flex flex-col">
          <div className="flex text-xs font-semibold rounded-tl-xl rounded-tr-xl overflow-hidden">
            <button onClick={() => { setActiveTab("tests"); setShowAllTests(true); setSelectedDept(null); setSelectedPackage(null); }}
              className={`flex-1 p-2 ${activeTab === "tests" ? "bg-cyan-700 text-white" : "bg-gray-200"}`}>Department</button>
            <button onClick={() => { setActiveTab("packages"); setSelectedPackage(null); setShowAllTests(false); }}
              className={`flex-1 p-2 ${activeTab === "packages" ? "bg-cyan-700 text-white" : "bg-gray-200"}`}>Packages</button>
          </div>
          <div className="flex-1 overflow-auto text-xs" style={{ maxHeight: 'calc(75vh - 40px)' }}>
            {activeTab === "tests" && (loading ? (
              <div className="p-4 text-center text-gray-400">Loading departments...</div>
            ) : departments.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No departments found</div>
            ) : (
              departments.map((d) => (
                <div key={d.name}
                  onClick={() => { setSelectedDept(d); setShowAllTests(false); setSelectedPackage(null); }}
                  className={`p-2 border-b cursor-pointer hover:bg-cyan-50 ${selectedDept?.name === d.name && !showAllTests ? 'bg-cyan-100 font-semibold' : ''}`}
                >{d.name}</div>
              ))
            ))}
            {activeTab === "packages" && (
              <>
                <div className="p-2 border-b sticky top-0 bg-white">
                  <input className={input} placeholder="Search Package" value={packageSearch} onChange={(e) => setPackageSearch(e.target.value)} />
                </div>
                {displayPackages.map((pkg, idx) => (
                  <div key={idx}
                    className={`p-2 border-b hover:bg-cyan-50 cursor-pointer ${selectedPackage?.name === pkg.name ? 'bg-cyan-100 font-semibold' : ''}`}
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <div className="font-semibold">{pkg.name}</div>
                    <div className="text-gray-500 text-xs">B2C: ₹{pkg.b2cCharge} | B2B: ₹{pkg.b2bCharge}</div>
                    <div className="text-gray-400 text-xs">{pkg.department}</div>
                  </div>
                ))}
                {displayPackages.length === 0 && <div className="p-4 text-center text-gray-400">No packages found</div>}
              </>
            )}
          </div>
        </div>

        {/* MIDDLE */}
        <div className="md:col-span-5 col-span-12 bg-white rounded-xl shadow flex flex-col">
          <div className="p-2 flex gap-2 border-b">
            <input className={`${input} flex-1`} placeholder="Search Test" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="relative group/refresh">
              <button onClick={() => { setSearch(""); setFilterFrequent(false); }} className="bg-cyan-700 hover:bg-cyan-600 text-white p-1 rounded transition-colors"><RefreshCcw size={16} /></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover/refresh:opacity-100 pointer-events-none transition-opacity z-50">
                Reload Complete Test List
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"/>
              </div>
            </div>
            <div className="relative group/star">
              <button onClick={() => setFilterFrequent(!filterFrequent)} className={`${filterFrequent ? 'bg-cyan-500' : 'bg-cyan-700 hover:bg-cyan-600'} text-white p-1 rounded transition-colors`}><Star size={16} /></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover/star:opacity-100 pointer-events-none transition-opacity z-50">
                Frequently Used Tests
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"/>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 bg-cyan-700 text-white font-semibold p-2 text-xs">
              <div className="col-span-5 flex items-center gap-2">
                {selectedPackage && (
                  <input 
                    type="checkbox" 
                    className="w-3 h-3 cursor-pointer accent-white"
                    checked={(() => {
                      const deptTests = departments.flatMap(d => d.tests.map(t => ({...t, department: d.name})));
                      const pkgTests = selectedPackage.tests.map(n => deptTests.find(t => t.name === n)).filter(Boolean);
                      return pkgTests.length > 0 && pkgTests.every(t => selectedTests.find(st => st.name === t.name));
                    })()}
                    onChange={(e) => {
                      const deptTests = departments.flatMap(d => d.tests.map(t => ({...t, department: d.name})));
                      const pkgTests = selectedPackage.tests.map(n => deptTests.find(t => t.name === n)).filter(Boolean);
                      if (e.target.checked) {
                        const toAdd = pkgTests
                          .filter(t => !selectedTests.find(st => st.name === t.name))
                          .map(t => ({ ...t, fromPackage: selectedPackage.name }));
                        const allPkgTests = [...selectedTests.filter(st => st.fromPackage === selectedPackage.name), ...toAdd];
                        const redistributed = distributePackageCharge(selectedPackage, allPkgTests);
                        setSelectedTests([
                          ...selectedTests.filter(st => st.fromPackage !== selectedPackage.name),
                          ...redistributed
                        ]);
                      } else {
                        const names = pkgTests.map(t => t.name);
                        setSelectedTests(selectedTests.filter(st => !names.includes(st.name)));
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                Test Name
              </div>
              <div className="col-span-2 text-center">Specimen Type</div>
              <div className="col-span-2 text-right">B2C Charges</div>
              <div className="col-span-2 text-right">B2B Charges</div>
              <div className="col-span-1"></div>
            </div>
          <div className="flex-1 overflow-auto text-xs" style={{ maxHeight: 'calc(75vh - 50px)' }}>
            {selectedPackage ? (
              <>
                {(() => {
                  const deptTests = departments.flatMap(d => d.tests.map(t => ({...t, department: d.name})));
                  const pkgTests = selectedPackage.tests.map(testName => deptTests.find(t => t.name === testName)).filter(Boolean);
                  return pkgTests.map((t, i) => (
                    <div key={t.name} className="grid grid-cols-12 border-b p-2 hover:bg-cyan-50 items-center">
                      <div className="col-span-5 flex gap-2 items-center">
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 cursor-pointer accent-cyan-600"
                          checked={selectedTests.find(st => st.name === t.name) !== undefined}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              if (!selectedTests.find(st => st.name === t.name)) {
                                // Recalculate all package tests including the re-added one
                                const allPkgTests = [...selectedTests.filter(st => st.fromPackage === selectedPackage.name), { ...t, fromPackage: selectedPackage.name }];
                                const redistributed = distributePackageCharge(selectedPackage, allPkgTests);
                                setSelectedTests([
                                  ...selectedTests.filter(st => st.fromPackage !== selectedPackage.name),
                                  ...redistributed
                                ]);
                              }
                            } else {
                              removeTest(t.name);
                            }
                          }}
                        />
                        {t.name}
                      </div>
                      <div className="col-span-2 text-center flex items-center justify-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
                          <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={getSampleColor(t.sample, specimenTypes)} stroke="#555" strokeWidth="1.2"/>
                          <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                          <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                        </svg>
                        {t.sample}
                      </div>
                      <div className="col-span-2 text-right">-</div>
                      <div className="col-span-2 text-right">-</div>
                      <div className="col-span-1"></div>
                    </div>
                  ));
                })()}
                <div className="grid grid-cols-12 border-t-2 border-cyan-700 p-2 bg-gray-50 font-bold items-center">
                  <div className="col-span-7 text-right">Total Package Cost</div>
                  <div className="col-span-4 text-right">₹{businessType === "B2C" ? selectedPackage.b2cCharge : selectedPackage.b2bCharge}</div>
                  <div className="col-span-1"></div>
                </div>
              </>
            ) : (
              (showAllTests ? departments : (selectedDept ? [selectedDept] : [])).map((dept) => {
                const filteredTests = filterFrequent
                  ? dept.tests.filter(t => frequentTests.find(f => f.name === t.name) && t.name.toLowerCase().includes(search.toLowerCase()))
                  : dept.tests.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
                return filteredTests.map((t) => (
                  <div key={t.name} className="grid grid-cols-12 border-b p-2 hover:bg-cyan-50 items-center">
                    <div className="col-span-5 flex gap-2 items-center">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 cursor-pointer accent-cyan-600"
                        checked={selectedTests.find(st => st.name === t.name) !== undefined}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            addTest({...t, department: dept.name});
                          } else {
                            removeTest(t.name);
                          }
                        }}
                      />
                      {t.name}
                    </div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
                        <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={getSampleColor(t.sample, specimenTypes)} stroke="#555" strokeWidth="1.2"/>
                        <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                        <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                      </svg>
                      {t.sample}
                    </div>
                    <div className="col-span-2 text-right">₹{t.b2cCharge}</div>
                    <div className="col-span-2 text-right">₹{t.b2bCharge}</div>
                    <div className="col-span-1"></div>
                  </div>
                ));
              })
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="md:col-span-4 col-span-12 bg-white rounded-xl shadow flex flex-col">
          <table className="w-full text-xs">
            <colgroup>
              <col style={{ width: '40%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <thead className="bg-cyan-700 text-white">
              <tr>
                <th className="p-2 text-left">Test</th>
                <th className="p-2 text-center">Charge</th>
                <th className="p-2 text-center">Action</th>
                <th className="p-2 text-center">Sample</th>
              </tr>
            </thead>
          </table>
          <div className="flex-1 overflow-auto text-xs" style={{ maxHeight: 'calc(75vh - 160px)' }}>
            <table className="w-full text-xs">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <tbody>
                {selectedTests.map((t) => (
                  <tr key={t.name} className={`border-b hover:bg-gray-50 ${t.fromPackage ? 'bg-cyan-50' : ''}`}>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {t.fromPackage && (
                          <span className="bg-cyan-600 text-white text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" title={`Package: ${t.fromPackage}`}>PKG</span>
                        )}
                        <span>{t.name}</span>
                      </div>
                      {t.fromPackage && (
                        <div className="text-xs text-gray-400 mt-0.5 ml-8">{t.fromPackage}</div>
                      )}
                    </td>
                    <td className="p-2 text-center font-semibold">₹{businessType === "B2C" ? t.b2cCharge : t.b2bCharge}</td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeTest(t.name)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
                          <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={getSampleColor(t.sample, specimenTypes)} stroke="#555" strokeWidth="1.2"/>
                          <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                          <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                        </svg>
                        {t.sample}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BILLING SECTION */}
          <div className="border-t bg-gray-50 text-xs">
            <div className="grid grid-cols-5 gap-2 p-2 border-b bg-white">
              <div>
                <label className="text-gray-600 block mb-1 text-xs">Total amount</label>
                <input className={`${input} font-semibold`} value={total} readOnly />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 text-xs">Discount(%)</label>
                <input className={input} type="number" step="1"
                  value={discountPercent === 0 ? '' : discountPercent}
                  onChange={(e) => handleDiscountPercentChange(e.target.value)}
                  onKeyPress={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }} />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 text-xs">Discount</label>
                <input className={input} type="number" step="1"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  onKeyPress={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }} />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 text-xs">Payment</label>
                <input className={input} type="number" step="1"
                  value={paid === 0 ? '' : paid}
                  onChange={(e) => handlePaymentChange(e.target.value)}
                  onKeyPress={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }} />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 text-xs">Balance</label>
                <input className={`${input} font-semibold`} value={((total - discount) - paid).toFixed(0)} readOnly />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2 border-b bg-white items-center">
              <select className={input} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option>Cash</option><option>UPI</option><option>Card</option><option>Net Banking</option>
              </select>
              <input className={input} placeholder="Discount Remark" value={discountRemark} onChange={(e) => setDiscountRemark(e.target.value)} />
              <div className="text-right">
                <span className="text-red-600 font-bold text-base">Collection Rs.{paid}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-gray-100">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" checked={printReceipt} onChange={(e) => setPrintReceipt(e.target.checked)} className="w-4 h-4" />
                  <span className="text-gray-700">Do you want to print receipt?</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" checked={navigateToResult} onChange={(e) => setNavigateToResult(e.target.checked)} className="w-4 h-4" />
                  <span className="text-gray-700">Navigate to result page</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleClearForm} 
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold flex items-center gap-2"
                  title="Clear all form data">
                  <X size={16} />
                  Clear Form
                </button>
                <button onClick={handleRegister} className="bg-cyan-700 hover:bg-cyan-800 text-white px-6 py-2 rounded font-semibold">
                  Register
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* PATIENT SELECTION MODAL */}
      {showPatientSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
            {/* Header - Fixed */}
            <div className="bg-gradient-to-r from-cyan-700 to-cyan-600 text-white p-3 flex justify-between items-center rounded-t-lg shrink-0">
              <h2 className="text-lg font-bold">Multiple Patients Found - Select One</h2>
              <button onClick={() => { setShowPatientSelectionModal(false); setFoundPatients([]); }} className="text-white hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            {/* Info Banner - Fixed */}
            <div className="bg-yellow-50 border-b border-yellow-200 p-3 shrink-0">
              <p className="text-xs text-yellow-800">
                <strong>Found {foundPatients.length} patients</strong> with this mobile/email. Please select the correct patient or create a new one.
              </p>
            </div>

            {/* Patient List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {foundPatients.map((patient, index) => (
                  <div key={patient.id} className="border border-gray-300 rounded-lg p-3 hover:border-cyan-500 hover:bg-cyan-50 transition-all cursor-pointer"
                    onClick={() => {
                      fillPatientData(patient);
                      setShowPatientSelectionModal(false);
                      setFoundPatients([]);
                    }}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Patient ID and Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-cyan-600 text-white px-2 py-0.5 rounded-full font-bold text-xs shrink-0">
                            {patient.patientId}
                          </span>
                          <h3 className="text-sm font-bold text-gray-800 truncate">
                            {patient.title} {patient.firstName} {patient.lastName}
                          </h3>
                        </div>
                        
                        {/* Patient Details - Compact Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Mobile:</span>
                            <span className="font-semibold text-gray-800">{patient.mobile}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Age:</span>
                            <span className="font-semibold text-gray-800">{patient.age || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <span className="text-gray-500">Email:</span>
                            <span className="font-semibold text-gray-800 truncate">{patient.email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Gender:</span>
                            <span className="font-semibold text-gray-800">{patient.gender || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Previous Tests - Compact */}
                        {patient.tests && patient.tests.length > 0 && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">
                              <strong>Previous Tests ({patient.tests.length}):</strong>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {patient.tests.slice(0, 5).map((test, idx) => (
                                <span key={idx} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                                  {test.testName}
                                </span>
                              ))}
                              {patient.tests.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  +{patient.tests.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Address - Compact */}
                        {patient.address && (
                          <div className="mt-1 text-xs text-gray-600 truncate">
                            <span className="text-gray-500">Address:</span>
                            <span className="ml-1">{patient.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Select Button */}
                      <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded text-xs font-semibold shrink-0">
                        Select
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer - Fixed/Sticky */}
            <div className="border-t border-gray-300 p-3 bg-gray-50 rounded-b-lg shrink-0">
              <button 
                onClick={() => {
                  setExistingPatientId(null);
                  setShowPatientSelectionModal(false);
                  setFoundPatients([]);
                  alert('New patient will be created with a new Patient ID.');
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm">
                <UserPlus size={18} />
                Create New Patient (Different Person)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION CONFIRMATION MODAL */}
      {showRegistrationModal && (
        <>
          <style>{`
            @media print {
              /* Hide everything on page except the modal */
              body * {
                visibility: hidden !important;
              }
              
              /* Show only the modal and its children */
              .print-modal-wrapper,
              .print-modal-wrapper * {
                visibility: visible !important;
              }
              
              /* Reset modal positioning */
              .print-modal-wrapper {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                padding: 0 !important;
              }
              
              .print-modal {
                position: static !important;
                max-width: 100% !important;
                max-height: none !important;
                overflow: visible !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                width: 100% !important;
              }
              
              /* Hide buttons and interactive elements */
              .print-hide {
                display: none !important;
                visibility: hidden !important;
              }
              
              /* Page setup */
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              
              /* Compact spacing */
              .print-modal .p-6 {
                padding: 0.5rem !important;
              }
              
              .print-modal .space-y-6 > * + * {
                margin-top: 0.75rem !important;
              }
              
              .print-modal .mb-3 {
                margin-bottom: 0.5rem !important;
              }
              
              .print-modal .gap-4 {
                gap: 0.5rem !important;
              }
              
              /* Compact table */
              .print-modal table {
                font-size: 9pt !important;
              }
              
              .print-modal table td,
              .print-modal table th {
                padding: 0.2rem !important;
              }
              
              /* Smaller fonts */
              .print-modal {
                font-size: 9pt !important;
              }
              
              .print-modal h2 {
                font-size: 13pt !important;
                padding: 0.5rem !important;
              }
              
              .print-modal h3 {
                font-size: 11pt !important;
                padding-bottom: 0.25rem !important;
              }
              
              /* Compact billing summary */
              .print-modal .bg-gray-50 {
                padding: 0.5rem !important;
              }
              
              .print-modal .space-y-2 > * + * {
                margin-top: 0.25rem !important;
              }
              
              /* Remove sticky positioning */
              .sticky {
                position: static !important;
              }
              
              /* Ensure backgrounds print */
              .bg-cyan-700,
              .bg-cyan-600,
              .bg-cyan-50,
              .bg-gray-50,
              .bg-gray-100 {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
          
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-modal-overlay print-modal-wrapper">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl print-modal">
            <div className="bg-gradient-to-r from-cyan-700 to-cyan-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-bold">Registration Summary</h2>
              <button onClick={() => setShowRegistrationModal(false)} className="text-white hover:text-gray-200 print-hide">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Information */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-700 mb-3 border-b pb-2">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex">
                    <span className="font-semibold w-32">Name:</span>
                    <span>{firstName} {lastName}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Date of Birth:</span>
                    <span>{dob}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Age:</span>
                    <span>{age} years</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Gender:</span>
                    <span>{gender}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Mobile:</span>
                    <span>{mobile}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Email:</span>
                    <span>{email || "N/A"}</span>
                  </div>
                  <div className="flex col-span-2">
                    <span className="font-semibold w-32">Address:</span>
                    <span>{address || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Registration Details */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-700 mb-3 border-b pb-2">Registration Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex">
                    <span className="font-semibold w-32">Visit Type:</span>
                    <span>{visitType || "N/A"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Referral Doctor:</span>
                    <span>{isManualRefDoctor ? manualRefDoctorName : refDoctor || "N/A"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Date:</span>
                    <span>{date}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Time:</span>
                    <span>{time}</span>
                  </div>
                  <div className="flex col-span-2">
                    <span className="font-semibold w-32">Remarks:</span>
                    <span>{remarks || "N/A"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-semibold w-32">Created At:</span>
                    <span>{selectedCreatedAt || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Tests/Packages */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-700 mb-3 border-b pb-2">Selected Tests & Packages</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-cyan-700 text-white">
                      <tr>
                        <th className="p-2 text-left">Sr.</th>
                        <th className="p-2 text-left">Test/Package Name</th>
                        <th className="p-2 text-center">Type</th>
                        <th className="p-2 text-right">Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTests.map((t, idx) => (
                        <tr key={idx} className={`border-b ${t.fromPackage ? 'bg-cyan-50' : ''}`}>
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">
                            {t.name}
                            {t.fromPackage && (
                              <div className="text-xs text-gray-400 mt-0.5">{t.fromPackage}</div>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {t.fromPackage ? (
                              <span className="bg-cyan-600 text-white text-xs px-2 py-1 rounded font-semibold">PKG</span>
                            ) : (
                              <span className="text-gray-600">Test</span>
                            )}
                          </td>
                          <td className="p-2 text-right font-semibold">₹{businessType === "B2C" ? t.b2cCharge : t.b2bCharge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Billing Summary */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-700 mb-3 border-b pb-2">Billing Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-bold text-lg">₹{total}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discount ({discountPercent}%):</span>
                    <span>- ₹{discount}</span>
                  </div>
                  {discountRemark && (
                    <div className="flex justify-between text-gray-600 text-xs">
                      <span>Discount Remark:</span>
                      <span className="italic">{discountRemark}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Amount:</span>
                    <span className="font-bold text-lg text-cyan-700">₹{total - discount}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span className="font-semibold">Payment ({paymentMode}):</span>
                    <span className="font-bold">₹{paid}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold text-red-600">Balance Due:</span>
                    <span className="font-bold text-lg text-red-600">₹{(total - discount) - paid}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-100 p-4 flex justify-between items-center sticky bottom-0 print-hide">
              <div className="text-sm text-gray-600">
                Please review the details before saving
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRegistrationModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-semibold">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveRegistration}
                  className="px-8 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
                  <span>Save Registration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
    </>
  );
}
