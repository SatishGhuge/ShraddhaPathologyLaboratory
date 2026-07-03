"use client";

import { useState, useEffect, useRef } from "react";
import { DollarSign, RotateCcw, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChargesManagerProps {
  entityId: string;
  entityName: string;
  entityType: "organization" | "doctor"; // "organization" or "doctor"
  apiPath: string; // e.g., "/master/organizations" or "/master/doctors"
}

export default function ChargesManager({
  entityId,
  entityName,
  entityType,
  apiPath,
}: ChargesManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tests, setTests] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [entity, setEntity] = useState<any>(null);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultCharges, setDefaultCharges] = useState<any[]>([]);
  const [originalCharges, setOriginalCharges] = useState<any>({});

  const [searchName, setSearchName] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [error, setError] = useState("");
  const [bulkCharge, setBulkCharge] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [filterType, setFilterType] = useState("all");

  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchData();
  }, [entityId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch entity details
      const entityResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${apiPath}/${entityId}`
      );
      const entityResult = await entityResponse.json();

      if (entityResult.success) {
        setEntity(entityResult.data);
      } else {
        setError(`Failed to load ${entityType}`);
        return;
      }

      // For doctors, use dedicated endpoint that includes doctor charges
      if (entityType === "doctor") {
        const chargesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/master/doctors/${entityId}/charges`
        );
        const chargesResult = await chargesResponse.json();

        if (chargesResult.success) {
          // Transform doctor charges response to match format expected by component
          const transformedTests = chargesResult.data.map((item: any) => ({
            id: item.id,
            name: item.name,
            shortName: item.shortName,
            testCode: item.shortName,
            group: item.group,
            department: { name: item.group },
            discountR: item.discountR || 0,
            discountS: item.discountS || 0,
            charges: [
              {
                id: null,
                testId: item.id,
                discountR: item.discountR || 0,
                discountS: item.discountS || 0
              }
            ]
          }));

          setTests(transformedTests);

          // Build default charges map
          const defaultChargesMap: any = {};
          chargesResult.data.forEach((item: any) => {
            defaultChargesMap[item.id] = {
              defaultB2C: item.defaultB2C,
              discountR: item.discountR || 0,
              discountS: item.discountS || 0
            };
          });
          setDefaultCharges(defaultChargesMap);

          // Build doctor charges array
          const doctorCharges = chargesResult.data
            .filter((item: any) => item.isCustomized)
            .map((item: any) => ({
              testId: item.id,
              discountR: item.discountR || 0,
              discountS: item.discountS || 0
            }));
          setCharges(doctorCharges);
        } else {
          setError("Failed to load doctor charges");
        }
      } else {
        // For organizations, use the original flow
        // Fetch all tests
        const testsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/master/test-charges/all`
        );
        const testsResult = await testsResponse.json();

        if (testsResult.success) {
          setTests(testsResult.data);

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

          // Fetch charges for this entity
          const chargesResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}${apiPath}/${entityId}/charges`
          );
          const chargesResult = await chargesResponse.json();
          if (chargesResult.success) {
            setCharges(chargesResult.data || []);
          } else {
            setCharges([]);
          }
        } else {
          setError("Failed to load tests");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!tests.length) return;

    const result = tests
      .map((test) => {
        const testCharge = charges.find((c: any) => c.testId === test.id);
        const defaultCharge = defaultCharges[test.id];

        // A test is customized if:
        // - For doctor: doctor has a record with discountS (special price) > 0
        // - For organization: charges differ from default
        let isCustomized = false;
        if (entityType === "doctor" && testCharge) {
          // Customized if special price (discountS) is set and different from regular (discountR)
          isCustomized = (testCharge.discountS || 0) > 0 && (testCharge.discountS !== testCharge.discountR);
        } else if (testCharge && defaultCharge) {
          isCustomized = 
            testCharge.b2cCharge !== defaultCharge.b2cCharge ||
            testCharge.b2bCharge !== defaultCharge.b2bCharge;
        }

        // Always show default test charge from test_charges table
        const displayCharge = defaultCharge?.defaultB2C || 0;

        const item = {
          id: test.id,
          name: test.name,
          shortName: test.shortName || test.testCode || "",
          group: test.group || test.department?.name || "",
          charges: displayCharge,
          b2b: testCharge?.b2bCharge || defaultCharge?.b2bCharge || 0,
          chargeId: testCharge?.id || null,
          isCustomized: isCustomized,
          defaultB2C: defaultCharge?.defaultB2C || defaultCharge?.b2cCharge || 0,
          defaultB2B: defaultCharge?.b2bCharge || 0,
          discountR: testCharge?.discountR || 0,
          discountS: testCharge?.discountS || 0,
        };

        // Store original charge for this test
        setOriginalCharges((prev: any) => ({
          ...prev,
          [test.id]: displayCharge
        }));

        return item;
      })
      .filter((item) => {
        if (filterType === "customized" && !item.isCustomized) return false;
        if (filterType === "default" && item.isCustomized) return false;

        return (
          item.name.toLowerCase().includes(searchName.toLowerCase()) &&
          item.shortName.toLowerCase().includes(searchCode.toLowerCase()) &&
          item.group.toLowerCase().includes(searchGroup.toLowerCase())
        );
      });

    setFilteredData(result);
    setCurrentPage(1);
  }, [tests, charges, defaultCharges, searchName, searchCode, searchGroup, filterType, entityType]);

  const handleReset = () => {
    setSearchName("");
    setSearchCode("");
    setSearchGroup("");
    setError("");
    setCurrentPage(1);
  };

  // Calculate totals for customized and default tests
  const totalCustomized = tests.filter((test) => {
    const testCharge = charges.find((c: any) => c.testId === test.id);
    const defaultCharge = defaultCharges[test.id];
    
    if (!testCharge || !defaultCharge) return false;
    
    // For doctor charges: check if discountS (special price) is different from discountR (regular price)
    if (entityType === "doctor") {
      return (testCharge.discountS || 0) > 0 && (testCharge.discountS !== testCharge.discountR);
    }
    
    // For organization charges: check if b2c/b2b charges differ from default
    return (
      testCharge.b2cCharge !== defaultCharge.b2cCharge ||
      testCharge.b2bCharge !== defaultCharge.b2bCharge
    );
  }).length;

  const totalDefault = tests.length - totalCustomized;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleChargeChange = (id: any, field: any, value: any) => {
    if (value < 0) return;
    const updated = filteredData.map((item) =>
      item.id === id ? { ...item, [field]: parseFloat(value) || 0 } : item
    );
    setFilteredData(updated);
  };

  const handleBulkApply = () => {
    if (!bulkCharge) {
      alert("Please enter charge value!");
      return;
    }
    const updated = filteredData.map((item) => ({
      ...item,
      charges: bulkCharge ? parseFloat(bulkCharge) : item.charges,
    }));
    setFilteredData(updated);
    setShowBulkModal(false);
    setBulkCharge("");
    alert("Bulk charges applied! Click 'Save' to save to database.");
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");

      // Build charges array - only include tests where charges actually changed
      const bulkCharges = filteredData
        .map((item) => {
          const originalCharge = originalCharges[item.id];
          const currentCharge = parseFloat(item.charges) || 0;
          const hasChanged = currentCharge !== originalCharge;

          return {
            testId: item.id,
            originalCharge,
            currentCharge,
            hasChanged,
            item
          };
        })
        .filter((c) => c.hasChanged) // Only items that changed
        .map((c) => {
          if (entityType === "doctor") {
            // For doctor:
            // discountR = regular/default price (original from test_charges)
            // discountS = special/customized price (what admin set)
            
            return {
              testId: c.item.id,
              discountR: c.originalCharge,  // Regular price (from test_charges)
              discountS: c.currentCharge    // Special price (customized by admin)
            };
          } else {
            // For organization: use the new charge value
            return {
              testId: c.item.id,
              b2cCharge: c.currentCharge,
              b2bCharge: c.currentCharge
            };
          }
        });

      if (bulkCharges.length === 0) {
        alert("No charges were modified. Please edit test charges before saving.");
        setLoading(false);
        return;
      }

      console.log("Sending bulk charges:", bulkCharges);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/master/test-charges/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            [entityType === "organization" ? "organizationId" : "doctorId"]: entityId,
            charges: bulkCharges,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.data.created + result.data.updated} charges saved!`);
        fetchData();
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

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx").catch(() => null);
      if (!XLSX) {
        alert("Please install: npm install xlsx");
        return;
      }

      const exportData = filteredData.map((item, index) => ({
        "Sr.No": index + 1,
        "Test Name": item.name,
        "Short Name": item.shortName,
        Group: item.group,
        Charges: item.charges,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 15 },
        { wch: 20 },
        { wch: 12 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${entityType === "organization" ? "Organization" : "Doctor"} Charges`);

      const date = new Date().toISOString().split("T")[0];
      const filename = `${entity?.name || entityName}_Charges_${date}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error exporting to Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      const jsPDFModule = await import("jspdf").catch(() => null);
      const autoTableModule = await import("jspdf-autotable").catch(() => null);

      if (!jsPDFModule || !autoTableModule) {
        alert("Please install: npm install jspdf jspdf-autotable");
        return;
      }

      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`${entity?.name || entityName} - Charges Report`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = filteredData.map((item, index) => [
        index + 1,
        item.name,
        item.shortName,
        item.group,
        item.charges,
      ]);

      autoTable(doc, {
        startY: 40,
        head: [["Sr.No", "Test Name", "Short Name", "Group", "Charges"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [249, 115, 22],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
        },
      });

      const date = new Date().toISOString().split("T")[0];
      const filename = `${entity?.name || entityName}_Charges_${date}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Error exporting to PDF");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImportExcel = async () => {
    if (!selectedFile) {
      alert("Please select a file first");
      return;
    }

    try {
      setLoading(true);
      const XLSX = await import("xlsx").catch(() => null);

      if (!XLSX) {
        alert("Please install: npm install xlsx");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);

          const validData = jsonData
            .map((row: any) => ({
              testName: row["Test Name"] || row["testName"] || "",
              testCode: row["Test Code"] || row["testCode"] || "",
              group: row["Group"] || row["group"] || "",
              charges: parseFloat(row["Charges"] || row["charges"] || 0),
            }))
            .filter((row) => row.testName || row.testCode);

          if (validData.length === 0) {
            alert("No valid data found in Excel");
            setLoading(false);
            return;
          }

          setImportedData(validData);
          setLoading(false);
        } catch (err) {
          console.error("Error parsing Excel:", err);
          alert("Error parsing Excel file");
          setLoading(false);
        }
      };

      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error("Error importing Excel:", error);
      alert("Error importing Excel file");
      setLoading(false);
    }
  };

  const handleFillCharges = () => {
    if (importedData.length === 0) {
      alert("No imported data to fill");
      return;
    }

    const updated = filteredData.map((item) => {
      const matchedRow = importedData.find(
        (row) =>
          (row.testCode && item.shortName === row.testCode) ||
          (row.testName && item.name.toLowerCase().includes(row.testName.toLowerCase()))
      );

      return {
        ...item,
        charges: matchedRow ? matchedRow.charges : item.charges,
      };
    });

    setFilteredData(updated);
    setShowImportModal(false);
    setImportedData([]);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white rounded shadow-md border border-gray-200">
      {/* Controls */}
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
                Customized ({totalCustomized})
              </button>
              <button
                onClick={() => setFilterType("default")}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  filterType === "default"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Using Defaults ({totalDefault})
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
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-purple-600 text-white px-4 py-1.5 text-sm rounded hover:bg-purple-700"
            >
              Bulk Apply
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex gap-1 items-center bg-blue-600 text-white px-3 py-1.5 text-sm rounded hover:bg-blue-700"
            >
              <Upload size={14} />
              Import
            </button>
            <button
              onClick={handleExportExcel}
              className="flex gap-1 items-center bg-green-600 text-white px-3 py-1.5 text-sm rounded hover:bg-green-700"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex gap-1 items-center bg-red-600 text-white px-3 py-1.5 text-sm rounded hover:bg-red-700"
            >
              <FileText size={14} />
              PDF
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-500 text-white px-4 py-1.5 text-sm rounded hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: "500px" }}>
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-900 text-white sticky top-0">
                <tr>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: "35%" }}>
                    <div className="mb-1">Name</div>
                    <input
                      placeholder="Search By Name"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                    />
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: "20%" }}>
                    <div className="mb-1">Short Name</div>
                    <input
                      placeholder="Search"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value)}
                      className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                    />
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-left font-semibold" style={{ width: "20%" }}>
                    <div className="mb-1">Group</div>
                    <input
                      placeholder="Search"
                      value={searchGroup}
                      onChange={(e) => setSearchGroup(e.target.value)}
                      className="w-full px-2 py-1 text-sm text-black rounded bg-white focus:outline-none border border-gray-300"
                    />
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold" style={{ width: "12%" }}>
                    Charges
                  </th>
                  <th className="border border-gray-300 px-3 py-2 text-center font-semibold" style={{ width: "10%" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 border-b border-gray-200 ${
                      item.isCustomized ? "bg-green-50" : "bg-amber-50"
                    }`}
                  >
                    <td className="border border-gray-300 px-3 py-2 font-medium">{item.name}</td>
                    <td className="border border-gray-300 px-3 py-2">{item.shortName}</td>
                    <td className="border border-gray-300 px-3 py-2">{item.group}</td>
                    <td className="border border-gray-300 px-2 py-1">
                      <input
                        type="number"
                        value={item.charges}
                        onChange={(e) => handleChargeChange(item.id, "charges", e.target.value)}
                        className="w-full border border-gray-300 px-2 py-1 text-sm rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
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
                {paginatedData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-500 border border-gray-300">
                      No tests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-200">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {filteredData.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-300 flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Items:</label>
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

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
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
                  className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bulk Apply Charges</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charges</label>
                <input
                  type="number"
                  value={bulkCharge}
                  onChange={(e) => setBulkCharge(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter charge"
                />
              </div>
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
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Import Excel</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="border border-gray-300 rounded px-3 py-2 w-full mb-4"
            />
            {importedData.length > 0 && (
              <p className="text-sm text-blue-600 mb-4">Loaded {importedData.length} rows. Click "Fill Charges" to apply.</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedFile(null);
                  setImportedData([]);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImportExcel}
                disabled={!selectedFile || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Import"}
              </button>
              {importedData.length > 0 && (
                <button
                  onClick={handleFillCharges}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Fill Charges
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
