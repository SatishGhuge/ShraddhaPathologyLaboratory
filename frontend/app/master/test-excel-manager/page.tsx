'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Upload, AlertCircle, CheckCircle, XCircle, Loader, ChevronLeft } from 'lucide-react';
import API_BASE_URL from '@/src/api/config';

interface ImportResult {
  created: { tests: number; parameters: number; categories: number };
  updated: { tests: number; parameters: number; categories: number };
  errors: string[];
  warnings: string[];
  totalErrors: number;
  totalWarnings: number;
  summary: string;
}

export default function TestExcelManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preValidationErrors, setPreValidationErrors] = useState<string[]>([]);
  const [preValidationWarnings, setPreValidationWarnings] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const router = useRouter();

  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      console.log('📥 Starting export...');

      const response = await fetch(`${API_BASE_URL}/master/tests/export`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export tests');
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tests_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ Export successful');
      alert('✅ Tests exported successfully!');
    } catch (error) {
      console.error('❌ Export error:', error);
      alert('❌ Failed to export tests: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.name.endsWith('.xlsx')) {
        alert('⚠️ Please select an Excel file (.xlsx)');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
      setPreValidationErrors([]);
      setPreValidationWarnings([]);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!file) {
      alert('⚠️ Please select a file first');
      return;
    }

    try {
      setIsImporting(true);
      console.log('📤 Starting import...');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/master/tests/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setPreValidationErrors(data.data?.errors || [data.message]);
        setPreValidationWarnings(data.data?.warnings || []);
        console.error('❌ Import validation failed:', data);
        return;
      }

      console.log('✅ Import successful:', data);
      setImportResult(data.data);
      setPreValidationErrors([]);
      setShowSuccess(true);

      // Clear success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);

      // Reset file after successful import
      setFile(null);
      if (e.target) (e.target as HTMLInputElement).value = '';
    } catch (error) {
      console.error('❌ Import error:', error);
      setPreValidationErrors([(error as Error).message]);
    } finally {
      setIsImporting(false);
    }
  };

  const e = {} as any;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Title and Description */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Test Excel Manager</h1>
          <p className="text-gray-600 mt-2">Export and import tests with parameters and categories</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* EXPORT SECTION */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Export Tests</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Download all tests with their parameters and categories as an Excel file. The file will contain three sheets:
              Tests, Parameters, and Categories.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Includes:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ All test details (name, code, department, sample type, etc.)</li>
                <li>✓ Test parameters with reference ranges</li>
                <li>✓ Test categories</li>
                <li>✓ Formatted headers with colors</li>
              </ul>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Export Tests to Excel
                </>
              )}
            </button>
          </div>

          {/* IMPORT SECTION */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <Upload className="text-green-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-900">Import Tests</h2>
            </div>

            <p className="text-gray-600 mb-6">
              Upload an Excel file to import tests with their parameters and categories. You can create new tests or update existing ones.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-900 mb-2">Requirements:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ Excel file (.xlsx format)</li>
                <li>✓ Must contain "Tests" sheet</li>
                <li>✓ Departments must exist in system</li>
                <li>✓ Valid data format (Yes/No for booleans)</li>
              </ul>
            </div>

            {/* File Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Excel File
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-600 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-600 hover:file:bg-green-100"
                />
              </div>
              {file && (
                <p className="text-sm text-green-600 mt-2 font-semibold">
                  ✓ Selected: {file.name}
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={isImporting || !file}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Import Tests from Excel
                </>
              )}
            </button>
          </div>
        </div>

        {/* SUCCESS MESSAGE */}
        {showSuccess && importResult && (
          <div className="mt-8 bg-green-50 border-2 border-green-500 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="text-green-600" size={24} />
              <h3 className="text-xl font-bold text-green-900">✅ Import Successful!</h3>
            </div>
            <p className="text-green-800 mb-4">{importResult.summary}</p>
          </div>
        )}

        {/* ERROR MESSAGES */}
        {preValidationErrors.length > 0 && (
          <div className="mt-8 bg-red-50 border-2 border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="text-red-600" size={24} />
              <h3 className="text-xl font-bold text-red-900">Errors ({preValidationErrors.length})</h3>
            </div>
            <ul className="space-y-2">
              {preValidationErrors.slice(0, 10).map((error, idx) => (
                <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-600 font-bold">•</span>
                  {error}
                </li>
              ))}
            </ul>
            {preValidationErrors.length > 10 && (
              <p className="text-sm text-red-700 mt-3 font-semibold">
                ... and {preValidationErrors.length - 10} more errors
              </p>
            )}
          </div>
        )}

        {/* WARNING MESSAGES */}
        {preValidationWarnings.length > 0 && (
          <div className="mt-8 bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="text-yellow-600" size={24} />
              <h3 className="text-xl font-bold text-yellow-900">Warnings ({preValidationWarnings.length})</h3>
            </div>
            <ul className="space-y-2">
              {preValidationWarnings.slice(0, 10).map((warning, idx) => (
                <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">⚠</span>
                  {warning}
                </li>
              ))}
            </ul>
            {preValidationWarnings.length > 10 && (
              <p className="text-sm text-yellow-700 mt-3 font-semibold">
                ... and {preValidationWarnings.length - 10} more warnings
              </p>
            )}
          </div>
        )}

        {/* IMPORT RESULTS */}
        {importResult && !preValidationErrors.length && (
          <div className="mt-8 bg-blue-50 border-2 border-blue-500 rounded-lg p-6">
            <h3 className="text-xl font-bold text-blue-900 mb-4">📊 Import Results</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Tests Created</p>
                <p className="text-2xl font-bold text-green-600">{importResult.created.tests}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Parameters Created</p>
                <p className="text-2xl font-bold text-green-600">{importResult.created.parameters}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Categories Created</p>
                <p className="text-2xl font-bold text-green-600">{importResult.created.categories}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Tests Updated</p>
                <p className="text-2xl font-bold text-blue-600">{importResult.updated.tests}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Parameters Updated</p>
                <p className="text-2xl font-bold text-blue-600">{importResult.updated.parameters}</p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Categories Updated</p>
                <p className="text-2xl font-bold text-blue-600">{importResult.updated.categories}</p>
              </div>
            </div>
          </div>
        )}

        {/* INFO BOX */}
        <div className="mt-8 bg-gray-100 border border-gray-300 rounded-lg p-6">
          <h3 className="font-bold text-gray-900 mb-3">💡 Tips:</h3>
          <ul className="text-gray-700 space-y-2 text-sm">
            <li>• Export the current tests to use as a template for importing new tests</li>
            <li>• Use "Yes" or "No" for boolean fields (isNABL, profileTest, isHeader, etc.)</li>
            <li>• Make sure all referenced departments exist in the system</li>
            <li>• Parameters and Categories sheets are optional for import</li>
            <li>• Duplicate tests (same name + department) will be updated, not created</li>
            <li>• All errors must be fixed before import; warnings can be ignored</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
