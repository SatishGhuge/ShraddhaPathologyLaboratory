"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

import Header from "@/src/components/Header";
import { ArrowLeft } from "lucide-react";
import { getAllPackages } from "@/src/api/master";

const AddPackageCharges = () => {
  const router = useRouter();
  const { id } = useParams();
  
  const [b2cCharge, setB2cCharge] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [packages, setPackages] = useState<any[]>([]);
  const [packageInfo, setPackageInfo] = useState<any>(null);

  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Load specific package data if ID is provided — only on initial load
  useEffect(() => {
    if (id && packages.length > 0 && !packageInfo) {
      const idStr = Array.isArray(id) ? id[0] : id;
      const selectedPkg = packages.find(pkg => pkg.id === parseInt(idStr));
      if (selectedPkg) {
        setSelectedPackage(selectedPkg.name);
        setPackageInfo(selectedPkg);
        setB2cCharge(selectedPkg.b2cCharge || "");
      }
    }
  }, [id, packages]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError("");
      
      const result = await getAllPackages(1, 100);
      
      if (result && Array.isArray(result)) {
        setPackages(result);
      } else {
        setError('Failed to load packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Handle package selection and update charges
  const handlePackageChange = (selectedPackageName: any) => {
    setSelectedPackage(selectedPackageName);
    
    const selectedPkg = packages.find(pkg => pkg.name === selectedPackageName);
    if (selectedPkg) {
      setPackageInfo(selectedPkg);
      setB2cCharge(selectedPkg.b2cCharge || "");
      setError("");
    } else {
      setPackageInfo(null);
      setB2cCharge("");
    }
  };

  const handleSaveCharges = async () => {
    // Validation
    if (!packageInfo) {
      setError("Please select a package!");
      return;
    }

    if (!b2cCharge) {
      setError("Please enter charge!");
      return;
    }
    
    setError("");

    try {
      setLoading(true);
      
      // Update the package charges directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/packages/${packageInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          b2cCharge: parseFloat(b2cCharge),
          b2bCharge: parseFloat(b2cCharge)
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowMessage(true);
        
        // Update local state with new charges
        setPackages(packages.map(pkg => 
          pkg.id === packageInfo.id 
            ? { ...pkg, b2cCharge: parseFloat(b2cCharge), b2bCharge: parseFloat(b2cCharge) }
            : pkg
        ));
        
        // Update package info
        setPackageInfo({
          ...packageInfo,
          b2cCharge: parseFloat(b2cCharge),
          b2bCharge: parseFloat(b2cCharge)
        });
        
        // Auto redirect after 1.5 seconds
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        setError(result.message || 'Failed to save package charges');
      }
    } catch (error) {
      console.error('Error saving package charges:', error);
      setError('Failed to save package charges. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="p-4 bg-white min-h-screen flex justify-center">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-cyan-700">
              PACKAGE CHARGES - {packageInfo ? packageInfo.name : "Select Package"}
            </h2>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-cyan-700 hover:text-cyan-500 px-3 py-1 rounded transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Success Message - Popup Modal */}
          {showMessage && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-80 text-center">
                <div className="text-green-500 text-4xl mb-3">✓</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Success!</h3>
                <p className="text-sm text-gray-600">Package charges saved successfully!</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between text-sm">
              <span className="font-medium">❌ {error}</span>
              <button 
                onClick={() => setError("")}
                className="text-red-700 hover:text-red-900 font-bold text-lg"
              >
                ×
              </button>
            </div>
          )}

          {/* Main Form Section */}
          <div className="space-y-4">
            {/* Package Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Package</label>
              <select
                value={selectedPackage}
                onChange={(e) => handlePackageChange(e.target.value)}
                disabled={loading}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 bg-white"
              >
                <option value="">-- Select a Package --</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Charges Section */}
            {packageInfo && (
              <>
                {/* Charge */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Charge (₹)</label>
                  <input
                    type="number"
                    value={b2cCharge}
                    onChange={(e) => setB2cCharge(e.target.value)}
                    placeholder="Enter charge"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveCharges}
                  disabled={loading || !packageInfo}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddPackageCharges;
