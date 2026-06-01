"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { DollarSign, RotateCcw, FileSpreadsheet, FileText } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

export default function OrganizationCharges() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [tests, setTests] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [b2bError, setB2bError] = useState("");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultCharges, setDefaultCharges] = useState<any[]>([]); // Store default charges for comparison

  const [searchName, setSearchName] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [error, setError] = useState("");
  const [bulkCharge, setBulkCharge] = useState("");
  const [bulkB2BCharge, setBulkB2BCharge] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [filterType, setFilterType] = useState("all"); // "all", "customized", "default"

  // Fetch organization, tests and charges on component mount
  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch organization details
      const orgResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/organizations/${organizationId}`);
      const orgResult = await orgResponse.json();

      if (orgResult.success) {
        setOrganization(orgResult.data);
      } else {
        setError("Failed to load organization");
        return;
      }

      // Fetch all tests with DEFAULT charges
      const testsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/test-charges/all`);
      const testsResult = await testsResponse.json();

      if (testsResult.success) {
        setTests(testsResult.data);
        
        // Extract default charges (organizationId = null)
        const defaultChargesMap: any = {};
        testsResult.data.forEach((test: any) => {
          if (test.charges && test.charges.length > 0) {
            const defaultCharge = test.charges.find((c: any) => !c.organizationId);
            if (defaultCharge) {
              defaultChargesMap[test.id] = defaultCharge;
            }
          }
        });
        setDefaultCharges(defaultChargesMap);

        // Fetch charges for this organization
        const chargesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/master/organizations/${organizationId}/charges`
        );
        const chargesResult = await chargesResponse.json();

        if (chargesResult.success) {
          setCharges(chargesResult.data || []);
        } else {
          setCharges([]);
        }
      } else {
        setError("Failed to load tests from server");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to connect to server. Please make sure the backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  // Search - Real-time filtering as user types
  useEffect(() => {
    if (!tests.length) return;

    const result = tests
      .map((test) => {
        const testCharge = charges.find((c: any) => c.testId === test.id);
        const defaultCharge = defaultCharges[test.id];
        
        // Check if this test has customized charges (different from default)
        const isCustomized = testCharge && defaultCharge && 
          (testCharge.b2cCharge !== defaultCharge.b2cCharge || 
           testCharge.b2bCharge !== defaultCharge.b2bCharge);

        return {
          id: test.id,
          name: test.name,
          code: test.testCode || "",
          group: test.group || test.department?.name || "",
          charges: testCharge?.b2cCharge || 0,
          b2b: testCharge?.b2bCharge || 0,
          chargeId: testCharge?.id || null,
          isCustomized: isCustomized || false,
          defaultB2C: defaultCharge?.b2cCharge || 0,
          defaultB2B: defaultCharge?.b2bCharge || 0,
        };
      })
      .filter((item) => {
        // Apply filter type
        if (filterType === "customized" && !item.isCustomized) return false;
        if (filterType === "default" && item.isCustomized) return false;
        
        // Apply search filters
        return (
          item.name.toLowerCase().includes(searchName.toLowerCase()) &&
          item.code.toLowerCase().includes(searchCode.toLowerCase()) &&
          item.group.toLowerCase().includes(searchGroup.toLowerCase())
        );
      });

    setFilteredData(result);
  }, [tests, charges, defaultCharges, searchName, searchCode, searchGroup, filterType]);

  // Handle Dropdown Change
  const handleReset = () => {
    setSearchName("");
    setSearchCode("");
    setSearchGroup("");
    setError("");
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
    if (!bulkCharge && !bulkB2BCharge) {
      alert("Please enter at least one bulk charge value!");
      return;
    }
    if (bulkCharge && bulkB2BCharge && parseFloat(bulkB2BCharge) > parseFloat(bulkCharge)) {
      setB2bError("B2B charge cannot be greater than B2C charge!");
      return;
    }

    const updated = filteredData.map((item) => ({
      ...item,
      charges: bulkCharge ? parseFloat(bulkCharge) : item.charges,
      b2b: bulkB2BCharge ? parseFloat(bulkB2BCharge) : item.b2b,
    }));

    setFilteredData(updated);
    setShowBulkModal(false);
    setBulkCharge("");
    setBulkB2BCharge("");
    alert("Bulk charges applied! Click 'Save' to save to database.");
  };

  // Save charges to database
  const handleSave = async () => {
    // Validate B2B <= B2C for all rows
    const invalid = filteredData.find(
      (item) => item.charges > 0 && item.b2b > 0 && parseFloat(item.b2b) > parseFloat(item.charges)
    );
    if (invalid) {
      setB2bError(`B2B charge cannot be greater than B2C charge for test: "${invalid.name}"`);
      return;
    }
    try {
      setLoading(true);
      setError("");

      // Prepare bulk update data
      const bulkCharges = filteredData
        .filter((item) => (item.charges && item.charges > 0) || (item.b2b && item.b2b > 0))
        .map((item) => ({
          testId: item.id,
          b2cCharge: parseFloat(item.charges) || 0,
          b2bCharge: parseFloat(item.b2b) || 0,
        }));

      if (bulkCharges.length === 0) {
        alert("No charges to save. Please enter some charges first.");
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/test-charges/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          organizationId,
          charges: bulkCharges,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.data.created + result.data.updated} charges saved successfully!`);
        fetchData(); // Reload data to get updated charge IDs
      } else {
        setError(result.message || "Failed to save charges");
      }
    } catch (error) {
      console.error("Error saving charges:", error);
      setError("Failed to save charges");
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx").catch(() => null);

      if (!XLSX) {
        alert('Excel export feature requires the "xlsx" package to be installed.\n\nPlease run: npm install xlsx');
        return;
      }

      const exportData = filteredData.map((item, index) => ({
        "Sr.No": index + 1,
        "Test Name": item.name,
        "Test Code": item.code,
        Group: item.group,
        Charges: item.charges,
        B2B: item.b2b,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);

      ws["!cols"] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Organization Charges");

      const date = new Date().toISOString().split("T")[0];
      const filename = `${organization?.name}_Charges_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Please try again.");
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      const jsPDFModule = await import("jspdf").catch(() => null);
      const autoTableModule = await import("jspdf-autotable").catch(() => null);

      if (!jsPDFModule || !autoTableModule) {
        alert('PDF export feature requires "jspdf" and "jspdf-autotable" packages to be installed.\n\nPlease run: npm install jspdf jspdf-autotable');
        return;
      }

      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text(`${organization?.name} - Charges Report`, 14, 20);

      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = filteredData.map((item, index) => [
        index + 1,
        item.name,
        item.code,
        item.group,
        item.charges,
        item.b2b,
      ]);

      autoTable(doc, {
        startY: 40,
        head: [["Sr.No", "Test Name", "Test Code", "Group", "Charges", "B2B"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
        },
      });

      const date = new Date().toISOString().split("T")[0];
      const filename = `${organization?.name}_Charges_${date}.pdf`;

      doc.save(filename);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      alert("Error exporting to PDF. Please try again.");
    }
  };

  return (
    <>
      <Header />

      <div className="p-6 bg-white min-h-screen">
        {/* Page Header */}
        <PageHeader title={`${organization?.name} - Test Charges`} icon={DollarSign} path="Master" />

        {/* Main Content Card */}
        <div className="bg-white rounded shadow-md border border-gray-200">
          {/* Controls Section */}
          <div className="border-b border-gray-300 p-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex-1 gap-2 flex flex-wrap items-end">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="bg-orange-500 text-white px-6 py-1.5 text-sm rounded hover:bg-orange-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                
                {/* Filter Buttons */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      filterType === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    All Tests ({tests.length})
                  </button>
                  <button
                    onClick={() => setFilterType("customized")}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      filterType === "customized"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Customized ({filteredData.filter((t: any) => t.isCustomized).length})
                  </button>
                  <button
                    onClick={() => setFilterType("default")}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      filterType === "default"
                        ? "bg-amber-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    Using Defaults ({filteredData.filter((t: any) => !t.isCustomized).length})
                  </button>
                </div>
              </div>
              <div className="flex gap-2 items-end">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-1.5 text-sm rounded transition-colors disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
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

                  <button
                    onClick={() => router.back()}
                    className="bg-gray-500 text-white px-4 py-1.5 text-sm rounded hover:bg-gray-600 transition-colors"
                  >
                    Back
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
              <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-900 text-white sticky top-0">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: "35%" }}>
                        <div className="mb-1">Name</div>
                        <input
                          placeholder="Search By Test Name"
                          value={searchName}
                          onChange={(e) => setSearchName(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                        />
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: "20%" }}>
                        <div className="mb-1">TestCode</div>
                        <input
                          placeholder="Search By TestCode"
                          value={searchCode}
                          onChange={(e) => setSearchCode(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                        />
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: "20%" }}>
                        <div className="mb-1">Group</div>
                        <input
                          placeholder="Search By Group"
                          value={searchGroup}
                          onChange={(e) => setSearchGroup(e.target.value)}
                          className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                        />
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold" style={{ width: "12%" }}>
                        Charges
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold" style={{ width: "13%" }}>
                        B2B
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold" style={{ width: "10%" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.id} className={`hover:bg-gray-50 border-b border-gray-200 ${item.isCustomized ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <td className="border border-gray-300 px-3 py-2 font-medium">{item.name}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.code}</td>
                        <td className="border border-gray-300 px-3 py-2">{item.group}</td>
                        <td className="border border-gray-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.charges}
                            onChange={(e) => handleChargeChange(item.id, "charges", e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 text-sm rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1">
                          <input
                            type="number"
                            value={item.b2b}
                            onChange={(e) => handleChargeChange(item.id, "b2b", e.target.value)}
                            className={`w-full border px-2 py-1 text-sm rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center ${
                              parseFloat(item.b2b) > parseFloat(item.charges) && item.charges > 0
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                            title={
                              parseFloat(item.b2b) > parseFloat(item.charges) && item.charges > 0
                                ? "B2B cannot exceed B2C"
                                : ""
                            }
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {item.isCustomized ? (
                            <span className="inline-block bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                              ✓ Customized
                            </span>
                          ) : (
                            <span className="inline-block bg-amber-600 text-white px-2 py-1 rounded text-xs font-semibold">
                              Default
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-gray-500 border border-gray-300">
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
                  B2C Charges (Apply to all tests)
                </label>
                <input
                  type="number"
                  value={bulkCharge}
                  onChange={(e) => setBulkCharge(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter B2C charge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  B2B Charges (Apply to all tests)
                </label>
                <input
                  type="number"
                  value={bulkB2BCharge}
                  onChange={(e) => setBulkB2BCharge(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter B2B charge"
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
      {/* B2B Error Popup */}
      {b2bError && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 text-center">
            <div className="text-red-500 text-4xl mb-3">⚠️</div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Invalid Charge</h3>
            <p className="text-sm text-gray-600 mb-4">{b2bError}</p>
            <button
              onClick={() => setB2bError("")}
              className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
