"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Share2, Loader, Download as PrintIcon } from "lucide-react";
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
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const visitId = searchParams.get("visitId");

        if (!visitId) {
          setError("Invalid report parameters - missing Visit ID");
          setLoading(false);
          return;
        }

        console.log("📊 Fetching report data for visitId:", visitId);

        // Fetch complete report data from new QR scan endpoint
        const response = await fetch(
          `${API_BASE_URL}/result/qr-scan/${encodeURIComponent(visitId)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const apiResponse = await response.json();
        console.log("📊 API Response:", apiResponse);

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
        console.error("Error processing report:", err);
        setError(`Failed to load report: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold">Loading professional report...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-2xl mx-auto p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-800 mb-2">Error Loading Report</h1>
            <p className="text-red-700">{error || "Unable to load report data"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 px-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                <Download size={18} />
                Print / PDF
              </button>
              {navigator.share && (
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  <Share2 size={18} />
                  Share
                </button>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Professional Test Report
            </h1>
            <p className="text-gray-600 mt-1">
              Visit ID: <span className="font-mono font-semibold">{reportData.visitId}</span>
            </p>
          </div>
        </div>

        {/* Professional Report Component */}
        <div className="bg-white rounded-lg shadow p-4">
          <div ref={reportRef} className="professional-report">
            {reportData.combinedTests && reportData.combinedTests.length > 0 && (
              <ProfessionalReport
                patient={reportData.patientInfo}
                visitId={reportData.visitId}
                visitDate={reportData.visitDate}
                test={reportData.combinedTests[0]}
                combinedTests={reportData.combinedTests}
                results={reportData.results}
                signature={reportData.signature}
                letterhead={reportData.letterhead}
                printOption="pagebreak"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          <p className="mb-2">
            © {new Date().getFullYear()} Shraddha Pathology Laboratory
          </p>
          <p>This is a professional test report scanned via QR code.</p>
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
          }
          .max-w-4xl {
            max-width: 100%;
          }
          .px-4 {
            padding: 0;
          }
          .mb-4 {
            margin-bottom: 0;
          }
          .mt-6 {
            margin-top: 0;
          }
          button,
          .flex items-center justify-between {
            display: none;
          }
          .bg-white {
            background: white;
            box-shadow: none;
          }
          .professional-report {
            margin: 0;
            padding: 0;
          }
        }

        @media screen {
          .professional-report {
            background: #f9f9f9;
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
}
