"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { Save, ArrowLeft, Eye, FlaskConical, Hash, Phone, MapPin, Edit, Loader } from "lucide-react";
import Header from "@/src/components/Header";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const AddOutsourcing = () => {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  
  const isViewMode = pathname.includes("/view/");
  const isEditMode = pathname.includes("/edit/");

  const [formData, setFormData] = useState({
    labName: "",
    code: "",
    mobile: "",
    address: "",
    selectedTests: [] as number[],
  });

  const [allTests, setAllTests] = useState<any[]>([]);
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch available tests
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/master/outsourcing/available-tests`);
        const result = await response.json();
        if (result.success) {
          setAllTests(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch tests:', err);
      }
    };

    fetchTests();
  }, []);

  // Fetch lab data when editing
  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      const fetchLab = async () => {
        try {
          const idStr = Array.isArray(id) ? id[0] : id;
          const response = await fetch(`${API_BASE_URL}/master/outsourcing/${idStr}`);
          const result = await response.json();
          
          if (result.success) {
            const lab = result.data;
            setFormData({
              labName: lab.labName,
              code: lab.code,
              mobile: lab.mobile || "",
              address: lab.address || "",
              selectedTests: lab.tests.map((t: any) => t.testId),
            });
          }
        } catch (err) {
          console.error('Failed to fetch lab:', err);
          setError('Failed to load lab details');
        }
      };

      fetchLab();
    }
  }, [id, isViewMode, isEditMode]);

  const handleChange = (e: any) => {
    if (isViewMode) return;
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTestToggle = (testId: number) => {
    if (isViewMode) return;
    setFormData((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter((t) => t !== testId)
        : [...prev.selectedTests, testId],
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (isViewMode) return;
    
    if (!formData.labName.trim()) {
      setError("Lab Name is required!");
      return;
    }
    
    if (!formData.code.trim()) {
      setError("Code is required!");
      return;
    }
    
    if (formData.mobile && formData.mobile.length !== 10) {
      setError("Mobile number must be exactly 10 digits!");
      return;
    }
    
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      setError("Mobile number must contain only digits!");
      return;
    }

    if (formData.selectedTests.length === 0) {
      setError("Please select at least one test!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `${API_BASE_URL}/master/outsourcing/${id}`
        : `${API_BASE_URL}/master/outsourcing`;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labName: formData.labName,
          code: formData.code,
          mobile: formData.mobile || null,
          address: formData.address || null,
          selectedTests: formData.selectedTests,
        })
      });

      const result = await response.json();

      if (result.success) {
        setShowMessage(true);
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        setError(result.message || 'Failed to save lab');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to save lab. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isViewMode) return "VIEW OUTSOURCE LAB";
    if (isEditMode) return "EDIT OUTSOURCE LAB";
    return "ADD OUTSOURCE LAB";
  };

  const getTitleIcon = () => {
    if (isViewMode) return <Eye size={20} />;
    if (isEditMode) return <Edit size={20} />;
    return <FlaskConical size={20} />;
  };

  const getButtonText = () => {
    if (isEditMode) return "Update";
    return "Submit";
  };

  return (
    <>
      <Header />

      <div className="p-6 min-h-screen bg-white">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                {getTitleIcon()} {getTitle()}
              </h2>
              <button
                type="button"
                onClick={() => router.back()}
                className="hover:bg-orange-100 p-1 rounded"
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded">
                {error}
              </div>
            )}

            {/* Success Message */}
            {showMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded">
                ✓ {isEditMode ? "Outsource Lab updated" : "Outsource Lab saved"} successfully!
              </div>
            )}

            {/* Section 1: Lab Details */}
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Lab Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Lab Name */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
                    <FlaskConical size={16} /> Lab Name *
                  </label>
                  <input
                    type="text"
                    name="labName"
                    value={formData.labName}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="Enter Lab Name"
                    className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
                    <Hash size={16} /> Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="Enter code"
                    className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
                    <Phone size={16} /> Mobile
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    disabled={isViewMode}
                    pattern="\d{10}"
                    maxLength={10}
                    placeholder="Mobile"
                    className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-gray-700">
                    <MapPin size={16} /> Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={isViewMode}
                    placeholder="Address"
                    rows={2}
                    className="w-full border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none col-span-2"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Tests Available */}
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">Tests Available at This Lab</h3>
              <p className="text-sm text-gray-600 mb-2">Select which tests this lab can perform *</p>
              
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded bg-gray-50">
                {allTests.map((test) => (
                  <label
                    key={test.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isViewMode ? "cursor-not-allowed opacity-60" : "hover:bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedTests.includes(test.id)}
                      onChange={() => handleTestToggle(test.id)}
                      disabled={isViewMode}
                      className="w-4 h-4 accent-orange-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{test.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            {!isViewMode && (
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  {getButtonText()}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default AddOutsourcing;
