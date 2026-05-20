"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import { Save, ArrowLeft, Eye, FlaskConical, Hash, Phone, MapPin, Edit } from "lucide-react";
import Header from "@/src/components/Header";

// Mock outsourcing data
const mockOutsourcingData = [
  {
    id: 1,
    labName: "PathLab Diagnostics",
    code: "PL001",
    mobile: "9876543210",
    address: "123 Medical Street, Mumbai - 400001",
  },
  {
    id: 2,
    labName: "MediTest Laboratory",
    code: "MT002",
    mobile: "9876543211",
    address: "456 Health Avenue, Delhi - 110001",
  },
];

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
  });
  const [showMessage, setShowMessage] = useState(false);

  // Fetch lab data when in view or edit mode
  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      const idStr = Array.isArray(id) ? id[0] : id;
      const lab = mockOutsourcingData.find((l) => l.id === parseInt(idStr));
      if (lab) {
        setFormData({
          labName: lab.labName,
          code: lab.code || "",
          mobile: lab.mobile,
          address: lab.address,
        });
      }
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

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (isViewMode) return;
    
    // Validate required fields
    if (!formData.labName.trim()) {
      alert("Lab Name is required!");
      return;
    }
    
    if (!formData.code.trim()) {
      alert("Code is required!");
      return;
    }
    
    // Validate mobile number if provided
    if (formData.mobile && formData.mobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits!");
      return;
    }
    
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      alert("Mobile number must contain only digits!");
      return;
    }
    
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
      router.back();
    }, 2000);
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

  const getSuccessMessage = () => {
    if (isEditMode) return "✓ Outsource Lab updated successfully!";
    return "✓ Outsource Lab saved successfully!";
  };

  return (
    <>
      <Header />

      <div className="p-6 min-h-screen bg-cyan-50 flex justify-center items-start">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-xl w-full">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
              <h2 className="flex items-center gap-2 font-semibold text-cyan-700">
                {getTitleIcon()} {getTitle()}
              </h2>
              <button
                type="button"
                onClick={() => router.back()}
                className="hover:bg-cyan-100 p-1 rounded"
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            {/* Success Message */}
            {showMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 p-2 rounded">
                {getSuccessMessage()}
              </div>
            )}

            {/* Lab Name */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                <FlaskConical size={16} /> Lab Name *
              </label>
              <input
                type="text"
                name="labName"
                value={formData.labName}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Enter Lab Name"
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={!isViewMode}
              />
            </div>

            {/* Code */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                <Hash size={16} /> Code *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Enter code"
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required={!isViewMode}
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
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
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Address */}
            <div>
              <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                <MapPin size={16} /> Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isViewMode}
                placeholder="Address"
                rows={3}
                className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
              />
            </div>

            {/* Submit Button */}
            {!isViewMode && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
                >
                  <Save size={16} />
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
