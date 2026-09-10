"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, RotateCcw, FileSpreadsheet, FileText, Upload } from "lucide-react";
import PaginationControls from "@/app/components/PaginationControls";

export default function AddLabCharges() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]); // Track original data to detect changes
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [bulkCharge, setBulkCharge] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedTests, setSelectedTests] = useState<Set<number>>(new Set());
  
  // Column visibility states
  const [visibleColumns, setVisibleColumns] = useState({
    checkbox: true,
    testCode: true,
    testName: true,
    shortName: true,
    department: true,
    sampleType: true,
    volume: true,
    testMethod: true,
    schedule: true,
    cutOff: true,
    tat: true,
    category: true,
    charges: true,
    comments: true
  });
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  
  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch tests and charges on component mount
  useEffect(() => {
    fetchTestsAndCharges();
  }, []);

  // Watch for itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

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
        
        // Log sample to verify preparation fields are present
        if (testsData.length > 0) {
          const sampleTest = testsData.find((t: any) => t.preparationTime || t.preparationType);
          if (sampleTest) {
            console.log('✓ Test with preparation data found:', sampleTest.name, {
              preparationTime: sampleTest.preparationTime,
              preparationType: sampleTest.preparationType
            });
          }
        }
        
        setTests(testsData);
        // Store original data for change detection
        setOriginalData(JSON.parse(JSON.stringify(testsData)));
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
      
      // TAT column: Use preparationTime + preparationType if available, otherwise use schedule
      let tatValue = '';
      
      if (test.preparationTime || test.preparationType) {
        // If both preparation fields exist, combine them
        const parts = [];
        if (test.preparationTime) parts.push(test.preparationTime);
        if (test.preparationType) parts.push(test.preparationType);
        tatValue = parts.join(' ');
      } else if (test.schedule) {
        // Fallback to schedule if preparation fields are empty
        tatValue = test.schedule;
      }
      
      return {
        id: test.id,
        name: test.name,
        testCode: test.testCode || '',
        shortName: test.shortName || '',
        department: test.department?.name || '',
        sampleType: test.sample_type?.Sample_Type || '',
        volume: test.volume || '',
        testMethod: test.testMethod || '',
        schedule: test.schedule || '',
        cutOff: test.cutOff || '',
        tat: tatValue, // TAT from preparationTime and preparationType
        category: defaultCharge?.category || '', // New category field
        comments: test.comments || '',
        charges: defaultCharge?.b2cCharge || 0,
        chargeId: defaultCharge?.id || null
      };
    }).filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.testCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredData(result);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [tests, searchQuery]);

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
    setSearchQuery("");
    setError("");
    setCurrentPage(1);
    // Data will be re-filtered automatically by useEffect
  };

  // Toggle test selection
  const toggleTestSelection = (testId: number) => {
    const newSelected = new Set(selectedTests);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTests(newSelected);
  };

  // Select/Deselect all visible tests
  const toggleSelectAll = () => {
    if (selectedTests.size === paginatedData.length) {
      setSelectedTests(new Set());
    } else {
      const allIds = new Set(paginatedData.map(item => item.id));
      setSelectedTests(allIds);
    }
  };

  // Toggle column visibility
  const toggleColumnVisibility = (columnName: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnName]: !prev[columnName]
    }));
  };

  // Check/Uncheck all columns
  const handleCheckAllColumns = () => {
    const allChecked = Object.values(visibleColumns).every(v => v);
    const newState = {};
    Object.keys(visibleColumns).forEach(key => {
      newState[key] = !allChecked;
    });
    setVisibleColumns(newState as any);
  };

  // Change Charges or Category
  const handleChargeChange = (id: any, field: any, value: any) => {
    if (field === 'charges' && value < 0) return;

    const updated = filteredData.map((item) =>
      item.id === id ? { ...item, [field]: field === 'charges' ? parseFloat(value) || 0 : value } : item
    );
    setFilteredData(updated);
  };

  // Bulk apply charges
  const handleBulkApply = () => {
    if (!bulkCharge) {
      alert("Please enter a bulk charge value!");
      return;
    }

    if (selectedTests.size === 0) {
      alert("Please select at least one test!");
      return;
    }

    const updated = filteredData.map((item) =>
      selectedTests.has(item.id)
        ? { ...item, charges: bulkCharge ? parseFloat(bulkCharge) : item.charges }
        : item
    );
    
    setFilteredData(updated);
    setShowBulkModal(false);
    setBulkCharge("");
    setSelectedTests(new Set());
    alert(`Bulk charges applied to ${selectedTests.size} test(s)! Click 'Save' to save to database.`);
  };

  // Save charges to database
  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Find only changed items by comparing with original data
      const changedItems = filteredData.filter(item => {
        const originalItem = originalData.find(o => o.id === item.id);
        if (!originalItem) return false;
        
        // Get original charge from the charges array
        const originalCharge = (originalItem.charges || []).find((c: any) => !c.organizationId);
        const originalB2C = originalCharge?.b2cCharge || 0;
        const originalCategory = originalCharge?.category || null;
        
        // Check if charges or category changed
        return (
          item.charges !== originalB2C || 
          item.category !== originalCategory
        );
      });

      if (changedItems.length === 0) {
        alert("No changes to save.");
        return;
      }
      
      // Prepare bulk update data only for changed items
      const bulkCharges = changedItems.map(item => ({
        testId: item.id,
        b2cCharge: parseFloat(item.charges) || 0,
        b2bCharge: parseFloat(item.charges) || 0,  // ✅ Set B2B = B2C
        category: item.category || null  // Include category field
      }));
      
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
        alert(`✅ ${changedItems.length} charge(s) saved successfully!`);
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
        'Test Code': item.testCode,
        'Test Name': item.name,
        'Short Name': item.shortName,
        'Department': item.department,
        'Sample Type': item.sampleType,
        'Volume': item.volume,
        'Method': item.testMethod,
        'Schedule': item.schedule,
        'Cut-Off': item.cutOff,
        'TAT': item.tat,
        'Category': item.category,
        'Charges': item.charges,
        'Comments': item.comments
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
      
      // Create PDF in landscape mode for more columns
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Prepare table data
      const tableData = filteredData.map((item, index) => [
        index + 1,
        item.testCode,
        item.name,
        item.shortName,
        item.department,
        item.sampleType,
        item.volume,
        item.testMethod,
        item.schedule,
        item.cutOff,
        item.tat,
        item.category,
        item.charges,
        item.comments
      ]);

      // Calculate page width for auto column sizing
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 5;
      const availableWidth = pageWidth - (2 * margin);
      const numColumns = 14;
      const columnWidth = availableWidth / numColumns;

      // Add table using autoTable with optimized settings for single page
      autoTable(doc, {
        startY: 5, // Minimal top margin
        head: [['Sr.No', 'Code', 'Name', 'Short', 'Dept', 'Sample', 'Vol', 'Method', 'Sch', 'Cut-Off', 'TAT', 'Category', 'Charges', 'Comments']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [100, 100, 100], // Simple gray header
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 1,
          lineColor: [0, 0, 0],
          lineWidth: 0.3
        },
        bodyStyles: {
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 0.8,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          minCellHeight: 4, // Minimize row height
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: columnWidth, halign: 'center' },   // Sr.No
          1: { cellWidth: columnWidth },  // Code
          2: { cellWidth: columnWidth },  // Name
          3: { cellWidth: columnWidth },  // Short
          4: { cellWidth: columnWidth },  // Dept
          5: { cellWidth: columnWidth },  // Sample
          6: { cellWidth: columnWidth },  // Vol
          7: { cellWidth: columnWidth },  // Method
          8: { cellWidth: columnWidth },  // Sch
          9: { cellWidth: columnWidth },  // Cut-Off
          10: { cellWidth: columnWidth }, // TAT
          11: { cellWidth: columnWidth }, // Category
          12: { cellWidth: columnWidth, halign: 'center' }, // Charges
          13: { cellWidth: columnWidth }  // Comments
        },
        margin: { top: 5, right: 5, bottom: 5, left: 5 },
        tableWidth: 'auto'
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
      
      <div className="p-6 bg-white min-h-screen">
        {/* Main Content Card */}
        <div className="bg-white rounded shadow-md border border-gray-200">
          {/* Controls Section */}
          <div className="border-b border-gray-300 p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex-1">
                <input
                  placeholder="Search by test name or test code"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-800 p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title="Reset search"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 text-sm rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="bg-purple-600 text-white px-4 py-2 text-sm rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                    disabled={selectedTests.size === 0}
                    title={selectedTests.size === 0 ? "Select tests first" : `Apply to ${selectedTests.size} selected test(s)`}
                  >
                    Bulk Apply ({selectedTests.size})
                  </button>
                  <button
                    onClick={() => setShowColumnFilter(!showColumnFilter)}
                    className="flex gap-1 sm:gap-1.5 items-center bg-slate-600 hover:bg-slate-700 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm transition-colors relative"
                  >
                    <span>Columns ({Object.values(visibleColumns).filter(Boolean).length})</span>
                  </button>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="flex gap-1 sm:gap-1.5 items-center bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm transition-colors"
                  >
                    <Upload size={14} className="sm:w-4 sm:h-4" />
                    <span>Import</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex gap-1 sm:gap-1.5 items-center bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm transition-colors"
                  >
                    <FileSpreadsheet size={14} className="sm:w-4 sm:h-4" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="flex gap-1 sm:gap-1.5 items-center bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 py-2 sm:py-2 rounded text-xs sm:text-sm transition-colors"
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
                <table className="w-full border-collapse text-xs whitespace-nowrap">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      {visibleColumns.checkbox && (
                        <th className="border border-gray-300 px-2 py-1 text-center font-semibold w-8">
                          <input
                            type="checkbox"
                            checked={selectedTests.size > 0 && selectedTests.size === paginatedData.length}
                            onChange={toggleSelectAll}
                            className="w-3.5 h-3.5 accent-orange-500"
                            title="Select all on this page"
                          />
                        </th>
                      )}
                      {visibleColumns.testCode && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Test Code</th>}
                      {visibleColumns.testName && <th className="border border-gray-300 px-2 py-1 text-left font-semibold max-w-xs">Test Name</th>}
                      {visibleColumns.shortName && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Short Name</th>}
                      {visibleColumns.department && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Department</th>}
                      {visibleColumns.sampleType && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Sample Type</th>}
                      {visibleColumns.volume && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Volume</th>}
                      {visibleColumns.testMethod && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Method</th>}
                      {visibleColumns.schedule && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Schedule</th>}
                      {visibleColumns.cutOff && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Cut-Off</th>}
                      {visibleColumns.tat && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">TAT</th>}
                      {visibleColumns.category && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Category</th>}
                      {visibleColumns.charges && <th className="border border-gray-300 px-2 py-1 text-center font-semibold w-20">Charges</th>}
                      {visibleColumns.comments && <th className="border border-gray-300 px-2 py-1 text-left font-semibold">Comments</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((item) => (
                      <tr key={item.id} className={`hover:bg-gray-50 border-b border-gray-200 ${selectedTests.has(item.id) ? 'bg-blue-50' : ''}`}>
                        {visibleColumns.checkbox && (
                          <td className="border border-gray-300 px-2 py-1 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTests.has(item.id)}
                              onChange={() => toggleTestSelection(item.id)}
                              className="w-3.5 h-3.5 accent-orange-500"
                            />
                          </td>
                        )}
                        {visibleColumns.testCode && <td className="border border-gray-300 px-2 py-1">{item.testCode}</td>}
                        {visibleColumns.testName && <td className="border border-gray-300 px-2 py-1 font-medium truncate max-w-xs" title={item.name}>{item.name}</td>}
                        {visibleColumns.shortName && <td className="border border-gray-300 px-2 py-1">{item.shortName}</td>}
                        {visibleColumns.department && <td className="border border-gray-300 px-2 py-1">{item.department}</td>}
                        {visibleColumns.sampleType && <td className="border border-gray-300 px-2 py-1">{item.sampleType}</td>}
                        {visibleColumns.volume && <td className="border border-gray-300 px-2 py-1">{item.volume}</td>}
                        {visibleColumns.testMethod && <td className="border border-gray-300 px-2 py-1 text-xs">{item.testMethod}</td>}
                        {visibleColumns.schedule && <td className="border border-gray-300 px-2 py-1">{item.schedule}</td>}
                        {visibleColumns.cutOff && <td className="border border-gray-300 px-2 py-1">{item.cutOff}</td>}
                        {visibleColumns.tat && <td className="border border-gray-300 px-2 py-1">{item.tat}</td>}
                        {visibleColumns.category && (
                          <td className="border border-gray-300 px-2 py-0.5">
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => handleChargeChange(item.id, 'category', e.target.value)}
                              className="w-full border border-gray-300 px-1.5 py-0.5 text-xs rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="Enter category"
                            />
                          </td>
                        )}
                        {visibleColumns.charges && (
                          <td className="border border-gray-300 px-2 py-0.5 w-20">
                            <input
                              type="number"
                              value={item.charges}
                              onChange={(e) => handleChargeChange(item.id, 'charges', e.target.value)}
                              className="w-full border border-gray-300 px-1.5 py-0.5 text-xs rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              style={{ MozAppearance: 'textfield' }}
                            />
                          </td>
                        )}
                        {visibleColumns.comments && <td className="border border-gray-300 px-2 py-1 text-xs">{item.comments}</td>}
                      </tr>
                    ))}
                    {paginatedData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="text-center py-3 text-gray-500 border border-gray-300 text-xs">
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
              <PaginationControls
                pagination={{
                  page: currentPage,
                  limit: itemsPerPage,
                  total: filteredData.length,
                  totalPages: Math.ceil(filteredData.length / itemsPerPage),
                  hasMore: currentPage < Math.ceil(filteredData.length / itemsPerPage)
                }}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(newLimit) => {
                  setItemsPerPage(newLimit);
                  setCurrentPage(1);
                }}
                isLoading={loading}
              />
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

      {/* Column Filter Modal */}
      {showColumnFilter && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal only if clicking on the overlay (background), not on the modal itself
            if (e.target === e.currentTarget) {
              setShowColumnFilter(false);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg p-3 w-64">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Required Columns</h3>
            
            <div className="space-y-0.5 mb-3 max-h-80 overflow-y-auto">
              {/* Check/Uncheck All */}
              <label className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-gray-50 rounded cursor-pointer font-semibold text-blue-600 text-xs">
                <input
                  type="checkbox"
                  checked={Object.values(visibleColumns).every(v => v)}
                  onChange={handleCheckAllColumns}
                  className="w-3.5 h-3.5 accent-blue-600"
                />
                <span>Check all</span>
              </label>

              {/* Individual Columns */}
              {Object.entries({
                checkbox: 'Checkbox',
                testCode: 'Test Code',
                testName: 'Test Name',
                shortName: 'Short Name',
                department: 'Department',
                sampleType: 'Sample Type',
                volume: 'Volume',
                testMethod: 'Method',
                schedule: 'Schedule',
                cutOff: 'Cut-Off',
                tat: 'TAT',
                charges: 'Charges',
                comments: 'Comments'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 px-1.5 py-0.5 hover:bg-gray-50 rounded cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                    onChange={() => toggleColumnVisibility(key)}
                    className="w-3.5 h-3.5 accent-blue-600"
                  />
                  <span className="text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowColumnFilter(false)}
                className="px-3 py-1 bg-gray-400 text-gray-800 rounded hover:bg-gray-500 font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

