"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { Save, ArrowLeft, Eye, FlaskConical, Hash, Phone, MapPin, Edit } from "lucide-react";
import Header from "@/src/components/Header";

// Mock data
const mockOutsourcingData = [
  {
    id: 1,
    labName: "PathLab Diagnostics",
    code: "PL001",
    mobile: "9876543210",
    address: "123 Medical Street, Mumbai - 400001",
    tests: [1, 3, 5],
    charges: { 1: 500, 3: 800, 5: 1200 },
  },
  {
    id: 2,
    labName: "MediTest Laboratory",
    code: "MT002",
    mobile: "9876543211",
    address: "456 Health Avenue, Delhi - 110001",
    tests: [2, 4],
    charges: { 2: 600, 4: 950 },
  },
];

const mockTests = [
  { id: 1, name: "Complete Blood Count (CBC)" },
  { id: 2, name: "Thyroid Profile" },
  { id: 3, name: "Kidney Function Test" },
  { id: 4, name: "Liver Function Test" },
  { id: 5, name: "Blood Sugar (Fasting)" },
  { id: 6, name: "Lipid Profile" },
  { id: 7, name: "Vitamin B12" },
  { id: 8, name: "Vitamin D" },
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
    selectedTests: [] as number[],
    testCharges: {} as { [key: number]: number },
  });
  const [showMessage, setShowMessage] = useState(false);

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
          selectedTests: lab.tests,
          testCharges: lab.charges,
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

  const handleTestToggle = (testId: number) => {
    if (isViewMode) return;
    setFormData((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter((t) => t !== testId)
        : [...prev.selectedTests, testId],
    }));
  };

  const handleChargeChange = (testId: number, charge: string) => {
    if (isViewMode) return;
    setFormData((prev) => ({
      ...prev,
      testCharges: {
        ...prev.testCharges,
        [testId]: parseFloat(charge) || 0,
      },
    }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (isViewMode) return;
    
    if (!formData.labName.trim()) {
      alert("Lab Name is required!");
      return;
    }
    
    if (!formData.code.trim()) {
      alert("Code is required!");
      return;
    }
    
    if (formData.mobile && formData.mobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits!");
      return;
    }
    
    if (formData.mobile && !/^\d{10}$/.test(formData.mobile)) {
      alert("Mobile number must contain only digits!");
      return;
    }

    if (formData.selectedTests.length === 0) {
      alert("Please select at least one test!");
      return;
    }

    for (const testId of formData.selectedTests) {
      if (!formData.testCharges[testId] || formData.testCharges[testId] <= 0) {
        alert(`Please set a valid charge for ${mockTests.find(t => t.id === testId)?.name}`);
        return;
      }
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

      <div className="p-6 min-h-screen bg-cyan-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-4xl mx-auto">
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

            {/* Section 1: Lab Details */}
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-3 text-cyan-800">Lab Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
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
                    rows={2}
                    className="w-full border border-cyan-600 rounded px-2 py-1 bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none col-span-2"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Tests Available */}
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-3 text-cyan-800">Tests Available at This Lab</h3>
              <p className="text-sm text-gray-600 mb-2">Select which tests this lab can perform *</p>
              
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded bg-gray-50">
                {mockTests.map((test) => (
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
                      className="w-4 h-4 accent-cyan-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{test.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Section 3: Test Charges */}
            {formData.selectedTests.length > 0 && (
              <div className="border-b pb-4">
                <h3 className="font-bold text-lg mb-3 text-cyan-800">Charges for Selected Tests *</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-cyan-100">
                      <tr>
                        <th className="border border-gray-300 p-2 text-left text-cyan-800">Test Name</th>
                        <th className="border border-gray-300 p-2 text-left text-cyan-800">Charge (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.selectedTests.map((testId) => {
                        const test = mockTests.find((t) => t.id === testId);
                        return (
                          <tr key={testId} className="hover:bg-cyan-50">
                            <td className="border border-gray-300 p-2">{test?.name}</td>
                            <td className="border border-gray-300 p-2">
                              <input
                                type="number"
                                value={formData.testCharges[testId] || ""}
                                onChange={(e) => handleChargeChange(testId, e.target.value)}
                                disabled={isViewMode}
                                placeholder="Enter charge"
                                className="w-24 border border-cyan-600 px-2 py-1 rounded bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-600 disabled:bg-gray-100"
                                min="1"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

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
