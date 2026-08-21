"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { RefreshCcw, Download, Printer, Mail, Search, FileText, Calendar, Settings, Barcode, ChevronDown, Upload, FileCheck, AlertTriangle } from "lucide-react";
import JsBarcode from "jsbarcode";
import BarcodeModal, { generateBarcodeLabels } from "@/app/components/BarcodeModal";
import ProfessionalReport from "@/app/components/ProfessionalReport";
import API_BASE_URL from "@/src/api/config";
import { generateCompactBarcodePrintHtml } from "@/app/utils/barcodePrintUtils";

import { FaWhatsapp } from "react-icons/fa";
import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
import { 
  getPatientTests, 
  updateTestStatus, 
  updateTestDates,
  updateTestResult,
  getTestStatistics,
  getPatientTestById,
  sendReport,
  getPreviousTestResult,
  getAllTestResults
} from "@/src/api/result";
import { getOrganizations } from "@/src/api/master";
import ReadingValidationModal from "@/app/components/ReadingValidationModal";
import AuthenticateModal from "@/app/components/AuthenticateModal";
import TestSelectionModal, { SelectedTestItem } from "@/app/components/TestSelectionModal";

const LetterHead = "/LetterHead.jpeg";

// ── Type definition for Letterhead from DB ──
interface LetterheadDB {
  id?: number;
  letterheadName?: string;
  headerImage?: string;   // base64 data-URI
  footerImage?: string;   // base64 data-URI
  fullPageImage?: string; // full-page letterhead image (new)
}

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
  
  const queryStatus = (searchParams?.get('status') || 'All') as string;
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
  const [selectAllChecked, setSelectAllChecked] = useState(false);
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

  // State for expandable columns (tracks which column headers are expanded)
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(new Set());

  // State for print options modal (Page Break vs No Page Break)
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);
  const [printOption, setPrintOption] = useState<'pagebreak' | 'nobreak'>('nobreak');

  // State for test selection modal (for No Page Break option)
  const [showTestSelectionModal, setShowTestSelectionModal] = useState(false);
  const [testSelectionData, setTestSelectionData] = useState<any[]>([]);
  const [testSelectionOrder, setTestSelectionOrder] = useState<SelectedTestItem[]>([]);
  const [pendingPrintTests, setPendingPrintTests] = useState<string[]>([]);
  
  // State for per-test comments modal (NEW)
  const [showPerTestCommentsModal, setShowPerTestCommentsModal] = useState(false);
  const [pendingTestsForComments, setPendingTestsForComments] = useState<any[]>([]);
  const [pendingCommentsResponses, setPendingCommentsResponses] = useState<any[]>([]);
  
  // State for Authenticate Modal
  const [showAuthenticateModal, setShowAuthenticateModal] = useState(false);
  const [authenticateData, setAuthenticateData] = useState<any>(null);

  // State for Required Columns dropdown
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [columnsFilter, setColumnsFilter] = useState('');
  const [selectedColumns, setSelectedColumns] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('resultPageColumns');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    // Default columns - all visible
    return {
      visitId: true,
      orgId: true,
      patientName: true,
      age: true,
      gender: true,
      services: true,
      result: true,
      unit: true,
      refInterval: true,
      referralDoc: true,
      ptr: true,
      atr: true,
      sTaken: true,
      barcode: true,
      history: true
    };
  });

  // Column definitions for the required columns section
  const RESULT_COLUMNS = [
    { key: 'visitId', label: 'Visit ID' },
    { key: 'orgId', label: 'Org ID' },
    { key: 'patientName', label: 'Patient Name' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'services', label: 'Services' },
    { key: 'result', label: 'Result' },
    { key: 'unit', label: 'Unit' },
    { key: 'refInterval', label: 'Ref. Interval' },
    { key: 'referralDoc', label: 'Referral Doc' },
    { key: 'ptr', label: 'PTR' },
    { key: 'atr', label: 'ATR' },
    { key: 'sTaken', label: 'S.Taken' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'history', label: 'History' }
  ];

  // Update columns and save to localStorage
  const handleColumnToggle = (columnKey: string) => {
    const updated = {
      ...selectedColumns,
      [columnKey]: !selectedColumns[columnKey]
    };
    setSelectedColumns(updated);
    localStorage.setItem('resultPageColumns', JSON.stringify(updated));
  };

  // Check all columns
  const handleCheckAllColumns = () => {
    const allChecked = Object.fromEntries(RESULT_COLUMNS.map(c => [c.key, true]));
    setSelectedColumns(allChecked);
    localStorage.setItem('resultPageColumns', JSON.stringify(allChecked));
  };

  // Uncheck all columns
  const handleUncheckAllColumns = () => {
    const allUnchecked = Object.fromEntries(RESULT_COLUMNS.map(c => [c.key, false]));
    setSelectedColumns(allUnchecked);
    localStorage.setItem('resultPageColumns', JSON.stringify(allUnchecked));
  };

  // Count selected columns
  const selectedColumnCount = Object.values(selectedColumns).filter(Boolean).length;

  // Handle Print Table as PDF
  const handlePrintTablePDF = async () => {
    try {
      // Import jsPDF
      const { jsPDF } = await import('jspdf');

      // Prepare table data based on selected columns and visible results
      const tableData: (string | number)[][] = [];
      
      // Add header row
      const headers: string[] = [];
      RESULT_COLUMNS.forEach(col => {
        if (selectedColumns[col.key]) {
          headers.push(col.label);
        }
      });

      // Add data rows
      paginatedResults.forEach((patient, patientIndex) => {
        patient.tests.forEach((test, testIndex) => {
          const row: (string | number)[] = [];
          
          RESULT_COLUMNS.forEach(col => {
            if (selectedColumns[col.key]) {
              let cellValue = '';
              
              // Only show on first test row for patient-level columns
              if (['visitId', 'orgId', 'patientName', 'age', 'gender'].includes(col.key) && testIndex !== 0) {
                cellValue = '';
              } else {
                switch (col.key) {
                  case 'visitId':
                    cellValue = patient.visit_id || '';
                    break;
                  case 'orgId':
                    cellValue = patient.organizationCode || patient.organizationId || '';
                    break;
                  case 'patientName':
                    cellValue = patient.patient_name || '';
                    break;
                  case 'age':
                    if (patient.ageYears !== undefined && patient.ageMonths !== undefined && patient.ageDays !== undefined) {
                      if (patient.ageYears === 0) {
                        cellValue = `${patient.ageMonths}M ${patient.ageDays}D`;
                      } else if (patient.ageYears < 12) {
                        cellValue = `${patient.ageYears}Y ${patient.ageMonths}M ${patient.ageDays}D`;
                      } else {
                        cellValue = (patient.ageYears + patient.ageMonths / 12).toFixed(1);
                      }
                    }
                    break;
                  case 'gender':
                    cellValue = patient.gender ? (patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : patient.gender) : '';
                    break;
                  case 'services':
                    cellValue = test.test_name || '';
                    break;
                  case 'result':
                    if (test.parameter_count > 1) {
                      cellValue = 'Parameter';
                    } else if (test.isOutsourced) {
                      cellValue = 'OUTSOURCING';
                    } else {
                      cellValue = (test.result_status === 'Entered' || test.result_status === 'Validated' || test.result_status === 'Authorized' || test.result_status === 'Delivered') ? (test.result || '-') : '-';
                    }
                    break;
                  case 'unit':
                    cellValue = test.parameter_count === 1 ? (test.unit || '') : '';
                    break;
                  case 'refInterval':
                    if (test.parameter_count === 1) {
                      cellValue = getAgeAppropriateRange(test.ref_interval_data, patient);
                    }
                    break;
                  case 'referralDoc':
                    cellValue = test.ref_by || '';
                    break;
                  case 'ptr':
                    cellValue = 'View';
                    break;
                  case 'atr':
                    cellValue = 'View';
                    break;
                  case 'sTaken':
                    cellValue = test.sample_taken ? '✓' : '';
                    break;
                  case 'barcode':
                    cellValue = '';
                    break;
                  case 'history':
                    cellValue = testIndex === 0 ? (patient.patient_history || '') : '';
                    break;
                  default:
                    cellValue = '';
                }
              }
              
              row.push(cellValue);
            }
          });
          
          tableData.push(row);
        });
      });

      // Create PDF with orientation based on number of columns
      // Use portrait for <= 5 columns, landscape for > 5 columns
      const numColumns = headers.length;
      const orientation = numColumns > 5 ? 'l' : 'p'; // 'l' = landscape, 'p' = portrait
      const doc = new jsPDF(orientation, 'mm', 'a4');
      
      // Add title and date
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const currentDate = new Date().toLocaleDateString('en-IN');
      
      doc.setFontSize(16);
      doc.text('SHRADDHA PATHOLOGY LABORATORY', pageWidth / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('Result Report', pageWidth / 2, 22, { align: 'center' });
      doc.text(`Generated: ${currentDate}`, pageWidth / 2, 28, { align: 'center' });
      
      // Add filter info
      doc.setFontSize(9);
      let filterText = `Period: ${filters.fromDate} to ${filters.toDate}`;
      if (filters.searchQuery) filterText += ` | Search: ${filters.searchQuery}`;
      if (filters.department) filterText += ` | Dept: ${filters.department}`;
      if (filters.organization.length > 0) filterText += ` | Org: ${filters.organization.join(', ')}`;
      doc.text(filterText, 14, 34);
      
      // Try to use autoTable if available, otherwise create simple table
      try {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Dynamically check if autoTable is available
        const autoTableAvailable = (doc as any).autoTable !== undefined;
        
        if (autoTableAvailable) {
          // Use autoTable plugin
          (doc as any).autoTable({
            head: [headers],
            body: tableData,
            startY: 40,
            margin: { top: 40, right: 10, left: 10, bottom: 10 },
            theme: 'grid',
            headStyles: {
              fillColor: [30, 41, 82],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8,
              halign: 'left',
              valign: 'middle',
            },
            bodyStyles: {
              fontSize: 8,
              halign: 'left',
              valign: 'middle',
            },
            alternateRowStyles: {
              fillColor: [245, 245, 245]
            }
          });
        } else {
          // Fallback: Create professional table manually with borders
          const margin = 10;
          const tableWidth = pageWidth - 2 * margin;
          
          // Calculate column widths based on header text length
          // Minimum width per column to prevent text overflow
          const minColWidth = 15;
          const maxColWidth = tableWidth / headers.length;
          
          // Estimate optimal column widths based on content
          const columnWidths = headers.map((header, idx) => {
            // Calculate average content length for this column
            let maxContentLength = String(header).length;
            tableData.forEach(row => {
              const cellLength = String(row[idx] || '').length;
              if (cellLength > maxContentLength) {
                maxContentLength = cellLength;
              }
            });
            
            // Width proportional to content length, but not too narrow or wide
            const estimatedWidth = Math.max(minColWidth, Math.min(maxColWidth, maxContentLength * 0.8));
            return estimatedWidth;
          });
          
          // Normalize widths to fit exactly in tableWidth
          const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);
          const scaleFactor = tableWidth / totalWidth;
          const finalColumnWidths = columnWidths.map(w => w * scaleFactor);
          
          let yPosition = 40;
          const rowHeight = 6;
          
          // Draw table header with background
          doc.setFillColor(30, 41, 82);
          doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
          
          // Draw header text
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          
          let xPos = margin;
          headers.forEach((header, idx) => {
            const colWidth = finalColumnWidths[idx];
            // Draw header border
            doc.setDrawColor(200, 200, 200);
            doc.rect(xPos, yPosition, colWidth, rowHeight);
            // Draw text
            doc.text(String(header).substring(0, 20), xPos + 2, yPosition + 4, { maxWidth: colWidth - 4 });
            xPos += colWidth;
          });
          
          yPosition += rowHeight;
          
          // Draw table rows
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          
          tableData.forEach((row, rowIdx) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
              
              // Redraw header on new page
              doc.setFillColor(30, 41, 82);
              doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
              
              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8);
              
              let xPosHeader = margin;
              headers.forEach((header, idx) => {
                const colWidth = finalColumnWidths[idx];
                doc.setDrawColor(200, 200, 200);
                doc.rect(xPosHeader, yPosition, colWidth, rowHeight);
                doc.text(String(header).substring(0, 20), xPosHeader + 2, yPosition + 4, { maxWidth: colWidth - 4 });
                xPosHeader += colWidth;
              });
              
              yPosition += rowHeight;
              
              doc.setTextColor(0, 0, 0);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
            }
            
            // Alternate row background color
            if (rowIdx % 2 === 0) {
              doc.setFillColor(245, 245, 245);
              doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
            }
            
            // Draw row borders and content
            doc.setDrawColor(220, 220, 220);
            let xPosCell = margin;
            row.forEach((cell, cellIdx) => {
              const colWidth = finalColumnWidths[cellIdx];
              
              // Draw cell border
              doc.rect(xPosCell, yPosition, colWidth, rowHeight);
              
              // Draw cell content
              doc.setTextColor(0, 0, 0);
              doc.setFontSize(7);
              const cellText = String(cell || '').substring(0, 25);
              doc.text(cellText, xPosCell + 1.5, yPosition + 3.5, { maxWidth: colWidth - 3 });
              
              xPosCell += colWidth;
            });
            
            yPosition += rowHeight;
          });
        }
      } catch (tableError) {
        console.warn('Table rendering error:', tableError);
      }

      // Save the PDF
      const fileName = `Result_Report_${new Date().getTime()}.pdf`;
      const pdfBlob = doc.output('blob') as Blob;
      // @ts-ignore - URL.createObjectURL returns string that window.open expects
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open print dialog
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
      
      alert('PDF generated! Print dialog opened.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      alert(`Error generating PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // State for inline result editing
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editingResultValue, setEditingResultValue] = useState<string>('');
  const [inlineEditingTests, setInlineEditingTests] = useState<Set<string>>(new Set()); // Track which single-param tests to show inline editor for
  
  // Ref to track input elements for Tab navigation
  const inlineInputRefs = useRef<any>({});

  // State for sidebar visibility
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Real data from API
  const [results, setResults] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    byStatus: {
      Registered: 0,
      Received: 0,
      Entered: 0,
      Validated: 0,
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
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            organization: Array.isArray(parsed.organization) ? parsed.organization : []  // Ensure it's an array
          };
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
      organization: [],  // Changed to array for multiple selection
      testName: ''
    };
  });

  // Organizations state
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);  // NEW: Show/hide org dropdown
  
  // Departments state
  const [departments, setDepartments] = useState<any[]>([]);

  // Letterhead state
  const [letterheadBase64, setLetterheadBase64] = useState<string>('');

  // Load letterhead from public folder on mount
  React.useEffect(() => {
    const loadLetterhead = async () => {
      try {
        const response = await fetch('/LetterHead.jpeg');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setLetterheadBase64(base64);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error loading letterhead:', error);
      }
    };
    
    loadLetterhead();
  }, []);

  // Barcode Scanner - Capture barcode input from hardware scanner (works globally on this page)
  React.useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout: any;

    const handleBarcodeInput = async (e: KeyboardEvent) => {
      // Skip if typing in input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        // Barcode complete
        const barcode = barcodeBuffer.trim();
        barcodeBuffer = '';
        clearTimeout(barcodeTimeout);

        console.log('📱 Barcode detected:', barcode);

        try {
          // Parse barcode via API
          const response = await fetch(`${API_BASE_URL}/result/parse-barcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode })
          });

          const data = await response.json();

          if (data.success) {
            console.log('✅ Barcode parsed successfully:', {
              visitId: data.visitId,
              sampleId: data.sampleId,
              barcode: data.barcode
            });
            // Barcode processed successfully
          } else {
            console.error('❌ Barcode parsing failed:', data.message);
          }
        } catch (error) {
          console.error('❌ Barcode API error:', error);
        }
      } else if (e.key.length === 1 && e.key.match(/[0-9\-]/)) {
        // Accumulate barcode characters (only numbers and dash)
        barcodeBuffer += e.key;

        // Reset timeout
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          if (barcodeBuffer.length > 5) {
            barcodeBuffer = '';
          }
        }, 100);
      }
    };

    window.addEventListener('keydown', handleBarcodeInput);

    return () => {
      window.removeEventListener('keydown', handleBarcodeInput);
      clearTimeout(barcodeTimeout);
    };
  }, []);
  
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

  // Helper function to calculate biological reference range based on patient demographics
  const getAgeAppropriateRange = (parameterData: any, patient: any) => {
    if (!parameterData) return '-';
    
    // ✅ PRIORITY 1: If textContent (RIGHT textarea) has a value, show ONLY that
    if (parameterData.textContent) {
      return parameterData.textContent;
    }
    
    // ✅ PRIORITY 2: If textContent is empty, calculate age/gender-based ranges
    const patientAgeYears = patient.ageYears ?? 0;
    const patientAgeMonths = patient.ageMonths ?? 0;
    const patientAgeDays = patient.ageDays ?? 0;
    const patientGender = patient.gender?.toLowerCase();
    
    // Check age ranges
    if (parameterData.ageRanges) {
      try {
        let ageRanges = JSON.parse(parameterData.ageRanges);
        
        // Sort by gender priority
        ageRanges = ageRanges.sort((a, b) => {
          const aGender = a.gender?.toLowerCase() || 'both';
          const bGender = b.gender?.toLowerCase() || 'both';
          
          const aMatchesGender = aGender === patientGender ? 0 : (aGender === 'both' ? 1 : 2);
          const bMatchesGender = bGender === patientGender ? 0 : (bGender === 'both' ? 1 : 2);
          
          return aMatchesGender - bMatchesGender;
        });
        
        for (const range of ageRanges) {
          if (!range.enabled) continue;
          const rangeGender = range.gender?.toLowerCase();
          if (rangeGender && rangeGender !== patientGender && rangeGender !== 'both') continue;
          
          let ageMatches = false;
          if (range.label?.includes('Between') && range.from != null && range.to != null) {
            const v = getAgeInUnit(patientAgeYears, patientAgeMonths, patientAgeDays, range.timeUnit);
            ageMatches = v >= range.from && v <= range.to;
          }
          
          if (ageMatches && range.ll != null && range.ul != null) {
            return `${range.ll} - ${range.ul}`;
          }
        }
      } catch (e) { console.warn('Error parsing age ranges:', e); }
    }
    
    // Fallback to gender and age-based ranges
    if (parameterData.rangeType === 'BySex' || parameterData.rangeType === 'ByGenderAndAge') {
      if (patientAgeYears < 18 && parameterData.childLowValue != null && parameterData.childHighValue != null) {
        return `${parameterData.childLowValue} - ${parameterData.childHighValue}`;
      }
      if (patientAgeYears >= 18) {
        if (patientGender === 'female' && parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
          return `${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`;
        }
        if (patientGender === 'male' && parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
          return `${parameterData.maleLowValue} - ${parameterData.maleHighValue}`;
        }
      }
    }
    
    // Final fallback
    if (patientGender === 'female' && parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
      return `${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`;
    }
    if (patientGender === 'male' && parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
      return `${parameterData.maleLowValue} - ${parameterData.maleHighValue}`;
    }
    if (parameterData.childLowValue != null && parameterData.childHighValue != null) {
      return `${parameterData.childLowValue} - ${parameterData.childHighValue}`;
    }
    
    return '';
    
    let exactAgeInYears = patientAgeYears;
    
    // Helper to get age in specific time unit (matching backend logic)
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
    
    if (parameterData.ageRanges) {
      try {
        const ageRanges = JSON.parse(parameterData.ageRanges);
        console.log(`   ageRanges found: ${ageRanges.length} ranges`);
        
        for (const range of ageRanges) {
          console.log(`\n   📋 Range: "${range.label}"`);
          
          if (!range.enabled) {
            console.log(`      ❌ DISABLED - skipping`);
            continue;
          }
          
          const rangeGender = range.gender?.toLowerCase();
          console.log(`      Gender Check: range="${rangeGender}", patient="${patientGender}"`);
          
          // Skip if gender doesn't match, unless it's 'both' (which applies to all)
          if (rangeGender && rangeGender !== 'both' && rangeGender !== patientGender) {
            console.log(`      ❌ GENDER MISMATCH - skipping`);
            continue;
          }
          console.log(`      ✅ GENDER OK`);
          
          let ageMatches = false;
          
          // Handle different range types with time units (matching backend logic)
          if (range.label?.includes('Between') && range.from != null && range.to != null) {
            const ageToCheck = getAgeInUnit(exactAgeInYears, patientAgeMonths, patientAgeDays, range.timeUnit);
            ageMatches = ageToCheck >= range.from && ageToCheck <= range.to;
            console.log(`      Age Check: "Between" - ageToCheck(${range.timeUnit})=${ageToCheck} in [${range.from}, ${range.to}] = ${ageMatches}`);
          } else if (range.label?.includes('Less Than') && range.value != null) {
            const ageToCheck = getAgeInUnit(exactAgeInYears, patientAgeMonths, patientAgeDays, range.timeUnit);
            ageMatches = ageToCheck < range.value;
            console.log(`      Age Check: "Less Than" - ageToCheck(${range.timeUnit})=${ageToCheck} < ${range.value} = ${ageMatches}`);
          } else if (range.label?.includes('More Than') && range.value != null) {
            const ageToCheck = getAgeInUnit(exactAgeInYears, patientAgeMonths, patientAgeDays, range.timeUnit);
            ageMatches = ageToCheck > range.value;
            console.log(`      Age Check: "More Than" - ageToCheck(${range.timeUnit})=${ageToCheck} > ${range.value} = ${ageMatches}`);
          } else if (range.label?.includes('Equal To') && range.value != null) {
            const ageToCheck = getAgeInUnit(exactAgeInYears, patientAgeMonths, patientAgeDays, range.timeUnit);
            ageMatches = ageToCheck === range.value;
            console.log(`      Age Check: "Equal To" - ageToCheck(${range.timeUnit})=${ageToCheck} === ${range.value} = ${ageMatches}`);
          }
          
          // Check if range has valid LL and UL
          const hasValidRange = range.ll != null && range.ul != null;
          console.log(`      Range Values: LL=${range.ll}, UL=${range.ul}, valid=${hasValidRange}`);
          
          if (ageMatches && hasValidRange) {
            console.log(`      ✅✅✅ MATCH FOUND! RETURNING: ${range.ll} - ${range.ul}`);
            return `${range.ll} - ${range.ul}`;
          }
          
          if (ageMatches && !hasValidRange) {
            console.log(`      ⚠️ Age matched but NO valid range values (LL/UL null)`);
          }
        }
        console.log(`\n   ❌ NO AGE RANGE MATCHED - continuing to fallback`);
      } catch (e) {
        console.warn('Error parsing age ranges:', e);
      }
    }
    
    // ✅ IMPROVED: Fallback to gender and age-based ranges
    // Don't require Active flag - just check if values exist
    if (parameterData.rangeType === 'BySex' || parameterData.rangeType === 'ByGenderAndAge') {
      if (exactAgeInYears < 18 && parameterData.childLowValue != null && parameterData.childHighValue != null) {
        console.log(`   ✅ Using CHILD range: ${parameterData.childLowValue} - ${parameterData.childHighValue}`);
        return `${parameterData.childLowValue} - ${parameterData.childHighValue}`;
      }
      if (exactAgeInYears >= 18) {
        // ALWAYS use matching gender range if available - ignore 'active' flag
        if (patientGender === 'female' && parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
          console.log(`   ✅ Using FEMALE range (gender match, ignoring Active flag): ${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`);
          return `${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`;
        }
        if (patientGender === 'male' && parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
          console.log(`   ✅ Using MALE range (gender match, ignoring Active flag): ${parameterData.maleLowValue} - ${parameterData.maleHighValue}`);
          return `${parameterData.maleLowValue} - ${parameterData.maleHighValue}`;
        }
        // If gender doesn't match M/F, try both
        if (!['male', 'female'].includes(patientGender)) {
          console.log(`⚠️ Gender is "${patientGender}", trying both ranges...`);
          if (parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
            console.log(`   ✅ Using MALE range (fallback): ${parameterData.maleLowValue} - ${parameterData.maleHighValue}`);
            return `${parameterData.maleLowValue} - ${parameterData.maleHighValue}`;
          }
          if (parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
            console.log(`   ✅ Using FEMALE range (fallback): ${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`);
            return `${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`;
          }
        }
      }
    }
    
    // Final fallback: return numeric ranges if available (for any range type)
    if (patientGender === 'female' && parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
      console.log(`   ✅ Using FALLBACK FEMALE range: ${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`);
      return `${parameterData.femaleLowValue} - ${parameterData.femaleHighValue}`;
    }
    if (patientGender === 'male' && parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
      console.log(`   ✅ Using FALLBACK MALE range: ${parameterData.maleLowValue} - ${parameterData.maleHighValue}`);
      return `${parameterData.maleLowValue} - ${parameterData.maleHighValue}`;
    }
    if (parameterData.childLowValue != null && parameterData.childHighValue != null) {
      console.log(`   ✅ Using FALLBACK CHILD range: ${parameterData.childLowValue} - ${parameterData.childHighValue}`);
      return `${parameterData.childLowValue} - ${parameterData.childHighValue}`;
    }
    
    // Last resort: return display text or range text
    console.log(`   ⚠️  No range found, using displayRangeText or empty`);
    return parameterData.displayRangeText || parameterData.rangeText || '-';
  };

  // Helper function to extract numeric bounds from reference range and check if value is out of range
  const isValueOutOfRange = (resultValue: any, parameterData: any, patient: any): boolean => {
    if (!resultValue || !parameterData) return false;
    
    const numericValue = parseFloat(resultValue);
    if (isNaN(numericValue)) return false;
    
    const patientAge = patient.age || 0;
    const patientGender = patient.gender?.toLowerCase();
    
    // Check complex age ranges first
    if (parameterData.ageRanges) {
      try {
        const ageRanges = JSON.parse(parameterData.ageRanges);
        for (const range of ageRanges) {
          if (!range.enabled) continue;
          const rangeGender = range.gender?.toLowerCase();
          // Skip if gender doesn't match, unless it's 'both' (which applies to all)
          if (rangeGender && rangeGender !== 'both' && rangeGender !== patientGender) continue;
          
          let ageMatches = false;
          if (range.label?.includes('Between') && range.from != null && range.to != null) {
            ageMatches = patientAge >= range.from && patientAge <= range.to;
          }
          
          if (ageMatches && range.ll != null && range.ul != null) {
            const ll = parseFloat(range.ll);
            const ul = parseFloat(range.ul);
            return numericValue < ll || numericValue > ul;
          }
        }
      } catch (e) {
        console.warn('Error parsing age ranges:', e);
      }
    }
    
    // Check gender and age-based ranges
    if (parameterData.rangeType === 'BySex' || parameterData.rangeType === 'ByGenderAndAge') {
      if (patientAge < 18 && parameterData.childActive && parameterData.childLowValue != null && parameterData.childHighValue != null) {
        const ll = parseFloat(parameterData.childLowValue);
        const ul = parseFloat(parameterData.childHighValue);
        return numericValue < ll || numericValue > ul;
      }
      if (patientAge >= 18) {
        if (patientGender === 'female' && parameterData.femaleActive && parameterData.femaleLowValue != null && parameterData.femaleHighValue != null) {
          const ll = parseFloat(parameterData.femaleLowValue);
          const ul = parseFloat(parameterData.femaleHighValue);
          return numericValue < ll || numericValue > ul;
        }
        if (patientGender === 'male' && parameterData.maleActive && parameterData.maleLowValue != null && parameterData.maleHighValue != null) {
          const ll = parseFloat(parameterData.maleLowValue);
          const ul = parseFloat(parameterData.maleHighValue);
          return numericValue < ll || numericValue > ul;
        }
      }
    }
    
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

    let targetPatient: any = null;
    for (const patient of sortedAndFilteredResults) {
      if ((patient as any).patient_uid === barcodeLockedPatientUid && (patient as any).visit_id === barcodeLockedVisitId) {
        targetPatient = patient;
        break;
      }
    }
    if (!targetPatient) return;

    const selectedTestsList = (targetPatient as any).tests.filter((t: any) => barcodeSelectedTests.has(t.test_id));
    
    // ✅ USE CENTRALIZED FUNCTION FOR CONSISTENT BARCODE GENERATION EVERYWHERE
    const labels = generateBarcodeLabels(
      selectedTestsList,
      (targetPatient as any).visit_id,
      (targetPatient as any).organizationCode || ''
    );

    console.log('✅ Generated barcode labels using centralized function:', labels);

    const genderInitial = (targetPatient as any).gender ? (targetPatient as any).gender.charAt(0).toUpperCase() : '';
    const age = (targetPatient as any).age || '';

    setBarcodePatientInfo({
      patientName: (targetPatient as any).patient_name || '',
      visitId: (targetPatient as any).visit_id || '',
      age,
      gender: (targetPatient as any).gender || '',
      // Pre-formatted age/gender string: "F/27 Yrs" or "M/45 Yrs"
      ageGender: genderInitial && age ? `${genderInitial}/${age} Yrs` : genderInitial || (age ? `${age} Yrs` : ''),
      organizationCode: (targetPatient as any).organizationCode || '', // ✅ Include organization code
    });
    
    setBarcodeLabels(labels);
    // ✅ Initialize ALL barcodes as selected by default
    setSelectedBarcodeIndices(new Set(labels.map((_, idx) => idx)));
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
    
    // Get all selected test IDs
    const testIds = Array.from(selectedTests);
    
    // If multiple tests selected, pass as query parameter to the same route
    if (testIds.length > 1) {
      const testIdsParam = testIds.join(',');
      router.push(`/result/patientresult/${testIds[0]}?testIds=${testIdsParam}`);
    } else {
      // Single test - use the original route
      const firstTestId = testIds[0];
      router.push(`/result/patientresult/${firstTestId}`);
    }
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

  // Handle Select All checkbox in table header
  const handleSelectAll = (checked: boolean) => {
    setSelectAllChecked(checked);
    
    if (checked) {
      // Select all visible tests from paginatedResults
      const allTestIds = new Set<string>();
      paginatedResults.forEach(patient => {
        patient.tests.forEach((test: any) => {
          // Only add if not disabled
          if (!isCheckboxDisabled(patient, test)) {
            allTestIds.add(test.test_id.toString());
          }
        });
      });
      setSelectedTests(allTestIds);
    } else {
      // Deselect all tests
      setSelectedTests(new Set());
    }
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
      // 🔧 PART 3: Include outsourcing data for each test (NO database fetch)
      const combinedTests = responses.map((r) => {
        return {
          name: r.patientTest.test.name,
          interpretation: r.patientTest.test.interpretation,
          groupedParameters: r.groupedParameters,
          parameters: r.parameters,
          // 🔧 PART 3: Include outsourcing flag and report data
          isOutsourced: r.patientTest.isOutsourced || false,
          outsourcedTo: r.patientTest.outsourcedTo || null,
          outsourcingReport: r.outsourcingReport || null  // Include outsourcing report from response
        };
      });

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
        signature,
        // 🔧 PART 3: Include first test's outsourcing info for single test case
        isOutsourced: first.patientTest.isOutsourced || false,
        outsourcedTo: first.patientTest.outsourcedTo || null
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

  // Download report as PDF using professional format
  const handleDownloadPdf = async (withHeader: boolean) => {
    setShowDownloadDropdown(false);
    if (selectedTests.size === 0) { alert('Please select a test'); return; }
    try {
      setLoading(true);
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      
      if (!responses || responses.length === 0) {
        alert('No test data found');
        return;
      }

      const first = responses[0];
      const patientTestData = first.patientTest;
      const patient = patientTestData.patient;
      const visitId = patientTestData.visitId;
      const visitDate = patientTestData.visitDate 
        ? new Date(patientTestData.visitDate).toLocaleDateString('en-GB') 
        : '-';
      const patientName = `${patient.title || ''} ${patient.firstName || ''} ${patient.lastName || ''}`.trim();

      // Fetch letterhead from DB if needed
      let letterheadDB: LetterheadDB | null = null;
      let letterHeadBase64 = '';
      if (withHeader) {
        try {
          const lhRes = await fetch(`${API_BASE_URL}/letterhead/active`);
          const lhData = await lhRes.json();
          if (lhData.success && lhData.data?.length > 0) {
            letterheadDB = lhData.data[0];
            console.log('✅ Letterhead loaded from DB:', letterheadDB);
          }
        } catch (e) {
          console.warn('Could not fetch letterhead from DB', e);
        }

        // Fallback: Convert static LetterHead to base64 if DB letterhead not available
        if (!letterheadDB) {
          try {
            const imgRes = await fetch(LetterHead);
            const blob = await imgRes.blob();
            letterHeadBase64 = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) { console.warn('Could not load static letterhead', e); }
        }
      }

      // Create PDF document
      const pdfDoc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const A4_Width = 210;
      const A4_Height = 297;

      // Convert each test response to PDF page using professional format
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const testData = response.patientTest;
        const testInfo = testData.test;

        // Build results map from parameters with existingResult
        const resultsMap: any = {};
        if (response.parameters && Array.isArray(response.parameters)) {
          response.parameters.forEach((param: any) => {
            if (param.existingResult) {
              resultsMap[param.id] = {
                numericValue: param.existingResult.numericValue,
                textValue: param.existingResult.textValue,
                referenceRange: param.existingResult.referenceRange,
                isAbnormal: param.existingResult.isAbnormal || false,
                isHighlighted: param.existingResult.isHighlighted || false
              };
            }
          });
        }

        // Build HTML content matching professional format
        const interpretationHtml = testInfo.interpretation 
          ? `<div style="margin-top:4mm;border-top:0.5px solid #999;padding-top:2mm;font-size:10px;color:#333;">${testInfo.interpretation}</div>` 
          : '';

        const commentsHtml = testData.comments 
          ? `<div style="margin-top:3mm;padding:2mm 0;border-top:0.5px solid #ddd;font-size:10px;"><strong>Notes:</strong> ${testData.comments}</div>` 
          : '';

        // Build parameters table with grouped parameters
        let paramsHtml = '';
        if (response.groupedParameters) {
          Object.entries(response.groupedParameters).forEach(([catName, params]: [string, any]) => {
            // Add category header
            if (catName !== 'NO_CATEGORY_HEADER' && (params as any)[0]?.showCategoryHeader) {
              paramsHtml += `<tr><td colspan="4" style="padding:3mm 2mm;background:#f5f5f5;font-weight:bold;font-size:10px;border-bottom:0.5px solid #999;">${catName}</td></tr>`;
            }

            // Add category method if exists
            const categoryMethod = (params as any)[0]?.categoryTestMethod;
            if (categoryMethod) {
              paramsHtml += `<tr><td colspan="4" style="padding:2mm;background:#fafafa;font-size:9px;color:#666;border-bottom:0.5px solid #eee;">Method: ${categoryMethod}</td></tr>`;
            }

            // Sort parameters by sortOrder
            const sortedParams = [...(params as any[])].sort((a: any, b: any) => (a.sortOrder || 999) - (b.sortOrder || 999));

            sortedParams.forEach((param: any) => {
              const result = resultsMap[param.id] || {};
              const resultValue = result.numericValue !== null && result.numericValue !== undefined 
                ? result.numericValue 
                : (result.textValue || '-');
              const rangeText = result.referenceRange || param.normalRange || '-';
              const outOfRange = result.isAbnormal ? 'color:#b91c1c;font-weight:bold;' : '';
              const rowClass = result.isHighlighted ? 'background:#ffe6e6;' : '';

              paramsHtml += `
                <tr style="${rowClass}">
                  <td style="padding:2mm;border-bottom:0.5px solid #ddd;font-size:10px;width:35%;">${param.parameterName}</td>
                  <td style="padding:2mm;border-bottom:0.5px solid #ddd;font-size:10px;width:20%;text-align:center;${outOfRange}">${resultValue}${result.isAbnormal ? ' *' : ''}</td>
                  <td style="padding:2mm;border-bottom:0.5px solid #ddd;font-size:10px;width:12%;">${param.units || '-'}</td>
                  <td style="padding:2mm;border-bottom:0.5px solid #ddd;font-size:10px;width:33%;">${rangeText}</td>
                </tr>
              `;
            });
          });
        }

        // Build letterhead image HTML if available
        const letterheadHtml = withHeader && (letterheadDB?.headerImage || letterHeadBase64)
          ? `<img src="${letterheadDB?.headerImage || letterHeadBase64}" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:fill;z-index:0;" />`
          : '';

        // Build complete HTML page
        const pageHtml = `
          <div style="width:100%;height:${A4_Height}mm;font-family:Arial,sans-serif;background:#fff;overflow:hidden;position:relative;">
            ${letterheadHtml}
            <div style="position:relative;z-index:1;padding:${withHeader ? '25mm' : '12mm'} 12mm;height:100%;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;">
              
              <!-- Test Title -->
              <div style="text-align:center;margin-bottom:5mm;padding-bottom:3mm;border-bottom:1px solid #333;">
                <strong style="font-size:12px;letter-spacing:0.5px;">${testInfo.name.toUpperCase()} REPORT</strong>
              </div>

              <!-- Patient Info Table -->
              <table style="width:100%;border-collapse:collapse;margin-bottom:4mm;font-size:10px;">
                <tr>
                  <td style="padding:2mm 3mm;width:50%;"><strong>Patient:</strong> ${patientName}</td>
                  <td style="padding:2mm 3mm;width:50%;"><strong>Age / Gender:</strong> ${patient.ageYears || 0}Y ${patient.ageMonths || 0}M / ${patient.gender || '-'}</td>
                </tr>
                <tr>
                  <td style="padding:2mm 3mm;"><strong>Lab No:</strong> ${visitId}</td>
                  <td style="padding:2mm 3mm;"><strong>Date:</strong> ${visitDate}</td>
                </tr>
              </table>

              <!-- Results Table -->
              <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:4mm;flex:1;overflow:hidden;">
                <thead>
                  <tr>
                    <th style="border-bottom:1px solid #333;padding:3mm 2mm;text-align:left;width:35%;"><strong>Test Description</strong></th>
                    <th style="border-bottom:1px solid #333;padding:3mm 2mm;text-align:center;width:20%;"><strong>Result</strong></th>
                    <th style="border-bottom:1px solid #333;padding:3mm 2mm;text-align:left;width:12%;"><strong>Unit</strong></th>
                    <th style="border-bottom:1px solid #333;padding:3mm 2mm;text-align:left;width:33%;"><strong>Reference Range</strong></th>
                  </tr>
                </thead>
                <tbody>
                  ${paramsHtml}
                </tbody>
              </table>

              <!-- Interpretation -->
              ${interpretationHtml}

              <!-- Comments/Notes -->
              ${commentsHtml}

              <!-- Footer Spacing -->
              <div style="flex:1;"></div>
            </div>
          </div>
        `;

        // Convert HTML to image and add to PDF
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

        if (i > 0) pdfDoc.addPage();
        pdfDoc.addImage(imgDataUrl, 'JPEG', 0, 0, A4_Width, A4_Height);
      }

      // Save PDF with proper filename
      const fileName = `${patientName.replace(/\s+/g, '_')}_${visitId}_Report.pdf`;
      pdfDoc.save(fileName);
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
      const patient: any = first.patientTest.patient;

      if (!patient.email) { alert('No email address saved for this patient.'); return; }

      // Build results payload matching what the backend email function expects
      const allResults: any[] = [];
      responses.forEach(r => {
        allResults.push({ isHeader: true, testName: r.patientTest.test.name });
        r.parameters.forEach((p: any) => {
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
  const buildWhatsAppMessage = (responses: any[]) => {
    const first = responses[0];
    const patient: any = first.patientTest.patient;
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
      
      // Sort and display grouped parameters with proper ordering
      Object.entries(r.groupedParameters || {})
        .sort((a: [string, any], b: [string, any]) => {
          const aOrder = (a[1][0]?.sortOrder || 999);
          const bOrder = (b[1][0]?.sortOrder || 999);
          return aOrder - bOrder;
        })
        .forEach(([catName, catParams]: [string, any]) => {
          if (catName !== 'NO_CATEGORY_HEADER' && catParams[0]?.showCategoryHeader) {
            lines.push(`  _${catName}_`);
          }
          
          // Sort parameters within category by sortOrder
          const sortedParams = [...catParams].sort((a: any, b: any) => (a.sortOrder || 999) - (b.sortOrder || 999));
          
          sortedParams.forEach(p => {
            const er = p.existingResult;
            const val = er
              ? (er.numericValue !== null && er.numericValue !== undefined ? er.numericValue : (er.textValue || '-'))
              : '-';
            const units = p.units ? ` ${p.units}` : '';
            const range = er?.referenceRange ? `  [${er.referenceRange}]` : '';
            const flag = er?.isAbnormal ? ' ⚠️' : '';
            
            // Strip HTML tags from parameter name for WhatsApp
            const paramName = p.parameterName.replace(/<[^>]*>/g, '');
            
            lines.push(`• ${paramName}: *${val}*${units}${range}${flag}`);
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

  // Print — loads report data and opens browser print dialog directly (skip modal)
  const handlePrintPreview = async () => {
    if (selectedTests.size === 0) { alert('Please select a test to print'); return; }
    
    // If multiple tests selected from same patient/visit, show print options modal
    if (selectedTests.size > 1) {
      // Verify all selected tests are from same patient and visit
      const testIds = Array.from(selectedTests);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      
      const firstTest = responses[0];
      const samePatient = responses.every(r => r.patientTest.patientId === firstTest.patientTest.patientId);
      const sameVisit = responses.every(r => r.patientTest.visitId === firstTest.patientTest.visitId);
      
      if (samePatient && sameVisit) {
        // Show print options modal
        setShowPrintOptionsModal(true);
        return;
      }
    }
    
    // Single test or tests from different patient/visit - proceed with combined print
    await proceedWithPrint('nobreak');
  };

  // Proceed with printing based on selected option - DIRECT PRINT PREVIEW (no modal)
  const proceedWithPrint = async (option: 'pagebreak' | 'nobreak') => {
    if (selectedTests.size === 0) { alert('Please select a test to print'); return; }

    if (option === 'nobreak') {
      // Show test selection modal first
      setShowPrintOptionsModal(false);
      
      // Get test details for the modal
      const testIds = Array.from(selectedTests);
      
      // Extract tests from the nested patient.tests structure
      const testsForSelection: any[] = [];
      results.forEach((patient: any) => {
        if (patient.tests && Array.isArray(patient.tests)) {
          patient.tests.forEach((test: any) => {
            if (testIds.includes(test.test_id)) {
              testsForSelection.push({
                test_id: test.test_id,
                test_name: test.test_name,
                package_name: test.package_name
              });
            }
          });
        }
      });
      
      console.log('📋 Tests for selection modal:', testsForSelection);
      setTestSelectionData(testsForSelection);
      setPendingPrintTests(testIds);
      setShowTestSelectionModal(true);
      return;
    }

    // For pagebreak option, proceed directly
    await executePrint(option, Array.from(selectedTests));
  };

  // Execute the actual print with selected tests in order
  const executePrint = async (option: 'pagebreak' | 'nobreak', testIds: string[]) => {
    try {
      setLoading(true);
      const responses = await Promise.all(testIds.map(id => getPatientTestById(id)));
      const first = responses[0];

      // Debug: Log the parameters received
      console.log('📋 Parameters received from API:', first.parameters);
      console.log('📋 Full response:', first);
      console.log('🔧 MACHINE DATA from API Response:');
      console.log('   usedMachineId:', first.patientTest?.usedMachineId);
      console.log('   usedMachine:', first.patientTest?.usedMachine);
      console.log('   usedMachine?.name:', first.patientTest?.usedMachine?.name);
      console.log('   usedMachine?.description:', first.patientTest?.usedMachine?.description);
      console.log('   debug.usedMachineName:', first.debug?.usedMachineName);
      console.log('   debug.usedMachineId:', first.debug?.usedMachineId);

      // Fetch signature
      let signature = first.patientTest.test?.signature || null;
      if (!signature) {
        try {
          const API_BASE_URL_LOCAL = process.env.NEXT_PUBLIC_API_URL || '/api';
          const testSpeciality = first.patientTest.test?.speciality || 'Regular';
          const sigRes = await fetch(`${API_BASE_URL_LOCAL}/signatures/by-specialty/${encodeURIComponent(testSpeciality)}`);
          const sigData = await sigRes.json();
          if (sigData.success && sigData.data) signature = sigData.data;
          else {
            const allRes = await fetch(`${API_BASE_URL_LOCAL}/signatures`);
            const allData = await allRes.json();
            if (allData.success && allData.data.length > 0) {
              const active = allData.data.filter(s => s.isActive);
              if (active.length > 0) signature = active[0];
            }
          }
        } catch (e) { console.warn('Could not fetch signature', e); }
      }

      // Fetch letterhead with full-page background image from DB (NEW APPROACH)
      let letterheadDB: LetterheadDB | null = null;
      let letterHeadBase64 = '';
      try {
        const lhRes = await fetch(`${API_BASE_URL}/letterhead/active`);
        const lhData = await lhRes.json();
        if (lhData.success && lhData.data?.length > 0) {
          letterheadDB = lhData.data[0];
          console.log('✅ Letterhead loaded from DB:', letterheadDB);
        }
      } catch (e) {
        console.warn('Could not fetch letterhead from DB', e);
      }

      // Fallback: Convert static LetterHead to base64 if DB letterhead not available
      if (!letterheadDB) {
        try {
          const imgRes = await fetch(LetterHead);
          const blob = await imgRes.blob();
          letterHeadBase64 = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) { console.warn('Could not load static letterhead', e); }
      }

      // Build combined tests array with results data
      const combinedTests = responses.map((r, idx) => {
        const testObj = {
          name: r.patientTest.test.name,
          interpretation: r.patientTest.test.interpretation,
          signature: r.patientTest.test.signature || signature,
          groupedParameters: r.groupedParameters,
          parameters: r.parameters,
          // Include outsourcing data if available
          isOutsourced: r.patientTest.isOutsourced || false,
          outsourcedTo: r.patientTest.outsourcedTo || null,
          outsourcingReport: r.outsourcingReport || null,
          // ✅ Include per-test comments
          comments: r.patientTest.comments || '',
          // ✅ Include machine/instrument data
          usedMachine: r.patientTest.usedMachine || null
        };
        
        console.log(`📦 Test ${idx} (${testObj.name}):`, {
          hasUsedMachine: !!testObj.usedMachine,
          usedMachine: testObj.usedMachine,
          usedMachineId: r.patientTest?.usedMachineId
        });
        
        return testObj;
      });

      // ✅ DEBUG: Log machine data
      console.log('🔧 Combined Tests with Machine Data:', combinedTests.map(t => ({
        name: t.name,
        usedMachine: t.usedMachine,
        machineExists: !!t.usedMachine,
        machineId: t.usedMachine?.id,
        machineName: t.usedMachine?.name,
        machineDesc: t.usedMachine?.description
      })));

      // Build results object mapping parameter IDs to their values
      const resultsMap: any = {};
      responses.forEach(r => {
        r.parameters.forEach((param: any) => {
          if (param.existingResult) {
            resultsMap[param.id] = {
              numericValue: param.existingResult.numericValue,
              textValue: param.existingResult.textValue,
              isAbnormal: param.existingResult.isAbnormal,
              isHighlighted: param.existingResult.isHighlighted || false
            };
          }
        });
      });

      // ✅ Build comments map - one comment per test
      const commentsMap: Record<string, string> = {};
      responses.forEach(r => {
        const testId = r.patientTest.test.id;
        commentsMap[testId] = r.comments || '';
      });

      console.log('🔍 DEBUG: Report Data:', {
        commentsMap: commentsMap,
        resultsMap: resultsMap,
        paramCount: first.parameters.length,
        totalTests: responses.length
      });
      console.log('✅ Passing per-test comments:', commentsMap);

      // ✅ DIRECT PRINT - trigger print immediately with report data
      setLoading(false);
      await directPrintReport({
        patient: {
          ...first.patientTest.patient,
          // ✅ Get organization name and code from the organization relationship
          organizationName: (first.patientTest.patient as any)?.organizationName || (first.patientTest as any)?.organization?.name || '',
          organizationCode: (first.patientTest.patient as any)?.organizationCode || (first.patientTest as any)?.organization?.code || '',
          // Ensure age fields are properly set
          ageYears: (first.patientTest.patient as any)?.ageYears ?? (first.patientTest.patient as any)?.age,
          ageMonths: (first.patientTest.patient as any)?.ageMonths ?? 0,
          ageDays: (first.patientTest.patient as any)?.ageDays ?? 0
        },
        visitId: first.patientTest.visitId,
        visitDate: first.patientTest.visitDate,
        test: first.patientTest.test,
        parameters: first.parameters,
        groupedParameters: first.groupedParameters,
        combinedTests,
        signature,
        letterhead: letterheadDB,
        letterHeadBase64,
        printOption: option,
        results: resultsMap,
        referralDoctor: first.patientTest.referralDoctor,
        // ✅ For single test, use combinedTests[0].comments; for multiple tests, combinedTests has per-test comments
        comments: combinedTests.length === 1 ? combinedTests[0].comments : ''
      });
      
      setReportWithHeader(true);
      setShowPrintOptionsModal(false);
    } catch (err) {
      console.error('Error loading report:', err);
      alert('Error loading report: ' + err.message);
      setLoading(false);
    }
  };

  // Handle test selection from modal
  const handleTestSelectionConfirm = (selectedTests: SelectedTestItem[]) => {
    // Sort tests by their sortOrder and get test IDs
    const sortedTestIds = selectedTests
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(t => t.test_id);
    
    setShowTestSelectionModal(false);
    executePrint('nobreak', sortedTestIds);
  };

  // Handle per-test comments confirmation
  const handlePerTestCommentsConfirm = async (commentsMap: Record<string, string>) => {
    try {
      setLoading(true);
      const responses = pendingCommentsResponses;
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

      // Fetch letterhead
      let letterheadDB: LetterheadDB | null = null;
      let letterHeadBase64 = '';
      try {
        const lhRes = await fetch(`${API_BASE_URL}/letterhead/active`);
        const lhData = await lhRes.json();
        if (lhData.success && lhData.data?.length > 0) {
          letterheadDB = lhData.data[0];
        }
      } catch (e) {
        console.warn('Could not fetch letterhead from DB', e);
      }

      if (!letterheadDB) {
        try {
          const imgRes = await fetch(LetterHead);
          const blob = await imgRes.blob();
          letterHeadBase64 = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) { console.warn('Could not load static letterhead', e); }
      }

      // Build combined tests array with test_id
      const combinedTests = responses.map(r => ({
        test_id: r.patientTest.test.id,
        name: r.patientTest.test.name,
        interpretation: r.patientTest.test.interpretation,
        signature: r.patientTest.test.signature || signature,
        groupedParameters: r.groupedParameters,
        parameters: r.parameters,
        isOutsourced: r.patientTest.isOutsourced || false,
        outsourcedTo: r.patientTest.outsourcedTo || null,
        outsourcingReport: r.outsourcingReport || null,
        comments: r.patientTest.comments || ''
      }));

      // Build results object mapping parameter IDs to their values
      const resultsMap: any = {};
      responses.forEach(r => {
        r.parameters.forEach((param: any) => {
          if (param.existingResult) {
            resultsMap[param.id] = {
              numericValue: param.existingResult.numericValue,
              textValue: param.existingResult.textValue,
              isAbnormal: param.existingResult.isAbnormal,
              isHighlighted: param.existingResult.isHighlighted || false
            };
          }
        });
      });

      console.log('✅ Per-test comments entered:', commentsMap);

      // ✅ DIRECT PRINT - trigger print immediately with per-test comments
      setLoading(false);
      await directPrintReport({
        patient: {
          ...first.patientTest.patient,
          // ✅ Get organization name and code from the organization relationship
          organizationName: (first.patientTest.patient as any)?.organizationName || (first.patientTest as any)?.organization?.name || '',
          organizationCode: (first.patientTest.patient as any)?.organizationCode || (first.patientTest as any)?.organization?.code || '',
          // Ensure age fields are properly set
          ageYears: (first.patientTest.patient as any)?.ageYears ?? (first.patientTest.patient as any)?.age,
          ageMonths: (first.patientTest.patient as any)?.ageMonths ?? 0,
          ageDays: (first.patientTest.patient as any)?.ageDays ?? 0
        },
        visitId: first.patientTest.visitId,
        visitDate: first.patientTest.visitDate,
        test: first.patientTest.test,
        parameters: first.parameters,
        groupedParameters: first.groupedParameters,
        combinedTests,
        signature,
        letterhead: letterheadDB,
        letterHeadBase64,
        printOption: 'nobreak',
        results: resultsMap,
        referralDoctor: first.patientTest.referralDoctor,
        comments: combinedTests.length === 1 ? combinedTests[0].comments : ''
      });

      setShowPerTestCommentsModal(false);
      setPendingTestsForComments([]);
      setPendingCommentsResponses([]);
    } catch (err) {
      console.error('Error printing:', err);
      alert('Error: ' + err.message);
      setLoading(false);
    }
  };
  const directPrintReport = (reportProps: any) => {
    const printContainer = document.createElement('div');
    printContainer.id = 'print-report-container-' + Date.now();
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '0';
    printContainer.style.width = '210mm';
    printContainer.style.overflow = 'visible';
    printContainer.style.pointerEvents = 'none';

    document.body.appendChild(printContainer);

    const root = ReactDOM.createRoot(printContainer);
    let printed = false;

    const cleanup = () => {
      root.unmount();
      if (printContainer.parentNode) {
        document.body.removeChild(printContainer);
      }
    };

    const doPrint = () => {
      if (printed) return;
      printed = true;

      const reportEl = printContainer.querySelector('.professional-report');
      if (!reportEl) {
        // Silently fail if report failed to render
        console.error('Failed to render report for printing');
        cleanup();
        return;
      }

      const pageEls = reportEl.querySelectorAll('.report-page');
      const pagesHtml = Array.from(pageEls).map(p => (p as HTMLElement).outerHTML).join('');

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        // Silently fail if pop-ups are blocked - don't show alert
        cleanup();
        return;
      }

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Report</title><style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:Arial,Helvetica,sans-serif; font-size:10px; background:white; }
        @page { size:A4 portrait; margin:0; }
        .report-page {
          position:relative; width:210mm; height:297mm;
          background:#fff; overflow:hidden;
          page-break-after:avoid; break-after:avoid;
        }
        .report-page--continued {
          page-break-before:always; break-before:page;
        }
      </style></head><body>${pagesHtml}</body></html>`);
      printWindow.document.close();
      printWindow.focus();

      const triggerPrint = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          cleanup();
        }, 150);
      };

      const imgs = printWindow.document.querySelectorAll('img');
      if (imgs.length === 0) {
        triggerPrint();
        return;
      }

      let loaded = 0;
      const check = () => {
        loaded++;
        if (loaded >= imgs.length) triggerPrint();
      };
      imgs.forEach(img => {
        if (img.complete) check();
        else {
          img.onload = check;
          img.onerror = check;
        }
      });
    };

    root.render(
      <ProfessionalReport
        patient={reportProps.patient}
        visitId={reportProps.visitId}
        visitDate={reportProps.visitDate}
        test={reportProps.test}
        parameters={reportProps.parameters}
        groupedParameters={reportProps.groupedParameters}
        combinedTests={reportProps.combinedTests}
        signature={reportProps.signature}
        letterhead={reportProps.letterhead}
        letterHeadBase64={reportProps.letterHeadBase64}
        printOption={reportProps.printOption}
        results={reportProps.results}
        referralDoctor={reportProps.referralDoctor}
        comments={reportProps.comments}  // Backward compatibility
       
        onReady={doPrint}
      />
    );
  };

  // Handle upload modal for a patient
  const handleUploadClick = (patient: any, specificTest: any = null) => {
    setUploadPatient(patient);
    // If opened from a specific test icon — pre-select ONLY that test
    // If opened from patient level — all unchecked
    const initial: any = {};
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
      const newUploads: any = {};

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
    } catch (err: any) {
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

  // Auto-focus first Result column input when page loads
  useEffect(() => {
    if (results && results.length > 0) {
      setTimeout(() => {
        // Find first test with single parameter in editable stage
        const firstEditableTest = results.find(
          test => test.parameter_count === 1 && 
                  (test.result_status === 'Entered' || test.result_status === 'Validated')
        );
        
        if (firstEditableTest && inlineInputRefs.current[firstEditableTest.test_id]) {
          inlineInputRefs.current[firstEditableTest.test_id].focus();
          console.log('🎯 Auto-focused first Result input for test:', firstEditableTest.test_id);
        }
      }, 100);
    }
  }, [results]);

  // Handle test name click - open result entry page only for Received or Rectified stages
  const handleTestNameClick = async (test: any, patient: any) => {
    try {
      // Map status to proper format for stage check
      const statusMap = {
        'Provisional': 'Entered',
        'Authenticated': 'Authorized',
        'Validated': 'Validated'
      };
      
      const testStatus = statusMap[test.result_status] || test.result_status;

      // Allow viewing report for outsourced tests at ANY stage
      // Or for normal tests in Received or Rectified stages
      if (test.isOutsourced) {
        // Outsourced tests can be viewed at any stage
        console.log('✅ Outsourced test - allowing view at stage:', testStatus);
        // Load and show report
        try {
          const testData = await getPatientTestById(test.test_id);
          
          if (!testData || !testData.patientTest) {
            alert('Error loading test data');
            return;
          }

          console.log('📋 testData received:', {
            hasOutsourcingReport: !!testData.outsourcingReport,
            outsourcingReport: testData.outsourcingReport
          });

          // Fetch letterhead
          const letterHeadResponse = await fetch(LetterHead);
          const letterHeadBlob = await letterHeadResponse.blob();
          const letterHeadBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(letterHeadBlob);
          });

          setReportData({
            patient: testData.patientTest.patient,
            visitDate: testData.patientTest.visitDate,
            visitId: testData.patientTest.visitId,
            signature: null,
            letterHeadBase64,
            isOutsourced: test.isOutsourced,
            outsourcedTo: test.outsourcedTo,
            outsourcingReport: testData.outsourcingReport,  // Use directly from testData
            combinedTests: [{
              test: testData.patientTest.test,
              patientTest: testData.patientTest,
              groupedParameters: testData.groupedParameters,
              parameters: testData.parameters,
              isOutsourced: test.isOutsourced,
              outsourcedTo: test.outsourcedTo,
              outsourcingReport: testData.outsourcingReport  // Use directly from testData
            }]
          });
          setReportWithHeader(true);
          setShowReportModal(true);
        } catch (err) {
          console.error('Error loading outsourced report:', err);
          alert('Error loading report');
        }
        return;
      }

      // Only allow opening result entry page for normal tests in Received or Rectified stages
      if (testStatus === 'Received' || testStatus === 'Rectified') {
        router.push(`/result/patientresult/${test.test_id}`);
      } else {
        alert(`⚠️ Not Authorized\n\nCurrent Stage: ${testStatus}\n\nReadings can only be entered in "Received" stage or edited in "Rectified" stage.\n\nTo edit results in other stages, click on "Parameter" in the Result column.`);
        return;
      }

    } catch (err: any) {
      console.error('Error opening result entry page:', err);
      alert('Error: ' + (err.message || 'Failed to open result entry page'));
    }
  };

  // Handle Parameter click - open appropriate modal based on current status
  const handleParameterClick = async (test: any, patient: any) => {
    try {
      const testData = await getPatientTestById(test.test_id);
      
      if (!testData || !testData.patientTest) {
        alert('Error loading test data');
        return;
      }

      const status = test.result_status || test.status;
      
      console.log('🔍 Parameter click - Current status:', status);
      console.log('🔍 Is Outsourced:', test.isOutsourced);
      
      // 🔧 NEW: Check if test is outsourced
      if (test.isOutsourced) {
        console.log('✅ Test is outsourced - redirecting to import page');
        router.push(`/result/outsourcing-import/${test.test_id}`);
        return;
      }
      
      // Determine which modal to show based on current status
      if (status === 'Validated') {
        // Status is Validated → Show Authenticate modal (next stage is Authorized)
        console.log('✅ Opening Authenticate modal for next stage');
        setAuthenticateData({
          patientTest: testData.patientTest,
          parameters: testData.parameters,
          groupedParameters: testData.groupedParameters
        });
        setShowAuthenticateModal(true);
      } else if (status === 'Entered') {
        // Status is Entered → Show Reading Validation modal
        console.log('📋 Opening Reading Validation modal');
        setReadingValidationData({
          patientTest: testData.patientTest,
          parameters: testData.parameters,
          groupedParameters: testData.groupedParameters
        });
        setShowReadingValidationModal(true);
      } else if (status === 'Authorized' || status === 'Delivered') {
        // Status is Authorized or Delivered → Show view-only or completed message
        console.log('✅ Test already authorized/delivered - show read-only');
        alert('This test is already authorized. You can print or download the report.');
      } else if (status === 'Registered') {
        // Status is Registered → Allow entering results
        console.log('📝 Opening result entry');
        setReadingValidationData({
          patientTest: testData.patientTest,
          parameters: testData.parameters,
          groupedParameters: testData.groupedParameters
        });
        setShowReadingValidationModal(true);
      } else {
        // Default - show validation modal
        console.log('📋 Opening Reading Validation modal (default)');
        setReadingValidationData({
          patientTest: testData.patientTest,
          parameters: testData.parameters,
          groupedParameters: testData.groupedParameters
        });
        setShowReadingValidationModal(true);
      }

    } catch (err: any) {
      console.error('Error opening modal:', err);
      alert('Error: ' + (err.message || 'Failed to open modal'));
    }
  };

  // Handle result value click - enable inline editing for single parameter
  const handleResultValueClick = (test: any) => {
    // Only allow editing for single parameter tests
    if (test.parameter_count === 1) {
      setEditingResultId(`${test.test_id}`);
      setEditingResultValue(test.result || '');
    }
  };

  // Handle keyboard navigation and shortcuts for inline result editing
  const handleInlineKeyDown = (e: any, test: any, results: any[], patient: any) => {
    if (e.key === 'Enter' || (e.key === 's' && e.ctrlKey)) {
      // Ctrl+S or Enter to save
      e.preventDefault();
      handleSaveResultValue(test, false);
    } else if (e.key === 'Tab') {
      // Tab or Shift+Tab to navigate to next/previous result field
      e.preventDefault();
      const currentEditingTests = results.filter(t => 
        t.parameter_count === 1 && (t.result_status === 'Entered' || t.result_status === 'Validated')
      );
      const currentIndex = currentEditingTests.findIndex(t => t.test_id === test.test_id);
      
      if (!e.shiftKey && currentIndex < currentEditingTests.length - 1) {
        // Tab: move to next
        const nextTest = currentEditingTests[currentIndex + 1];
        setEditingResultId(`${nextTest.test_id}`);
        setEditingResultValue(nextTest.result || '');
        setTimeout(() => {
          inlineInputRefs.current[nextTest.test_id]?.focus();
        }, 0);
      } else if (e.shiftKey && currentIndex > 0) {
        // Shift+Tab: move to previous
        const prevTest = currentEditingTests[currentIndex - 1];
        setEditingResultId(`${prevTest.test_id}`);
        setEditingResultValue(prevTest.result || '');
        setTimeout(() => {
          inlineInputRefs.current[prevTest.test_id]?.focus();
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      // Down arrow to move to next result field
      e.preventDefault();
      const currentEditingTests = results.filter(t => 
        t.parameter_count === 1 && (t.result_status === 'Entered' || t.result_status === 'Validated')
      );
      const currentIndex = currentEditingTests.findIndex(t => t.test_id === test.test_id);
      
      if (currentIndex < currentEditingTests.length - 1) {
        const nextTest = currentEditingTests[currentIndex + 1];
        setEditingResultId(`${nextTest.test_id}`);
        setEditingResultValue(nextTest.result || '');
        setTimeout(() => {
          inlineInputRefs.current[nextTest.test_id]?.focus();
        }, 0);
      }
    } else if (e.key === 'ArrowUp') {
      // Up arrow to move to previous result field
      e.preventDefault();
      const currentEditingTests = results.filter(t => 
        t.parameter_count === 1 && (t.result_status === 'Entered' || t.result_status === 'Validated')
      );
      const currentIndex = currentEditingTests.findIndex(t => t.test_id === test.test_id);
      
      if (currentIndex > 0) {
        const prevTest = currentEditingTests[currentIndex - 1];
        setEditingResultId(`${prevTest.test_id}`);
        setEditingResultValue(prevTest.result || '');
        setTimeout(() => {
          inlineInputRefs.current[prevTest.test_id]?.focus();
        }, 0);
      }
    } else if (e.key === 'Escape') {
      // Escape to cancel editing
      e.preventDefault();
      setEditingResultId(null);
      setEditingResultValue('');
    }
  };

  // Handle inline result save on Enter/Tab/Ctrl+S
  const handleSaveResultValue = async (test: any, moveToNext: boolean = false) => {
    try {
      if (!editingResultValue.trim()) {
        // Clear editing but don't save empty values
        setEditingResultId(null);
        setEditingResultValue('');
        return;
      }

      console.log('💾 Saving result - Test object:', {
        test_id: test.test_id,
        parameter_id: test.parameter_id,
        editingResultValue: editingResultValue,
        isNumeric: !isNaN(parseFloat(editingResultValue))
      });

      const payloadData = {
        result: editingResultValue,
        parameterResults: [
          {
            parameterId: test.parameter_id,
            numericValue: isNaN(parseFloat(editingResultValue)) ? null : parseFloat(editingResultValue),
            textValue: isNaN(parseFloat(editingResultValue)) ? editingResultValue : null
          }
        ]
      };

      console.log('📤 Sending payload:', JSON.stringify(payloadData, null, 2));

      // Update test result via API
      const response = await updateTestResult(test.test_id.toString(), payloadData);
      
      console.log('✅ Backend response:', response);

      // Update local state immediately for better UX - update the test result in the results array
      setResults(prevResults => 
        prevResults.map(patient => ({
          ...patient,
          tests: patient.tests.map(t => 
            t.test_id === test.test_id 
              ? { ...t, result: editingResultValue }
              : t
          )
        }))
      );

      // Clear editing state
      setEditingResultId(null);
      setEditingResultValue('');

      // Show success feedback
      console.log('✨ Result saved successfully');
      
      // Refresh results from server (for pagination and other updates)
      await fetchResults();
      
      // If moveToNext, find and focus the next single-param test in Entered stage
      if (moveToNext) {
        setTimeout(() => {
          // Get current test index and find next Entered single-param test
          const enteredSingleParamTests = paginatedResults
            .flatMap(patient => patient.tests)
            .filter(t => t.result_status === 'Entered' && t.parameter_count === 1);
          
          const currentIdx = enteredSingleParamTests.findIndex(t => t.test_id === test.test_id);
          if (currentIdx !== -1 && currentIdx < enteredSingleParamTests.length - 1) {
            const nextTest = enteredSingleParamTests[currentIdx + 1];
            // Focus next input
            const nextInput = inlineInputRefs.current[nextTest.test_id];
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
              setEditingResultId(`${nextTest.test_id}`);
              setEditingResultValue(nextTest.result || '');
            }
          }
        }, 100);
      }
    } catch (err: any) {
      console.error('❌ Error saving result:', err);
      alert('Failed to save result: ' + (err.message || 'Unknown error'));
      // Don't clear editing state on error, allow user to retry
    }
  };

  // Handle cancel editing
  const handleCancelEditResult = () => {
    setEditingResultId(null);
    setEditingResultValue('');
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

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${API_BASE_URL}/master/departments`);
        const data = await res.json();
        
        // 🔴 DEBUG: Log departments response
        console.log(`🔴 Frontend - Departments API Response:`, data);
        console.log(`🔴 Frontend - Departments Status:`, data.success);
        console.log(`🔴 Frontend - Departments Data:`, data.data);
        
        if (data.success && Array.isArray(data.data)) {
          console.log(`✅ Loaded ${data.data.length} departments:`, data.data.map(d => d.name));
          setDepartments(data.data);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();
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

  // Handle Ctrl+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch results from API
  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getPatientTests(filters);
      
      // 🔍 DEBUG: Log first few results to check isEmergency field
      console.log('🔍 RESULT DEBUG - First result tests:', data[0]?.tests?.[0]);
      console.log('🔍 RESULT DEBUG - isEmergency sample:', data[0]?.tests?.[0]?.isEmergency);
      
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
    setFilters(prev => {
      // Special handling for organization (array)
      if (key === 'organization') {
        const newOrgs = prev.organization.includes(value)
          ? prev.organization.filter(org => org !== value)  // Remove if already selected
          : [...prev.organization, value];  // Add if not selected
        return {
          ...prev,
          organization: newOrgs
        };
      }
      return {
        ...prev,
        [key]: value
      };
    });
  };

  // Listen for filter changes and refetch data (IMPORTANT: includes department, organization, testName filters)
  useEffect(() => {
    // Save filters to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('resultPageFilters', JSON.stringify(filters));
    }
    
    // Fetch results with new filters
    fetchResults();
  }, [filters]);

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

  // Filter results based on selected status only (organization filtering is done by backend via filters)
  const filteredResults = selectedStatus === "All" 
    ? results 
    : results.map(patient => ({
        ...patient,
        tests: patient.tests.filter(test => {
          // Map old status names to new ones
          const statusMap = {
            'Provisional': 'Entered',
            'Authenticated': 'Authorized',
            'Validated': 'Validated'
          };
          
          const testStatus = statusMap[test.result_status] || test.result_status;
          return testStatus.toUpperCase() === selectedStatus.toUpperCase();
        })
      })).filter(patient => patient.tests.length > 0);

  // Sort results based on sortBy selection
  const sortedAndFilteredResults = [...filteredResults].sort((a, b) => {
    // Priority 1: Emergency patients first
    const aHasEmergency = a.tests?.some((t: any) => t.isEmergency);
    const bHasEmergency = b.tests?.some((t: any) => t.isEmergency);
    
    if (aHasEmergency && !bHasEmergency) return -1;
    if (!aHasEmergency && bHasEmergency) return 1;
    
    // Priority 2: Sort by selected method
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

  // Reset to page 1 when filters change (including organization)
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredResults, selectedStatus, filters.organization]);

  // Get status badge color based on status
  const getStatusBadgeColor = (status: any) => {
    const pascalStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
    // Map old status names to new ones for display
    const statusMap = {
      'Provisional': 'Entered',
      'Authenticated': 'Authorized',
      'Validated': 'Validated'
    };
    
    const displayStatus = statusMap[pascalStatus] || pascalStatus;
    
    switch (displayStatus) {
      case "Registered":
        return "bg-cyan-100 text-cyan-800";
      case "Received":
        return "bg-orange-100 text-orange-800";
      case "Entered":
        return "bg-purple-100 text-purple-800";
      case "Validated":
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
      const updates: any[] = [];
      Object.keys(settingsFormData.selectedTests).forEach(testId => {
        if (settingsFormData.selectedTests[testId]) {
          updates.push({
            id: parseInt(testId),
            status: (settingsFormData.testStatuses as any)[testId],
            remarks: (settingsFormData.testRemarks as any)[testId]
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
      
    } catch (err: any) {
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
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        
        {/* Error Message */}
        {error && (
          <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded mx-2">
            {error}
          </div>
        )}
        
        <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">

            {/* Status Cards with All button */}
            <div className="flex gap-1 items-center px-2 py-0.5">
              <button
                onClick={() => setSelectedStatus("All")}
                className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                  selectedStatus === "All" 
                    ? "bg-slate-900 text-white ring-2 ring-slate-900" 
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                All ({statistics.total})
              </button>
              
              <div className="grid grid-cols-7 gap-1 flex-1">
                <div 
                  onClick={() => setSelectedStatus("Registered")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Registered" ? "bg-cyan-200 ring-2 ring-cyan-600" : "bg-cyan-100"
                  }`}
                >
                  <h3 className="text-cyan-800 font-semibold text-[11px]">
                    Registered ({statistics.byStatus.Registered})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Received")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Received" ? "bg-orange-200 ring-2 ring-orange-600" : "bg-orange-100"
                  }`}
                >
                  <h3 className="text-orange-800 font-semibold text-[11px]">
                    Received ({statistics.byStatus.Received})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Entered")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Entered" ? "bg-purple-200 ring-2 ring-purple-600" : "bg-purple-100"
                  }`}
                >
                  <h3 className="text-purple-800 font-semibold text-xs sm:text-sm">
                    Entered ({statistics.byStatus.Entered})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Validated")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Validated" ? "bg-yellow-200 ring-2 ring-yellow-600" : "bg-yellow-100"
                  }`}
                >
                  <h3 className="text-yellow-800 font-semibold text-[11px]">
                    Validated ({statistics.byStatus.Validated})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Authorized")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Authorized" ? "bg-blue-200 ring-2 ring-blue-600" : "bg-blue-100"
                  }`}
                >
                  <h3 className="text-blue-800 font-semibold text-[11px]">
                    Authorized ({statistics.byStatus.Authorized})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Delivered")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Delivered" ? "bg-green-200 ring-2 ring-green-600" : "bg-green-100"
                  }`}
                >
                  <h3 className="text-green-800 font-semibold text-[11px]">
                    Delivered ({statistics.byStatus.Delivered})
                  </h3>
                </div>
                <div 
                  onClick={() => setSelectedStatus("Rectified")}
                  className={`rounded-lg p-1 text-center cursor-pointer hover:shadow-md transition-shadow ${
                    selectedStatus === "Rectified" ? "bg-red-200 ring-2 ring-red-600" : "bg-red-100"
                  }`}
                >
                  <h3 className="text-red-800 font-semibold text-[11px]">
                    Rectified ({statistics.byStatus.Rectified})
                  </h3>
                </div>
              </div>
            </div>

            {/* Top Filter Bar */}
            <div className="bg-white rounded shadow-md p-1 mx-2">
              <div className="flex flex-wrap items-center gap-1">
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
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                
                {/* Organization Multi-Select Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                    className="h-8 px-2 rounded border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600 bg-white flex items-center gap-1 hover:bg-gray-50"
                  >
                    <span className="truncate">
                      {filters.organization.length === 0 
                        ? 'All Org' 
                        : `${filters.organization.length} selected`}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {showOrgDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-max max-h-64 overflow-y-auto">
                      {/* "All" option */}
                      <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer border-b">
                        <input
                          type="checkbox"
                          checked={filters.organization.length === 0}
                          onChange={() => setFilters(prev => ({ ...prev, organization: [] }))}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs">All Organizations</span>
                      </label>
                      
                      {/* Organization options */}
                      {organizations.map(org => (
                        <label key={org.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.organization.includes(org.code)}
                            onChange={() => handleFilterChange('organization', org.code)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-xs">{org.code || org.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Close dropdown when clicking outside */}
                {showOrgDropdown && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowOrgDropdown(false)}
                  />
                )}
                
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
                
                {/* Required Columns Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                    className="h-8 px-2 rounded border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-600 bg-white flex items-center gap-1 hover:bg-gray-50"
                    title="Show/Hide Columns"
                  >
                    <span className="truncate">
                      Columns ({selectedColumnCount})
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {showColumnsDropdown && (
                    <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-300 rounded shadow-lg mt-0.5">
                      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-t text-sm font-semibold">Required Columns</div>
                      <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-1 text-xs mb-1">
                          <span className="font-semibold text-gray-600">Filter:</span>
                          <input
                            type="text"
                            value={columnsFilter}
                            onChange={(e) => setColumnsFilter(e.target.value)}
                            placeholder="Keywords"
                            className="border border-gray-400 px-1.5 py-0.5 rounded text-xs flex-1 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-3 text-xs">
                          <button
                            onClick={handleCheckAllColumns}
                            className="text-blue-700 font-semibold hover:underline"
                          >
                            ✓ Check all
                          </button>
                          <button
                            onClick={handleUncheckAllColumns}
                            className="text-blue-700 font-semibold hover:underline"
                          >
                            ✕ Uncheck all
                          </button>
                        </div>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {RESULT_COLUMNS.filter(c =>
                          c.label.toLowerCase().includes(columnsFilter.toLowerCase())
                        ).map(col => (
                          <label
                            key={col.key}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 ${
                              selectedColumns[col.key] ? 'bg-gray-100' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!!selectedColumns[col.key]}
                              onChange={() => handleColumnToggle(col.key)}
                              className="w-4 h-4 accent-blue-600"
                            />
                            <span className="font-medium text-gray-800">{col.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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

                {/* ✅ Pagination selector moved to filter bar */}
                <div className="ml-auto flex gap-0.5 text-sm items-center">
                  <span className="text-xs text-gray-600">Show:</span>
                  <button
                    onClick={() => { setItemsPerPage(25); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded transition-colors text-xs ${itemsPerPage === 25 ? 'text-cyan-600 font-semibold bg-cyan-100' : 'text-gray-700 hover:text-cyan-600 hover:bg-gray-100'}`}
                  >
                    25
                  </button>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => { setItemsPerPage(50); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded transition-colors text-xs ${itemsPerPage === 50 ? 'text-cyan-600 font-semibold bg-cyan-100' : 'text-gray-700 hover:text-cyan-600 hover:bg-gray-100'}`}
                  >
                    50
                  </button>
                  <span className="text-gray-400">/</span>
                  <button
                    onClick={() => { setItemsPerPage(100); setCurrentPage(1); }}
                    className={`px-2 py-1 rounded transition-colors text-xs ${itemsPerPage === 100 ? 'text-cyan-600 font-semibold bg-cyan-100' : 'text-gray-700 hover:text-cyan-600 hover:bg-gray-100'}`}
                  >
                    100
                  </button>
                </div>
              </div>
            </div>

            {/* Result Table - Scrollable with dynamic height */}
            <div className="bg-white rounded shadow-md overflow-hidden flex flex-col mx-2">
              
              <div className="overflow-y-auto overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs border-collapse">
                  <thead className="bg-slate-900 text-white shadow-xl">
                    <tr>
                      <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-center font-semibold text-[10px] whitespace-nowrap border border-gray-300">
                        <input 
                          type="checkbox" 
                          className="w-3 h-3 cursor-pointer accent-white" 
                          checked={selectAllChecked}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          title="Select all visible tests"
                        />
                      </th>
                      {selectedColumns.visitId && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Visit ID</th>
                      )}
                      {selectedColumns.orgId && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Org ID</th>
                      )}
                      {selectedColumns.patientName && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Patient Name</th>
                      )}
                      {selectedColumns.age && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Age</th>
                      )}
                      {selectedColumns.gender && (
                        <th className="px-0.5 sm:px-1 py-0.5 sm:py-1 text-center font-semibold text-[10px] whitespace-nowrap border border-gray-300">Gender</th>
                      )}
                      {selectedColumns.services && (
                        <th className="px-2 sm:px-3 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300 min-w-[200px]">Services</th>
                      )}
                      {selectedColumns.result && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Result</th>
                      )}
                      {selectedColumns.unit && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Unit</th>
                      )}
                      {selectedColumns.refInterval && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Ref. Interval</th>
                      )}
                      {selectedColumns.referralDoc && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300">Referral Doc</th>
                      )}
                      {selectedColumns.ptr && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300" title="Previous Test Result">
                          PTR
                        </th>
                      )}
                      {selectedColumns.atr && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-left font-semibold text-[10px] whitespace-nowrap border border-gray-300" title="All Test Results">
                          ATR
                        </th>
                      )}
                      {selectedColumns.sTaken && (
                        <th className="px-0.5 sm:px-1 py-0.5 sm:py-1 text-center font-semibold text-[10px] whitespace-nowrap border border-gray-300">
                          <span className="text-[9px]">S.Taken</span>
                        </th>
                      )}
                      {selectedColumns.barcode && (
                        <th className="px-0.5 sm:px-1 py-0.5 sm:py-1 text-center font-semibold text-[10px] whitespace-nowrap border border-gray-300">
                          <div title="Print barcode labels for selected tests">
                            <Barcode
                              size={16}
                              className="mx-auto cursor-pointer hover:text-cyan-300 transition-colors"
                              onClick={handleBarcodePrint}
                            />
                          </div>
                        </th>
                      )}
                      {selectedColumns.history && (
                        <th className="px-1 sm:px-2 py-0.5 sm:py-1 text-center font-semibold text-[10px] whitespace-nowrap border border-gray-300">
                          <span className="text-[9px]">History</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={17} className="text-center p-2 text-gray-500 text-sm border border-gray-300">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                            Loading...
                          </div>
                        </td>
                      </tr>
                    ) : paginatedResults.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="text-center p-2 text-gray-500 text-xs sm:text-sm border border-gray-300">
                          No records found for {selectedStatus} status
                        </td>
                      </tr>
                    ) : (
                      paginatedResults.map((patient, patientIndex) => {
                        return patient.tests.map((test, testIndex) => {
                          const statusBgColor = getStatusBadgeColor(test.result_status);
                          const rowClassName = test.isEmergency 
                            ? 'bg-red-50 border-l-4 border-l-red-600 text-gray-800 border-b border-gray-300 cursor-pointer transition-all'
                            : `${statusBgColor} border-b border-gray-300 cursor-pointer transition-all`;
                          
                          return (
                          <tr 
                            key={`${patient.patient_uid}-${test.test_id}`} 
                            className={`hover:bg-opacity-80 ${rowClassName}`}
                            style={{ height: 'auto', lineHeight: '1.2' }}
                          >
                            {/* Column 1: Checkbox */}
                            <td className="px-1 sm:px-2 py-0.5 text-center border border-gray-300">
                              <input 
                                type="checkbox" 
                                className="w-3 h-3 cursor-pointer accent-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                checked={selectedTests.has(test.test_id)}
                                disabled={isCheckboxDisabled(patient, test)}
                                onChange={(e) => handleTestSelection(test.test_id, e.target.checked, patient, test)}
                                tabIndex={0}
                                title="Select test (Tab to focus)"
                              />
                            </td>

                            {/* Column 2: Visit ID (show only on first test row) */}
                            {selectedColumns.visitId && (
                              <td className="px-1 sm:px-2 py-0.25 text-[11px] border border-gray-300">
                                {testIndex === 0 ? patient.visit_id : ''}
                              </td>
                            )}

                            {/* Column 3: Org ID with hover tooltip (show only on first test row) */}
                            {selectedColumns.orgId && (
                              <td className="px-1 sm:px-2 py-0.25 text-[11px] border border-gray-300 relative">
                                {testIndex === 0 && (
                                  <div 
                                    className="cursor-help relative group"
                                    title={(patient.organization_name || patient.organizationName) || 'N/A'}
                                  >
                                    <span className="font-medium text-gray-900">
                                      {(patient.organizationCode || patient.organizationId || '-')}
                                    </span>
                                    {/* Tooltip - only show if organization exists */}
                                    {(patient.organizationCode || patient.organizationId) && (
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none">
                                        <span className="bg-gray-800 text-white text-[10px] font-semibold rounded px-2 py-1 whitespace-nowrap shadow-lg max-w-xs">
                                          {(patient.organization_name || patient.organizationName || 'Organization')}
                                        </span>
                                        <span className="w-2 h-2 bg-gray-800 rotate-45 -mt-1" />
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Column 4: Patient Name with balance icon (show only on first test row) */}
                            {selectedColumns.patientName && (
                              <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] font-medium border border-gray-300">
                                {testIndex === 0 && (
                                  <span className={`flex items-center gap-1 ${test.isEmergency ? 'text-red-700' : ''}`}>
                                    {test.isEmergency && (
                                      <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
                                    )}
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
                            )}

                            {/* Column 5: Age (show only on first test row) */}
                            {selectedColumns.age && (
                              <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] font-medium border border-gray-300 text-center">
                                {testIndex === 0 && (
                                  <span className="font-semibold text-gray-900">
                                    {(() => {
                                      if (patient.ageYears !== undefined && patient.ageMonths !== undefined && patient.ageDays !== undefined) {
                                        // Under 1 year: show only months and days
                                        if (patient.ageYears === 0) {
                                          return `${patient.ageMonths}M ${patient.ageDays}D`;
                                        }
                                        // 1 to 12 years: show years, months, and days
                                        else if (patient.ageYears < 12) {
                                          return `${patient.ageYears}Y ${patient.ageMonths}M ${patient.ageDays}D`;
                                        }
                                        // 12 years and above: show as decimal (years.months)
                                        else {
                                          const decimalAge = (patient.ageYears + patient.ageMonths / 12).toFixed(1);
                                          return decimalAge;
                                        }
                                      }
                                      return patient.age || '-';
                                    })()}
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Column 6: Gender (show only on first test row) */}
                            {selectedColumns.gender && (
                              <td className="px-0.5 sm:px-1 py-0.5 sm:py-1 text-[11px] font-medium border border-gray-300 text-center">
                                {testIndex === 0 && (
                                  <span className="font-semibold text-gray-900">
                                    {patient.gender ? (patient.gender === 'Male' ? 'M' : patient.gender === 'Female' ? 'F' : patient.gender) : '-'}
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Column 7: Services (with icons) */}
                            {selectedColumns.services && (
                              <td className="px-2 sm:px-4 py-0.5 sm:py-1 text-[11px] border border-gray-300 min-w-[280px]" title={test.test_name}>
                                <div className="flex items-center gap-1">
                                <span 
                                  className="flex-1 cursor-pointer hover:text-cyan-700 hover:font-semibold transition-colors"
                                  onClick={() => handleTestNameClick(test, patient)}
                                  title="Click to enter/edit readings (Received or Rectified stage only)"
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
                                      width="20" height="20"
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
                            )}

                            {/* Column 8: Result */}
                            {selectedColumns.result && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300 max-w-[120px]">
                              {test.parameter_count > 1 ? (
                                <span 
                                  className="text-black font-medium cursor-pointer hover:text-cyan-600 hover:underline focus:outline-none focus:ring-2 focus:ring-cyan-600 px-1 py-0.5 inline-block"
                                  onClick={() => handleParameterClick(test, patient)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleParameterClick(test, patient);
                                    }
                                  }}
                                  tabIndex={0}
                                  role="button"
                                  title="Press Enter or Space to edit parameters"
                                >
                                  Parameter
                                </span>
                              ) : test.parameter_count === 1 && (test.result_status === 'Entered' || test.result_status === 'Validated') ? (
                                // Single parameter in Entered or Validated stage - show inline input with black text
                                <input
                                  ref={(el) => {
                                    if (el) inlineInputRefs.current[test.test_id] = el;
                                  }}
                                  type="text"
                                  value={editingResultId === `${test.test_id}` ? editingResultValue : (test.result || '')}
                                  onChange={(e) => {
                                    if (editingResultId === `${test.test_id}`) {
                                      setEditingResultValue(e.target.value);
                                    } else {
                                      setEditingResultId(`${test.test_id}`);
                                      setEditingResultValue(e.target.value);
                                    }
                                  }}
                                  onKeyDown={(e) => handleInlineKeyDown(e, test, results, patient)}
                                  onFocus={() => {
                                    setEditingResultId(`${test.test_id}`);
                                    setEditingResultValue(test.result || '');
                                  }}
                                  onBlur={() => {
                                    // Keep value if user navigates away
                                  }}
                                  placeholder="Enter value"
                                  autoFocus={editingResultId === `${test.test_id}`}
                                  className={`w-24 px-1 py-0.5 border rounded text-[11px] text-black font-medium focus:outline-none focus:ring-1 ${
                                    isValueOutOfRange(editingResultId === `${test.test_id}` ? editingResultValue : test.result, test.ref_interval_data, patient)
                                      ? 'border-red-500 focus:ring-red-500 bg-white'
                                      : 'border-cyan-600 focus:ring-cyan-600 bg-white'
                                  }`}
                                  title="Ctrl+S or Enter to save | Tab/Down to next | Shift+Tab/Up to previous | Escape to cancel"
                                />
                              ) : (
                                <span 
                                  className={`cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-600 px-1 py-0.5 inline-block text-black font-medium hover:text-cyan-600 hover:underline`}
                                  onClick={() => handleParameterClick(test, patient)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleParameterClick(test, patient);
                                    }
                                  }}
                                  tabIndex={0}
                                  role="button"
                                  title={test.result_status === 'Validated' ? 'Press Enter to edit this value' : 'Read-only in this stage'}
                                >
                                  {test.isOutsourced ? (
                                    <span 
                                      className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer hover:bg-yellow-200 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/result/outsourcing-import/${test.test_id}`);
                                      }}
                                      title="Click to import outsourcing report"
                                    >
                                      <span>⚠️</span>
                                      <span>OUTSOURCING</span>
                                    </span>
                                  ) : test.result_status === 'Entered' || test.result_status === 'Validated' || test.result_status === 'Authorized' || test.result_status === 'Delivered' 
                                    ? (test.result || '-') 
                                    : '-'}
                                </span>
                              )}
                            </td>
                            )}

                            {/* Column 9: Unit */}
                            {selectedColumns.unit && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300">
                              <span className="text-gray-700">
                                {test.parameter_count === 1 ? (test.unit || '-') : '-'}
                              </span>
                            </td>
                            )}
                            
                            {/* Column 10: Ref. Interval */}
                            {selectedColumns.refInterval && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300">
                              <span className="text-gray-700">
                                {test.parameter_count === 1 
                                  ? getAgeAppropriateRange(test.ref_interval_data, patient)
                                  : '-'}
                              </span>
                            </td>
                            )}

                            {/* Column 11: Referral Doc */}
                            {selectedColumns.referralDoc && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300">
                              <span>
                                {test.ref_by === "SELF" ? (
                                  <span>{test.ref_by}</span>
                                ) : (
                                  <span>{test.ref_by}</span>
                                )}
                              </span>
                            </td>
                            )}

                            {/* Column 12: Previous Test Result */}
                            {selectedColumns.ptr && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleFetchPreviousResult(patient, test)}
                                  disabled={previousResultLoading}
                                  className="text-cyan-600 hover:text-cyan-800 hover:underline font-medium text-xs disabled:opacity-50"
                                  title="View previous test result"
                                >
                                  {previousResultLoading ? '...' : 'View'}
                                </button>
                              </div>
                            </td>
                            )}

                            {/* Column 13: All Test Results */}
                            {selectedColumns.atr && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleFetchAllResults(patient, test)}
                                  disabled={allResultsLoading}
                                  className="text-cyan-600 hover:text-cyan-800 hover:underline font-medium text-xs disabled:opacity-50"
                                  title="View all test results"
                                >
                                  {allResultsLoading ? '...' : 'View'}
                                </button>
                              </div>
                            </td>
                            )}

                            {/* Column 14: S.Taken (green tick mark + calendar & settings icons, all rows) */}
                            {selectedColumns.sTaken && (
                            <td className="px-0.5 sm:px-1 py-0.5 sm:py-1 text-center border border-gray-300">
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
                            )}
                            
                            {/* Column 15: Barcode checkbox */}
                            {selectedColumns.barcode && (
                            <td className="px-0.5 sm:px-1 py-0.5 sm:py-1 text-center border border-gray-300">
                              <input
                                type="checkbox"
                                className="w-3 h-3 cursor-pointer accent-cyan-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                checked={barcodeSelectedTests.has(test.test_id)}
                                disabled={isBarcodeCheckboxDisabled(patient)}
                                onChange={(e) => handleBarcodeSelection(test.test_id, e.target.checked, patient)}
                              />
                            </td>
                            )}

                            {/* Column 16: Patient History */}
                            {selectedColumns.history && (
                            <td className="px-1 sm:px-2 py-0.5 sm:py-1 text-[11px] border border-gray-300 relative group">
                              {testIndex === 0 && patient.patient_history && (
                                <>
                                  <div className="text-xs text-gray-700 line-clamp-2 cursor-help">
                                    {patient.patient_history}
                                  </div>
                                  {/* Tooltip on hover - shows full text */}
                                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-normal max-w-xs shadow-lg">
                                    {patient.patient_history}
                                  </div>
                                </>
                              )}
                              {(testIndex !== 0 || !patient.patient_history) && (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            )}
                          </tr>
                          );
                        });
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalRecords > 0 && (
              <div className="bg-white rounded shadow-md p-1 mx-2">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-700">
                    Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, totalRecords)}</span> of <span className="font-semibold">{totalRecords}</span>
                  </div>
                  
                  {/* Pagination buttons - same row */}
                  <div className="flex gap-0.5 items-center">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-1.5 py-0 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors"
                    >
                      ← Prev
                    </button>
                    
                    <div className="flex items-center gap-0.5">
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
                            className={`px-1 py-0 rounded text-xs font-medium transition-colors ${
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
                      className="px-1.5 py-0 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 text-white rounded text-xs font-medium transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Bottom Action Buttons - Fixed at bottom */}
            <div className="bg-white rounded shadow-md p-0.5 mx-2 mb-2">
              <div className="flex flex-wrap items-center gap-0.5">
                <button 
                  onClick={handleResultEntry}
                  className="flex gap-0.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors">
                  <span>Result ({selectedTests.size})</span>
                </button>
                <button
                  onClick={handlePrintPreview}
                  disabled={loading || selectedTests.size === 0}
                  className="flex gap-0.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors disabled:opacity-50"
                >
                  <Printer size={11} />
                  <span>Print</span>
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={loading || selectedTests.size === 0}
                  className="flex gap-0.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors disabled:opacity-50"
                >
                  <Mail size={11} />
                  <span>Email</span>
                </button>
                <button
                  onClick={() => handleSendWhatsApp()}
                  disabled={loading || selectedTests.size === 0}
                  className="flex gap-0.5 items-center bg-green-600 hover:bg-green-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors disabled:opacity-50"
                >
                  <FaWhatsapp size={11} />
                  <span>Whatsapp</span>
                </button>

                {/* Validate Button */}
                <button
                  onClick={async () => {
                    const testsToValidate = Array.from(selectedTests);
                    if (testsToValidate.length === 0) {
                      alert('Please select tests to validate');
                      return;
                    }
                    try {
                      for (const testId of testsToValidate) {
                        await updateTestStatus(testId.toString(), { status: 'Validated' });
                      }
                      alert(`${testsToValidate.length} test(s) moved to Validated stage`);
                      fetchResults();
                      setSelectedTests(new Set());
                    } catch (err) {
                      alert('Error validating tests: ' + err.message);
                    }
                  }}
                  disabled={loading || selectedTests.size === 0}
                  className="flex gap-0.5 items-center bg-yellow-500 hover:bg-yellow-600 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors disabled:opacity-50"
                >
                  <span>Validate</span>
                </button>

                {/* Authorize Button */}
                <button
                  onClick={async () => {
                    const testsToAuthorize = Array.from(selectedTests);
                    if (testsToAuthorize.length === 0) {
                      alert('Please select tests to authorize');
                      return;
                    }
                    try {
                      for (const testId of testsToAuthorize) {
                        await updateTestStatus(testId.toString(), { status: 'Authorized' });
                      }
                      alert(`${testsToAuthorize.length} test(s) moved to Authorized stage`);
                      fetchResults();
                      setSelectedTests(new Set());
                    } catch (err) {
                      alert('Error authorizing tests: ' + err.message);
                    }
                  }}
                  disabled={loading || selectedTests.size === 0}
                  className="flex gap-0.5 items-center bg-green-600 hover:bg-green-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors disabled:opacity-50"
                >
                  <span>Authorize</span>
                </button>
                
                {/* Download Dropdown */}
                <div className="relative download-dropdown">
                  <button 
                    onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                    className="flex gap-0.5 items-center bg-gray-600 hover:bg-gray-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors"
                  >
                    <Download size={11} />
                    <span>Download</span>
                    <ChevronDown size={10} />
                  </button>
                  
                  {showDownloadDropdown && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[140px]">
                      <button
                        onClick={() => handleDownloadPdf(true)}
                        className="w-full text-left px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
                      >
                        <img src={LetterHead} alt="Header" className="w-3 h-3 object-contain" />
                        With Header
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(false)}
                        className="w-full text-left px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
                      >
                        Without Header
                      </button>
                    </div>
                  )}
                </div>

                {/* Print Table as PDF */}
                <button
                  onClick={handlePrintTablePDF}
                  disabled={loading || paginatedResults.length === 0}
                  className="flex gap-0.5 items-center bg-purple-600 hover:bg-purple-700 text-white px-1.5 py-0.5 rounded text-[13px] transition-colors disabled:opacity-50"
                  title="Print result table as PDF"
                >
                  <FileText size={11} />
                  <span>Print Table PDF</span>
                </button>
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
                                <option value="Validated">Validated</option>
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

      {/* Report Modal - REMOVED - Direct print preview now used instead */}
      {/* showReportModal is no longer used - directPrintReport handles printing directly */}

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
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
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
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-2">
                <strong>Patient:</strong> {allResultsData.patient.patient_name} | 
                <strong className="ml-2">Total Results:</strong> {allResultsData.results ? allResultsData.results.length : 0}
              </p>
              
              {allResultsData.results && allResultsData.results.length > 0 ? (
                <div className="space-y-2">
                  {allResultsData.results.map((testResult, testIdx) => (
                    <div key={testIdx} className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                      <div className="flex items-center justify-between mb-2 pb-1 border-b">
                        <div>
                          <p className="font-semibold text-gray-900 text-xs">
                            {new Date(testResult.visitDate).toLocaleDateString()} {new Date(testResult.visitDate).toLocaleTimeString()}
                          </p>
                          <p className="text-[10px] text-gray-600">Status: <span className="font-medium">{testResult.status}</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {testResult.results && testResult.results.map((result, idx) => (
                          <div key={idx} className="bg-white p-1 rounded border border-gray-200 text-[10px]">
                            <p className="font-medium text-gray-800">{result.parameterName}</p>
                            <p className="text-gray-600">
                              <span className={result.isOutOfRange ? 'text-red-600 font-semibold' : ''}>
                                {result.value}
                              </span>
                              {result.units && <span className="text-gray-500"> {result.units}</span>}
                            </p>
                            {result.referenceRange && (
                              <p className="text-gray-500 text-[9px]">Ref: {result.referenceRange}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-3">No test results found</p>
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
          // Trigger iframe print - handled by BarcodeModal component
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
        
        // Now print the barcodes after status update using generateCompactBarcodePrintHtml
        setTimeout(() => {
          console.log('📄 Status updated, now printing barcodes with proper format...');
          
          // Filter only selected barcodes
          const selectedBarcodeLabels = Array.from(selectedBarcodeIndices)
            .map(idx => barcodeLabels[idx])
            .filter(label => label !== undefined);
          
          if (selectedBarcodeLabels.length === 0) {
            console.error('No selected barcodes to print');
            return;
          }
          
          // Generate print HTML using the same function as Print Only button
          const printHtml = generateCompactBarcodePrintHtml(
            selectedBarcodeLabels.map(label => ({
              barcodeValue: label.barcodeValue,
              specimen: label.specimen,
              shortNamesStr: label.shortNamesStr,
              dateStr: label.dateStr,
              timeStr: label.timeStr,
              organizationCode: label.organizationCode
            })),
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
          
          // Use iframe to print with proper formatting
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
          
          if (iframe.contentDocument) {
            iframe.contentDocument.open();
            iframe.contentDocument.write(printHtml);
            iframe.contentDocument.close();
            
            setTimeout(() => {
              iframe.contentWindow?.print();
              // Remove iframe after printing
              setTimeout(() => {
                document.body.removeChild(iframe);
              }, 500);
            }, 300);
          }
          
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
        }, 500);
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

      {/* Test Selection Modal - for No Page Break option */}
      {showTestSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Select Tests for Continuous Print</h2>
            <p className="text-sm text-gray-600 mb-4">Choose which tests to include and their order. Tests will print continuously on the same page with line separators.</p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 max-h-[400px] overflow-y-auto">
              {testSelectionData.map((test, idx) => (
                <div key={test.testId} className="flex items-center gap-3 p-2 mb-2 bg-white rounded border border-gray-200 hover:bg-blue-50">
                  <input
                    type="checkbox"
                    id={`test-${test.testId}`}
                    checked={test.selected}
                    onChange={(e) => {
                      const updated = [...testSelectionData];
                      updated[idx].selected = e.target.checked;
                      setTestSelectionData(updated);
                    }}
                    className="accent-cyan-600 cursor-pointer"
                  />
                  <label htmlFor={`test-${test.testId}`} className="flex-1 cursor-pointer">
                    <div className="font-semibold text-gray-800">{test.testName}</div>
                    {test.shortName && <div className="text-xs text-gray-600">{test.shortName}</div>}
                  </label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (idx > 0) {
                          const updated = [...testSelectionData];
                          [updated[idx], updated[idx - 1]] = [updated[idx - 1], updated[idx]];
                          updated[idx].order = idx;
                          updated[idx - 1].order = idx - 1;
                          setTestSelectionData(updated);
                        }
                      }}
                      disabled={idx === 0}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded text-xs font-semibold transition-colors"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => {
                        if (idx < testSelectionData.length - 1) {
                          const updated = [...testSelectionData];
                          [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                          updated[idx].order = idx;
                          updated[idx + 1].order = idx + 1;
                          setTestSelectionData(updated);
                        }
                      }}
                      disabled={idx === testSelectionData.length - 1}
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded text-xs font-semibold transition-colors"
                      title="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTestSelectionModal(false);
                  setTestSelectionData([]);
                  setTestSelectionOrder([]);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const selectedTests = testSelectionData.filter(t => t.selected);
                  if (selectedTests.length === 0) {
                    alert('Please select at least one test');
                    return;
                  }
                  
                  try {
                    setLoading(true);
                    // Fetch full test data for selected tests
                    const responses = await Promise.all(
                      selectedTests.map(t => getPatientTestById(t.testId))
                    );
                    
                    // Prepare test data for comment modal
                    const testsForComments = responses.map(r => ({
                      test_id: r.patientTest.test.id,
                      test_name: r.patientTest.test.name
                    }));

                    // Store responses and show comments modal
                    setPendingCommentsResponses(responses);
                    setPendingTestsForComments(testsForComments);
                    setShowPerTestCommentsModal(true);
                    setShowTestSelectionModal(false);
                    setTestSelectionData([]);
                    setTestSelectionOrder([]);
                  } catch (err) {
                    console.error('Error loading report:', err);
                    alert('Error: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || testSelectionData.filter(t => t.selected).length === 0}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Print Continuous'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Options Modal - Page Break vs No Page Break */}
      {showPrintOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Print Options</h2>
            <p className="text-sm text-gray-600 mb-6">You have selected multiple tests. How would you like to print them?</p>
            
            <div className="space-y-3 mb-6">
              {/* Option 1: Page Break */}
              <label className="flex items-start gap-3 p-3 border-2 border-cyan-200 rounded-lg cursor-pointer hover:bg-cyan-50 transition-colors" onClick={() => setPrintOption('pagebreak')}>
                <input
                  type="radio"
                  name="printOption"
                  value="pagebreak"
                  checked={printOption === 'pagebreak'}
                  onChange={() => setPrintOption('pagebreak')}
                  className="mt-1 accent-cyan-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Each report on separate page</div>
                  <div className="text-xs text-gray-600 mt-1">Each test report will start on a new page with proper headers and formatting</div>
                </div>
              </label>

              {/* Option 2: No Page Break */}
              <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setPrintOption('nobreak')}>
                <input
                  type="radio"
                  name="printOption"
                  value="nobreak"
                  checked={printOption === 'nobreak'}
                  onChange={() => setPrintOption('nobreak')}
                  className="mt-1 accent-cyan-600"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Continuous on same page</div>
                  <div className="text-xs text-gray-600 mt-1">All test reports will be continuous with line separators between them (no page breaks)</div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPrintOptionsModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => proceedWithPrint(printOption)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Print'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Selection Modal - for Continuous on same page option */}
      <TestSelectionModal
        isOpen={showTestSelectionModal}
        tests={testSelectionData}
        onConfirm={handleTestSelectionConfirm}
        onCancel={() => {
          setShowTestSelectionModal(false);
          setPendingPrintTests([]);
          setTestSelectionData([]);
        }}
        loading={loading}
      />

      
    </>
  );
}
