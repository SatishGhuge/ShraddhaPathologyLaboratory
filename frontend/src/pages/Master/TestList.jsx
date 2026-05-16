import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header.jsx";
import PageHeader from "../../components/BreadCrumb.jsx";
import { FlaskConical, RotateCwIcon } from "lucide-react";
import { getTests, deleteTest, updateTest } from "../../api/master.js";

const TestList = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch tests from backend on component mount
  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTests();
      setTests(data);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Copy Test - Creates a duplicate
  const handleCopyTest = async (id) => {
    const testToCopy = tests.find((t) => t.id === id);
    if (!testToCopy) return;

    const confirm = window.confirm(`Do you want to create a copy of "${testToCopy.name}"?`);
    if (!confirm) return;

    try {
      // Create a copy with modified name
      const newTestData = {
        ...testToCopy,
        name: `${testToCopy.name} (Copy)`,
        shortName: testToCopy.shortName ? `${testToCopy.shortName}_COPY` : null,
        testCode: testToCopy.testCode ? `${testToCopy.testCode}_COPY` : null,
      };

      // Remove fields that shouldn't be copied
      delete newTestData.id;
      delete newTestData.createdAt;
      delete newTestData.updatedAt;
      delete newTestData.department; // Remove department object, keep departmentId

      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTestData),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Test copied successfully!`);
        fetchTests(); // Refresh the list
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      console.error('Error copying test:', err);
      alert(`Failed to copy test: ${err.message}`);
    }
  };

  // 🔹 Delete Test
  const handleDeleteTest = async (id) => {
    const testToDelete = tests.find((t) => t.id === id);
    if (!testToDelete) return;

    const confirm = window.confirm(`Are you sure you want to delete "${testToDelete.name}"?\n\nThis action cannot be undone.`);
    if (!confirm) return;

    try {
      await deleteTest(id);
      alert("Test deleted successfully!");
      fetchTests(); // Refresh the list
    } catch (err) {
      console.error('Error deleting test:', err);
      alert(`Failed to delete test: ${err.message}`);
    }
  };

  // 🔹 Toggle Active / Inactive with dynamic message
  const handleToggleActive = async (id) => {
    const currentTest = tests.find((t) => t.id === id);

    const message = currentTest.isActive
      ? `Do you want to Inactivate "${currentTest.name}"?\n\nThe test will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentTest.name}"?\n\nThe test will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      await updateTest(id, { isActive: !currentTest.isActive });
      alert(currentTest.isActive ? "Test inactivated successfully!" : "Test activated successfully!");
      fetchTests(); // Refresh the list
    } catch (err) {
      console.error('Error toggling test status:', err);
      alert(`Failed to update test: ${err.message}`);
    }
  };

  // 🔹 Reset search
  const handleReset = () => {
    setSearch("");
  };

  return (
    <>
      <Header />

      <div className="p-3 sm:p-4 md:p-6 bg-cyan-50 min-h-screen">
        {/* Page Header */}
        <PageHeader 
          title="Test List" 
          icon={FlaskConical}
          path="Master"
        />

        {/* 🔹 Top Bar - Title, Search, Reset, Add in Single Row */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search by keyword"            
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-full sm:w-64 text-xs sm:text-sm
           placeholder:text-gray-500
           focus:outline-none focus:ring-2 focus:ring-cyan-600"
            />

            <button
              onClick={handleReset}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto"
            >
              <RotateCwIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              Reset
            </button>

            <label className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-600 rounded text-xs sm:text-sm cursor-pointer hover:bg-cyan-100 transition-colors w-full sm:w-auto">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-cyan-600"
              />
              <span className="text-gray-700">Show Inactive</span>
            </label>
          </div>

          <button
            onClick={() => navigate("/master/testlist/add")}
            className="bg-cyan-600 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-cyan-700 transition-colors w-full sm:w-auto"
          >
            + Add Test
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-700 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tests...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white rounded shadow-md p-8 text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-2">Error Loading Tests</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchTests} 
              className="bg-cyan-700 text-white px-6 py-2 rounded hover:bg-cyan-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* 🔹 Table */}
        {!loading && !error && (
          <div className="overflow-x-auto bg-white rounded shadow-md">
            <table className="w-full text-xs sm:text-sm border-collapse min-w-[800px]">
              <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
                <tr>
                  {[
                    "Id",
                    "Name",
                    "Category",
                    "Short Name",
                    "Department",
                    "Sort Order",
                    "Active",
                    "Action",
                  ].map((head) => (
                    <th
                      key={head}
                      className="border border-cyan-800 px-3 py-1 text-left font-semibold"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      No tests found. Click "Add Test" to create one.
                    </td>
                  </tr>
                ) : tests.filter((t) => {
                      // When "Show Inactive" is checked, show ONLY inactive tests
                      if (showInactive && t.isActive) return false;
                      
                      // When "Show Inactive" is unchecked, show ONLY active tests
                      if (!showInactive && !t.isActive) return false;
                      
                      // Filter by search
                      return (
                        t.name.toLowerCase().includes(search.toLowerCase()) ||
                        (t.shortName && t.shortName.toLowerCase().includes(search.toLowerCase()))
                      );
                    }).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      {showInactive 
                        ? "No inactive tests found. All tests are currently active."
                        : "No active tests found. Check 'Show Inactive' to see inactive tests."}
                    </td>
                  </tr>
                ) : (
                  tests
                    .filter((t) => {
                      // When "Show Inactive" is checked, show ONLY inactive tests
                      if (showInactive && t.isActive) return false;
                      
                      // When "Show Inactive" is unchecked, show ONLY active tests
                      if (!showInactive && !t.isActive) return false;
                      
                      // Filter by search
                      return (
                        t.name.toLowerCase().includes(search.toLowerCase()) ||
                        (t.shortName && t.shortName.toLowerCase().includes(search.toLowerCase()))
                      );
                    })
                    .map((test, index) => (
                      <tr 
                        key={test.id} 
                        className={`hover:bg-gray-50 border-b border-gray-200 ${
                          !test.isActive ? 'bg-gray-100 opacity-60' : ''
                        }`}
                      >
                        <td className="border border-gray-300 px-3 py-1">
                          {index + 1}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.name}
                        </td>

                        <td className="border border-gray-300 px-3 py-1 text-center">
                          <span className="bg-cyan-600 text-white px-2 rounded font-bold cursor-pointer">
                            +
                          </span>
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.shortName || '-'}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          {test.department?.name || '-'}
                        </td>

                        <td className="border border-gray-300 px-3 py-1">
                          <input
                            type="text"
                            value={test.sortOrder || ''}
                            readOnly
                            className="border border-cyan-600 w-12 sm:w-16 px-2 py-1 text-xs sm:text-sm rounded"
                          />
                        </td>

                        {/* Active column */}
                        <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-xs sm:text-sm">
                          {test.isActive ? "Yes" : "No"}
                        </td>

                        {/* Action column */}
                        <td className="border border-gray-300 px-3 py-1">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                                onClick={() => navigate(`/master/testlist/edit/${test.id}`)}
                                className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-blue-700 transition-colors"
                              >
                                Edit
                              </button>

                            <button 
                              onClick={() => navigate(`/master/test-charges/${test.id}`)}
                              className="bg-purple-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-purple-700 transition-colors"
                            >
                              Charges
                            </button>

                            <button 
                              onClick={() => handleCopyTest(test.id)}
                              className="bg-yellow-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-yellow-700 transition-colors"
                            >
                              Copy
                            </button>

                            <button
                              onClick={() => handleToggleActive(test.id)}
                              className={`px-2 py-1 rounded text-[10px] sm:text-xs text-white transition-colors ${
                                test.isActive
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-gray-900 hover:bg-gray-900"
                              }`}
                              title={test.isActive ? "Click to inactivate test" : "Click to activate test"}
                            >
                              {test.isActive ? "Active" : "Inactive"}
                            </button>

                            <button 
                              onClick={() => handleDeleteTest(test.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-red-600 transition-colors"
                              title="Permanently delete test"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
    </>
  );
};

export default TestList;
