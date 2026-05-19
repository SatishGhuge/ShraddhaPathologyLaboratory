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

import { FaWhatsapp } from "react-icons/fa";
import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
import { 
  getPatientTests, 
  updateTestStatus, 
  updateTestDates, 
  getTestStatistics,
  getPatientTestById,
  sendReport
} from "@/src/api/result.js";
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

  // State for barcode checkbox selection (separate from result selection)
  const [barcodeSelectedTests, setBarcodeSelectedTests] = useState(new Set());
  const [barcodeLockedPatientUid, setBarcodeLockedPatientUid] = useState<any>(null);
  const [barcodeLockedVisitId, setBarcodeLockedVisitId] = useState<any>(null);

  // State for barcode preview modal
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeLabels, setBarcodeLabels] = useState<any[]>([]);
  const [barcodePatientInfo, setBarcodePatientInfo] = useState<any>(null);

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
  
  // Real data from API
  const [results, setResults] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: {
      REGISTERED: 0,
      RECEIVED: 0,
      PROVISIONAL: 0,
      AUTHENTICATED: 0,
      DELIVERED: 0
    }
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'All',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    patientName: '',
    labRequest: '',
    corporate: '',
    department: 'Department',
    testName: ''
  });
  
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

  // Open barcode preview modal for selected barcode tests
  const handleBarcodePrint = () => {
    if (barcodeSelectedTests.size === 0) {
      alert('Please select tests using the barcode checkboxes first');
      return;
    }

    let targetPatient = null;
    for (const patient of filteredResults) {
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
    selectedTestsList.forEach(t => {
      const key = t.specimen_type || 'Unknown';
      if (!specimenGroups[key]) specimenGroups[key] = [];
      specimenGroups[key].push(t.test_short_name || t.test_name);
    });

    // Build labels — barcode value = visitId for first specimen, visitId-2, visitId-3 ...
    const specimenEntries = Object.entries(specimenGroups);
    const labels = specimenEntries.map(([specimen, shortNames], idx) => ({
      // visitId for first, visitId-2 for second, etc.
      barcodeValue: idx === 0 ? targetPatient.visit_id : `${targetPatient.visit_id}-${idx + 1}`,
      specimen,
      // Short names joined — truncated smartly for label space
      shortNamesStr: (shortNames as any[]).join(' / '),
      dateStr,
      timeStr,
    }));

    const genderInitial = targetPatient.gender ? targetPatient.gender.charAt(0).toUpperCase() : '';
    const age = targetPatient.age || '';

    setBarcodePatientInfo({
      patientName: targetPatient.patient_name || '',
      visitId: targetPatient.visit_id || '',
      age,
      gender: targetPatient.gender || '',
      // Pre-formatted age/gender string: "F/27 Yrs" or "M/45 Yrs"
      ageGender: genderInitial && age ? `${genderInitial}/${age} Yrs` : genderInitial || (age ? `${age} Yrs` : ''),
    });
    setBarcodeLabels(labels);
    setShowBarcodeModal(true);
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
      `🏥 *SilverLeaf Diagnostics*`,
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

  // Print — loads report data, opens print preview in new tab with Print button
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

      const patient = first.patientTest.patient;
      const visitId = first.patientTest.visitId;
      const visitDate = first.patientTest.visitDate
        ? new Date(first.patientTest.visitDate).toLocaleDateString('en-GB') : '-';
      const patientName = `${patient.title || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim();

      const buildPage = (r: any, withHeader: any) => {
        const t = r.patientTest.test;
        const gp = r.groupedParameters || {};

        const paramRows = Object.entries(gp).map(([catName, catParams]: [string, any]) => {
          let rows = '';
          if (catName !== 'NO_CATEGORY_HEADER' && catParams[0]?.showCategoryHeader) {
            rows += `<tr><td colSpan={4} style="padding:4px 6px;font-weight:bold;border-bottom:1px solid #ddd;background:#f5f5f5;">${catName.toUpperCase()}</td></tr>`;
          }
          (catParams as any[]).forEach(p => {
            const er = p.existingResult;
            const val = er
              ? (er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : (er.textValue || '-'))
              : '-';
            const flag = isParamOutOfRange(p, er);
            const valDisplay = flag
              ? `<strong style="color:#b91c1c;letter-spacing:0.3px;">${val} *</strong>`
              : val;
            rows += `<tr>
              <td style="padding:3px 6px;width:38%;font-weight:${flag ? 'bold' : 'normal'};">${p.parameterName}</td>
              <td style="padding:3px 6px 3px 20px;width:22%;font-size:11px;">${valDisplay}</td>
              <td style="padding:3px 6px;width:12%;color:#555;">${p.units || ''}</td>
              <td style="padding:3px 6px;width:28%;color:#555;">${er?.referenceRange || ''}</td>
            </tr>`;
          });
          return rows;
        }).join('');

        const sigHtml = signature ? `
          <div style="margin-top:auto;padding-top:6mm;display:flex;justify-content:flex-end;">
            <div style="text-align:center;">
              ${signature.signatureImage ? `<img src="${signature.signatureImage}" style="width:${signature.width||150}px;height:${signature.height||80}px;object-fit:contain;" />` : ''}
              ${signature.signatureText ? `<div style="font-size:11px;font-weight:bold;">${signature.signatureText}</div>` : ''}
              ${signature.doctorName ? `<div style="font-size:11px;font-weight:bold;">${signature.doctorName}</div>` : ''}
              ${signature.specialty ? `<div style="font-size:10px;color:#444;">${signature.specialty}</div>` : ''}
            </div>
          </div>` : '';

        return `
          <div class="report-page">
            ${withHeader && letterHeadBase64 ? `<img src="${letterHeadBase64}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;z-index:0;" />` : ''}
            <div style="position:relative;z-index:1;height:100%;display:flex;flex-direction:column;padding-top:${withHeader ? '38mm' : '12mm'};padding-bottom:${withHeader ? '36mm' : '12mm'};padding-left:14mm;padding-right:14mm;box-sizing:border-box;">
              <div style="text-align:center;margin-bottom:6mm;border-bottom:1.5px solid #333;padding-bottom:3mm;">
                <strong style="font-size:13px;letter-spacing:1px;">${t.name.toUpperCase()} REPORT</strong>
              </div>
              <table style="width:100%;border-collapse:collapse;margin-bottom:4mm;font-size:11px;">
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
                  ${paramRows}
                </tbody>
              </table>
              ${t.interpretation ? `<div style="margin-top:4mm;border-top:1px solid #ccc;padding-top:3mm;font-size:11px;color:#444;">${t.interpretation}</div>` : ''}
              ${sigHtml}
            </div>
          </div>`;
      };

      // Build both with-header and without-header versions
      // Add attachment page if exists
      const attachPath = responses.find(r => r.patientTest.attachmentPath)?.patientTest.attachmentPath
        || (uploadedFiles[Array.from(selectedTests)[0] as string]?.serverPath);
      let attachPageHtml = '';
      if (attachPath) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api','');
        const src = attachPath.startsWith('http') ? attachPath : `${baseUrl}${attachPath}`;
        const isPdf = attachPath.endsWith('.pdf');
        attachPageHtml = `<div class="report-page" style="display:flex;align-items:center;justify-content:center;">
          ${isPdf
            ? `<iframe src="${src}" style="width:100%;height:100%;border:none;"></iframe>`
            : `<img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;" />`}
        </div>`;
      }

      const withHeaderHtml = responses.map(r => buildPage(r, true)).join('') + attachPageHtml;
      const withoutHeaderHtml = responses.map(r => buildPage(r, false)).join('') + attachPageHtml;

      const previewWindow = window.open('', '_blank', 'width=1000,height=800');
      previewWindow.document.write(`<!DOCTYPE html><html><head><title>Print Preview — ${patientName}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial,sans-serif; font-size:11px; background:#6b7280; }
          .toolbar { position:fixed; top:0; left:0; right:0; z-index:100; background:#1f2937; color:white; padding:10px 20px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.4); }
          .toolbar h3 { font-size:14px; font-weight:600; flex:1; }
          .toolbar button { padding:6px 16px; border:none; border-radius:4px; cursor:pointer; font-size:13px; font-weight:600; }
          .btn-print { background:#2563eb; color:white; }
          .btn-print:hover { background:#1d4ed8; }
          .btn-toggle { background:#374151; color:#d1d5db; }
          .btn-toggle.active { background:#0891b2; color:white; }
          .pages { margin-top:60px; padding:20px; }
          .report-page { width:210mm; height:297mm; position:relative; background:#fff; margin:16px auto; box-shadow:0 4px 20px rgba(0,0,0,0.3); overflow:hidden; page-break-after:always; }
          .report-page:last-child { page-break-after:avoid; }
          @media print {
            .toolbar { display:none !important; }
            body { background:white; }
            .pages { margin-top:0; padding:0; }
            .report-page { margin:0; box-shadow:none; }
            @page { size:A4; margin:0; }
          }
        </style>
      </head><body>
        <div class="toolbar">
          <h3>🖨️ Print Preview — ${patientName} | Lab No: ${visitId}</h3>
          <button class="btn-toggle active" id="btnWith" onclick="showWith()">With Header</button>
          <button class="btn-toggle" id="btnWithout" onclick="showWithout()">Without Header</button>
          <button class="btn-print" onclick="window.print()">🖨️ Print</button>
          <button class="btn-toggle" onclick="window.close()">✕ Close</button>
        </div>
        <div class="pages" id="pages">${withHeaderHtml}</div>
        <script>
          const withH = ${JSON.stringify(withHeaderHtml)};
          const withoutH = ${JSON.stringify(withoutHeaderHtml)};
          function showWith() {
            document.getElementById('pages').innerHTML = withH;
            document.getElementById('btnWith').classList.add('active');
            document.getElementById('btnWithout').classList.remove('active');
          }
          function showWithout() {
            document.getElementById('pages').innerHTML = withoutH;
            document.getElementById('btnWithout').classList.add('active');
            document.getElementById('btnWith').classList.remove('active');
          }
        <\/script>
      </body></html>`);
      previewWindow.document.close();
      previewWindow.focus();
      // Record print icon for selected tests
      markSentIcons(Array.from(selectedTests), 'print');
    } catch (err) {
      console.error('Print preview error:', err);
      alert('Failed to load print preview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Print — opens report in a new tab for viewing/printing
  const handlePrint = () => {
    const pages = document.querySelectorAll('.report-page');
    if (!pages.length) return;
    const pagesHtml = Array.from(pages).map(p => p.outerHTML).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Report</title><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; font-size:11px; background:#e5e7eb; }
      @page { size: A4; margin: 0; }
      .report-page {
        width: 210mm; height: 297mm;
        position: relative; overflow: hidden;
        page-break-after: always;
        background: #fff;
        margin: 16px auto;
        box-shadow: 0 2px 16px rgba(0,0,0,0.18);
      }
      .report-page:last-child { page-break-after: avoid; }
      @media print {
        body { background: white; }
        .report-page { margin: 0; box-shadow: none; }
      }
    </style></head><body>${pagesHtml}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
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
    fetchStatistics();
  }, [filters]);

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
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics from API
  const fetchStatistics = async () => {
    try {
      const stats = await getTestStatistics({
        fromDate: filters.fromDate,
        toDate: filters.toDate
      });
      setStatistics(stats);
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
    setFilters({
      status: 'All',
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      patientName: '',
      labRequest: '',
      corporate: '',
      department: 'Department',
      testName: ''
    });
    setSelectedStatus('All');
    setSelectedTests(new Set());
    setLockedVisitId(null);
    setLockedPatientUid(null);
    setLockedPackageName(null);
    setBarcodeSelectedTests(new Set());
    setBarcodeLockedPatientUid(null);
    setBarcodeLockedVisitId(null);
    fetchResults();
    fetchStatistics();
  };

  // Filter results based on selected status
  const filteredResults = selectedStatus === "All" 
    ? results 
    : results.map(patient => ({
        ...patient,
        tests: patient.tests.filter(test => test.result_status.toUpperCase() === selectedStatus.toUpperCase())
      })).filter(patient => patient.tests.length > 0);

  // Get status badge color based on status
  const getStatusBadgeColor = (status: any) => {
    const upperStatus = status.toUpperCase();
    switch (upperStatus) {
      case "REGISTERED":
        return "bg-cyan-100 text-cyan-800";
      case "RECEIVED":
        return "bg-orange-100 text-orange-800";
      case "PROVISIONAL":
        return "bg-pink-100 text-pink-800";
      case "AUTHENTICATED":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
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
      <div className="p-2 sm:p-3 md:p-4 lg:p-6 bg-gray-50 min-h-screen">
        <PageHeader title="Laboratory Dashboard" icon={FileText} path="Results" />
        
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
              
              <div className="grid grid-cols-5 gap-2 flex-1">
                <div 
                  onClick={() => setSelectedStatus("REGISTERED")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "REGISTERED" ? "bg-cyan-200 ring-2 ring-cyan-600" : "bg-cyan-100"
                  }`}
                >
                  <h3 className="text-cyan-800 font-semibold text-xs sm:text-sm">
                    Registered ({statistics.byStatus.REGISTERED})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("RECEIVED")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "RECEIVED" ? "bg-orange-200 ring-2 ring-orange-600" : "bg-orange-100"
                  }`}
                >
                  <h3 className="text-orange-800 font-semibold text-xs sm:text-sm">
                    Received ({statistics.byStatus.RECEIVED})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("PROVISIONAL")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "PROVISIONAL" ? "bg-pink-200 ring-2 ring-pink-600" : "bg-pink-100"
                  }`}
                >
                  <h3 className="text-pink-800 font-semibold text-xs sm:text-sm">
                    Provisional ({statistics.byStatus.PROVISIONAL})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("AUTHENTICATED")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "AUTHENTICATED" ? "bg-purple-200 ring-2 ring-purple-600" : "bg-purple-100"
                  }`}
                >
                  <h3 className="text-purple-800 font-semibold text-xs sm:text-sm">
                    Authenticated ({statistics.byStatus.AUTHENTICATED})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("DELIVERED")}
                  className={`rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "DELIVERED" ? "bg-green-200 ring-2 ring-green-600" : "bg-green-100"
                  }`}
                >
                  <h3 className="text-green-800 font-semibold text-xs sm:text-sm">
                    Delivered ({statistics.byStatus.DELIVERED})
                  </h3>
                </div>
              </div>
            </div>

            {/* Top Filter Bar */}
            <div className="bg-white rounded shadow-md p-2 sm:p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="All">All</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="RECEIVED">Received</option>
                  <option value="PROVISIONAL">Provisional</option>
                  <option value="AUTHENTICATED">Authenticated</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
                
                <input 
                  type="date" 
                  value={filters.fromDate}
                  onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
                
                <input 
                  type="date" 
                  value={filters.toDate}
                  onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
                
                <input 
                  type="text" 
                  placeholder="Patient Name/ID"
                  value={filters.patientName}
                  onChange={(e) => handleFilterChange('patientName', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600 flex-1 min-w-[180px]"
                />
                
                <input 
                  type="text" 
                  placeholder="Visit ID"
                  value={filters.labRequest}
                  onChange={(e) => handleFilterChange('labRequest', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600 w-28"
                />
                
                <input 
                  type="text" 
                  placeholder="Search Corporate"
                  value={filters.corporate}
                  onChange={(e) => handleFilterChange('corporate', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600 flex-1 min-w-[140px]"
                />
                
                <select 
                  value={filters.department}
                  onChange={(e) => handleFilterChange('department', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="Department">Department</option>
                  <option value="Haematology">Haematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Microbiology">Microbiology</option>
                </select>
                
                <input 
                  type="text" 
                  placeholder="Test Name"
                  value={filters.testName}
                  onChange={(e) => handleFilterChange('testName', e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600 flex-1 min-w-[140px]"
                />
                
                <select 
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="All">Status</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="RECEIVED">Received</option>
                  <option value="PROVISIONAL">Provisional</option>
                  <option value="AUTHENTICATED">Authenticated</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
                
                <button 
                  onClick={handleSearch}
                  disabled={loading}
                  className="h-8 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                >
                  <Search size={14} />
                </button>
                
                <button 
                  onClick={handleRefresh}
                  disabled={loading}
                  className="h-8 px-3 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                >
                  <RefreshCcw size={14} />
                </button>
                
                <button
                  onClick={handlePrintPreview}
                  disabled={loading || selectedTests.size === 0}
                  className="h-8 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded flex items-center gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                >
                  <Printer size={14} />
                </button>
                
                <button className="h-8 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs sm:text-sm">
                  ☰
                </button>
              </div>
            </div>



            {/* Result Table - Scrollable */}
            <div className="bg-white rounded shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 shadow-xl text-white">
                    <tr>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-center font-semibold text-xs whitespace-nowrap border border-gray-300">
                        <input type="checkbox" className="w-3 h-3 cursor-pointer accent-white" />
                      </th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">No.</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Patient</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Corp.</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">UID</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Visit ID</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-center font-semibold text-xs whitespace-nowrap border border-gray-300">
                        <input type="checkbox" className="w-3 h-3 cursor-pointer accent-white" />
                      </th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Services</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Ref By</th>
                      <th className="px-1 sm:px-2 py-1.5 sm:py-2 text-left font-semibold text-xs whitespace-nowrap border border-gray-300">Date</th>
                      <th className="px-0.5 sm:px-1 py-1.5 sm:py-2 text-center font-semibold text-xs whitespace-nowrap border border-gray-300">
                        <span className="text-[10px]">S.Taken</span>
                      </th>
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
                        <td colSpan={12} className="text-center p-4 text-gray-500 text-sm border border-gray-300">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                            Loading...
                          </div>
                        </td>
                      </tr>
                    ) : filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center p-3 sm:p-4 text-gray-500 text-xs sm:text-sm border border-gray-300">
                          No records found for {selectedStatus} status
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((patient, patientIndex) => {
                        return patient.tests.map((test, testIndex) => (
                          <tr 
                            key={`${patient.patient_uid}-${test.test_id}`} 
                            className={`hover:bg-opacity-80 text-gray-800 border-b border-gray-300 cursor-pointer transition-all ${getStatusBadgeColor(test.result_status)}`}
                          >
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-center border border-gray-300">
                              <input type="checkbox" className="w-3 h-3 cursor-pointer accent-cyan-600" />
                            </td>
                            
                            {/* Show patient info only on first test row, lab number on all rows */}
                            {testIndex === 0 ? (
                              <>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">{patientIndex + 1}</td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs font-medium border border-gray-300">
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
                                </td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">{patient.corporate}</td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300">{patient.patient_uid}</td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs font-semibold border border-gray-300">{patient.visit_id}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300"></td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300"></td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300"></td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300"></td>
                                <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs font-semibold border border-gray-300">{patient.visit_id}</td>
                              </>
                            )}
                            
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-center border border-gray-300">
                              <input 
                                type="checkbox" 
                                className="w-3 h-3 cursor-pointer accent-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                checked={selectedTests.has(test.test_id)}
                                disabled={isCheckboxDisabled(patient, test)}
                                onChange={(e) => handleTestSelection(test.test_id, e.target.checked, patient, test)}
                              />
                            </td>
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs border border-gray-300" title={test.test_name}>
                              <div className="flex items-center gap-1">
                                <span className="flex-1">{test.test_name}</span>
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
                            <td className="px-1 sm:px-2 py-1 sm:py-1.5 text-xs whitespace-nowrap border border-gray-300">{test.approved_date}</td>
                            <td className="px-0.5 sm:px-1 py-1 sm:py-1.5 border border-gray-300 relative">
                              <div className="flex items-center justify-start gap-1">
                                {/* Show patient-level buttons on first test row */}
                                {testIndex === 0 ? (
                                  <div className="flex items-center gap-1">
                                    <div className="relative">
                                      <Calendar 
                                        size={14} 
                                        className="text-gray-700 cursor-pointer hover:text-cyan-600 flex-shrink-0" 
                                        onMouseEnter={() => setHoveredTest(`${patient.patient_uid}-patient-calendar`)}
                                        onMouseLeave={() => setHoveredTest(null)}
                                        onClick={() => handleCalendarClick(patient, patient.tests[0])}
                                      />
                                      {/* Responsive Tooltip */}
                                      {hoveredTest === `${patient.patient_uid}-patient-calendar` && (
                                        <div className="fixed z-50 w-72 sm:w-80 bg-white border-2 border-black rounded-lg shadow-lg p-3 text-xs pointer-events-none"
                                             style={{
                                               left: '50%',
                                               top: '50%',
                                               transform: 'translate(-50%, -50%)',
                                               maxWidth: 'calc(100vw - 2rem)'
                                             }}>
                                          <div className="font-semibold text-gray-800 mb-1">Patient: {patient.patient_name}</div>
                                          <div className="font-bold text-gray-900 mb-2">SILVERLEAF DIAGNOSTICS</div>
                                          <div className="font-semibold text-gray-800 mb-1">Visit ID:</div>
                                          <div className="text-blue-600 font-medium mb-2">{patient.visit_id}</div>
                                          <div className="font-semibold text-gray-800 mb-1">Total Tests:</div>
                                          <div className="text-gray-900">{patient.tests.length}</div>
                                        </div>
                                      )}
                                    </div>
                                    <Settings 
                                      size={14} 
                                      className="text-gray-700 cursor-pointer hover:text-cyan-600 flex-shrink-0" 
                                      onClick={() => handleSettingsClick(patient, patient.tests[0])}
                                    />
                                  </div>
                                ) : (
                                  /* Show individual test calendar/settings only for specific statuses */
                                  (test.result_status.toUpperCase() === "AUTHENTICATED" || test.result_status.toUpperCase() === "PROVISIONAL") ? (
                                    <div className="flex items-center gap-1">
                                      <div className="relative">
                                        <Calendar 
                                          size={12} 
                                          className="text-gray-500 crsor-pointer hover:text-cyan-600 flex-shrink-0" 
                                          onMouseEnter={() => setHoveredTest(`${patient.patient_uid}-${test.test_id}`)}
                                          onMouseLeave={() => setHoveredTest(null)}
                                          onClick={() => handleCalendarClick(patient, test)}
                                        />
                                        {/* Responsive Tooltip */}
                                        {hoveredTest === `${patient.patient_uid}-${test.test_id}` && (
                                          <div className="fixed z-50 w-72 sm:w-80 bg-white border-2 border-black rounded-lg shadow-lg p-3 text-xs pointer-events-none"
                                               style={{
                                                 left: '50%',
                                                 top: '50%',
                                                 transform: 'translate(-50%, -50%)',
                                                 maxWidth: 'calc(100vw - 2rem)'
                                               }}>
                                            <div className="font-semibold text-gray-800 mb-1">Test: {test.test_name}</div>
                                            <div className="font-bold text-gray-900 mb-2">SILVERLEAF DIAGNOSTICS</div>
                                            <div className="font-semibold text-gray-800 mb-1">Sample Received:</div>
                                            <div className="text-blue-600 font-medium mb-2">{test.approved_date}</div>
                                            <div className="font-semibold text-gray-800 mb-1">Sample Type:</div>
                                            <div className="text-gray-900">{test.specimen_type}</div>
                                          </div>
                                        )}
                                      </div>
                                      <Settings 
                                        size={12} 
                                        className="text-gray-500 cursor-pointer hover:text-cyan-600 flex-shrink-0" 
                                        onClick={() => handleSettingsClick(patient, test)}
                                      />
                                    </div>
                                  ) : null
                                )}
                              </div>
                            </td>
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
                  <button
                    onClick={() => handleSendWhatsApp()}
                    disabled={loading || selectedTests.size === 0}
                    className="flex gap-1 sm:gap-1.5 items-center bg-cyan-600 hover:bg-cyan-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors disabled:opacity-50"
                  >
                    <span>Direct WA to Patient</span>
                  </button>
                  <button
                    onClick={handleDirectWADoctor}
                    disabled={loading || selectedTests.size === 0}
                    className="flex gap-1 sm:gap-1.5 items-center bg-cyan-600 hover:bg-cyan-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors disabled:opacity-50"
                  >
                    <span>Direct WA to Doctor</span>
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm">
                  <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded">Registered</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Received</span>
                  <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded">Provisional</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Authenticated</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Delivered</span>
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
                                <option value="Please Select">Please Select</option>
                                <option value="REGISTERED">Registered</option>
                                <option value="RECEIVED">Received</option>
                                <option value="PROVISIONAL">Provisional</option>
                                <option value="AUTHENTICATED">Authenticated</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="RETEST">Retest</option>
                                <option value="REVERT">Revert</option>
                                <option value="HOLD">Hold</option>
                                <option value="REJECTED">Rejected</option>
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

      {/* Report Modal */}
      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">

            {/* Modal Toolbar - hidden on print */}
            <div className="flex items-center justify-between px-4 py-3 border-b no-print flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">{reportData.test?.name} — Report</h2>
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
            <div className="overflow-y-auto flex-1">

              {/* Print styles */}
              <style>{`
                @media print {
                  body * { visibility: hidden !important; }
                  .report-page, .report-page * { visibility: visible !important; }
                  .report-page {
                    position: relative !important;
                    width: 210mm !important;
                    height: 297mm !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    page-break-after: always;
                    overflow: hidden !important;
                  }
                  .report-page:last-child { page-break-after: avoid; }
                  .no-print { display: none !important; }
                  @page { size: A4; margin: 0; }
                }
              `}</style>

              {/* Render each test as its own A4 page */}
              {(reportData.combinedTests || [{ name: reportData.test?.name, groupedParameters: reportData.groupedParameters, interpretation: reportData.test?.interpretation }]).map((t, ti) => (
                <div
                  key={ti}
                  id={ti === 0 ? 'report-print-page' : undefined}
                  className="report-page"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    margin: '16px auto',
                    position: 'relative',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11px',
                    overflow: 'hidden',
                  }}
                >
                  {/* LetterHead background */}
                  {reportWithHeader && (
                    <img
                      src={LetterHead}
                      alt=""
                      style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'fill', zIndex: 0, pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Page content */}
                  <div
                    style={{
                      position: 'relative', zIndex: 1,
                      height: '100%', display: 'flex', flexDirection: 'column',
                      paddingTop: reportWithHeader ? '38mm' : '12mm',
                      paddingBottom: reportWithHeader ? '36mm' : '12mm',
                      paddingLeft: '14mm', paddingRight: '14mm',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Report Title */}
                    <div style={{ textAlign: 'center', marginBottom: '6mm', borderBottom: '1.5px solid #333', paddingBottom: '3mm' }}>
                      <strong style={{ fontSize: '13px', letterSpacing: '1px' }}>{t.name?.toUpperCase()} REPORT</strong>
                    </div>

                    {/* Patient Info */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '11px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 4px', width: '50%' }}><strong>Patient:</strong> {reportData.patient?.title} {reportData.patient?.firstName} {reportData.patient?.lastName}</td>
                          <td style={{ padding: '2px 4px', width: '50%' }}><strong>Age / Gender:</strong> {reportData.patient?.age} Yrs / {reportData.patient?.gender}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}><strong>Lab No:</strong> {reportData.visitId}</td>
                          <td style={{ padding: '2px 4px' }}><strong>Date:</strong> {reportData.visitDate ? new Date(reportData.visitDate).toLocaleDateString('en-GB') : '-'}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Results Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '38%' }}>Test Description</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '22%', paddingLeft: '20px' }}>Result</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '12%' }}>Unit</th>
                          <th style={{ borderBottom: '1.5px solid #333', padding: '4px 6px', textAlign: 'left', width: '28%' }}>Biological Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={4} style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }}>{t.name}</td>
                        </tr>
                        {t.groupedParameters && Object.entries(t.groupedParameters).map(([categoryName, categoryParams]: [string, any]) => (
                          <React.Fragment key={categoryName}>
                            {categoryName !== 'NO_CATEGORY_HEADER' && categoryParams[0]?.showCategoryHeader && (
                              <tr>
                                <td colSpan={4} style={{ padding: '4px 6px', fontWeight: 'bold', borderBottom: '1px solid #ddd' }}>
                                  {categoryName.toUpperCase()}
                                </td>
                              </tr>
                            )}
                            {(categoryParams as any[]).map((param) => (
                              <tr key={param.id}>
                                <td style={{ padding: '3px 6px', width: '38%', fontWeight: isParamOutOfRange(param, param.existingResult) ? 'bold' : 'normal' }}>{param.parameterName}</td>
                                <td style={{ padding: '3px 6px 3px 20px', width: '22%', fontWeight: isParamOutOfRange(param, param.existingResult) ? '900' : 'normal', color: isParamOutOfRange(param, param.existingResult) ? '#b91c1c' : 'inherit', fontSize: '11px' }}>
                                  {param.existingResult
                                    ? (param.type === 'Numeric' ? (param.existingResult.numericValue ?? '-') : (param.existingResult.textValue || '-'))
                                    : '-'}
                                  {isParamOutOfRange(param, param.existingResult) && <span style={{ marginLeft: '4px' }}>*</span>}
                                </td>
                                <td style={{ padding: '3px 6px', width: '12%' }}>{param.units || ''}</td>
                                <td style={{ padding: '3px 6px', width: '28%' }}>{param.normalRange || ''}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>

                    {/* Interpretation */}
                    {t.interpretation && (
                      <div style={{ marginTop: '4mm', borderTop: '1px solid #ccc', paddingTop: '3mm', fontSize: '11px', color: '#444' }}
                        dangerouslySetInnerHTML={{ __html: t.interpretation }} />
                    )}

                    {/* Signature */}
                    {reportData.signature && (
                      <div style={{ marginTop: 'auto', paddingTop: '6mm', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ textAlign: 'center' }}>
                          {reportData.signature.signatureImage && (
                            <img src={reportData.signature.signatureImage} alt="Signature"
                              style={{ width: reportData.signature.width || 150, height: reportData.signature.height || 80, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
                          )}
                          {reportData.signature.signatureText && (
                            <div style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'pre-line', marginTop: '2px' }}>{reportData.signature.signatureText}</div>
                          )}
                          {reportData.signature.doctorName && (
                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{reportData.signature.doctorName}</div>
                          )}
                          {reportData.signature.specialty && (
                            <div style={{ fontSize: '10px', color: '#444' }}>{reportData.signature.specialty}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer - without header only */}
                    {!reportWithHeader && (
                      <div style={{ marginTop: reportData.signature ? '4mm' : 'auto', borderTop: '1px solid #ccc', paddingTop: '3mm', fontSize: '10px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Report generated on: {new Date().toLocaleString('en-GB')}</span>
                        <span>SilverLeaf Diagnostics — Pathology Laboratory</span>
                      </div>
                    )}
                  </div>
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
                  onClick={() => setShowBarcodeModal(false)}
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

                      {/* Barcode number centered — this is what scanner reads = visitId */}
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

                      {/* Short test names — no separator line */}
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
    </>
  );
}
