"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Share2, Loader, Printer, FileDown } from "lucide-react";
import API_BASE_URL from "@/src/api/config";
import dynamic from "next/dynamic";

// Dynamically import ProfessionalReport to avoid SSR issues
const ProfessionalReport = dynamic(
  () => import("@/app/components/ProfessionalReport"),
  { ssr: false, loading: () => <div>Loading report...</div> }
);

interface PatientInfo {
  title?: string;
  firstName?: string;
  lastName?: string;
  age?: number | string;
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  gender?: string;
  organizationName?: string;
}

interface ReportData {
  visitId: string;
  patientName: string;
  visitDate: string;
  patientInfo: PatientInfo;
  combinedTests: any[];
  results: Record<string, any>;
  signature?: any;
  letterhead?: any;
}

export default function ReportViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const reportRef = useRef<HTMLDivElement>(null);

  // Handle PDF download - Optimized for mobile
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = reportRef.current;
      
      const fileName = `Report-${reportData?.visitId}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      const opt = {
        margin: [8, 8, 8, 8],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      // Generate and download PDF
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          console.log('✅ PDF downloaded successfully');
        })
        .catch((err: any) => {
          console.error('Error downloading PDF:', err);
          alert('Failed to download PDF. Please try again.');
        });
    } catch (err) {
      console.error('Error in PDF download:', err);
      alert('PDF download failed. Make sure you have a stable internet connection.');
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const visitId = searchParams.get("visitId");
        
        const debugLog = `
        🔍 Report View Debug Info:
        - Current URL: ${window.location.href}
        - Search Params: ${searchParams.toString()}
        - Visit ID: ${visitId}
        - API Base URL: ${API_BASE_URL}
        `;
        
        console.log(debugLog);
        setDebugInfo(debugLog);

        if (!visitId) {
          const errorMsg = "Invalid report parameters - missing Visit ID";
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }

        console.log("📊 Fetching report data for visitId:", visitId);

        // Fetch complete report data from new QR scan endpoint
        const apiUrl = `${API_BASE_URL}/results/qr-scan/${encodeURIComponent(visitId)}`;
        console.log("🌐 Calling API:", apiUrl);
        
        const response = await fetch(apiUrl);

        console.log("📡 API Response Status:", response.status);
        console.log("📡 API Response Headers:", response.headers);

        if (!response.ok) {
          const responseText = await response.text();
          console.error("❌ API Error Response:", responseText);
          throw new Error(`HTTP ${response.status} - ${responseText.substring(0, 100)}`);
        }

        const apiResponse = await response.json();
        console.log("✅ API Response:", apiResponse);

        if (!apiResponse.success || !apiResponse.data) {
          setError("Failed to load report data. Please try again.");
          setLoading(false);
          return;
        }

        const reportDataFromApi = apiResponse.data;

        setReportData({
          visitId: reportDataFromApi.visitId || "",
          patientName: reportDataFromApi.patientName,
          visitDate: reportDataFromApi.visitDate || new Date().toISOString(),
          patientInfo: reportDataFromApi.patientInfo,
          combinedTests: reportDataFromApi.combinedTests || [],
          results: reportDataFromApi.results || {},
          signature: reportDataFromApi.signature,
          letterhead: reportDataFromApi.letterhead,
        });

        setLoading(false);
      } catch (err) {
        console.error("❌ Error processing report:", err);
        const errorMsg = `Failed to load report: ${err instanceof Error ? err.message : 'Unknown error'}`;
        setError(errorMsg);
        setDebugInfo(prev => prev + `\n\n❌ Error: ${errorMsg}`);
        setLoading(false);
      }
    };

    fetchReportData();
  }, [searchParams]);

  const handleShare = async () => {
    if (navigator.share && reportData) {
      try {
        await navigator.share({
          title: `Test Report - ${reportData.visitId}`,
          text: `Visit ID: ${reportData.visitId}\nPatient: ${reportData.patientName}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading professional report...</p>
          <pre className="text-xs text-gray-500 mt-4 text-left bg-gray-100 p-2 rounded overflow-auto max-h-48 break-words">
            {debugInfo}
          </pre>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Report</h1>
            <p className="text-red-700 mb-4">{error || "Unable to load report data"}</p>
            <pre className="text-xs text-red-600 bg-red-100 p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap break-words">
              {debugInfo}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32 print:pb-0">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm sm:text-base"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            
            {/* Report Info */}
            <div className="text-sm text-right">
              <p className="text-gray-700 font-semibold">
                {reportData.patientName}
              </p>
              <p className="text-gray-600 text-xs">
                ID: {reportData.visitId}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Report Component - Clean, no header */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
        <div 
          ref={reportRef} 
          className="bg-white rounded-lg shadow-md p-3 sm:p-6 print:rounded-none print:shadow-none print:p-0"
          style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as any}
        >
          {reportData.combinedTests && reportData.combinedTests.length > 0 && (
            <ProfessionalReport
              patient={reportData.patientInfo}
              visitId={reportData.visitId}
              visitDate={reportData.visitDate}
              test={reportData.combinedTests[0]}
              combinedTests={reportData.combinedTests}
              results={reportData.results}
              signature={reportData.signature}
              letterhead={undefined}
              letterHeadBase64={undefined}
              printOption="pagebreak"
              forceShowReferenceRange={true}
            />
          )}
        </div>
      </div>

      {/* Fixed Footer with Buttons - Only visible on screen, not on print */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 flex gap-2 flex-wrap justify-center">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex-1 sm:flex-none"
            title="Download PDF"
          >
            <FileDown size={18} />
            Download PDF
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex-1 sm:flex-none"
            title="Print report"
          >
            <Printer size={18} />
            Print
          </button>

          {navigator.share && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition text-sm flex-1 sm:flex-none"
              title="Share report"
            >
              <Share2 size={18} />
              Share
            </button>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          
          .min-h-screen {
            min-height: auto;
            padding-bottom: 0 !important;
          }
          
          .max-w-7xl {
            max-width: 100%;
          }
          
          .px-2, .px-4, .px-6 {
            padding-left: 0;
            padding-right: 0;
          }
          
          .py-3, .py-4 {
            padding-top: 0;
            padding-bottom: 0;
          }
          
          /* Hide interactive elements when printing */
          button,
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure report prints properly */
          .bg-white {
            background: white !important;
          }
          
          .rounded-lg {
            border-radius: 0 !important;
          }
          
          .shadow-md {
            box-shadow: none !important;
          }
          
          /* Ensure tables and text are readable */
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          /* Hide header on print */
          .sticky {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
