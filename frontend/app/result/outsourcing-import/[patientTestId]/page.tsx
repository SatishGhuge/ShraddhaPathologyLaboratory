"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Upload, ArrowLeft, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import Header from "@/src/components/Header";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const OutsourcingImport = () => {
  const router = useRouter();
  const { patientTestId } = useParams();

  const [patientTest, setPatientTest] = useState<any>(null);
  const [outsourcingLabs, setOutsourcingLabs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fetch patient test and labs
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📥 Fetching patient test:', patientTestId);
        
        const testResponse = await fetch(`${API_BASE_URL}/results/${patientTestId}`);
        const testResult = await testResponse.json();
        
        console.log('📥 Test response:', testResult);
        
        if (testResult.success && testResult.data) {
          console.log('✅ Patient test loaded:', testResult.data.patientTest);
          setPatientTest(testResult.data.patientTest);
        } else {
          console.error('❌ Failed to load patient test:', testResult.message);
          setError('Failed to load patient test details: ' + (testResult.message || 'Unknown error'));
        }

        // Get outsourcing labs
        const labsResponse = await fetch(`${API_BASE_URL}/master/outsourcing`);
        const labsResult = await labsResponse.json();
        
        console.log('📥 Labs response:', labsResult);
        
        if (labsResult.success && labsResult.data) {
          console.log('✅ Labs loaded:', labsResult.data.length, 'labs');
          setOutsourcingLabs(labsResult.data);
        }
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Failed to load data: ' + err.message);
      }
    };

    if (patientTestId) {
      fetchData();
    }
  }, [patientTestId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportFile(file);
      setError("");
      handleExtractData(file);
    }
  };

  const handleTestToggle = (index: number) => {
    setSelectedTests(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSelectAllTests = () => {
    if (selectedTests.length === extractedData?.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(extractedData?.map((_: any, idx: number) => idx) || []);
    }
  };

  const handleExtractData = async (file: File) => {
    if (!selectedLab) {
      setError("Please select lab first");
      return;
    }

    setLoading(true);
    setError("");
    try {
      console.log('📤 Calling extract endpoint with PDF file...');
      
      const formData = new FormData();
      formData.append('reportFile', file);
      formData.append('patientTestId', String(patientTestId));
      formData.append('outsourcingLabId', String(selectedLab));

      const response = await fetch(`${API_BASE_URL}/master/outsourcing-reports/extract`, {
        method: 'POST',
        body: formData
      });

      console.log('📥 Extract response status:', response.status);
      const result = await response.json();
      console.log('📥 Extract response:', result);

      if (result.success && result.data) {
        console.log('✅ Extracted', result.data.length, 'rows');
        setExtractedData(result.data);
        setSuccess(false); // Clear success message when new data extracted
      } else {
        setError(result.message || 'Failed to extract data from PDF');
        setExtractedData(null);
      }
    } catch (err) {
      console.error('❌ Extract error:', err);
      setError('Failed to extract: ' + (err instanceof Error ? err.message : String(err)));
      setExtractedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!extractedData || !selectedLab || selectedTests.length === 0) {
      setError("Please select at least one test to import");
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Marking test as imported (no data storage)...');
      console.log('📋 Selected tests indices:', selectedTests);
      
      // Filter data based on selected tests
      const selectedData = selectedTests.map(idx => extractedData[idx]);
      console.log('📋 Selected tests data:', selectedData);
      
      const response = await fetch(`${API_BASE_URL}/master/outsourcing-reports/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientTestId: String(patientTestId),
          outsourcingLabId: String(selectedLab),
          selectedTests: selectedData  // Pass selected test data
        })
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        console.log('✅ Test marked as imported, redirecting to result page...');
        setTimeout(() => {
          router.push(`/result`);
        }, 2000);
      } else {
        setError(result.message || 'Failed to import');
      }
    } catch (err) {
      console.error('❌ Import error:', err);
      setError('Failed to import: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (!patientTest) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <Loader size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="p-6 min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Upload size={24} />
                Import Outsourcing Report
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Patient Test: {patientTest?.test?.name}
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 p-3 rounded mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              Report imported successfully! Redirecting...
            </div>
          )}

          {/* Step 1: Select Lab */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="font-bold text-lg mb-3 text-blue-900">Step 1: Select Outsourcing Lab</h2>
            <select
              value={selectedLab}
              onChange={(e) => setSelectedLab(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Select Lab --</option>
              {outsourcingLabs.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  {lab.labName} ({lab.code})
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Upload Report */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h2 className="font-bold text-lg mb-3 text-purple-900">Step 2: Upload Lab Report PDF</h2>
            <div 
              className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-500 transition cursor-pointer"
              onClick={() => document.getElementById('reportFile')?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-purple-500', 'bg-purple-100');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('border-purple-500', 'bg-purple-100');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-purple-500', 'bg-purple-100');
                const files = e.dataTransfer.files;
                if (files?.length > 0) {
                  const file = files[0];
                  if (file.type === 'application/pdf') {
                    handleFileChange({ target: { files } } as any);
                  } else {
                    alert('Please upload a PDF file');
                  }
                }
              }}
            >
              <FileText size={40} className="mx-auto text-purple-400 mb-2" />
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="reportFile"
              />
              <p className="text-sm text-gray-700">
                {reportFile ? (
                  <span className="text-green-600 font-semibold">✅ {reportFile.name}</span>
                ) : (
                  <>Click to upload or drag PDF file here</>
                )}
              </p>
            </div>
          </div>

          {/* Step 3: Preview & Save */}
          {extractedData && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h2 className="font-bold text-lg mb-3 text-yellow-900">Step 3: Select Tests to Print & Save</h2>
              
              {/* Test Selection */}
              <div className="mb-4 p-3 bg-white rounded border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Available Tests ({extractedData.length})</h3>
                  <button
                    onClick={handleSelectAllTests}
                    className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    {selectedTests.length === extractedData.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {extractedData.map((test: any, idx: number) => (
                    <label key={idx} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTests.includes(idx)}
                        onChange={() => handleTestToggle(idx)}
                        className="w-4 h-4 text-orange-500 rounded"
                      />
                      <span className="text-sm text-gray-700">{test.name || test.parameterName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-4">
                ✅ {selectedTests.length > 0 ? `${selectedTests.length} test(s) selected` : 'Select at least one test'} to print.
              </p>
              
              <button
                onClick={handleSaveReport}
                disabled={loading || selectedTests.length === 0}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                Save & Import Selected Tests
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OutsourcingImport;
