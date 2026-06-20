"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { DollarSign, RotateCcw, FileSpreadsheet, FileText } from "lucide-react";

export default function AddLabCharges() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchName, setSearchName] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [error, setError] = useState("");
  const [bulkCharge, setBulkCharge] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

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
        
        // Extract charges from tests
        const chargesMap: any = {};
        testsData.forEach((test: any) => {
          if (test.charges && test.charges.length > 0) {
            chargesMap[test.id] = test.charges;
          }
        });
        
        setCharges(Object.entries(chargesMap).map(([testId, charges]: [string, any]) => ({
          testId: parseInt(testId),
          charges
        })));
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
        code: test.testCode || '',
        group: test.group || test.department?.name || '',
        charges: defaultCharge?.b2cCharge || 0,
        chargeId: defaultCharge?.id || null
      };
    }).filter((item) =>
      item.name.toLowerCase().includes(searchName.toLowerCase()) &&
      item.code.toLowerCase().includes(searchCode.toLowerCase()) &&
      item.group.toLowerCase().includes(searchGroup.toLowerCase())
    );
    
    setFilteredData(result);
  }, [tests, searchName, searchCode, searchGroup]);

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
        'Test Code': item.code,
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
        item.code,
        item.group,
        item.charges
      ]);

      // Add table using autoTable
      autoTable(doc, {
        startY: 40,
        head: [['Sr.No', 'Test Name', 'Test Code', 'Group', 'Charges']],
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
                        <div className="mb-1">TestCode</div>
                        <input
                          placeholder="Search By TestCode"
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
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                        <td className="border border-gray-300 px-3 py-2 font-medium">{item.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.code}</td>
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
                    {filteredData.length === 0 && !loading && (
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
    </>
  );
}

