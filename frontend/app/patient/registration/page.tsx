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
  Barcode,
} from "lucide-react";
import { createPatient, searchPatient } from "@/src/api/patient";
import { getDoctors, createDoctor, getSpecimenTypes, getOrganizations, getTestCharges } from "@/src/api/master";
import { getCities, getSubSections, getDistricts, getVillages, formatLocation, parseLocation, searchLocations } from "@/src/data/maharashtraLocations";
import API_BASE_URL from "@/src/api/config";

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
        ${inputError ? "border-red-400 ring-1 ring-red-400" : "border-slate-300 focus-within:ring-1 focus-within:ring-orange-500 focus-within:border-gray-300"}`}>
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
              className="flex items-center gap-1 text-sm font-bold text-gray-800 hover:text-slate-900">
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
                    className={`text-xs py-1.5 rounded-lg ${viewMonth===i?"bg-orange-500 text-white font-semibold":"hover:bg-gray-100 text-gray-700"}`}>
                    {m.slice(0,3)}
                  </button>
                ))}
              </div>
              <div className="max-h-32 overflow-y-auto grid grid-cols-3 gap-1">
                {years.map(y => (
                  <button type="button" key={y} onClick={() => { setViewYear(y); setShowMonthYear(false); }}
                    className={`text-xs py-1.5 rounded-lg ${viewYear===y?"bg-orange-500 text-white font-semibold":"hover:bg-gray-100 text-gray-700"}`}>
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
                      ${isToday(day)&&!isSelected(day)?"border border-gray-300 text-slate-900":""}
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
        className="h-8 w-full rounded border border-slate-300 px-2 text-xs flex items-center justify-between bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-gray-300">
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
                    ${isSel ? "bg-white text-gray-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}
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
  const [location, setLocation] = useState(rebookingData?.location || "");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationDropdownRef = useRef(null);

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
  
  // Barcode state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeLabels, setBarcodeLabels] = useState<any[]>([]);
  const [barcodePatientInfo, setBarcodePatientInfo] = useState<any>(null);
  
  const [showSimilarPatientsDropdown, setShowSimilarPatientsDropdown] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: "", tests: [], b2cCharge: 0, b2bCharge: 0 });
  const [newRef, setNewRef] = useState({ type: "Doctor", name: "", degree: "", compliment: "", mobile: "", email: "", address: "", allowSend: false });

  /* --- Referral Doctor Checkbox Logic --- */
  const [isManualRefDoctor, setIsManualRefDoctor] = useState(false);
  const [manualRefDoctorName, setManualRefDoctorName] = useState("");  /* --- Departments and Packages from API --- */
  const [departments, setDepartments] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [specimenTypes, setSpecimenTypes] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>("");
  const [organizationCharges, setOrganizationCharges] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Fetch departments with tests and packages from API
  useEffect(() => {
    fetchDepartmentsData();
    getDoctors().then((res: any) => setDoctorsList(Array.isArray(res) ? res : res?.data || [])).catch(console.error);
    getSpecimenTypes().then(setSpecimenTypes).catch(console.error);
    getOrganizations().then((res: any) => {
      const orgs = Array.isArray(res) ? res : res?.data || [];
      setOrganizations(orgs);
      console.log('📋 Organizations loaded:', orgs);
    }).catch(console.error);
  }, []);

  // Fetch organization-specific charges when organization is selected
  useEffect(() => {
    if (selectedOrganization) {
      getTestCharges(undefined, selectedOrganization).then((charges: any) => {
        const chargeMap: any = {};
        charges.forEach((charge: any) => {
          chargeMap[charge.testId] = {
            b2cCharge: charge.b2cCharge,
            b2bCharge: charge.b2bCharge
          };
        });
        setOrganizationCharges(chargeMap);
        console.log('💰 Organization charges loaded:', chargeMap);
        
        // Update selected tests with organization charges
        setSelectedTests(prevTests => 
          prevTests.map(test => {
            const orgCharge = chargeMap[test.id];
            if (orgCharge) {
              return {
                ...test,
                b2cCharge: orgCharge.b2cCharge,
                b2bCharge: orgCharge.b2bCharge
              };
            }
            return test;
          })
        );
      }).catch(console.error);
    } else {
      setOrganizationCharges({});
    }
  }, [selectedOrganization]);
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
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(e.target)) {
        setShowDoctorList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleRefDoctorCheckbox = (checked: boolean) => {
    setIsManualRefDoctor(checked);
    if (!checked) {
      setManualRefDoctorName("");
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
        if (data.location) setLocation(data.location);
        if (data.gender) setGender(data.gender);
        if (data.remarks) setRemarks(data.remarks);
        if (data.createdBy) setCreatedBy(data.createdBy);
        
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
          firstName, lastName, title, dob, age, mobile, email, address, location,
          gender, remarks, visitType, reportMode,
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
    firstName, lastName, title, dob, age, mobile, email, address, location, gender, remarks,
    visitType, reportMode, sampleBarcodeNo,
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
    setLocation("");
    setGender("");
    setRemarks("");
    setCreatedBy(loggedUser);
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

  const input = "h-8 rounded border border-slate-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 w-full";

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

  // Handle location search input
  const handleLocationSearchChange = (value: string) => {
    setLocationSearch(value);
    setLocation(value); // Update location as user types
    
    if (value.trim()) {
      const suggestions = searchLocations(value);
      setLocationSuggestions(suggestions);
      setShowLocationDropdown(true);
    } else {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
    }
  };

  // Handle location selection from dropdown
  const handleLocationSelect = (selectedLocation: string) => {
    setLocation(selectedLocation);
    setLocationSearch(selectedLocation);
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize location search from stored location
  useEffect(() => {
    if (location && !locationSearch) {
      setLocationSearch(location);
    }
  }, []);

  const handleRegister = () => {
    // Validate ALL Patient Identity fields as mandatory
    const missingFields = [];
    if (!title) missingFields.push("Title");
    if (!firstName) missingFields.push("First Name");
    if (!lastName) missingFields.push("Last Name");
    if (!age) missingFields.push("Age");
    if (!gender) missingFields.push("Gender");
    if (!mobile) missingFields.push("Mobile");
    if (!address) missingFields.push("Address");
    
    if (missingFields.length > 0) {
      return alert(`Please fill the following mandatory fields:\n\n• ${missingFields.join('\n• ')}`);
    }
    
    if (mobile.length !== 10) return alert("Mobile must be 10 digits");
    if (email && !email.endsWith("@gmail.com")) return alert("Email must end with @gmail.com");
    
    // If NO tests selected - save patient info only
    if (selectedTests.length === 0) {
      handleSavePatientInfoOnly();
      return;
    }
    
    // If tests selected - show registration confirmation modal
    setShowRegistrationModal(true);
  };

  // Save patient info only (without tests)
  const handleSavePatientInfoOnly = async () => {
    try {
      const patientData = {
        existingPatientId: existingPatientId || null,
        title: title,
        firstName: firstName,
        lastName: lastName || null,
        dob: dob || null,
        age: parseInt(age) || null,
        gender: gender,
        mobile: mobile,
        email: email || null,
        createdBy: createdBy || null,
        address: address || null,
        location: location || null,
        organizationId: selectedOrganization || null,
        visitType: visitType || "General",
        reportMode: reportMode || "Email",
        referralDoctor: isManualRefDoctor ? manualRefDoctorName : refDoctor || null,
        visitDate: date || new Date().toISOString().split('T')[0],
        visitTime: time || "00:00",
        sampleBarcodeNo: sampleBarcodeNo || null,
        remarks: remarks || null,
        totalAmount: 0,
        discountPercent: 0,
        discountAmount: 0,
        discountRemark: null,
        paidAmount: 0,
        balanceAmount: 0,
        paymentMode: paymentMode || "Cash",
        businessType: businessType || "B2C",
        tests: [] // Empty tests array
      };

      console.log('Saving patient info only:', patientData);
      const response = await createPatient(patientData);
      
      console.log("Patient info saved successfully:", response);
      
      const patientId = response?.data?.patientId || response?.patientId || 'N/A';
      
      alert(`Patient Information Saved ✅\nPatient ID: ${patientId}\n\nYou can now add tests and click "Register" to complete registration.`);
      
      // Clear tests but KEEP patient info
      setSelectedTests([]);
      
    } catch (error) {
      console.error("Error saving patient info:", error);
      alert(`Failed to save patient info: ${error.message}`);
    }
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
        existingPatientId: existingPatientId || null,
        // Patient Identity
        title: title,
        firstName: firstName,
        lastName: lastName || null,
        dob: dob || null,  // DOB is optional
        age: parseInt(age) || null,
        gender: gender,
        mobile: mobile,
        email: email || null,
        createdBy: createdBy || null,
        address: address || null,
        location: location || null,  // Add location field
        organizationId: selectedOrganization || null,
        // Registration Details (optional if no tests)
        visitType: visitType || "General",  // Default value
        reportMode: reportMode || "Email",  // Default value
        referralDoctor: isManualRefDoctor ? manualRefDoctorName : refDoctor || null,
        visitDate: date || new Date().toISOString().split('T')[0],  // Default to today
        visitTime: time || "00:00",  // Default time
        sampleBarcodeNo: sampleBarcodeNo || null,
        remarks: remarks || null,
        // Billing Details
        totalAmount: totalAmt || 0,
        discountPercent: discPct || 0,
        discountAmount: discAmt || 0,
        discountRemark: discountRemark || null,
        paidAmount: paidAmt || 0,
        balanceAmount: balAmt || 0,
        paymentMode: paymentMode || "Cash",  // Default value
        businessType: businessType || "B2C",  // Default value
        // Tests (expanded from packages)
        tests: expandedTests
      };

      console.log('Sending patient data:', patientData);
      const response = await createPatient(patientData);
      
      console.log("Patient registered successfully:", response);
      
      // Handle response structure correctly - response.data contains the patient object
      const patientId = response?.data?.patientId || response?.patientId || 'N/A';
      const visitId = response?.data?.visitId || response?.visitId || patientId;
      
      // Show success message
      const message = selectedTests.length > 0 
        ? `Patient Registered Successfully ✅\nPatient ID: ${patientId}\n\nYou can now add more tests or print barcode.`
        : `Patient Information Saved ✅\nPatient ID: ${patientId}\n\nYou can now select and add tests.`;
      
      alert(message);
      
      // If tests were added, show barcode modal
      if (selectedTests.length > 0) {
        showBarcodeAfterRegistration(
          `${title} ${firstName} ${lastName || ''}`.trim(),
          visitId,
          age,
          gender,
          selectedTests
        );
      }
      
      // Clear tests but KEEP patient info
      setSelectedTests([]);
      
      // Close registration modal if it was open
      setShowRegistrationModal(false);
      
    } catch (error) {
      console.error("Error saving registration:", error);
      alert(`Failed to register patient: ${error.message}`);
    }
  };

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

  // Show barcode modal after registration
  const showBarcodeAfterRegistration = (patientName: string, visitId: string, age: string, gender: string, tests: any[]) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

    // Group by specimen type
    const specimenGroups: any = {};
    tests.forEach(t => {
      const key = t.sample || 'Unknown';
      if (!specimenGroups[key]) specimenGroups[key] = [];
      specimenGroups[key].push(t.name);
    });

    // Build labels
    const specimenEntries = Object.entries(specimenGroups);
    const labels = specimenEntries.map(([specimen, shortNames], idx) => ({
      barcodeValue: idx === 0 ? visitId : `${visitId}-${idx + 1}`,
      specimen,
      shortNamesStr: (shortNames as any[]).join(' / '),
      dateStr,
      timeStr,
    }));

    const genderInitial = gender ? gender.charAt(0).toUpperCase() : '';
    const ageGender = genderInitial && age ? `${genderInitial}/${age} Yrs` : genderInitial || (age ? `${age} Yrs` : '');

    setBarcodePatientInfo({
      patientName,
      visitId,
      age,
      gender,
      ageGender,
    });
    setBarcodeLabels(labels);
    setShowBarcodeModal(true);
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

    <div className="w-full px-3 sm:px-6 mt-16">
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
              <input 
                className={input} 
                placeholder="Age *" 
                value={age} 
                onChange={(e) => setAge(e.target.value)}
                type="number"
                min="0"
                max="150"
                required 
              />
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
                    <div className="bg-white px-4 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-700">{foundPatients.length} patient{foundPatients.length > 1 ? 's' : ''} found</p>
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
                          className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${i < foundPatients.length - 1 ? "border-b border-gray-100" : ""}`}
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
                <div className="text-slate-900 font-medium text-sm cursor-not-allowed select-none">
                  {createdBy || '—'}
                </div>
              </div>

              {/* Organization Selector */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-0.5">Organization / Lab</label>
                <select 
                  value={selectedOrganization} 
                  onChange={(e) => setSelectedOrganization(e.target.value)}
                  className={input}
                >
                  <option value="">Select Organization (Optional)</option>
                  {Array.isArray(organizations) && organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <textarea className={input} placeholder="Address *" value={address} onChange={(e) => setAddress(e.target.value)} rows={3} required></textarea>
              
              {/* Location Field - Searchable Input (Simple City-Village Format) */}
              <div className="relative" ref={locationDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Location *"
                    value={locationSearch}
                    onChange={(e) => handleLocationSearchChange(e.target.value)}
                    onFocus={() => {
                      if (locationSearch.trim()) {
                        setShowLocationDropdown(true);
                      }
                    }}
                    className={`${input} w-full`}
                  />
                  {locationSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationSearch("");
                        setLocation("");
                        setLocationSuggestions([]);
                        setShowLocationDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Location Suggestions Dropdown */}
                {showLocationDropdown && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {locationSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleLocationSelect(suggestion.display)}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-800">{suggestion.display}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No suggestions message */}
                {showLocationDropdown && locationSearch.trim() && locationSuggestions.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 text-center text-gray-500 text-sm">
                    No locations found matching "{locationSearch}"
                  </div>
                )}
              </div>
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
                                  className={`px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
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
                  className="bg-slate-900 hover:bg-orange-500 text-white px-3 rounded h-8 shrink-0 flex items-center justify-center font-bold"
                  title="Add New Referral Doctor"
                >+</button>
              </div>

              <InlineDatePicker value={date} onChange={setDate} placeholder="Visit Date" className="w-full" />
              <input type='time' className={input} value={time} onChange={(e) => setTime(e.target.value)} />
              <textarea className={input} placeholder="Patient History" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3}></textarea>
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
              <button onClick={saveNewPackage} className="bg-slate-900 text-white px-4 py-2 rounded">Save Package</button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showRefModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Add Referral Doctor</h3>
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
                className="bg-slate-900 hover:bg-orange-600 text-white px-6 py-2 rounded transition-colors font-semibold"
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
              className={`flex-1 p-2 ${activeTab === "tests" ? "bg-slate-900 text-white" : "bg-gray-200"}`}>Department</button>
            <button onClick={() => { setActiveTab("packages"); setSelectedPackage(null); setShowAllTests(false); }}
              className={`flex-1 p-2 ${activeTab === "packages" ? "bg-slate-900 text-white" : "bg-gray-200"}`}>Packages</button>
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
                  className={`p-2 border-b cursor-pointer hover:bg-gray-50 ${selectedDept?.name === d.name && !showAllTests ? 'bg-orange-100 font-semibold' : ''}`}
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
                    className={`p-2 border-b hover:bg-gray-50 cursor-pointer ${selectedPackage?.name === pkg.name ? 'bg-orange-100 font-semibold' : ''}`}
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
              <button onClick={() => { setSearch(""); setFilterFrequent(false); }} className="bg-slate-900 hover:bg-orange-500 text-white p-1 rounded transition-colors"><RefreshCcw size={16} /></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover/refresh:opacity-100 pointer-events-none transition-opacity z-50">
                Reload Complete Test List
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"/>
              </div>
            </div>
            <div className="relative group/star">
              <button onClick={() => setFilterFrequent(!filterFrequent)} className={`${filterFrequent ? 'bg-white0' : 'bg-slate-900 hover:bg-orange-500'} text-white p-1 rounded transition-colors`}><Star size={16} /></button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded whitespace-nowrap opacity-0 group-hover/star:opacity-100 pointer-events-none transition-opacity z-50">
                Frequently Used Tests
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"/>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 bg-slate-900 text-white font-semibold p-2 text-xs">
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
                    <div key={t.name} className="grid grid-cols-12 border-b p-2 hover:bg-gray-50 items-center">
                      <div className="col-span-5 flex gap-2 items-center">
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 cursor-pointer accent-orange-500"
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
                <div className="grid grid-cols-12 border-t-2 border-slate-900 p-2 bg-gray-50 font-bold items-center">
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
                  <div key={t.name} className="grid grid-cols-12 border-b p-2 hover:bg-gray-50 items-center">
                    <div className="col-span-5 flex gap-2 items-center">
                      <input 
                        type="checkbox" 
                        className="w-3 h-3 cursor-pointer accent-orange-500"
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
            <thead className="bg-slate-900 text-white">
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
                  <tr key={t.name} className={`border-b hover:bg-gray-50 ${t.fromPackage ? 'bg-white' : ''}`}>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {t.fromPackage && (
                          <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold shrink-0" title={`Package: ${t.fromPackage}`}>PKG</span>
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
                <button 
                  onClick={handleRegister} 
                  className="bg-slate-900 hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold"
                  title={selectedTests.length === 0 ? "Save patient information" : "Register patient with tests"}>
                  {selectedTests.length === 0 ? "Save" : "Register"}
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
            <div className="bg-gradient-to-r from-slate-800 via-orange-700 to-orange-600 text-white p-3 flex justify-between items-center rounded-t-lg shrink-0">
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
                  <div key={patient.id} className="border border-gray-300 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                    onClick={() => {
                      fillPatientData(patient);
                      setShowPatientSelectionModal(false);
                      setFoundPatients([]);
                    }}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Patient ID and Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold text-xs shrink-0">
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
                      <button className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-semibold shrink-0">
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
              .bg-slate-900,
              .bg-orange-500,
              .bg-white,
              .bg-gray-50,
              .bg-gray-100 {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>
          
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print-modal-overlay print-modal-wrapper">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl print-modal">
            <div className="bg-gradient-to-r from-slate-800 via-orange-700 to-orange-600 text-white p-4 flex justify-between items-center sticky top-0 z-10">
              <h2 className="text-xl font-bold">Registration Summary</h2>
              <button onClick={() => setShowRegistrationModal(false)} className="text-white hover:text-gray-200 print-hide">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">Patient Information</h3>
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
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">Registration Details</h3>
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
                </div>
              </div>

              {/* Tests/Packages */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">Selected Tests & Packages</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900 text-white">
                      <tr>
                        <th className="p-2 text-left">Sr.</th>
                        <th className="p-2 text-left">Test/Package Name</th>
                        <th className="p-2 text-center">Type</th>
                        <th className="p-2 text-right">Charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTests.map((t, idx) => (
                        <tr key={idx} className={`border-b ${t.fromPackage ? 'bg-white' : ''}`}>
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">
                            {t.name}
                            {t.fromPackage && (
                              <div className="text-xs text-gray-400 mt-0.5">{t.fromPackage}</div>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {t.fromPackage ? (
                              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded font-semibold">PKG</span>
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
                <h3 className="text-lg font-semibold text-slate-900 mb-3 border-b pb-2">Billing Summary</h3>
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
                    <span className="font-bold text-lg text-slate-900">₹{total - discount}</span>
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
                  className="px-8 py-2 bg-slate-900 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
                  <span>Save Registration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Barcode Preview Modal */}
      {showBarcodeModal && barcodePatientInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-800 rounded-t-lg">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Barcode size={16} /> Barcode Labels — {barcodePatientInfo.patientName} | {barcodePatientInfo.visitId}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const printArea = document.getElementById('barcode-print-area');
                    const win = window.open('', '_blank');
                    win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
                      <style>
                        * { margin:0; padding:0; box-sizing:border-box; }
                        body { font-family: Arial, sans-serif; background: white; }
                        .labels-wrap { display: flex; flex-wrap: wrap; gap: 8mm; padding: 8mm; }
                        .label { width: 80mm; border: 0.5px solid #999; page-break-inside: avoid; }
                        @page { size: A4; margin: 8mm; }
                      </style>
                    </head><body>${printArea.innerHTML}</body></html>`);
                    win.document.close();
                    win.focus();
                    win.print();
                    win.close();
                  }}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-blue-700"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => {
                    setShowBarcodeModal(false);
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  }}
                  className="text-gray-300 hover:text-white text-xl font-bold leading-none px-1"
                >×</button>
              </div>
            </div>

            {/* Labels */}
            <div className="overflow-y-auto flex-1 p-5 bg-gray-100">
              <div id="barcode-print-area" className="flex flex-wrap gap-4 justify-start">
                {barcodeLabels.map((label, idx) => {
                  const { svg, width, height } = buildCode128Svg(label.barcodeValue);
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-gray-300 shadow"
                      style={{ width: '302px', fontFamily: 'Arial, sans-serif' }}
                    >
                      {/* Barcode — centered, horizontal, full width */}
                      <div className="flex justify-center px-2 pt-2 pb-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="100%"
                          height="52"
                          viewBox={`0 0 ${width} ${height}`}
                          preserveAspectRatio="none"
                          dangerouslySetInnerHTML={{ __html: svg }}
                        />
                      </div>

                      {/* Barcode number centered */}
                      <div className="text-center font-bold text-sm tracking-widest py-0.5 px-2">
                        {label.barcodeValue}
                      </div>

                      {/* Date time (left) + specimen type (right) */}
                      <div className="flex justify-between items-center px-3 pb-0.5">
                        <span className="text-xs text-gray-700">{label.dateStr} {label.timeStr}</span>
                        <span className="text-xs text-gray-600 font-medium">({label.specimen})</span>
                      </div>

                      {/* Patient name (left) + gender initial / age (right) */}
                      <div className="flex justify-between items-center px-3 pb-2">
                        <span className="font-bold text-xs leading-tight truncate max-w-[170px]">
                          {barcodePatientInfo.patientName}
                        </span>
                        <span className="text-xs font-semibold whitespace-nowrap ml-1">
                          {barcodePatientInfo.ageGender}
                        </span>
                      </div>

                      {/* Short test names */}
                      {label.shortNamesStr && (
                        <div className="px-3 pb-2 text-[10px] text-gray-500 truncate">
                          {label.shortNamesStr}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}


