"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect } from "react";
import {
  RefreshCcw,
  Download,
  Printer,
  Mail,
  Search,
  FileText,
  Calendar,
  Settings,
  Barcode,
  ChevronDown,
  Upload,
  FileCheck,
} from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import BarcodeModal from "@/app/components/BarcodeModal";
import API_BASE_URL from "@/src/api/config";

import { FaWhatsapp } from "react-icons/fa";
import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
import { 
  getPatientTests, 
  updateTestStatus, 
  updateTestDates, 
  getTestStatistics,
  getPatientTestById,
  sendReport,
  getPreviousTestResult,
  getAllTestResults
} from "@/src/api/result";
import { getOrganizations } from "@/src/api/master";
import ReadingValidationModal from "@/app/components/ReadingValidationModal";
import AuthenticateModal from "@/app/components/AuthenticateModal";
import ProfessionalResultReport from "@/src/components/ProfessionalResultReport";
const LetterHead = "/LetterHead.jpeg";

/* ── Per-test row with ALL date fields inside Edit Details modal ── */
function PerTestDateRow({ test, onSave, onStatusChange, rowBg }: { test: any; onSave: (testId: string, data: any) => void; onStatusChange: (testId: string, status: string) => void; rowBg: string }) {
  const [saving, setSaving] = useState(false);
  
  // State for each date field — order_date comes from PatientTest.visitDate (ISO string)
  const [orderChecked, setOrderChecked] = useState(!!test.order_date);
  const [orderDate, setOrderDate] = useState(
    test.order_date ? test.order_date.slice(0, 16) : ''
  );
  
  const [sTakenChecked, setSTakenChecked] = useState(!!test.sample_taken);
  const [sTakenDate, setSTakenDate] = useState(
    test.sample_taken ? test.sample_taken.slice(0, 16) : ''
  );
  
  const [sReceivedChecked, setSReceivedChecked] = useState(!!test.sample_received);
  const [sReceivedDate, setSReceivedDate] = useState(
    test.sample_received ? test.sample_received.slice(0, 16) : ''
  );
  
  const [resultChecked, setResultChecked] = useState(!!test.result_date);
  const [resultDate, setResultDate] = useState(
    test.result_date ? test.result_date.slice(0, 16) : ''
  );

  const handleSave = async (field, checked, dateValue) => {
    setSaving(true);
    const updateData: any = {};
    
    if (field === 'order') {
      updateData.visitDate = checked ? dateValue : null;
      if (checked && dateValue) {
        const dt = new Date(dateValue);
        updateData.visitTime = dt.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' });
      }
    } else if (field === 'sTaken') {
      updateData.sTakenDate = checked ? dateValue : null;
      // Move to RECEIVED when sample taken date is set
      if (checked && dateValue && test.result_status === 'REGISTERED') {
        onStatusChange && onStatusChange(test.test_id, 'RECEIVED');
      }
    } else if (field === 'sReceived') {
      updateData.sReceivedDate = checked ? dateValue : null;
      // Move to RECEIVED when sample received date is set
      if (checked && dateValue && test.result_status === 'REGISTERED') {
        onStatusChange && onStatusChange(test.test_id, 'RECEIVED');
      }
    } else if (field === 'result') {
      updateData.resultDate = checked ? dateValue : null;
    }
    
    await onSave(test.test_id, updateData);
    setSaving(false);
  };

  return (
    <tr className={rowBg}>
      <td className="px-3 py-2 font-medium text-gray-800 text-xs">{test.test_name}</td>
      
      {/* Order Date */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={orderChecked}
          onChange={(e) => {
            setOrderChecked(e.target.checked);
            if (!e.target.checked) {
              handleSave('order', false, null);
            } else if (orderDate) {
              handleSave('order', true, orderDate);
            }
          }}
          className="w-4 h-4 accent-cyan-600 cursor-pointer"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="datetime-local"
          value={orderDate}
          onChange={(e) => {
            setOrderDate(e.target.value);
            if (orderChecked) {
              handleSave('order', true, e.target.value);
            }
          }}
          disabled={!orderChecked || saving}
          className={`border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 ${!orderChecked ? "bg-gray-100 text-gray-400" : "bg-white"}`}
        />
      </td>
      
      {/* S.Taken Date */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={sTakenChecked}
          onChange={(e) => {
            setSTakenChecked(e.target.checked);
            if (!e.target.checked) {
              handleSave('sTaken', false, null);
            } else {
              const now = new Date().toISOString().slice(0, 16);
              setSTakenDate(now);
              handleSave('sTaken', true, now);
            }
          }}
          className="w-4 h-4 accent-cyan-600 cursor-pointer"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="datetime-local"
          value={sTakenDate}
          onChange={(e) => {
            setSTakenDate(e.target.value);
            if (sTakenChecked) {
              handleSave('sTaken', true, e.target.value);
            }
          }}
          disabled={!sTakenChecked || saving}
          className={`border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 ${!sTakenChecked ? "bg-gray-100 text-gray-400" : "bg-white"}`}
        />
      </td>
      
      {/* S.Received Date */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={sReceivedChecked}
          onChange={(e) => {
            setSReceivedChecked(e.target.checked);
            if (!e.target.checked) {
              handleSave('sReceived', false, null);
            } else {
              const now = new Date().toISOString().slice(0, 16);
              setSReceivedDate(now);
              handleSave('sReceived', true, now);
            }
          }}
          className="w-4 h-4 accent-cyan-600 cursor-pointer"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="datetime-local"
          value={sReceivedDate}
          onChange={(e) => {
            setSReceivedDate(e.target.value);
            if (sReceivedChecked) {
              handleSave('sReceived', true, e.target.value);
            }
          }}
          disabled={!sReceivedChecked || saving}
          className={`border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 ${!sReceivedChecked ? "bg-gray-100 text-gray-400" : "bg-white"}`}
        />
      </td>
      
      {/* Result Date */}
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={resultChecked}
          onChange={(e) => {
            setResultChecked(e.target.checked);
            if (!e.target.checked) {
              handleSave('result', false, null);
            } else {
              const now = new Date().toISOString().slice(0, 16);
              setResultDate(now);
              handleSave('result', true, now);
            }
          }}
          className="w-4 h-4 accent-cyan-600 cursor-pointer"
          disabled={saving}
        />
      </td>
      <td className="px-2 py-2">
        <input
          type="datetime-local"
          value={resultDate}
          onChange={(e) => {
            setResultDate(e.target.value);
            if (resultChecked) {
              handleSave('result', true, e.target.value);
            }
          }}
          disabled={!resultChecked || saving}
          className={`border rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 ${!resultChecked ? "bg-gray-100 text-gray-400" : "bg-white"}`}
        />
      </td>
    </tr>
  );
}

export default function Result() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const queryStatus = searchParams.get('status') || 'All';
  const [selectedStatus, setSelectedStatus] = useState(queryStatus);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedPatientTests, setSelectedPatientTests] = useState<any[]>([]);
  const [hoveredTest, setHoveredTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  
  // State for selected tests
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [lockedVisitId, setLockedVisitId] = useState<any>(null);
  const [lockedPatientUid, setLockedPatientUid] = useState<any>(null);
  const [lockedPackageName, setLockedPackageName] = useState<any>(null);
  
  // State for download dropdown
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // State for sort dropdown
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // State for barcode checkbox selection (separate from result selection)
  const [barcodeSelectedTests, setBarcodeSelectedTests] = useState(new Set());
  const [barcodeLockedPatientUid, setBarcodeLockedPatientUid] = useState<any>(null);
  const [barcodeLockedVisitId, setBarcodeLockedVisitId] = useState<any>(null);

  // State for barcode preview modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeLabels, setBarcodeLabels] = useState<any[]>([]);
  const [barcodePatientInfo, setBarcodePatientInfo] = useState<any>(null);
  
  // State for tracking which barcodes are selected for printing (separate from test selection)
  const [selectedBarcodeIndices, setSelectedBarcodeIndices] = useState<Set<number>>(new Set());
  const [barcodesPrinting, setBarcodesPrinting] = useState(false);

  // Track sent/print icons per test_id — persisted in localStorage
  const [sentIcons, setSentIcons] = useState(() => {
    try {
      const saved = localStorage.getItem('sl_sentIcons');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert arrays back to Sets
        const restored = {};
        Object.keys(parsed).forEach(k => { restored[k] = new Set(parsed[k]); });
        return restored;
      }
    } catch (e) {}
    return {};
  });

  // Previous test results cache — stores previous results for each test
  const [previousTestResults, setPreviousTestResults] = useState<any>({});

  // All test results cache — stores all results for each patient/test combination
  const [allTestResults, setAllTestResults] = useState<any>({});

  // State for Previous Test Result Modal
  const [showPreviousResultModal, setShowPreviousResultModal] = useState(false);
  const [previousResultData, setPreviousResultData] = useState<any>(null);
  const [previousResultLoading, setPreviousResultLoading] = useState(false);

  // State for All Test Results Modal
  const [showAllResultsModal, setShowAllResultsModal] = useState(false);
  const [allResultsData, setAllResultsData] = useState<any>([]);
  const [allResultsLoading, setAllResultsLoading] = useState(false);
  
  // State for Upload File Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadPatient, setUploadPatient] = useState<any>(null);
  const [uploadSelectedTests, setUploadSelectedTests] = useState<any>({});
  const [uploadFile, setUploadFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  // Store uploaded file URLs per test_id for report display
  const [uploadedFiles, setUploadedFiles] = useState<any>({});
  
  // State for Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportWithHeader, setReportWithHeader] = useState(true);
  const [defaultSignature, setDefaultSignature] = useState<any>(null);
  
  // State for Reading Validation Modal
  const [showReadingValidationModal, setShowReadingValidationModal] = useState(false);
  const [readingValidationData, setReadingValidationData] = useState<any>(null);
  
  // State for Authenticate Modal
  const [showAuthenticateModal, setShowAuthenticateModal] = useState(false);
  const [authenticateData, setAuthenticateData] = useState<any>(null);
  
  // Real data from API
  const [results, setResults] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: {
      Registered: 0,
      Received: 0,
      Entered: 0,
      Validation: 0,
      Authorized: 0,
      Delivered: 0,
      Rectified: 0
    }
  });
  
  // Filter states — persisted in localStorage (survives browser refresh)
  const [filters, setFilters] = useState(() => {
    // Try to load filters from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resultPageFilters');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Failed to parse saved filters:', e);
        }
      }
    }
    // Default filters if none saved
    return {
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      searchQuery: '', // For Patient Name, ID, or Visit ID
      department: '',
      organization: '',
      testName: ''
    };
  });

  // Organizations state
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  const [settingsFormData, setSettingsFormData] = useState({
    selectedTests: {},
    selectedSpecimens: {},
    testStatuses: {},
    testRemarks: {}
  });
  // Handle test selection with locking logic
  const handleTestSelection = (testId, isSelected, patient, test) => {
    if (isSelected) {
      const newSelected = new Set(selectedTests);
      newSelected.add(testId);
      setSelectedTests(newSelected);
      setLockedVisitId(patient.visit_id);
      setLockedPatientUid(patient.patient_uid);
      // Lock to this package name (null = individual test)
      setLockedPackageName(test.package_name || '__individual__');
    } else {
      const newSelected = new Set(selectedTests);
      newSelected.delete(testId);
      setSelectedTests(newSelected);
      if (newSelected.size === 0) {
        setLockedVisitId(null);
        setLockedPatientUid(null);
        setLockedPackageName(null);
      }
    }
  };

  // Check if a checkbox should be disabled
  const isCheckboxDisabled = (patient: any, test: any) => {
    if (selectedTests.size === 0) return false;
    // Different patient or visit → always block
    if (patient.patient_uid !== lockedPatientUid || patient.visit_id !== lockedVisitId) return true;
    // Same visit — only allow if same package (or same individual)
    const thisKey = test.package_name || '__individual__';
    if (thisKey !== lockedPackageName) return true;
    return false;
  };

  // Handle barcode checkbox selection — locked to same patient/visit
  const handleBarcodeSelection = (testId: any, isSelected: any, patient: any) => {
    if (isSelected) {
      const next = new Set(barcodeSelectedTests);
      next.add(testId);
      setBarcodeSelectedTests(next);
      setBarcodeLockedPatientUid(patient.patient_uid);
      setBarcodeLockedVisitId(patient.visit_id);
    } else {
      const next = new Set(barcodeSelectedTests);
      next.delete(testId);
      setBarcodeSelectedTests(next);
      if (next.size === 0) {
        setBarcodeLockedPatientUid(null);
        setBarcodeLockedVisitId(null);
      }
    }
  };

  const isBarcodeCheckboxDisabled = (patient: any) => {
    if (barcodeSelectedTests.size === 0) return false;
    return patient.patient_uid !== barcodeLockedPatientUid || patient.visit_id !== barcodeLockedVisitId;
  };

  // Open barcode preview modal for selected barcode tests
  const handleBarcodePrint = () => {
    if (barcodeSelectedTests.size === 0) {
      alert('Please select tests using the barcode checkboxes first');
      return;
    }

    let targetPatient = null;
    for (const patient of sortedAndFilteredResults) {
      if (patient.patient_uid === barcodeLockedPatientUid && patient.visit_id === barcodeLockedVisitId) {
        targetPatient = patient;
        break;
      }
    }
    if (!targetPatient) return;

    const selectedTestsList = targetPatient.tests.filter(t => barcodeSelectedTests.has(t.test_id));
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();

    // Group by specimen type — one label per unique specimen
    // Multiple tests with same specimen → one barcode, short names joined with " / "
    const specimenGroups = {};
    const specimenTestIds = {};
    const specimenTestStatuses = {}; // Track ALL test statuses for each specimen group
    const specimenBarcodeStatuses = {}; // Track ALL barcode statuses for each specimen group
    
    selectedTestsList.forEach(t => {
      const key = t.specimen_type || 'Unknown';
      if (!specimenGroups[key]) {
        specimenGroups[key] = [];
        specimenTestIds[key] = [];
        specimenTestStatuses[key] = []; // Store array of all test statuses
        specimenBarcodeStatuses[key] = []; // Store array of all barcode statuses
      }
      specimenGroups[key].push(t.test_short_name || t.test_name);
      specimenTestIds[key].push(t.test_id);
      specimenTestStatuses[key].push(t.status || 'Registered'); // Store each test's status
      specimenBarcodeStatuses[key].push(t.barcode_status || 'Unprinted'); // Store each barcode's status
    });

    // Build labels — barcode value = visitId for first specimen, visitId-2, visitId-3 ...
    const specimenEntries = Object.entries(specimenGroups);
    const labels = specimenEntries.map(([specimen, shortNames], idx) => {
      const statuses = specimenTestStatuses[specimen] || [];
      const barcodeStatuses = specimenBarcodeStatuses[specimen] || [];
      
      // Determine final status: if ANY test is "Received", use "Received"
      // Otherwise, if ANY barcode is "Printed", use "Printed"
      // Otherwise use "Registered" (no test received yet)
      let finalSampleStatus = 'Registered';
      let finalBarcodeStatus = 'Unprinted';
      
      // Check if any test has been received
      if (statuses.includes('Received')) {
        finalSampleStatus = 'Received';
      }
      
      // Check if any barcode has been printed
      if (barcodeStatuses.includes('Printed')) {
        finalBarcodeStatus = 'Printed';
      }
      
      return {
        barcodeValue: idx === 0 ? targetPatient.visit_id : `${targetPatient.visit_id}-${idx + 1}`,
        specimen,
        shortNamesStr: (shortNames as any[]).join(' / '),
        dateStr,
        timeStr,
        testIds: specimenTestIds[specimen] || [],
        sampleStatus: finalSampleStatus,
        barcode_status: finalBarcodeStatus,
      };
    });

    const genderInitial = targetPatient.gender ? targetPatient.gender.charAt(0).toUpperCase() : '';
    const age = targetPatient.age || '';

    setBarcodePatientInfo({
      patientName: targetPatient.patient_name || '',
      visitId: targetPatient.visit_id || '',
      age,
      gender: targetPatient.gender || '',
      // Pre-formatted age/gender string: "F/27 Yrs" or "M/45 Yrs"
      ageGender: genderInitial && age ? `${genderInitial}/${age} Yrs` : genderInitial || (age ? `${age} Yrs` : ''),
      organizationCode: targetPatient.organizationCode || '', // ✅ Include organization code
    });
    
    // Add organizationCode to each label
    const labelsWithOrgCode = labels.map(label => ({
      ...label,
      organizationCode: targetPatient.organizationCode || '', // ✅ Add org code to barcode labels
    }));
    
    setBarcodeLabels(labelsWithOrgCode);
    // Initialize NO barcodes as selected (user must manually select them)
    setSelectedBarcodeIndices(new Set());
    setShowBarcodeModal(true);
  };

  // Toggle barcode selection for printing
  const handleBarcodeToggle = (index: number) => {
    const updated = new Set(selectedBarcodeIndices);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setSelectedBarcodeIndices(updated);
  };

  // Handle navigate to result entry
  const handleResultEntry = () => {
    if (selectedTests.size === 0) {
      alert('Please select a test to enter results');
      return;
    }
    
    // Get the first selected test ID
    const firstTestId = Array.from(selectedTests)[0];
    router.push(`/result/patientresult/${firstTestId}`);
  };

  // Helper: check if a value is out of range based on parameter ranges
  const isParamOutOfRange = (param: any, er: any) => {
    if (!er) return false;
    if (er.isAbnormal === true || er.isAbnormal === 1) return true;
    if (param.type !== 'Numeric') return false;
    const val = er.numericValue;
    if (val === null || val === undefined) return false;
    const rangeStr = er.referenceRange || param.normalRange || '';
    const match = rangeStr.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
    if (match) {
      const low = parseFloat(match[1]);
      const high = parseFloat(match[2]);
      return val < low || val > high;
    }
    return false;
  };

  // Handle download with header option
  const handleDownload = async (option) => {
    setShowDownloadDropdown(false);
    
    if (selectedTests.size === 0) {
      alert('Please select a test to view report');
      return;
    }
    
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);

      // Fetch all selected tests in parallel
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));

      // Use first test's patient/visit info
      const first = responses[0];

      // Fetch signature from first test's speciality
      let signature = first.patientTest.test?.signature || null;
      if (!signature) {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
          const testSpeciality = first.patientTest.test?.speciality || 'Regular';
          const sigRes = await fetch(`${API_BASE_URL}/signatures/by-specialty/${encodeURIComponent(testSpeciality)}`);
          const sigData = await sigRes.json();
          if (sigData.success && sigData.data) {
            signature = sigData.data;
          } else {
            const allRes = await fetch(`${API_BASE_URL}/signatures`);
            const allData = await allRes.json();
            if (allData.success && allData.data.length > 0) {
              const active = allData.data.filter(s => s.isActive);
              if (active.length > 0) signature = active[0];
            }
          }
        } catch (e) { console.warn('Could not fetch signature', e); }
      }

      // Build combined tests array — each with its own name, parameters, interpretation
      const combinedTests = responses.map(r => ({
        name: r.patientTest.test.name,
        interpretation: r.patientTest.test.interpretation,
        groupedParameters: r.groupedParameters,
        parameters: r.parameters
      }));

      setReportData({
        patient: first.patientTest.patient,
        visitId: first.patientTest.visitId,
        visitDate: first.patientTest.visitDate,
        // Keep single test ref for backward compat
        test: first.patientTest.test,
        parameters: first.parameters,
        groupedParameters: first.groupedParameters,
        // Combined multi-test data
        combinedTests,
        signature
      });
      setReportWithHeader(option === "With Header");
      setShowReportModal(true);
    } catch (err) {
      console.error('Error loading report data:', err);
      alert('Error loading report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark sent icons for selected tests — persisted in localStorage
  const markSentIcons = (testIds: any, type: any) => {
    setSentIcons(prev => {
      const updated = { ...prev };
      testIds.forEach(id => {
        const existing = new Set(updated[id] || []);
        existing.add(type);
        updated[id] = existing;
      });
      // Persist to localStorage (convert Sets to arrays)
      try {
        const toSave = {};
        Object.keys(updated).forEach(k => { toSave[k] = Array.from(updated[k]); });
        localStorage.setItem('sl_sentIcons', JSON.stringify(toSave));
      } catch (e) {}
      return updated;
    });
  };

  // Download report as PDF directly to device
  const handleDownloadPdf = async (withHeader) => {
    setShowDownloadDropdown(false);
    if (selectedTests.size === 0) { alert('Please select a test'); return; }
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      const first = responses[0];

      // Fetch signature
      let signature = first.patientTest.test?.signature || null;
      if (!signature) {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
          const testSpeciality = first.patientTest.test?.speciality || 'Regular';
          const sigRes = await fetch(`${API_BASE_URL}/signatures/by-specialty/${encodeURIComponent(testSpeciality)}`);
          const sigData = await sigRes.json();
          if (sigData.success && sigData.data) signature = sigData.data;
          else {
            const allRes = await fetch(`${API_BASE_URL}/signatures`);
            const allData = await allRes.json();
            if (allData.success && allData.data.length > 0) {
              const active = allData.data.filter(s => s.isActive);
              if (active.length > 0) signature = active[0];
            }
          }
        } catch (e) { console.warn('Could not fetch signature', e); }
      }

      const patient = first.patientTest.patient;
      const visitId = first.patientTest.visitId;
      const visitDate = first.patientTest.visitDate
        ? new Date(first.patientTest.visitDate).toLocaleDateString('en-GB') : '-';
      const patientName = `${patient.title || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim();

      // Convert LetterHead image to base64 for embedding in PDF
      let letterHeadBase64 = '';
      if (withHeader) {
        try {
          const imgRes = await fetch(LetterHead);
          const blob = await imgRes.blob();
          letterHeadBase64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) { console.warn('Could not load letterhead', e); }
      }

      const fileName = `${patientName.replace(/\s+/g, '_')}_${visitId}_Report.pdf`;

      // Pre-convert all images to base64 to avoid CORS issues
      const toBase64 = async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      };

      // Re-convert letterhead to base64 if not already done
      if (withHeader && !letterHeadBase64) {
        try { letterHeadBase64 = await toBase64(LetterHead) as string; } catch (e) {}
      }

      // Convert signature image to base64
      let signatureImageBase64 = '';
      if (signature?.signatureImage) {
        try { signatureImageBase64 = await toBase64(signature.signatureImage) as string; } catch (e) { signatureImageBase64 = signature.signatureImage; }
      }

      // Replace signature image src with base64 in sigHtml (rebuild with base64)
      const buildPageHtmlB64 = (r: any) => {
        const t = r.patientTest.test;
        const gp = r.groupedParameters || {};
        const ptop = withHeader ? '144px' : '45px';
        const pbot = withHeader ? '136px' : '45px';

        const paramRows2 = Object.entries(gp).map(([catName, catParams]: [string, any]) => {
          let rows = '';
          if (catName !== 'NO_CATEGORY_HEADER' && catParams[0]?.showCategoryHeader) {
            rows += `<tr><td colSpan={4} style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #ddd;background:#f5f5f5;">${catName.toUpperCase()}</td></tr>`;
          }
          (catParams as any[]).forEach(p => {
            const er = p.existingResult;
            const val = er ? (er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : (er.textValue || '-')) : '-';
            const outOfRange = isParamOutOfRange(p, er);
            rows += `<tr>
              <td style="padding:3px 6px;width:38%;font-weight:${outOfRange ? 'bold' : 'normal'};">${p.parameterName}</td>
              <td style="padding:3px 6px 3px 20px;width:22%;font-size:11px;${outOfRange ? 'color:#b91c1c;font-weight:bold;' : ''}">${val}${outOfRange ? ' *' : ''}</td>
              <td style="padding:3px 6px;width:12%;color:#555;">${p.units || ''}</td>
              <td style="padding:3px 6px;width:28%;color:#555;">${er?.referenceRange || ''}</td>
            </tr>`;
          });
          return rows;
        }).join('');

        const sigHtml2 = signature ? `
          <div style="margin-top:auto;padding-top:22px;display:flex;justify-content:flex-end;">
            <div style="text-align:center;">
              ${signatureImageBase64 ? `<img src="${signatureImageBase64}" style="width:${signature.width||150}px;height:${signature.height||80}px;object-fit:contain;display:block;margin:0 auto;" />` : ''}
              ${signature.signatureText ? `<div style="font-size:11px;font-weight:bold;white-space:pre-line;">${signature.signatureText}</div>` : ''}
              ${signature.doctorName ? `<div style="font-size:11px;font-weight:bold;">${signature.doctorName}</div>` : ''}
              ${signature.specialty ? `<div style="font-size:10px;color:#444;">${signature.specialty}</div>` : ''}
            </div>
          </div>` : '';

        return `<div style="width:100%;height:1123px;position:relative;background:#fff;font-family:Arial,sans-serif;font-size:11px;overflow:hidden;">
            ${withHeader && letterHeadBase64 ? `<img src="${letterHeadBase64}" style="position:absolute;top:0;left:0;width:100%;height:1123px;object-fit:fill;z-index:0;" />` : ''}
            <div style="position:relative;z-index:1;height:1123px;display:flex;flex-direction:column;padding-top:${ptop};padding-bottom:${pbot};padding-left:53px;padding-right:53px;box-sizing:border-box;">
              <div style="text-align:center;margin-bottom:22px;border-bottom:1.5px solid #333;padding-bottom:11px;">
                <strong style="font-size:13px;letter-spacing:1px;">${t.name.toUpperCase()} REPORT</strong>
              </div>
              <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:11px;">
                <tr>
                  <td style="padding:2px 4px;width:50%;"><strong>Patient:</strong> ${patientName}</td>
                  <td style="padding:2px 4px;width:50%;"><strong>Age / Gender:</strong> ${patient.age || '-'} Yrs / ${patient.gender || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:2px 4px;"><strong>Lab No:</strong> ${visitId}</td>
                  <td style="padding:2px 4px;"><strong>Date:</strong> ${visitDate}</td>
                </tr>
              </table>
              <table style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead>
                  <tr>
                    <th style="border-bottom:1.5px solid #333;padding:4px 6px;text-align:left;width:38%;">Test Description</th>
                    <th style="border-bottom:1.5px solid #333;padding:4px 6px 4px 20px;text-align:left;width:22%;">Result</th>
                    <th style="border-bottom:1.5px solid #333;padding:4px 6px;text-align:left;width:12%;">Unit</th>
                    <th style="border-bottom:1.5px solid #333;padding:4px 6px;text-align:left;width:28%;">Biological Reference Range</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={4} style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #ccc;">${t.name}</td></tr>
                  ${paramRows2}
                </tbody>
              </table>
              ${t.interpretation ? `<div style="margin-top:15px;border-top:1px solid #ccc;padding-top:11px;font-size:11px;color:#444;">${t.interpretation}</div>` : ''}
              ${sigHtml2}
            </div>
          </div>`;
      };

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const A4_W = 210, A4_H = 297;

      for (let i = 0; i < responses.length; i++) {
        // html2pdf manages its own container/overlay — just pass the HTML string
        const pageHtml = buildPageHtmlB64(responses[i]);

        const imgDataUrl = await html2pdf().set({
          margin: 0,
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: 794,
          }
        }).from(pageHtml).outputImg('datauristring');

        if (i > 0) pdf.addPage();
        pdf.addImage(imgDataUrl, 'JPEG', 0, 0, A4_W, A4_H);
      }

      // Attachment page
      const attachmentPath = responses.find(r => r.patientTest.attachmentPath)?.patientTest.attachmentPath
        || (uploadedFiles[Array.from(selectedTests)[0] as string]?.serverPath);
      if (attachmentPath && !attachmentPath.endsWith('.pdf')) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api', '');
          const src = attachmentPath.startsWith('http') ? attachmentPath : `${baseUrl}${attachmentPath}`;
          const attachBase64 = await toBase64(src) as string;
          pdf.addPage();
          pdf.addImage(attachBase64, 'JPEG', 0, 0, A4_W, A4_H);
        } catch (e) { console.warn('Could not add attachment page', e); }
      }

      pdf.save(fileName);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleSendEmail = async () => {
    if (selectedTests.size === 0) { alert('Please select at least one test'); return; }
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      const first = responses[0];
      const patient = first.patientTest.patient;

      if (!patient.email) { alert('No email address saved for this patient.'); return; }

      // Build results payload matching what the backend email function expects
      const allResults = [];
      responses.forEach(r => {
        allResults.push({ isHeader: true, testName: r.patientTest.test.name });
        r.parameters.forEach(p => {
          const er = p.existingResult;
          if (!er) return;
          allResults.push({
            parameterName: p.parameterName,
            value: er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : (er.textValue || '-'),
            units: p.units || '',
            referenceRange: er.referenceRange || '',
            isAbnormal: er.isAbnormal || false,
          });
        });
      });

      const testNames = responses.map(r => r.patientTest.test.name).join(', ');
      const result = await sendReport(testIds, 'email');
      // Mark as DELIVERED and record email icon
      await Promise.all(testIds.map(id => updateTestStatus(id, { status: 'DELIVERED' })));
      markSentIcons(testIds, 'email');
      fetchResults();
      alert(`Report sent to ${patient.email}`);
    } catch (err) {
      alert('Failed to send email: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Build WhatsApp document-style message matching the Download report layout
  const buildWhatsAppMessage = (responses: any) => {
    const first = responses[0];
    const patient = first.patientTest.patient;
    const name = `${patient.title || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    const visitId = first.patientTest.visitId;
    const visitDate = first.patientTest.visitDate
      ? new Date(first.patientTest.visitDate).toLocaleDateString('en-GB') : '-';

    const lines = [
      `🏥 *Shraddha Pathology Laboratory*`,
      `_Empowering Life Transforming Health_`,
      ``,
      `Dear ${name},`,
      `Your lab report is ready.`,
      ``,
      `Lab No  : ${visitId}`,
      `Date    : ${visitDate}`,
      `Age/Sex : ${patient.age || '-'} Yrs / ${patient.gender || '-'}`,
      ``,
    ];

    responses.forEach(r => {
      lines.push(`*${r.patientTest.test.name.toUpperCase()}*`);
      lines.push(`${'─'.repeat(30)}`);
      Object.entries(r.groupedParameters || {}).forEach(([catName, catParams]: [string, any]) => {
        if (catName !== 'NO_CATEGORY_HEADER' && catParams[0]?.showCategoryHeader) {
          lines.push(`  _${catName}_`);
        }
        (catParams as any[]).forEach(p => {
          const er = p.existingResult;
          const val = er
            ? (er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : (er.textValue || '-'))
            : '-';
          const units = p.units ? ` ${p.units}` : '';
          const range = er?.referenceRange ? `  [${er.referenceRange}]` : '';
          const flag = er?.isAbnormal ? ' ⚠️' : '';
          lines.push(`• ${p.parameterName}: *${val}*${units}${range}${flag}`);
        });
      });
      lines.push('');
    });

    lines.push(`⚠️ Values marked ⚠️ are outside normal range. Consult your doctor.`);
    lines.push(`📞 8779295302`);
    lines.push(`📍 Plot No-38, Sector-1, New Panvel - 410 206`);
    return lines.join('\n');
  };

  // Handle WhatsApp — opens wa.me deep link with document-style report
  const handleSendWhatsApp = async () => {
    if (selectedTests.size === 0) { alert('Please select at least one test'); return; }
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      const patient = responses[0].patientTest.patient;
      if (!patient.mobile) { alert('No mobile number saved for this patient.'); return; }
      const phone = patient.mobile.startsWith('+')
        ? patient.mobile.replace(/\D/g, '')
        : `91${patient.mobile.replace(/\D/g, '')}`;
      const msg = buildWhatsAppMessage(responses);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
      // Mark as DELIVERED and record whatsapp icon
      await Promise.all(testIds.map(id => updateTestStatus(id, { status: 'DELIVERED' })));
      markSentIcons(testIds, 'whatsapp');
      fetchResults();
    } catch (err) {
      alert('Failed to prepare WhatsApp message: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Direct WA to Doctor — same report but sent to referral doctor's mobile
  const handleDirectWADoctor = async () => {
    if (selectedTests.size === 0) { alert('Please select at least one test'); return; }
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      const doctorName = responses[0].patientTest.referralDoctor;
      if (!doctorName || doctorName === 'SELF') { alert('No referral doctor for this test.'); return; }
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${API_BASE_URL}/master/doctors`);
      const data = await res.json();
      const doctor = data.data?.find(d => d.name === doctorName);
      if (!doctor?.mobile) { alert(`No mobile number found for Dr. ${doctorName}`); return; }
      const phone = doctor.mobile.startsWith('+')
        ? doctor.mobile.replace(/\D/g, '')
        : `91${doctor.mobile.replace(/\D/g, '')}`;
      const msg = buildWhatsAppMessage(responses);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Print — loads report data, opens modal with Professional Report Component
  const handlePrintPreview = async () => {
    if (selectedTests.size === 0) { alert('Please select a test to print'); return; }
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      const first = responses[0];

      // Fetch signature
      let signature = first.patientTest.test?.signature || null;
      if (!signature) {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
          const testSpeciality = first.patientTest.test?.speciality || 'Regular';
          const sigRes = await fetch(`${API_BASE_URL}/signatures/by-specialty/${encodeURIComponent(testSpeciality)}`);
          const sigData = await sigRes.json();
          if (sigData.success && sigData.data) signature = sigData.data;
          else {
            const allRes = await fetch(`${API_BASE_URL}/signatures`);
            const allData = await allRes.json();
            if (allData.success && allData.data.length > 0) {
              const active = allData.data.filter(s => s.isActive);
              if (active.length > 0) signature = active[0];
            }
          }
        } catch (e) { console.warn('Could not fetch signature', e); }
      }

      // Convert LetterHead to base64
      let letterHeadBase64 = '';
      try {
        const imgRes = await fetch(LetterHead);
        const blob = await imgRes.blob();
        letterHeadBase64 = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) { console.warn('Could not load letterhead', e); }

      // Build combined tests array
      const combinedTests = responses.map(r => ({
        name: r.patientTest.test.name,
        interpretation: r.patientTest.test.interpretation,
        groupedParameters: r.groupedParameters,
        parameters: r.parameters
      }));

      // Set report data and open modal
      setReportData({
        patient: first.patientTest.patient,
        visitId: first.patientTest.visitId,
        visitDate: first.patientTest.visitDate,
        test: first.patientTest.test,
        parameters: first.parameters,
        groupedParameters: first.groupedParameters,
        combinedTests,
        signature,
        letterHeadBase64
      });
      setReportWithHeader(true);
      setShowReportModal(true);
      // Record print icon for selected tests
      markSentIcons(testIds, 'print');
    } catch (err) {
      console.error('Print preview error:', err);
      alert('Failed to load print preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle print from modal
  const handlePrint = () => {
    window.print();
  };

  // Open upload modal for a patient
  const handleUploadClick = (patient, specificTest = null) => {
    setUploadPatient(patient);
    // If opened from a specific test icon — pre-select ONLY that test
    // If opened from patient level — all unchecked
    const initial = {};
    patient.tests.forEach(t => {
      initial[t.test_id] = specificTest ? t.test_id === specificTest.test_id : false;
    });
    setUploadSelectedTests(initial);
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async () => {
    const selectedIds = Object.keys(uploadSelectedTests).filter(id => uploadSelectedTests[id]);
    if (!uploadFile) { alert('Please choose a file'); return; }
    if (selectedIds.length === 0) { alert('Please select at least one test'); return; }
    setUploading(true);
    try {
      const objectUrl = URL.createObjectURL(uploadFile);
      const newUploads = {};

      // Upload to backend for each selected test
      for (const id of selectedIds) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const res = await fetch(`/api/results/${id}/attachment`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          const testObj = uploadPatient?.tests?.find(t => String(t.test_id) === String(id));
          newUploads[id] = { url: objectUrl, serverPath: data.attachmentPath, imageSize: testObj?.image_size || null };
        }
      }

      setUploadedFiles(prev => ({ ...prev, ...newUploads }));
      alert('File uploaded and saved successfully!');
      setShowUploadModal(false);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Helper function to get age in specific time unit
  const getAgeInUnit = (years, months, days, timeUnit) => {
    switch (timeUnit) {
      case 'Day(s)':
        return days;
      case 'Month(s)':
        return months;
      case 'Year(s)':
        return years;
      default:
        return years;
    }
  };

  // Function to determine appropriate normal range based on age, gender, and time units
  const getAgeAppropriateRange = (parameter, patientAge, patientGender, patientDob) => {
    if (!parameter) return '';
    
    if (parameter.type === 'Text' || parameter.isDescriptive) {
      return parameter.normalRange || '-';
    }

    if (!parameter.ageRanges || parameter.ageRanges.length === 0) {
      return parameter.normalRange || '-';
    }

    const today = new Date();
    const birthDate = new Date(patientDob);
    
    const ageInYears = today.getFullYear() - birthDate.getFullYear();
    const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    const ageInDays = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));

    for (const range of parameter.ageRanges) {
      const patientAgeInUnit = getAgeInUnit(ageInYears, ageInMonths, ageInDays, range.timeUnit);
      
      const meetsAgeCondition = patientAgeInUnit >= range.minAge && patientAgeInUnit <= range.maxAge;
      const meetsGenderCondition = !range.gender || range.gender.toLowerCase() === patientGender.toLowerCase();
      
      if (meetsAgeCondition && meetsGenderCondition) {
        if (range.lowValue !== null && range.highValue !== null) {
          return `${range.lowValue} - ${range.highValue}`;
        } else if (range.lowValue !== null) {
          return `> ${range.lowValue}`;
        } else if (range.highValue !== null) {
          return `< ${range.highValue}`;
        }
      }
    }

    return parameter.normalRange || '-';
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchResults();
    // fetchStatistics is now called inside fetchResults
  }, [filters]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resultPageFilters', JSON.stringify(filters));
    }
  }, [filters]);

  // Handle test name click to open appropriate modal based on stage
  const handleTestNameClick = async (test: any, patient: any) => {
    try {
      // Map status to proper format for stage check
      const statusMap = {
        'Provisional': 'Entered',
        'Authenticated': 'Authorized',
        'Validated': 'Validation'
      };
      
      const testStatus = statusMap[test.result_status] || test.result_status;

      // If test is in "Entered" stage - open Reading Validation Modal
      if (testStatus === 'Entered') {
        // Fetch full test data including parameters
        const testData = await getPatientTestById(test.test_id);
        
        if (!testData || !testData.patientTest) {
          alert('Error loading test data');
          return;
        }

        // Set data for modal
        setReadingValidationData({
          patientTest: testData.patientTest,
          parameters: testData.parameters,
          groupedParameters: testData.groupedParameters
        });
        
        setShowReadingValidationModal(true);
      }
      // If test is in "Validation" stage - open Authenticate Modal
      else if (testStatus === 'Validation') {
        // Fetch full test data including parameters
        const testData = await getPatientTestById(test.test_id);
        
        if (!testData || !testData.patientTest) {
          alert('Error loading test data');
          return;
        }

        // Set data for modal
        setAuthenticateData({
          patientTest: testData.patientTest,
          parameters: testData.parameters,
          groupedParameters: testData.groupedParameters
        });
        
        setShowAuthenticateModal(true);
      }
      // If test is in any other stage - show error message
      else {
        alert(`⚠️ Test cannot be edited or authenticated.\n\nCurrent Stage: ${testStatus}\n\nReadings can only be edited in "Entered" stage or authenticated in "Validation" stage.\n\nPlease complete earlier stages first.`);
        return;
      }

    } catch (err: any) {
      console.error('Error opening modal:', err);
      alert('Error: ' + (err.message || 'Failed to open modal'));
    }
  };

  // Fetch organizations on component mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const data = await getOrganizations(1, 100);
        setOrganizations(data);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };
    fetchOrganizations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (showDownloadDropdown && !event.target.closest('.download-dropdown')) {
        setShowDownloadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadDropdown]);

  // Fetch results from API
  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getPatientTests(filters);
      setResults(data);
      
      // Calculate unique patient registration count
      const uniquePatients = new Set(data.map(r => r.patient_uid)).size;
      console.log(`📊 Unique patients registered today: ${uniquePatients}`);
      
      // Also fetch and update statistics with the new data
      await fetchStatisticsWithData(data);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics from API with provided data
  const fetchStatisticsWithData = async (data: any[]) => {
    try {
      const stats = await getTestStatistics({
        fromDate: filters.fromDate,
        toDate: filters.toDate
      });
      
      // Modify statistics: count unique patients for "Registered" count
      // Instead of showing all tests with Registered status, show unique patients registered
      const uniqueRegisteredPatients = new Set(
        data
          .filter(r => r.tests?.some(t => t.result_status === 'Registered'))
          .map(r => r.patient_uid)
      ).size;
      
      console.log(`👥 Unique patients with registered tests: ${uniqueRegisteredPatients}`);
      console.log(`📊 Total tests with Registered status: ${data.flatMap(r => r.tests || []).filter(t => t.result_status === 'Registered').length}`);
      
      // Update stats to show unique patient count instead of test count
      setStatistics({
        ...stats,
        byStatus: {
          ...stats.byStatus,
          Registered: uniqueRegisteredPatients  // Override with unique patient count
        }
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Fetch statistics from API (for manual calls)
  const fetchStatistics = async () => {
    try {
      const data = await getPatientTests(filters);
      await fetchStatisticsWithData(data);
    } catch (err) {
      console.error('Error fetching statistics:', err);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: any, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle search
  const handleSearch = () => {
    fetchResults();
  };

  // Handle refresh — reset filters and reload data
  const handleRefresh = () => {
    const defaultFilters = {
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      searchQuery: '',
      department: '',
      organization: '',
      testName: ''
    };
    setFilters(defaultFilters);
    setSelectedStatus('All');
    setSelectedTests(new Set());
    setLockedVisitId(null);
    setLockedPatientUid(null);
    setLockedPackageName(null);
    setBarcodeSelectedTests(new Set());
    setBarcodeLockedPatientUid(null);
    setBarcodeLockedVisitId(null);
    
    // Clear filters from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('resultPageFilters');
    }
    
    fetchResults();
    fetchStatistics();
  };

  // Handle fetch previous test result
  const handleFetchPreviousResult = async (patient: any, test: any) => {
    try {
      setPreviousResultLoading(true);
      const result = await getPreviousTestResult(patient.patient_uid, test.test_id.toString());
      setPreviousResultData({
        test: test,
        patient: patient,
        result: result
      });
      setShowPreviousResultModal(true);
    } catch (error) {
      console.error('Error fetching previous result:', error);
      alert('Failed to fetch previous test result: ' + error.message);
    } finally {
      setPreviousResultLoading(false);
    }
  };

  // Handle fetch all test results
  const handleFetchAllResults = async (patient: any, test: any) => {
    try {
      setAllResultsLoading(true);
      const results = await getAllTestResults(patient.patient_uid, test.test_id.toString(), 10);
      setAllResultsData({
        test: test,
        patient: patient,
        results: results
      });
      setShowAllResultsModal(true);
    } catch (error) {
      console.error('Error fetching all results:', error);
      alert('Failed to fetch test result history: ' + error.message);
    } finally {
      setAllResultsLoading(false);
    }
  };

  // Filter results based on selected status
  const filteredResults = selectedStatus === "All" 
    ? results 
    : results.map(patient => ({
        ...patient,
        tests: patient.tests.filter(test => {
          // Map old status names to new ones
          const statusMap = {
            'Provisional': 'Entered',
            'Authenticated': 'Authorized',
            'Validated': 'Validation'
          };
          
          const testStatus = statusMap[test.result_status] || test.result_status;
          return testStatus.toUpperCase() === selectedStatus.toUpperCase();
        })
      })).filter(patient => patient.tests.length > 0);

  // Sort results based on sortBy selection
  const sortedAndFilteredResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        // Sort by date (newest first)
        return new Date(b.tests?.[0]?.order_date || 0).getTime() - new Date(a.tests?.[0]?.order_date || 0).getTime();
      case 'uid':
        // Sort by UID alphanumerically
        return (a.patient_uid || '').localeCompare(b.patient_uid || '');
      case 'alphabetic':
        // Sort by patient name alphabetically
        return (a.patient_name || '').localeCompare(b.patient_name || '');
      default:
        return 0;
    }
  });

  // Calculate pagination
  const totalRecords = sortedAndFilteredResults.length;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResults = sortedAndFilteredResults.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredResults]);

  // Get status badge color based on status
  const getStatusBadgeColor = (status: any) => {
    const pascalStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
    // Map old status names to new ones for display
    const statusMap = {
      'Provisional': 'Entered',
      'Authenticated': 'Authorized',
      'Validated': 'Validation'
    };
    
    const displayStatus = statusMap[pascalStatus] || pascalStatus;
    
    switch (displayStatus) {
      case "Registered":
        return "bg-cyan-100 text-cyan-800";
      case "Received":
        return "bg-orange-100 text-orange-800";
      case "Entered":
        return "bg-purple-100 text-purple-800";
      case "Validation":
        return "bg-yellow-100 text-yellow-800";
      case "Authorized":
        return "bg-blue-100 text-blue-800";
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Rectified":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle S.Taken checkbox toggle for individual test — saves immediately
  const handleSTakenToggle = async (test, checked) => {
    try {
      const now = new Date().toISOString().slice(0, 16);
      await updateTestDates(test.test_id, {
        sTakenDate: checked ? now : null,
      });
      // When sample is taken → move to RECEIVED
      if (checked && test.result_status === 'REGISTERED') {
        await updateTestStatus(test.test_id, { status: 'RECEIVED' });
      }
      fetchResults();
    } catch (err) {
      console.error('Error saving S.Taken:', err);
    }
  };

  // Handle calendar icon click — opens modal for ALL tests of the patient
  const handleCalendarClick = (patient: any, test: any) => {
    setSelectedTest({ ...test, patientName: patient.patient_name, visitId: patient.visit_id });
    setSelectedPatientTests(patient.tests);
    setShowEditModal(true);
  };

  // Handle settings icon click
  const handleSettingsClick = (patient: any, test: any) => {
    setSelectedPatient(patient);
    setSelectedTest(test);
    
    // Initialize form data with current patient's tests
    const initialTestStatuses = {};
    const initialTestRemarks = {};
    const initialSelectedTests = {};
    const initialSelectedSpecimens = {};
    
    // Group tests by specimen type
    const specimenTypes = [...new Set(patient.tests.map(t => t.specimen_type))];
    
    patient.tests.forEach(t => {
      initialTestStatuses[t.test_id] = t.result_status;
      initialTestRemarks[t.test_id] = t.remark || '';
      initialSelectedTests[t.test_id] = false;
    });
    
    specimenTypes.forEach((specimen: any) => {
      initialSelectedSpecimens[specimen] = false;
    });
    
    setSettingsFormData({
      selectedTests: initialSelectedTests,
      selectedSpecimens: initialSelectedSpecimens,
      testStatuses: initialTestStatuses,
      testRemarks: initialTestRemarks
    });
    
    setShowSettingsModal(true);
  };

  // Handle settings input changes
  const handleSettingsInputChange = (type: any, id: any, value: any) => {
    setSettingsFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [id]: value
      }
    }));
  };

  // Handle settings save
  const handleSettingsSave = async () => {
    try {
      setLoading(true);
      
      // Get selected test IDs and their new statuses
      const updates = [];
      Object.keys(settingsFormData.selectedTests).forEach(testId => {
        if (settingsFormData.selectedTests[testId]) {
          updates.push({
            id: parseInt(testId),
            status: settingsFormData.testStatuses[testId],
            remarks: settingsFormData.testRemarks[testId]
          });
        }
      });
      
      if (updates.length === 0) {
        alert('Please select tests to update');
        return;
      }
      
      // Update each selected test
      for (const update of updates) {
        if (update.status && update.status !== "Please Select") {
          await updateTestStatus(update.id, {
            status: update.status,
            remarks: update.remarks
          });
        }
      }
      
      setShowSettingsModal(false);
      fetchResults(); // Refresh data
      
      alert('Status updated successfully!');
      
    } catch (err) {
      console.error('Error updating test statuses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle form cancel
  const handleCancel = () => {
    setShowEditModal(false);
    setSelectedTest(null);
  };

  // Handle settings cancel
  const handleSettingsCancel = () => {
    setShowSettingsModal(false);
    setSelectedTest(null);
  };

  return (
    <>
      <Header />
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-gray-50 min-h-screen mt-16">
        <PageHeader title="" path="Results" />
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-2">

            {/* Status Cards with All button */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setSelectedStatus("All")}
                className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                  selectedStatus === "All" 
                    ? "bg-gray-700 text-white ring-2 ring-gray-900" 
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All ({statistics.total})
              </button>
              
              <div className="grid grid-cols-7 gap-2 flex-1">
                <div 
                  onClick={() => setSelectedStatus("Registered")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Registered" ? "bg-cyan-200 ring-2 ring-cyan-600" : "bg-cyan-100"
                  }`}
                >
                  <h3 className="text-cyan-800 font-semibold text-xs sm:text-sm">
                    Registered ({statistics.byStatus.Registered})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Received")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Received" ? "bg-orange-200 ring-2 ring-orange-600" : "bg-orange-100"
                  }`}
                >
                  <h3 className="text-orange-800 font-semibold text-xs sm:text-sm">
                    Received ({statistics.byStatus.Received})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Entered")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Entered" ? "bg-purple-200 ring-2 ring-purple-600" : "bg-purple-100"
                  }`}
                >
                  <h3 className="text-purple-800 font-semibold text-xs sm:text-sm">
                    Entered ({statistics.byStatus.Entered})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Validation")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Validation" ? "bg-yellow-200 ring-2 ring-yellow-600" : "bg-yellow-100"
                  }`}
                >
                  <h3 className="text-yellow-800 font-semibold text-xs sm:text-sm">
                    Validation ({statistics.byStatus.Validation})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Authorized")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Authorized" ? "bg-blue-200 ring-2 ring-blue-600" : "bg-blue-100"
                  }`}
                >
                  <h3 className="text-blue-800 font-semibold text-xs sm:text-sm">
                    Authorized ({statistics.byStatus.Authorized})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Delivered")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Delivered" ? "bg-green-200 ring-2 ring-green-600" : "bg-green-100"
                  }`}
                >
                  <h3 className="text-green-800 font-semibold text-xs sm:text-sm">
                    Delivered ({statistics.byStatus.Delivered})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Rectified")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Rectified" ? "bg-red-200 ring-2 ring-red-600" : "bg-red-100"
                  }`}
                >
                  <h3 className="text-red-800 font-semibold text-xs sm:text-sm">
                    Rectified ({statistics.byStatus.Rectified})
                  </h3>
                </div>
              </div>
            </div>

            {/* Top Filter Bar */}
            <div className="bg-white rounded shadow-md p-2 sm:p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <input 
                  type="date" 
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  title="From Date"
                />
                
                <span className="text-xs text-gray-500">to</span>
                
                <input 
                  type="date" 
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  title="To Date"
                />
                
                <input 
                  type="text" 
                  placeholder="Patient/ID/Visit"
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600 w-32"
                />
                
                <select 
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="">All Dept</option>
                  <option value="Haematology">Haematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Microbiology">Microbiology</option>
                </select>
                
                <select 
                  value={filters.organization}
                  onChange={(e) => handleFilterChange('organization', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="">All Org</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.code || org.name}</option>
                  ))}
                </select>
                
                <input 
                  type="text" 
                  placeholder="Test"
                  value={filters.testName}
                  onChange={(e) => handleFilterChange('testName', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600 w-20"
                />
                
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="h-8 px-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center gap-1 text-xs disabled:opacity-50"
                  title="Search"
                >
                  <Search size={14} />
                </button>
                
                <button 
                  onClick={handleRefresh}
                  disabled={loading}
                  className="h-8 px-2 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-1 text-xs disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCcw size={14} />
                </button>
                
                <button 
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="h-8 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs sm:text-sm relative"
                  title="Sort"
                >
                  ☰
                  
                  {showSortDropdown && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-max">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortBy('date');
                          setShowSortDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-100 ${sortBy === 'date' ? 'bg-blue-50 font-semibold' : ''}`}
                      >
                        ↓ Sort by Date
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortBy('uid');
                          setShowSortDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-100 ${sortBy === 'uid' ? 'bg-blue-50 font-semibold' : ''}`}
                      >
                        ↓ Sort by UID
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortBy('alphabetic');
                          setShowSortDropdown(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-100 ${sortBy === 'alphabetic' ? 'bg-blue-50 font-semibold' : ''}`}
                      >
                        ↓ Sort by Alphabetic (Name)
                      </button>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Result Table - Scrollable */}
            <div className="bg-white rounded shadow-md overflow-hidden">
              {/* Top right selector for records per page */}
              <div className="px-3 py-2 border-b border-gray-200 flex justify-end">
                <div className="flex gap-1 text-sm">
                  <button
                    onClick={() => { setItemsPerPage(25); setCurrentPage(1); }}
                    className={`px-2 py-1 transition-colors ${itemsPerPage === 25 ? 'text-cyan-600 font-semibold' : 'text-gray-700 hover:text-cyan-600'}`}
                  >
                    25
                  </button>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => { setItemsPerPage(50); setCurrentPage(1); }}
                    className={`px-2 py-1 transition-colors ${itemsPerPage === 50 ? 'text-cyan-600 font-semibold' : 'text-gray-700 hover:text-cyan-600'}`}
                  >
                    50
                  </button>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => { setItemsPerPage(100); setCurrentPage(1); }}
                    className={`px-2 py-1 transition-colors ${itemsPerPage === 100 ? 'text-cyan-600 font-semibold' : 'text-gray-700 hover:text-cyan-600'}`}
                  >
                    100
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-900 text-white shadow-xl">
                    <tr>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-center font-semibold text-xs whitespace-nowrap border border-gray-300">
                        <input type="checkbox" className="w-3 h-3 cursor-pointer accent-white" />
                      </th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Visit ID</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Org ID</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Patient Name</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Age</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Gender</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Services</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Referral Doc</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">
                        Previous Test Result
                      </th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">
                        All Test Results
                      </th>
                      <th className="px-0.5 sm:px-1 py-1.5 sm:py-2 text-center font-semibold text-xs whitespace-nowrap border border-gray-300">
                        <span className="text-[10px]">S.Taken</span>
                      </th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Patient History</th>
                      <th className="px-0.5 sm:px-1 py-1.5 sm:py-2 text-center font-semibold text-xs whitespace-nowrap border border-gray-300">
                        <div title="Print barcode labels for selected tests">
                          <Barcode
                            size={16}
                            className="mx-auto cursor-pointer hover:text-cyan-300 transition-colors"
                            onClick={handleBarcodePrint}
                          />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={13} className="text-center p-4 text-gray-500 text-sm border border-gray-300">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                            Loading...
                          </div>
                        </td>
                      </tr>
                    ) : paginatedResults.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">
                          No records found for {selectedStatus} status
                        </td>
                      </tr>
                    ) : (
                      paginatedResults.map((patient, patientIndex) => {
                        return patient.tests.map((test, testIndex) => (
                          <tr 
                            key={`${patient.patient_uid}-${test.test_id}`} 
                            className={`hover:bg-opacity-80 text-gray-800 border-b border-gray-300 cursor-pointer transition-all ${getStatusBadgeColor(test.result_status)}`}
                          >
                            {/* Column 1: Checkbox */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-center border border-gray-300">
                              <input 
                                type="checkbox" 
                                className="w-3 h-3 cursor-pointer accent-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                checked={selectedTests.has(test.test_id)}
                                disabled={isCheckboxDisabled(patient, test)}
                                onChange={(e) => handleTestSelection(test.test_id, e.target.checked, patient, test)}
                              />
                            </td>

                            {/* Column 2: Visit ID (show only on first test row) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">
                              {testIndex === 0 ? patient.visit_id : ''}
                            </td>

                            {/* Column 3: Org ID with hover tooltip (show only on first test row) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300 relative">
                              {testIndex === 0 && (
                                <div 
                                  className="cursor-help relative group"
                                  title={patient.organization_name || 'N/A'}
                                >
                                  <span>{patient.organizationCode ? patient.organizationCode : '-'}</span>
                                  {/* Tooltip - only show if organization exists */}
                                  {patient.organizationCode && (
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                                      <span className="bg-gray-800 text-white text-[10px] font-semibold rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                        {patient.organization_name || 'Organization'}
                                      </span>
                                      <span className="w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Column 4: Patient Name with balance icon (show only on first test row) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs font-medium border border-gray-300">
                              {testIndex === 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="truncate">{patient.patient_name}</span>
                                  {patient.balance_amount > 0 && (
                                    <span
                                      className="relative group cursor-pointer"
                                      onClick={() => {
                                        localStorage.setItem('searchQuery', patient.patient_uid);
                                        router.push('/patient/search-booking');
                                      }}
                                    >
                                      <span className="text-red-500 text-[11px] font-bold leading-none select-none">₹</span>
                                      {/* Tooltip */}
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                                        <span className="bg-red-600 text-white text-[10px] font-semibold rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                          Balance: ₹{patient.balance_amount.toLocaleString('en-IN')}
                                        </span>
                                        <span className="w-2 h-2 bg-red-600 rotate-45 -mt-1" />
                                      </span>
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>

                            {/* Column 5: Age (show only on first test row) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs font-medium border border-gray-300 text-center">
                              {testIndex === 0 && (
                                <span className="font-semibold text-gray-900">{patient.age || '-'} Yrs</span>
                              )}
                            </td>

                            {/* Column 6: Gender (show only on first test row) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs font-medium border border-gray-300 text-center">
                              {testIndex === 0 && (
                                <span className="font-semibold text-gray-900">{patient.gender || '-'}</span>
                              )}
                            </td>

                            {/* Column 7: Services (with icons) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300" title={test.test_name}>
                              <div className="flex items-center gap-1">
                                <span 
                                  className="flex-1 cursor-pointer hover:text-cyan-700 hover:font-semibold transition-colors"
                                  onClick={() => handleTestNameClick(test, patient)}
                                  title="Click to view/edit readings"
                                >
                                  {test.test_name}
                                </span>
                                {/* Sent/Print icons */}
                                {sentIcons[test.test_id]?.has('email') && (
                                  <div title="Email sent">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                  </div>
                                )}
                                {sentIcons[test.test_id]?.has('whatsapp') && (
                                  <div title="WhatsApp sent">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#16a34a" className="flex-shrink-0">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                    </svg>
                                  </div>
                                )}
                                {sentIcons[test.test_id]?.has('print') && (
                                  <div title="Printed">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                      <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                                    </svg>
                                  </div>
                                )}
                                {/* Upload icon — only when attachFile = Yes */}
                                {test.attach_file === 'Yes' && (
                                  <div title="Upload file">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="24" height="24"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="text-gray-700 cursor-pointer hover:text-green-700 flex-shrink-0"
                                      onClick={() => handleUploadClick(patient, test)}
                                    >
                                      <path d="M11 15V9.414l-2.293 2.293-1.414-1.414L12 5.586l4.707 4.707-1.414 1.414L13 9.414V15h-2z"/>
                                      <path d="M5 18v2h14v-2H5z"/>
                                    </svg>
                                  </div>
                                )}
                                {/* Star icon — right end, only for package tests */}
                                {test.package_name && (
                                  <div title={`Package: ${test.package_name}`}>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="12" height="12"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="text-yellow-500 flex-shrink-0"
                                    >
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* Column 8: Referral Doc */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">
                              <span className="inline-flex items-center gap-1">
                                {test.ref_by === "SELF" ? (
                                  <>
                                    <span className="text-orange-600 text-[10px]">👤</span>
                                    <span>{test.ref_by}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-blue-600 text-[10px]">👨‍⚕️</span>
                                    <span>{test.ref_by}</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Column 9: Previous Test Result */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleFetchPreviousResult(patient, test)}
                                  disabled={previousResultLoading}
                                  className="text-cyan-600 hover:text-cyan-800 hover:underline font-medium text-xs disabled:opacity-50"
                                  title="View previous test result"
                                >
                                  {previousResultLoading ? '...' : '📋 View'}
                                </button>
                              </div>
                            </td>

                            {/* Column 10: All Test Results */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleFetchAllResults(patient, test)}
                                  disabled={allResultsLoading}
                                  className="text-cyan-600 hover:text-cyan-800 hover:underline font-medium text-xs disabled:opacity-50"
                                  title="View all test results"
                                >
                                  {allResultsLoading ? '...' : '📊 View'}
                                </button>
                              </div>
                            </td>

                            {/* Column 11: S.Taken (green tick mark + calendar & settings icons, all rows) */}
                            <td className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border border-gray-300">
                              <div className="flex items-center justify-center gap-1">
                                {test.sample_taken ? (
                                  <span className="text-green-600 text-lg font-bold leading-none">✓</span>
                                ) : null}
                                {/* Calendar icon */}
                                <div className="relative">
                                  <Calendar 
                                    size={14} 
                                    className="text-gray-700 cursor-pointer hover:text-cyan-600 flex-shrink-0" 
                                    onMouseEnter={() => setHoveredTest(`${patient.patient_uid}-${test.test_id}-calendar`)}
                                    onMouseLeave={() => setHoveredTest(null)}
                                    onClick={() => {
                                      // Always show ALL tests for this patient visit, regardless of which row's calendar is clicked
                                      handleCalendarClick(patient, test);
                                    }}
                                  />
                                  {/* Tooltip for Calendar */}
                                  {hoveredTest === `${patient.patient_uid}-${test.test_id}-calendar` && (
                                    <div className="fixed z-50 w-72 sm:w-80 bg-white border-2 border-black rounded-lg shadow-lg p-3 text-xs pointer-events-none"
                                         style={{
                                           left: '50%',
                                           top: '50%',
                                           transform: 'translate(-50%, -50%)',
                                           maxWidth: 'calc(100vw - 2rem)'
                                         }}>
                                      {testIndex === 0 ? (
                                        <>
                                          <div className="font-semibold text-gray-800 mb-1">Patient: {patient.patient_name}</div>
                                          <div className="font-bold text-gray-900 mb-2">SHRADDHA PATHOLOGY LABORATORY</div>
                                          <div className="font-semibold text-gray-800 mb-1">Visit ID:</div>
                                          <div className="text-blue-600 font-medium mb-2">{patient.visit_id}</div>
                                          <div className="font-semibold text-gray-800 mb-1">Total Tests:</div>
                                          <div className="text-gray-900">{patient.tests.length}</div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="font-semibold text-gray-800 mb-1">Test: {test.test_name}</div>
                                          <div className="font-bold text-gray-900 mb-2">SHRADDHA PATHOLOGY LABORATORY</div>
                                          <div className="font-semibold text-gray-800 mb-1">Sample Received:</div>
                                          <div className="text-blue-600 font-medium mb-2">{test.approved_date}</div>
                                          <div className="font-semibold text-gray-800 mb-1">Sample Type:</div>
                                          <div className="text-gray-900">{test.specimen_type}</div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {/* Settings icon */}
                                <Settings 
                                  size={14} 
                                  className="text-gray-700 cursor-pointer hover:text-cyan-600 flex-shrink-0" 
                                  onClick={() => {
                                    if (testIndex === 0) {
                                      handleSettingsClick(patient, patient.tests[0]);
                                    } else if (test.result_status === "Authorized" || test.result_status === "Entered") {
                                      handleSettingsClick(patient, test);
                                    }
                                  }}
                                />
                              </div>
                            </td>

                            {/* Column 12: Patient History (display patient_history text only, show only on first test row) */}
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300 relative">
                              {testIndex === 0 && (
                                <div className="relative group cursor-help">
                                  {patient.patient_history ? (
                                    <>
                                      <span className="truncate block max-w-xs" title={patient.patient_history}>
                                        {patient.patient_history}
                                      </span>
                                      {/* Tooltip on hover */}
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                                        <span className="bg-gray-800 text-white text-[10px] font-semibold rounded px-2 py-1 whitespace-normal max-w-xs shadow-lg">
                                          {patient.patient_history}
                                        </span>
                                        <span className="w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 italic">—</span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Column 13: Barcode checkbox */}
                            <td className="px-0.5 sm:px-1 py-1 sm:py-1.5 text-center border border-gray-300">
                              <input
                                type="checkbox"
                                className="w-3 h-3 cursor-pointer accent-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                checked={barcodeSelectedTests.has(test.test_id)}
                                disabled={isBarcodeCheckboxDisabled(patient)}
                                onChange={(e) => handleBarcodeSelection(test.test_id, e.target.checked, patient)}
                              />
                            </td>
                          </tr>
                        ));
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalRecords > 0 && (
              <div className="bg-white rounded shadow-md p-3">
                <div className="text-sm text-gray-700 mb-3">
                  Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, totalRecords)}</span> of <span className="font-semibold">{totalRecords}</span> records
                </div>
                
                {/* Pagination buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
                  >
                    ← Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-cyan-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
            
            {/* Bottom Action Buttons */}
            <div className="bg-white rounded shadow-md p-2 sm:p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <button 
                    onClick={handleResultEntry}
                    className="flex gap-1 sm:gap-1.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                    <span>Result ({selectedTests.size})</span>
                  </button>
                  <button className="flex gap-1 sm:gap-1.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors">
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handlePrintPreview}
                    disabled={loading || selectedTests.size === 0}
                    className="flex gap-1 sm:gap-1.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors disabled:opacity-50"
                  >
                    <Printer size={14} className="sm:w-4 sm:h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={loading || selectedTests.size === 0}
                    className="flex gap-1 sm:gap-1.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors disabled:opacity-50"
                  >
                    <Mail size={14} className="sm:w-4 sm:h-4" />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => handleSendWhatsApp()}
                    disabled={loading || selectedTests.size === 0}
                    className="flex gap-1 sm:gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors disabled:opacity-50"
                  >
                    <FaWhatsapp size={14} className="sm:w-4 sm:h-4" />
                    <span>Whatsapp</span>
                  </button>
                  
                  {/* Download Dropdown */}
                  <div className="relative download-dropdown">
                    <button 
                      onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                      className="flex gap-1 sm:gap-1.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
                    >
                      <Download size={14} className="sm:w-4 sm:h-4" />
                      <span>Download</span>
                      <ChevronDown size={12} className="sm:w-3 sm:h-3" />
                    </button>
                    
                    {showDownloadDropdown && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[140px]">
                        <button
                          onClick={() => handleDownloadPdf(true)}
                          className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <img src={LetterHead} alt="Header" className="w-4 h-4 object-contain" />
                          With Header
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(false)}
                          className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Without Header
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>

      {/* Edit Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-medium text-gray-900">Edit Details</h2>
              <button 
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              {/* Patient Info */}
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-800">
                  Patient: <span className="text-cyan-700">{selectedTest?.patientName}</span>
                </h3>
                <p className="text-sm text-gray-600">Visit ID: {selectedTest?.visitId}</p>
              </div>

              {/* All Tests with All Date Fields */}
              {selectedPatientTests.length > 0 && (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-gradient-to-r from-cyan-700 to-cyan-600 text-white">
                      <tr>
                        <th className="px-3 py-2 text-left border border-gray-300">Test Name</th>
                        <th className="px-2 py-2 text-center border border-gray-300 w-16">Order</th>
                        <th className="px-2 py-2 text-left border border-gray-300 min-w-[160px]">Order Date</th>
                        <th className="px-2 py-2 text-center border border-gray-300 w-16">S.Taken</th>
                        <th className="px-2 py-2 text-left border border-gray-300 min-w-[160px]">S.Taken Date</th>
                        <th className="px-2 py-2 text-center border border-gray-300 w-16">S.Received</th>
                        <th className="px-2 py-2 text-left border border-gray-300 min-w-[160px]">S.Received Date</th>
                        <th className="px-2 py-2 text-center border border-gray-300 w-16">Result</th>
                        <th className="px-2 py-2 text-left border border-gray-300 min-w-[160px]">Result Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPatientTests.map((t, i) => (
                        <PerTestDateRow
                          key={t.test_id}
                          test={t}
                          onStatusChange={async (testId, status) => {
                            await updateTestStatus(testId, { status });
                            fetchResults();
                          }}
                          onSave={async (testId, updateData) => {
                            await updateTestDates(testId, updateData);
                            fetchResults();
                            // Update local state
                            setSelectedPatientTests(prev =>
                              prev.map(x => {
                                if (x.test_id === testId) {
                                  const updated = { ...x };
                                  if (updateData.visitDate !== undefined) updated.order_date = updateData.visitDate;
                                  if (updateData.sTakenDate !== undefined) updated.sample_taken = updateData.sTakenDate;
                                  if (updateData.sReceivedDate !== undefined) updated.sample_received = updateData.sReceivedDate;
                                  if (updateData.resultDate !== undefined) updated.result_date = updateData.resultDate;
                                  return updated;
                                }
                                return x;
                              })
                            );
                          }}
                          rowBg={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 sticky bottom-0">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sample Details Modal */}
      {showSettingsModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-medium text-blue-600">Edit Sample Details</h2>
              <button 
                onClick={handleSettingsCancel}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6">
              {/* Patient Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {selectedPatient.patient_name} {selectedPatient.age} Yrs / {selectedPatient.gender}
                </h3>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-cyan-600 text-white">
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Specimen Type</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Tests</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Group tests by specimen type */}
                    {(() => {
                      const specimenGroups = {};
                      selectedPatient.tests.forEach(test => {
                        if (!specimenGroups[test.specimen_type]) {
                          specimenGroups[test.specimen_type] = [];
                        }
                        specimenGroups[test.specimen_type].push(test);
                      });

                      return Object.entries(specimenGroups).map(([specimenType, tests]: [string, any]) => 
                        (tests as any[]).map((test, testIndex) => (
                          <tr key={test.test_id} className="bg-white hover:bg-gray-50">
                            {/* Specimen Type - show only for first test of each specimen type */}
                            {testIndex === 0 && (
                              <td className="border border-gray-300 px-4 py-3" rowSpan={tests.length}>
                                <div className="flex items-center">
                                  <input 
                                    type="checkbox" 
                                    className="mr-2"
                                    checked={settingsFormData.selectedSpecimens[specimenType] || false}
                                    onChange={(e) => handleSettingsInputChange('selectedSpecimens', specimenType, e.target.checked)}
                                  />
                                  <span className="text-sm font-medium">{specimenType}</span>
                                </div>
                              </td>
                            )}
                            
                            {/* Test Name */}
                            <td className="border border-gray-300 px-4 py-3">
                              <div className="flex items-center">
                                <input 
                                  type="checkbox" 
                                  className="mr-2"
                                  checked={settingsFormData.selectedTests[test.test_id] || false}
                                  onChange={(e) => handleSettingsInputChange('selectedTests', test.test_id, e.target.checked)}
                                />
                                <span className="text-sm">{test.test_name}</span>
                              </div>
                            </td>
                            
                            {/* Status Dropdown */}
                            <td className="border border-gray-300 px-4 py-3">
                              <select 
                                value={settingsFormData.testStatuses[test.test_id] || test.result_status}
                                onChange={(e) => handleSettingsInputChange('testStatuses', test.test_id, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              >
                                <option value="">Please Select</option>
                                <option value="Registered">Registered</option>
                                <option value="Received">Received</option>
                                <option value="Entered">Entered</option>
                                <option value="Validation">Validation</option>
                                <option value="Authorized">Authorized</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Rectified">Rectified</option>
                              </select>
                            </td>
                            
                            {/* Remark Input */}
                            <td className="border border-gray-300 px-4 py-3">
                              <input
                                type="text"
                                value={settingsFormData.testRemarks[test.test_id] || test.remark || ''}
                                onChange={(e) => handleSettingsInputChange('testRemarks', test.test_id, e.target.value)}
                                placeholder="Write Or Select"
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              />
                            </td>
                          </tr>
                        ))
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Update Status Button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSettingsSave}
                  className="px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm font-medium"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal - Using Professional Report Component */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">

            {/* Modal Toolbar - hidden on print */}
            <div className="flex items-center justify-between px-4 py-3 border-b no-print flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Professional Report - {reportData.test?.name}</h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
                >
                  Print
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none px-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Scrollable preview area */}
            <div className="overflow-y-auto flex-1 bg-gray-100 p-6">

              {/* Print styles */}
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  .report-page, .report-page * { visibility: visible !important; }
                  .report-page {
                    position: relative !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 20px !important;
                    box-shadow: none !important;
                    page-break-after: always;
                    overflow: visible !important;
                    background: white !important;
                  }
                  .report-page:last-child { page-break-after: avoid; }
                  .no-print { display: none !important; }
                  @page { size: A4; margin: 10mm; }
                }
              `}</style>

              {/* Render Professional Report Component */}
              {(reportData.combinedTests || [reportData]).map((testData, idx) => (
                <div
                  key={idx}
                  className="report-page"
                  id={idx === 0 ? 'report-print-page' : undefined}
                  style={{
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    padding: '0',
                    marginBottom: '16px',
                    borderRadius: '4px',
                  }}
                >
                  <ProfessionalResultReport
                    patient={reportData.patient}
                    visitDate={reportData.visitDate}
                    visitId={reportData.visitId}
                    test={testData.test || testData}
                    groupedParameters={testData.groupedParameters || reportData.groupedParameters}
                    parameters={testData.parameters || reportData.parameters}
                    signature={reportData.signature}
                    withHeader={reportWithHeader}
                    letterHeadBase64={reportData.letterHeadBase64}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && uploadPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">Upload File</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">×</button>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Select Laboratory Tests:</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {uploadPatient.tests.map(t => {
                    const hasAttachment = t.attachment_path || uploadedFiles[t.test_id]?.serverPath;
                    return (
                      <label key={t.test_id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uploadSelectedTests[t.test_id] || false}
                          onChange={(e) => setUploadSelectedTests(prev => ({ ...prev, [t.test_id]: e.target.checked }))}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-gray-800">{t.test_name}</span>
                        {hasAttachment && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            ✅ Attached
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                await fetch(`/api/results/${t.test_id}/attachment`, { method: 'DELETE' });
                                setUploadedFiles(prev => { const n = { ...prev }; delete n[t.test_id]; return n; });
                                setUploadPatient(prev => ({
                                  ...prev,
                                  tests: prev.tests.map(x => x.test_id === t.test_id ? { ...x, attachment_path: null } : x)
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 ml-1"
                            >✕</button>
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5">
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:text-xs file:bg-white file:text-gray-700 hover:file:bg-gray-50"
                />
              </div>

              <button
                onClick={handleUploadSubmit}
                disabled={uploading}
                className="bg-green-600 text-white px-5 py-2 rounded text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previous Test Result Modal */}
      {showPreviousResultModal && previousResultData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                Previous Test Result - {previousResultData.test.test_name}
              </h2>
              <button 
                onClick={() => setShowPreviousResultModal(false)} 
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {previousResultData.result ? (
                <>
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-gray-600">
                      <strong>Patient:</strong> {previousResultData.patient.patient_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Test Date:</strong> {new Date(previousResultData.result.visitDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-semibold text-gray-900">Results:</p>
                    {previousResultData.result.testResults && previousResultData.result.testResults.length > 0 ? (
                      <div className="space-y-2">
                        {previousResultData.result.testResults.map((result, idx) => (
                          <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="font-medium text-gray-800">{result.parameterName}</p>
                            <p className="text-sm text-gray-600">
                              Value: <span className={result.isOutOfRange ? 'text-red-600 font-semibold' : ''}>{result.value}</span> {result.units}
                            </p>
                            {result.isAbnormal && (
                              <p className="text-xs text-orange-600 font-semibold">⚠️ Abnormal</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No results recorded for this test</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-6">No previous test result found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Test Results Modal */}
      {showAllResultsModal && allResultsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                Test Result History - {allResultsData.test.test_name}
              </h2>
              <button 
                onClick={() => setShowAllResultsModal(false)} 
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                <strong>Patient:</strong> {allResultsData.patient.patient_name} | 
                <strong className="ml-2">Total Results:</strong> {allResultsData.results ? allResultsData.results.length : 0}
              </p>
              
              {allResultsData.results && allResultsData.results.length > 0 ? (
                <div className="space-y-4">
                  {allResultsData.results.map((testResult, testIdx) => (
                    <div key={testIdx} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {new Date(testResult.visitDate).toLocaleDateString()} {new Date(testResult.visitDate).toLocaleTimeString()}
                          </p>
                          <p className="text-xs text-gray-600">Status: <span className="font-medium">{testResult.status}</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {testResult.results && testResult.results.map((result, idx) => (
                          <div key={idx} className="bg-white p-2 rounded border border-gray-200 text-xs">
                            <p className="font-medium text-gray-800">{result.parameterName}</p>
                            <p className="text-gray-600">
                              <span className={result.isOutOfRange ? 'text-red-600 font-semibold' : ''}>
                                {result.value}
                              </span>
                              {result.units && <span className="text-gray-500"> {result.units}</span>}
                            </p>
                            {result.referenceRange && (
                              <p className="text-gray-500 text-[10px]">Ref: {result.referenceRange}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-6">No test results found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal - Using Reusable Component */}
      <BarcodeModal
        isOpen={showBarcodeModal}
        onClose={() => {
          setShowBarcodeModal(false);
          setBarcodeSelectedTests(new Set());
          setBarcodeLockedPatientUid(null);
          setBarcodeLockedVisitId(null);
        }}
        onPrintOnly={async () => {
          const printArea = document.getElementById('barcode-print-area');
          const printContent = printArea.innerHTML;
          const win = window.open('', '_blank');
          win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Barcode Labels - ${barcodePatientInfo?.patientName || 'Print'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { 
      font-family: 'Arial', sans-serif; 
      background: white; 
      padding: 5mm;
      margin: 0;
    }
    .barcode-container { 
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5mm;
      padding: 0;
      page-break-after: auto;
    }
    .barcode-card {
      width: 70mm;
      height: 80mm;
      border: 2px solid #333;
      padding: 4px;
      page-break-inside: avoid;
      background: white;
      display: flex;
      flex-direction: column;
      font-family: 'Arial', sans-serif;
      font-size: 10px;
      break-inside: avoid;
    }
    svg { 
      max-width: 100%; 
      height: auto; 
      display: block;
    }
    @page { 
      size: A4 portrait; 
      margin: 5mm;
      padding: 0;
    }
    @media print { 
      body { 
        padding: 5mm;
        margin: 0;
      }
      .barcode-container { 
        gap: 3mm;
      }
      .barcode-card {
        border: 1px solid #000;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="barcode-container">
    ${printContent}
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 500);
    });
  </script>
</body>
</html>`);
          win.document.close();
          win.focus();
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
                  body: JSON.stringify({ changedBy: 'result_page' })
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
          
          // Print only the selected barcodes
          const printArea = document.getElementById('barcode-print-area');
          const allLabels = printArea.querySelectorAll('[data-barcode-index]');
          
          // Create a new container with only selected labels
          const selectedLabelsHtml = Array.from(allLabels)
            .map((label, idx) => {
              if (selectedBarcodeIndices.has(idx)) {
                return (label as HTMLElement).outerHTML;
              }
              return '';
            })
            .filter(html => html.length > 0)
            .join('');
          
          const win = window.open('', '_blank');
          win.document.write(`<!DOCTYPE html><html><head><title>Barcode Labels</title>
            <style>
              * { margin:0; padding:0; box-sizing:border-box; }
              body { font-family: Arial, sans-serif; background: white; padding: 8mm; }
              .labels-wrap { display: flex; flex-wrap: wrap; gap: 6mm; justify-content: flex-start; }
              .label { width: 58mm; border: 2px solid; padding: 3px; page-break-inside: avoid; }
              @page { size: A4; margin: 8mm; }
              @media print { body { padding: 0; } .labels-wrap { gap: 4mm; } }
            </style>
          </head><body><div class="labels-wrap">${selectedLabelsHtml}</div></body></html>`);
          win.document.close();
          win.focus();
          win.print();
          
          setShowBarcodeModal(false);
          setBarcodeSelectedTests(new Set());
          setBarcodeLockedPatientUid(null);
          setBarcodeLockedVisitId(null);
          setSelectedBarcodeIndices(new Set());
          
          if (successCount > 0) {
            setTimeout(() => {
              alert(`✅ ${successCount} test(s) marked as Received and ${selectedBarcodeIndices.size} barcode(s) printed!`);
              // Refresh results to get updated barcode_status from database
              fetchResults();
            }, 800);
          }
        }}
        barcodeLabels={barcodeLabels}
        barcodePatientInfo={barcodePatientInfo}
        selectedBarcodes={selectedBarcodeIndices}
        onBarcodeToggle={handleBarcodeToggle}
        isPrinting={barcodesPrinting}
      />

      {/* Reading Validation Modal */}
      {showReadingValidationModal && readingValidationData && (
        <ReadingValidationModal
          isOpen={showReadingValidationModal}
          onClose={() => {
            setShowReadingValidationModal(false);
            setReadingValidationData(null);
            fetchResults(); // Refresh results after validation
          }}
          patientData={readingValidationData.patientTest}
          parameters={readingValidationData.parameters}
          groupedParameters={readingValidationData.groupedParameters}
        />
      )}

      {/* Authenticate Modal */}
      {showAuthenticateModal && authenticateData && (
        <AuthenticateModal
          isOpen={showAuthenticateModal}
          onClose={() => {
            setShowAuthenticateModal(false);
            setAuthenticateData(null);
            fetchResults(); // Refresh results after authentication
          }}
          patientData={authenticateData.patientTest}
          parameters={authenticateData.parameters}
          groupedParameters={authenticateData.groupedParameters}
        />
      )}
    </>
  );
}
