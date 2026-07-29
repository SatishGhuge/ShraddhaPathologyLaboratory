"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Upload, ArrowLeft, FileText, CheckCircle, AlertCircle, Loader, Plus, Trash2, X, ArrowRight } from "lucide-react";
import Header from "@/src/components/Header";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const OutsourcingImport = () => {
  const router = useRouter();
  const { patientTestId } = useParams();

  const [patientTest, setPatientTest] = useState<any>(null);
  const [outsourcingLabs, setOutsourcingLabs] = useState<any[]>([]);
  const [selectedLab, setSelectedLab] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [manualTests, setManualTests] = useState<any[]>([]);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showStep3Modal, setShowStep3Modal] = useState(false);

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
      // Create PDF preview URL
      const url = URL.createObjectURL(file);
      setPdfPreviewUrl(url);
      // Reset manual tests when new file selected
      setManualTests([]);
      setSelectedTests([]);
    }
  };

  const handleAddTest = () => {
    setManualTests([...manualTests, {
      id: manualTests.length,
      name: '',
      parameterName: '',
      value: '',
      result: '',
      unit: '',
      units: '',
      referenceRange: '',
      range: '',
      interpretation: ''
    }]);
  };

  const handleRemoveTest = (index: number) => {
    const updated = manualTests.filter((_, i) => i !== index);
    setManualTests(updated);
    setSelectedTests(selectedTests.filter(i => i !== index));
  };

  const handleTestChange = (index: number, field: string, value: string) => {
    const updated = [...manualTests];
    updated[index] = {
      ...updated[index],
      [field]: value,
      // Keep name and parameterName in sync
      ...(field === 'name' && { parameterName: value }),
      ...(field === 'value' && { result: value }),
      ...(field === 'unit' && { units: value }),
      ...(field === 'referenceRange' && { range: value })
    };
    setManualTests(updated);
  };

  const handleTestToggle = (index: number) => {
    setSelectedTests(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSaveReport = async () => {
    if (!selectedLab || manualTests.length === 0 || selectedTests.length === 0) {
      setError("Please select a lab, add tests, and select at least one test to import");
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Saving manual test entries...');
      console.log('📋 Selected tests indices:', selectedTests);
      
      // Filter data based on selected tests
      const selectedData = selectedTests.map(idx => manualTests[idx]);
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
        console.log('✅ Tests imported successfully, redirecting to result page...');
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

          {/* Step 3: Continue Button */}
          {reportFile && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h2 className="font-bold text-lg mb-3 text-green-900">Step 3: Enter Test Results</h2>
              <p className="text-sm text-gray-700 mb-4">
                You can now proceed to enter the lab test results. The PDF preview and test entry form will open in full screen.
              </p>
              <button
                onClick={() => setShowStep3Modal(true)}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ArrowRight size={20} />
                Continue to Step 3 - Enter Test Results
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Step 3 Modal - PDF + Test Entry Form */}
      {showStep3Modal && pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0">
          <div className="bg-white w-full h-screen flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h1 className="text-xl font-bold text-gray-800">Step 3: Enter Lab Test Results</h1>
              <button
                onClick={() => setShowStep3Modal(false)}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold leading-none"
                title="Close"
              >
                <X size={32} />
              </button>
            </div>

            {/* Modal Body - Two Column Layout */}
            <div className="flex-1 overflow-hidden flex gap-0">
              {/* Left: PDF Preview - 50% width, Single Page with Scroll */}
              <div className="w-1/2 border-r bg-gray-100 p-4 flex flex-col overflow-hidden">
                <h2 className="font-bold text-lg text-gray-800 mb-3 flex-shrink-0">📄 Lab Report PDF</h2>
                <div className="flex-1 bg-white rounded overflow-hidden shadow">
                  <iframe
                    src={pdfPreviewUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                    title="PDF Preview"
                  />
                </div>
              </div>

              {/* Right: Test Entry Form - 50% width */}
              <div className="w-1/2 overflow-auto p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg text-gray-800">🔬 Test Results ({manualTests.length})</h2>
                  <button
                    onClick={handleAddTest}
                    className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded flex items-center gap-1 font-semibold"
                  >
                    <Plus size={16} />
                    Add Test
                  </button>
                </div>

                {/* Tests List */}
                {manualTests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No tests added yet.</p>
                    <p className="text-sm">Click "Add Test" to start entering results from the PDF.</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {manualTests.map((test, idx) => (
                      <div
                        key={test.id}
                        className={`p-4 rounded-lg border-2 transition ${
                          selectedTests.includes(idx)
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-300 bg-gray-50 hover:border-orange-300'
                        }`}
                      >
                        {/* Checkbox + Delete */}
                        <div className="flex items-start justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTests.includes(idx)}
                              onChange={() => handleTestToggle(idx)}
                              className="w-5 h-5 text-orange-500 rounded"
                            />
                            <span className="text-sm font-semibold text-gray-700">Select for Import</span>
                          </label>
                          <button
                            onClick={() => handleRemoveTest(idx)}
                            className="text-red-500 hover:text-red-700 font-bold"
                            title="Remove test"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Test Name *</label>
                            <input
                              type="text"
                              placeholder="e.g., Total Protein"
                              value={test.name}
                              onChange={(e) => handleTestChange(idx, 'name', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-semibold text-gray-700 block mb-1">Result Value *</label>
                              <input
                                type="text"
                                placeholder="e.g., 7.2"
                                value={test.value}
                                onChange={(e) => handleTestChange(idx, 'value', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-gray-700 block mb-1">Unit *</label>
                              <input
                                type="text"
                                placeholder="e.g., g/dL"
                                value={test.unit}
                                onChange={(e) => handleTestChange(idx, 'unit', e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Reference Range *</label>
                            <input
                              type="text"
                              placeholder="e.g., 6.0-8.3"
                              value={test.referenceRange}
                              onChange={(e) => handleTestChange(idx, 'referenceRange', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-700 block mb-1">Interpretation (Optional)</label>
                            <textarea
                              placeholder="Copy interpretation from PDF..."
                              value={test.interpretation}
                              onChange={(e) => handleTestChange(idx, 'interpretation', e.target.value)}
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save Button - Sticky at bottom */}
                <div className="border-t pt-4 mt-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">
                      <span className="font-bold text-orange-600">{selectedTests.length}</span> of{' '}
                      <span className="font-bold">{manualTests.length}</span> tests selected for import
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedTests.length > 0 ? '✅ Ready to import' : '⚠️ Select at least one test'}
                    </p>
                  </div>

                  <button
                    onClick={handleSaveReport}
                    disabled={loading || manualTests.length === 0 || selectedTests.length === 0}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 rounded font-semibold flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                    {loading ? 'Importing...' : 'Save & Import Selected Tests'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OutsourcingImport;
