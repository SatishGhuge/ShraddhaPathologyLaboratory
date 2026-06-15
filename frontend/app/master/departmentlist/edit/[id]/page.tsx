"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import {
  Building2,
  ArrowLeft,
  Save,
  Hash,
  Layers,
  ArrowDownUp,
} from "lucide-react";

// example images (replace with your own)
const img_department = "/img-department.png";
const departmentImg = "/department.png";

const AddDepartment = () => {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  
  // Determine mode based on route
  const isEditMode = pathname.includes('/edit/');
  const isViewMode = pathname.includes('/view/');
  const isAddMode = !isEditMode && !isViewMode;
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    sortOrder: "",
    groupName: "",
    isInactive: false,
  });
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load department data for edit/view mode
  useEffect(() => {
    if ((isEditMode || isViewMode) && id) {
      fetchDepartmentData();
    }
  }, [id, isEditMode, isViewMode]);

  const fetchDepartmentData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/departments/${id}`);
      const result = await response.json();
      
      if (result.success) {
        const dept = result.data;
        setFormData({
          name: dept.name || "",
          code: dept.code || "",
          sortOrder: dept.sortOrder?.toString() || "",
          groupName: dept.groupName || "",
          isInactive: !dept.isActive,
        });
      } else {
        setError('Failed to load department data');
      }
    } catch (error) {
      console.error('Error fetching department:', error);
      setError('Failed to load department data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    // Convert department name to uppercase
    const finalValue = name === 'name' ? value.toUpperCase() : (type === 'checkbox' ? checked : value);
    setFormData({ 
      ...formData, 
      [name]: finalValue
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validation: Check if required fields are empty
    const emptyFields = [];
    
    if (!formData.name.trim()) {
      emptyFields.push("Department Name");
    }
    
    if (!formData.code.trim()) {
      emptyFields.push("Department Code");
    }
    
    if (!formData.sortOrder.trim()) {
      emptyFields.push("Sort Order");
    }
    
    // If any fields are empty, show general message first
    if (emptyFields.length > 0) {
      alert("Please enter all fields!\n\nMissing fields:\n- " + emptyFields.join("\n- "));
      return;
    }
    
    try {
      setLoading(true);
      setError("");
      
      const departmentData = {
        name: formData.name,
        code: formData.code,
        sortOrder: parseInt(formData.sortOrder),
        isActive: !formData.isInactive
      };
      
      let response;
      if (isAddMode) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/departments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(departmentData)
        });
      } else if (isEditMode) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/departments/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(departmentData)
        });
      }
      
      if (!response) throw new Error('No response from server');
      const result = await response.json();
      
      if (result.success) {
        setShowMessage(true);
        
        // Hide message and navigate after 2 seconds
        setTimeout(() => {
          setShowMessage(false);
          router.push("/master/departmentlist");
        }, 2000);
      } else {
        setError(result.message || 'Failed to save department');
      }
    } catch (error) {
      console.error('Error saving department:', error);
      setError('Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic styling based on mode
  const headerBgColor = "border-b";
  const inputBorder = "border-cyan-600";
  const inputBg = "bg-cyan-50";
  const focusRing = "focus:ring-cyan-600";
  const messageBg = "bg-green-100 border-green-400 text-green-700";
  const messageHover = "text-green-700 hover:text-green-900";
  const displayImage = isAddMode ? img_department : departmentImg;
  const imageBg = "";
  
  const getTitle = () => {
    if (isViewMode) return "View Department";
    if (isEditMode) return "Edit Department";
    return "Add New Department";
  };

  const getSuccessMessage = () => {
    if (isAddMode) return "✓ Department saved successfully!";
    return "✓ Department updated successfully!";
  };

  return (
    <>
      <Header/>
      <div className="min-h-screen bg-cyan-50 p-3 sm:p-4 md:p-6 pt-4 sm:pt-6 md:pt-8">
        <div className="max-w-xl mx-auto bg-white rounded shadow-lg border">
          {/* Header */}
          <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center px-3 sm:px-4 py-3 gap-2 sm:gap-0 ${headerBgColor}`}>
            <div className="flex items-center gap-2">
              <Building2 className="text-cyan-700" size={20} />
              <h2 className={`text-base sm:text-lg font-semibold text-cyan-700`}>
                {getTitle()}
              </h2>
            </div>

            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-700 text-xs sm:text-sm px-3 py-1.5 sm:py-1 border rounded text-white transition-colors w-full sm:w-auto justify-center"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>

          {/* Image Display */}
          <div className={`flex justify-center py-3 sm:py-4 ${imageBg}`}>
            <img
              src={displayImage}
              alt="Department"
              className="h-16 sm:h-20 md:h-24 object-contain"
            />
          </div>

          {/* Success Message */}
          {showMessage && (
            <div className={`mx-3 sm:mx-4 mb-4 p-2 sm:p-3 ${messageBg} border rounded flex items-center justify-between text-sm`}>
              <span className="font-medium">{getSuccessMessage()}</span>
              <button 
                onClick={() => setShowMessage(false)}
                className={`${messageHover} font-bold text-lg`}
              >
                ×
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-3 sm:mx-4 mb-4 p-2 sm:p-3 bg-red-100 border-red-400 text-red-700 border rounded flex items-center justify-between text-sm">
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
            <div className="mx-3 sm:mx-4 mb-4 p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
              <p className="mt-2 text-gray-600 text-sm">Loading department data...</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Row 1: ID (view only) and Code */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* ID Field - Only shown in View Mode */}
              {isViewMode && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 text-cyan-800">ID</label>
                  <div className="relative">
                    <Hash
                      className="absolute left-2 top-2.5 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      value={id || ''}
                      disabled
                      className="w-full pl-8 border border-cyan-600 rounded px-2 py-1.5 sm:py-1 bg-gray-100 cursor-not-allowed font-semibold text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Code */}
              <div className={isViewMode ? "" : "sm:col-span-2"}>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-cyan-800">Code</label>
                <div className="relative">
                  <Hash
                    className="absolute left-2 top-2.5 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={isViewMode}
                    autoComplete="off"
                    className={`w-full pl-8 border ${inputBorder} rounded px-2 py-1.5 sm:py-1 ${inputBg} focus:outline-none focus:ring-2 ${focusRing} disabled:bg-gray-100 disabled:cursor-not-allowed text-sm`}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Name and Sort Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-cyan-800">Name</label>
                <div className="relative">
                  <Layers
                    className="absolute left-2 top-2.5 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isViewMode}
                    autoComplete="off"
                    style={{ textTransform: 'uppercase' }}
                    className={`w-full pl-8 border ${inputBorder} rounded px-2 py-1.5 sm:py-1 ${inputBg} focus:outline-none focus:ring-2 ${focusRing} disabled:bg-gray-100 disabled:cursor-not-allowed text-sm`}
                  />
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-cyan-800">
                  Sort Order
                </label>
                <div className="relative">
                  <ArrowDownUp
                    className="absolute left-2 top-2.5 text-gray-400"
                    size={16}
                  />
                  <input
                    type="number"
                    name="sortOrder"
                    value={formData.sortOrder}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className={`w-full pl-8 border ${inputBorder} rounded px-2 py-1.5 sm:py-1 ${inputBg} focus:outline-none focus:ring-2 ${focusRing} disabled:bg-gray-100 disabled:cursor-not-allowed text-sm`}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Group Name and Make Inactive - Only for Edit/View Mode */}
            {(isEditMode || isViewMode) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
                {/* Group Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 text-cyan-800">Group Name</label>
                  <div className="relative">
                    <Layers
                      className="absolute left-2 top-2.5 text-gray-400"
                      size={16}
                    />
                    <input
                      type="text"
                      name="groupName"
                      value={formData.groupName}
                      onChange={handleChange}
                      disabled={isViewMode}
                      className={`w-full pl-8 border ${inputBorder} rounded px-2 py-1.5 sm:py-1 ${inputBg} focus:outline-none focus:ring-2 ${focusRing} disabled:bg-gray-100 disabled:cursor-not-allowed text-sm`}
                    />
                  </div>
                </div>

                {/* Make Inactive Checkbox */}
                <div className="flex items-center gap-2 pb-0 sm:pb-1">
                  <input
                    type="checkbox"
                    name="isInactive"
                    checked={formData.isInactive}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <label className="text-xs sm:text-sm font-medium">Make Inactive?</label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!isViewMode && (
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 sm:py-1.5 rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 sm:py-1.5 rounded transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : (isAddMode ? "Save" : "Update")}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default AddDepartment;
