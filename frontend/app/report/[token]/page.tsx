'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import DOMPurify from 'dompurify';
import { AlertCircle, CheckCircle, Download, Printer, RefreshCw } from 'lucide-react';
import ProfessionalReport from '@/app/components/ProfessionalReport';

interface ReportData {
  report: {
    patientTestId: number;
    patientId: string;
    visitId: string;
    testName: string;
    testId: number;
    status: string;
    visitDate: string;
    sampleBarcodeNo: string;
    referralDoctor: string;
    department: string;
    sampleType: string;
    patientHistory: string;
    comments: string;
  };
  patient: {
    patientId: string;
    firstName: string;
    lastName: string;
    dob: string;
    age: number;
    ageMonths: number;
    ageDays: number;
    gender: string;
    mobile: string;
    email: string;
    address: string;
  };
  results: Array<{
    resultId: number;
    parameterId: number;
    parameterName: string;
    categoryName: string;
    numericValue: string;
    textValue: string;
    selectedOption: string;
    isHighlighted: boolean;
    enteredAt: string;
    verifiedAt: string;
    unit: any;
  }>;
  tokenInfo: {
    accessCount: number;
    lastAccessedAt: string;
    createdAt: string;
    expiresAt: string | null;
  };
  verified: boolean;
  verificationBadge: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
}

export default function ReportQRViewPage() {
  const params = useParams();
  const token = params?.token as string;

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Validate token and fetch report data
  useEffect(() => {
    const validateAndFetchReport = async () => {
      if (!token) {
        setError('Invalid QR code: Token not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/report-qr/validate/${token}`,
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          setReportData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to validate report');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load report';
        setError(errorMessage);
        console.error('Report validation error:', err);
      } finally {
        setLoading(false);
      }
    };

    validateAndFetchReport();
  }, [token]);

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    if (!reportData) return;

    try {
      // This will be implemented with html2pdf
      const element = document.getElementById('report-content');
      if (!element) {
        alert('Report content not found');
        return;
      }

      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 10,
        filename: `Report-${reportData.report.patientTestId}-${reportData.patient.patientId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download PDF');
    }
  }, [reportData]);

  // Handle print
  const handlePrint = useCallback(() => {
    if (!reportData) return;
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  }, [reportData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your verified report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={32} />
            <h1 className="text-2xl font-bold">Invalid QR Code</h1>
          </div>
          <p className="text-gray-600 mb-6">{DOMPurify.sanitize(error)}</p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Possible reasons:</p>
            <ul className="list-disc list-inside">
              <li>The QR code has expired</li>
              <li>The QR code has been disabled</li>
              <li>The QR code is invalid or corrupted</li>
              <li>The report is not yet available</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-600">No report data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Verification Badge */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 border-2 border-green-500 rounded-full p-2">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {reportData.verificationBadge}
                </h1>
                <p className="text-sm text-gray-600">
                  Patient: {reportData.patient.firstName} {reportData.patient.lastName}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={handleDownloadPDF}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Download size={18} />
                Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                <Printer size={18} />
                Print
              </button>
              <button
                onClick={() => setShowTokenInfo(!showTokenInfo)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Info
              </button>
            </div>
          </div>

          {/* Token Info Section */}
          {showTokenInfo && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">QR Code Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Access Count:</span> {reportData.tokenInfo.accessCount}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(reportData.tokenInfo.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Accessed:</span>{' '}
                  {reportData.tokenInfo.lastAccessedAt
                    ? new Date(reportData.tokenInfo.lastAccessedAt).toLocaleString()
                    : 'Not accessed yet'}
                </div>
                <div>
                  <span className="font-medium">Expires:</span>{' '}
                  {reportData.tokenInfo.expiresAt
                    ? new Date(reportData.tokenInfo.expiresAt).toLocaleString()
                    : 'No expiration'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div id="report-content" className="max-w-7xl mx-auto p-4 print:p-0 print:m-0">
        <div className={isPrinting ? 'print:block' : ''}>
          <ProfessionalReport
            patientInfo={{
              patientId: reportData.patient.patientId,
              firstName: reportData.patient.firstName,
              lastName: reportData.patient.lastName,
              dob: reportData.patient.dob,
              age: reportData.patient.age,
              ageMonths: reportData.patient.ageMonths,
              ageDays: reportData.patient.ageDays,
              gender: reportData.patient.gender,
              mobile: reportData.patient.mobile,
              email: reportData.patient.email,
              address: reportData.patient.address
            }}
            visitInfo={{
              visitId: reportData.report.visitId,
              visitDate: reportData.report.visitDate,
              testName: reportData.report.testName,
              testId: reportData.report.testId,
              sampleBarcodeNo: reportData.report.sampleBarcodeNo,
              referralDoctor: reportData.report.referralDoctor,
              department: reportData.report.department,
              sampleType: reportData.report.sampleType,
              patientHistory: reportData.report.patientHistory,
              comments: reportData.report.comments
            }}
            testResults={reportData.results}
            isVerified={true}
            verificationBadge={reportData.verificationBadge}
            qrTokenInfo={reportData.tokenInfo}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 border-t border-gray-200 mt-8 py-4 print:hidden">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>This is a verified report accessed via secure QR code. For official use only.</p>
          <p className="mt-1">
            Report ID: {reportData.report.patientTestId} | Generated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
