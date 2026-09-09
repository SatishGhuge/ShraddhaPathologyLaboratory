"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { ArrowLeft, Package, Hash, FlaskConical } from "lucide-react";

import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import API_BASE_URL from "@/src/api/config.js";

const AddPackage = () => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Determine mode based on route
  const isEditMode = pathname.includes('/edit/');
  const isViewMode = pathname.includes('/view/');
  const isAddMode = !isEditMode && !isViewMode;
  
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    charges: "",
    labTests: "",
  });
  
  const [testList, setTestList] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [totalCharges, setTotalCharges] = useState<number>(0);

  // Fetch tests on component mount
  useEffect(() => {
    fetchTests();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside the lab tests input and dropdown
      if (!target.closest('[data-lab-tests-container]')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Calculate total charges whenever testList changes
  useEffect(() => {
    const total = testList.reduce((sum, test) => sum + (test.charge || 0), 0);
    setTotalCharges(total);
    console.log('💰 Total Charges Calculated:', {
      testCount: testList.length,
      tests: testList.map(t => ({ name: t.name, charge: t.charge })),
      totalCharges: total
    });
  }, [testList]);

  // Load package data for edit/view mode
  useEffect(() => {
    if ((isEditMode || isViewMode) && id) {
      fetchPackageData();
    }
  }, [id, isEditMode, isViewMode]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching ALL tests from:', `${API_BASE_URL}/master/tests/all`);
      
      const testsResponse = await fetch(`${API_BASE_URL}/master/tests/all`);
      console.log('Response status:', testsResponse.status);
      
      const testsResult = await testsResponse.json();
      console.log('✅ Tests response:', testsResult);

      if (testsResult.success && testsResult.data) {
        const testData = Array.isArray(testsResult.data) ? testsResult.data : [];
        setAvailableTests(testData);
        console.log('✅ All tests fetched successfully:', testData.length, 'tests');
        
        if (testData.length === 0) {
          console.warn('⚠️ No tests found in response');
        }
      } else {
        console.error('❌ Invalid response structure:', testsResult);
        setError('Failed to load tests - invalid response');
      }
    } catch (error) {
      console.error('❌ Error fetching tests:', error);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPackageData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/master/packages/${id}`);
      const result = await response.json();
      
      if (result.success) {
        const pkg = result.data;
        setFormData({
          name: pkg.name || "",
          code: pkg.code || "",
          description: pkg.description || "",
          charges: pkg.charges?.toString() || "",
          labTests: "",
        });
        
        // Set the tests from packageTests with charge info
        const tests = pkg.packageTests?.map(pt => {
          let charge = 0;
          
          // Try to get charge from test.charges array
          if (pt.test.charges && Array.isArray(pt.test.charges) && pt.test.charges.length > 0) {
            charge = pt.test.charges[0].b2cCharge || 0;
          }
          
          return {
            id: pt.test.id,
            name: pt.test.name,
            charge: charge
          };
        }) || [];
        
        console.log('📦 Package tests loaded:', {
          packageId: pkg.id,
          packageName: pkg.name,
          testCount: tests.length,
          tests: tests,
          packageTotal: pkg.packageTotal
        });
        
        setTestList(tests);
      } else {
        setError('Failed to load package data');
      }
    } catch (error) {
      console.error('Error fetching package:', error);
      setError('Failed to load package data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // If searching lab tests, filter available tests
    if (name === "labTests" && value.trim()) {
      const filtered = availableTests.filter(test =>
        test.name.toLowerCase().includes(value.toLowerCase())
      );
      setSearchResults(filtered);
      setShowDropdown(true);
    } else if (name === "labTests") {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handleAddTest = (test: any) => {
    // Check if test already exists in the list
    const exists = testList.find(t => t.id === test.id);
    if (exists) {
      alert("This test is already added to the package!");
      return;
    }
    
    console.log('➕ Adding test:', { id: test.id, name: test.name, charge: test.charge });
    
    // Add test to the list with charge info
    setTestList([...testList, { 
      id: test.id, 
      name: test.name,
      charge: test.charge || 0
    }]);
    
    // Clear search
    setFormData({ ...formData, labTests: "" });
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleRemoveTest = (testId: any) => {
    const testToRemove = testList.find(t => t.id === testId);
    console.log('➖ Removing test:', testToRemove);
    
    const confirm = window.confirm("Are you sure you want to remove this test?");
    if (confirm) {
      setTestList(testList.filter(test => test.id !== testId));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: Check if required fields are empty
    const emptyFields = [];
    
    if (!formData.name.trim()) {
      emptyFields.push("Package Name");
    }
    
    if (!formData.code.trim()) {
      emptyFields.push("Package Code");
    }
    
    // If any fields are empty, show general message first
    if (emptyFields.length > 0) {
      alert("Please enter all fields!\n\nMissing fields:\n- " + emptyFields.join("\n- "));
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      // IMPORTANT: Recalculate packageTotal from current testList to ensure accuracy
      const calculatedTotal = testList.reduce((sum, test) => sum + (test.charge || 0), 0);
      
      const packageData = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        charges: formData.charges ? parseFloat(formData.charges) : 0,
        packageTotal: calculatedTotal, // Use recalculated value, not state
        testIds: testList.map(test => test.id)
      };
      
      console.log('📦 Sending package data to API:', packageData);
      console.log('💰 Total Charges Info:', {
        testCount: testList.length,
        testCharges: testList.map(t => ({ name: t.name, charge: t.charge })),
        calculatedTotal: calculatedTotal,
        packageTotal: packageData.packageTotal
      });
      
      console.log('🔍 Frontend sending:');
      console.log('   - charges (manual):', formData.charges);
      console.log('   - packageTotal (test sum):', calculatedTotal);
      console.log('   - testIds:', testIds);
      
      let response;
      if (isAddMode) {
        response = await fetch(`${API_BASE_URL}/master/packages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(packageData)
        });
      } else if (isEditMode) {
        response = await fetch(`${API_BASE_URL}/master/packages/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(packageData)
        });
      }
      
      const result = await response.json();
      
      console.log('📨 API Response:', result);
      
      if (result.success) {
        setShowMessage(true);
        
        // Hide message and navigate after 2 seconds
        setTimeout(() => {
          setShowMessage(false);
          router.push("/master/packagelist");
        }, 2000);
      } else {
        setError(result.message || 'Failed to save package');
      }
    } catch (error) {
      console.error('Error saving package:', error);
      setError('Failed to save package. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isViewMode) return "View Package";
    if (isEditMode) return "Edit Package";
    return "Add Packages";
  };

  return (
    <>
      <Header />
      <div className="p-3 sm:p-4 md:p-6 bg-white min-h-screen flex justify-center">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 max-w-3xl w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-3 py-2 border-b border-gray-300 gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900">
              {getTitle()}
            </h2>

            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-xs bg-gray-100 px-3 py-1.5 rounded-md hover:bg-gray-200 w-full sm:w-auto justify-center"
            >
              <ArrowLeft size={14} />
              Back To List
            </button>
          </div>

          {/* Success Message */}
          {showMessage && (
            <div className="mx-3 mt-3 p-2 bg-green-100 border border-green-400 text-green-700 rounded flex items-center justify-between text-xs sm:text-sm">
              <span className="font-medium">
                ✓ Package {isAddMode ? "saved" : "updated"} successfully!
              </span>
              <button 
                onClick={() => setShowMessage(false)}
                className="text-green-700 hover:text-green-900 font-bold text-lg"
              >
                ×
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-3 mt-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between text-xs sm:text-sm">
              <span className="font-medium">❌ {error}</span>
              <button 
                onClick={() => setError("")}
                className="text-red-700 hover:text-red-900 font-bold text-lg"
              >
                ×
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (isEditMode || isViewMode) && (
            <div className="mx-3 mt-3 p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading package data...</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              {/* Package Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-2 sm:gap-4">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-gray-700">
                  <Package size={14} className="text-cyan-600" />
                  Package Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className="md:col-span-2 border border-gray-300 rounded-md px-2 py-1.5 sm:py-1 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Package Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-2 sm:gap-4">
                <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2 text-gray-700">
                  <Hash size={16} className="text-cyan-600" />
                  Package Code
                </label>

                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className="md:col-span-2 border border-gray-300 rounded-md px-2 py-1.5 sm:py-1 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Description */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-2 sm:gap-4">
                <label className="text-xs sm:text-sm font-medium text-gray-700 mt-1">
                  Description
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter package description"
                  disabled={isViewMode}
                  rows={3}
                  className="md:col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Charges */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-start md:items-center gap-2 sm:gap-4">
                <label className="text-xs sm:text-sm font-medium text-gray-700">
                  Charges (₹)
                </label>

                <input
                  type="text"
                  name="charges"
                  value={formData.charges}
                  onChange={handleChange}
                  placeholder="0"
                  disabled={isViewMode}
                  className="md:col-span-2 border border-gray-300 rounded-md px-2 py-1.5 sm:py-1 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              {/* Lab Tests */}
              <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-2 sm:gap-4 relative" data-lab-tests-container>
                <label className="text-xs sm:text-sm font-medium flex items-center gap-1.5 mt-0 md:mt-2 text-gray-700">
                  <FlaskConical size={14} className="text-cyan-600" />
                  Lab Tests
                </label>

                <div className="md:col-span-2 relative">
                  <input
                    type="text"
                    name="labTests"
                    value={formData.labTests}
                    onChange={handleChange}
                    placeholder="Search Laboratory"
                    disabled={isViewMode}
                    autoComplete="off"
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 sm:py-1 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  
                  {/* Dropdown for search results */}
                  {showDropdown && searchResults.length > 0 && !isViewMode && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-cyan-400 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((test) => (
                        <div
                          key={test.id}
                          onClick={() => handleAddTest(test)}
                          className="px-3 py-2 text-xs sm:text-sm hover:bg-cyan-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                        >
                          <span>{test.name}</span>
                          <span className="text-gray-600 font-semibold">₹ {test.charge || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Show message if no results */}
                  {showDropdown && searchResults.length === 0 && formData.labTests.trim() && !isViewMode && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                      <div className="px-3 py-2 text-xs sm:text-sm text-gray-500">
                        No tests found
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Test List - Show in all modes */}
            {testList.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Tests in Package:</h3>
                  <div className="text-xs sm:text-sm font-semibold text-gray-700">
                    Total: <span className="text-orange-600">₹ {totalCharges.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {testList.map((test) => (
                    <div 
                      key={test.id} 
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 px-3 py-2 rounded border text-xs sm:text-sm gap-2"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-700">{test.name}</div>
                        <div className="text-gray-600">Charge: ₹ {test.charge || 0}</div>
                      </div>
                      {!isViewMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTest(test.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition w-full sm:w-auto"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          {!isViewMode && (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row justify-end gap-2 px-3 sm:px-4 py-3 border-t bg-gray-50">
              <button
                onClick={() => router.back()}
                type="button"
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1.5 text-xs sm:text-sm rounded-md transition-colors w-full sm:w-auto"
              >
                Cancel
              </button>
              
              <button 
                type="submit"
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 text-xs sm:text-sm rounded-md transition-colors w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (isAddMode ? "Save" : "Update")}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default AddPackage;
