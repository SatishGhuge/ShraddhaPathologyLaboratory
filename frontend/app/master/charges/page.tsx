"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { DollarSign, RotateCcw, FileSpreadsheet, FileText, Upload } from "lucide-react";

export default function AddLabCharges() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [error, setError] = useState("");
  const [bulkCharge, setBulkCharge] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch tests and charges on component mount
  useEffect(() => {
    fetchTestsAndCharges();
  }, []);

  const fetchTestsAndCharges = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch all tests with their charges
      const chargesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/test-charges/all`);
      const chargesResult = await chargesResponse.json();
      
      if (chargesResult.success) {
        // chargesResult.data is an array of tests with charges nested
        const testsData = chargesResult.data;
        setTests(testsData);
        
        // Charges are already available in test.charges from the API response
      } else {
        setError('Failed to load charges from server');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to connect to server. Please make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  // Search - Real-time filtering as user types
  useEffect(() => {
    if (!tests.length) return;
    
    const result = tests.map(test => {
      // Get charges from test.charges array (from API response)
      const testCharges = test.charges || [];
      // Get default charge (organizationId is null)
      const defaultCharge = testCharges.find((c: any) => !c.organizationId);
      
      return {
        id: test.id,
        name: test.name,
        shortName: test.shortName || test.testCode || '',
        group: test.group || test.department?.name || '',
        charges: defaultCharge?.b2cCharge || 0,
        chargeId: defaultCharge?.id || null
      };
    }).filter((item) =>
      item.name.toLowerCase().includes(searchName.toLowerCase()) &&
      item.shortName.toLowerCase().includes(searchCode.toLowerCase()) &&
      item.group.toLowerCase().includes(searchGroup.toLowerCase())
    );
    
    setFilteredData(result);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [tests, searchName, searchCode, searchGroup]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Manual search button (for consistency with UI)
  const handleSearch = () => {
    // Search is already handled by useEffect above
    console.log('Search triggered');
  };

  // Reset
  const handleReset = () => {
    setSearchName("");
    setSearchCode("");
    setSearchGroup("");
    setError("");
    setCurrentPage(1);
    // Data will be re-filtered automatically by useEffect
  };

  // Change Charges
  const handleChargeChange = (id: any, field: any, value: any) => {
    if (value < 0) return;

    const updated = filteredData.map((item) =>
      item.id === id ? { ...item, [field]: parseFloat(value) || 0 } : item
    );
    setFilteredData(updated);
  };

  // Bulk apply charges
  const handleBulkApply = () => {
    if (!bulkCharge) {
      alert("Please enter a bulk charge value!");
      return;
    }

    const updated = filteredData.map((item) => ({
      ...item,
      charges: bulkCharge ? parseFloat(bulkCharge) : item.charges
    }));
    
    setFilteredData(updated);
    setShowBulkModal(false);
    setBulkCharge("");
    alert("Bulk charges applied! Click 'Save' to save to database.");
  };

  // Save charges to database
  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Prepare bulk update data for DEFAULT charges (no organizationId)
      const bulkCharges = filteredData
        .filter(item => item.charges && item.charges > 0)
        .map(item => ({
          testId: item.id,
          b2cCharge: parseFloat(item.charges) || 0,
          b2bCharge: parseFloat(item.charges) || 0  // ✅ Set B2B = B2C
        }));

      if (bulkCharges.length === 0) {
        alert("No charges to save. Please enter some charges first.");
        return;
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/test-charges/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          // No organizationId - these are DEFAULT charges
          charges: bulkCharges
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.data.updated + result.data.created} charges saved successfully!`);
        fetchTestsAndCharges(); // Reload data to get updated charge IDs
      } else {
        setError(result.message || 'Failed to save charges');
      }
    } catch (error) {
      console.error('Error saving charges:', error);
      setError('Failed to save charges');
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      // Check if xlsx is available
      const XLSX = await import('xlsx').catch(() => null);
      
      if (!XLSX) {
        alert('Excel export feature requires the "xlsx" package to be installed.\n\nPlease run: npm install xlsx');
        return;
      }
      
      // Prepare data for export
      const exportData = filteredData.map((item, index) => ({
        'Sr.No': index + 1,
        'Test Name': item.name,
        'Short Name': item.shortName,
        'Group': item.group,
        'Charges': item.charges
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // Sr.No
        { wch: 30 }, // Test Name
        { wch: 15 }, // Test Code
        { wch: 20 }, // Group
        { wch: 12 }  // Charges
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lab Charges");

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Default_Charges_${date}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel. Please try again.');
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      // Check if jsPDF is available
      const jsPDFModule = await import('jspdf').catch(() => null);
      const autoTableModule = await import('jspdf-autotable').catch(() => null);
      
      if (!jsPDFModule || !autoTableModule) {
        alert('PDF export feature requires "jspdf" and "jspdf-autotable" packages to be installed.\n\nPlease run: npm install jspdf jspdf-autotable');
        return;
      }
      
      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;
      
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.text('Default Test Charges Report', 14, 20);
      
      // Add date
      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

      // Prepare table data
      const tableData = filteredData.map((item, index) => [
        index + 1,
        item.name,
        item.shortName,
        item.group,
        item.charges
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 40,
        head: [['Sr.No', 'Test Name', 'Short Name', 'Group', 'Charges']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [249, 115, 22], // Orange color
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 15 },  // Sr.No
          1: { cellWidth: 80 },  // Test Name
          2: { cellWidth: 30 },  // Test Code
          3: { cellWidth: 35 },  // Group
          4: { cellWidth: 25 }   // Charges
        }
      });

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `Default_Charges_${date}.pdf`;

      // Save PDF
      doc.save(filename);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF. Please try again.');
    }
  };

  // Handle Excel file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Parse Excel file and show data
  const handleImportExcel = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setLoading(true);
      const XLSX = await import('xlsx').catch(() => null);
      
      if (!XLSX) {
        alert('Excel import feature requires the "xlsx" package to be installed.\n\nPlease run: npm install xlsx');
        return;
      }

      // Read file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);

          // Validate and prepare data
          const validData = jsonData.map((row: any) => ({
            testName: row['Test Name'] || row['testName'] || '',
            testCode: row['Test Code'] || row['testCode'] || '',
            group: row['Group'] || row['group'] || '',
            charges: parseFloat(row['Charges'] || row['charges'] || 0)
          })).filter(row => row.testName || row.testCode);

          if (validData.length === 0) {
            alert('No valid data found in Excel file. Please check the format.');
            return;
          }

          setImportedData(validData);
          setLoading(false);
        } catch (err) {
          console.error('Error parsing Excel:', err);
          alert('Error parsing Excel file. Please check the format.');
          setLoading(false);
        }
      };

      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Error importing Excel file.');
      setLoading(false);
    }
  };

  // Fill charges from imported data
  const handleFillCharges = () => {
    if (importedData.length === 0) {
      alert('No imported data to fill');
      return;
    }

    const updated = filteredData.map((item) => {
      // Try to match by short name first, then by test name
      const matchedRow = importedData.find((row) =>
        (row.testCode && item.shortName === row.testCode) ||
        (row.testName && item.name.toLowerCase().includes(row.testName.toLowerCase()))
      );

      return {
        ...item,
        charges: matchedRow ? matchedRow.charges : item.charges
      };
    });

    setFilteredData(updated);
    setShowImportModal(false);
    setImportedData([]);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Silent completion - no alert shown
  };

  return (
    <>
      <Header />
      
      <div className="p-6 bg-white min-h-screen">
        {/* Page Header */}
        <PageHeader 
          title="Default Test Charges" 
          icon={DollarSign}
          path="Master"
        />
        <p className="text-sm text-gray-600 mb-4">Set default charges for all tests. These charges will be applied to new organizations automatically.</p>
        {/* Main Content Card */}
        <div className="bg-white rounded shadow-md border border-gray-200">
          {/* Controls Section */}
          <div className="border-b border-gray-300 p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex-1 gap-2 flex flex-wrap items-end">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-orange-500 text-white px-6 py-1.5 text-sm rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  Search
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-orange-500 text-white px-6 py-1.5 text-sm rounded hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
              </div>
              <div className="flex gap-2 items-end">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-1.5 text-sm rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="bg-purple-600 text-white px-4 py-1.5 text-sm rounded hover:bg-purple-700 transition-colors"
                  >
                    Bulk Apply
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
                  >
                    <Upload size={14} className="sm:w-4 sm:h-4" />
                    <span>Import</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex gap-1 sm:gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
                  >
                    <FileSpreadsheet size={14} className="sm:w-4 sm:h-4" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded text-xs sm:text-sm transition-colors"
                  >
                    <FileText size={14} className="sm:w-4 sm:h-4" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
                <p className="mt-2 text-gray-600">Loading tests and charges...</p>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: '35%' }}>
                        <div className="mb-1">Name</div>
                        <input
                          placeholder="Search By Test Name"
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                        />
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: '20%' }}>
                        <div className="mb-1">Short Name</div>
                        <input
                          placeholder="Search By Short Name"
                          value={searchCode}
                          onChange={(e) => setSearchCode(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                        />
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: '20%' }}>
                        <div className="mb-1">Group</div>
                        <input
                          placeholder="Search By Group"
                          value={searchGroup}
                          onChange={(e) => setSearchGroup(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                        />
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold" style={{ width: '25%' }}>Charges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="border border-gray-300 px-3 py-2 font-medium">{item.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.shortName}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.group}</td>
                        <td className="border border-gray-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.charges}
                            onChange={(e) => handleChargeChange(item.id, 'charges', e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 text-sm rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                    {paginatedData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-gray-500 border border-gray-300">
                          No tests found matching your search criteria
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border-t border-red-200">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredData.length > 0 && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-300 flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} tests
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Items per page:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-2.5 py-1.5 text-sm rounded transition-colors ${
                            currentPage === page
                              ? "bg-orange-500 text-white font-semibold"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Apply Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bulk Apply Charges</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Charges (Apply to all tests)
                </label>
                <input
                  type="number"
                  value={bulkCharge}
                  onChange={(e) => setBulkCharge(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter charge"
                />
              </div>
              
              <p className="text-sm text-gray-600">
                Note: This will apply the charges to all currently filtered tests. Leave empty to keep existing values.
              </p>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkApply}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Import Charges from Excel</h3>
            
            {importedData.length === 0 ? (
              // File Upload Section
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload size={40} className="mx-auto text-blue-500 mb-2" />
                  <p className="text-gray-700 font-medium mb-2">Upload Excel File</p>
                  <p className="text-sm text-gray-600 mb-4">
                    File should contain columns: Test Name, Test Code, Group, Charges
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors mb-2"
                  >
                    Select File
                  </button>
                  
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>Selected:</strong> {selectedFile.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportExcel}
                    disabled={!selectedFile || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Reading...' : 'Read File'}
                  </button>
                </div>
              </div>
            ) : (
              // Preview and Fill Section
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                  <p className="text-green-800 font-medium">
                    ✅ Successfully loaded {importedData.length} records from Excel
                  </p>
                </div>

                {/* Data Preview Table */}
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-200 sticky top-0">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left">Test Name</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Test Code</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Group</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Charges</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2">{row.testName}</td>
                          <td className="border border-gray-300 px-3 py-2">{row.testCode}</td>
                          <td className="border border-gray-300 px-3 py-2">{row.group}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-medium">{row.charges}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setImportedData([]);
                      setSelectedFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFillCharges}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Fill Charges
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

