"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Eye, FlaskConical, Hash, Phone, MapPin } from "lucide-react";
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

const ViewOutsourcing = () => {
  const router = useRouter();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    labName: "",
    code: "",
    mobile: "",
    address: "",
    selectedTests: [] as number[],
    testCharges: {} as { [key: number]: number },
  });

  useEffect(() => {
    if (id) {
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
  }, [id]);

  return (
    <>
      <Header />

      <div className="p-6 min-h-screen bg-cyan-50">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-4 max-w-4xl mx-auto">
          <form className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
              <h2 className="flex items-center gap-2 font-semibold text-cyan-700">
                <Eye size={20} /> VIEW OUTSOURCE LAB
              </h2>
              <button
                type="button"
                onClick={() => router.back()}
                className="hover:bg-cyan-100 p-1 rounded"
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            {/* Section 1: Lab Details */}
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-3 text-cyan-800">Lab Details</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Lab Name */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                    <FlaskConical size={16} /> Lab Name
                  </label>
                  <input
                    type="text"
                    value={formData.labName}
                    disabled
                    className="w-full border border-cyan-600 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                    <Hash size={16} /> Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    disabled
                    className="w-full border border-cyan-600 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                    <Phone size={16} /> Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    disabled
                    className="w-full border border-cyan-600 rounded px-2 py-1 bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="flex gap-2 items-center text-sm font-medium text-cyan-800">
                    <MapPin size={16} /> Address
                  </label>
                  <textarea
                    value={formData.address}
                    disabled
                    rows={2}
                    className="w-full border border-cyan-600 rounded px-2 py-1 bg-gray-100 cursor-not-allowed resize-none col-span-2"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Tests Available */}
            <div className="border-b pb-4">
              <h3 className="font-bold text-lg mb-3 text-cyan-800">Tests Available at This Lab</h3>
              
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded bg-gray-50">
                {mockTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center gap-2 p-2 rounded bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedTests.includes(test.id)}
                      disabled
                      className="w-4 h-4 accent-cyan-600 cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-700">{test.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Test Charges */}
            {formData.selectedTests.length > 0 && (
              <div className="border-b pb-4">
                <h3 className="font-bold text-lg mb-3 text-cyan-800">Charges for Selected Tests</h3>
                
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
                          <tr key={testId} className="bg-white">
                            <td className="border border-gray-300 p-2">{test?.name}</td>
                            <td className="border border-gray-300 p-2 font-semibold">
                              ₹ {formData.testCharges[testId] || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Back Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ViewOutsourcing;
