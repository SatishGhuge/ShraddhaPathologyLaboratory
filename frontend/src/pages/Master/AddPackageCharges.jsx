import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../components/Header.jsx";
import { ArrowLeft, Search } from "lucide-react";

const AddPackageCharges = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [b2bError, setB2bError] = useState("");
  
  const [searchCorporate, setSearchCorporate] = useState("");
  const [charges, setCharges] = useState("");
  const [b2bCharges, setB2bCharges] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [walkinCharge, setWalkinCharge] = useState("");
  const [walkinB2BCharge, setWalkinB2BCharge] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [packages, setPackages] = useState([]);
  const [packageInfo, setPackageInfo] = useState(null);

  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

  // Load specific package data if ID is provided — only on initial load
  useEffect(() => {
    if (id && packages.length > 0 && !packageInfo) {
      const selectedPkg = packages.find(pkg => pkg.id === parseInt(id));
      if (selectedPkg) {
        setSelectedPackage(selectedPkg.name);
        setPackageInfo(selectedPkg);
        setWalkinCharge(selectedPkg.b2cCharge || "");
        setWalkinB2BCharge(selectedPkg.b2bCharge || "");
      }
    }
  }, [id, packages]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/packages/all`);
      const result = await response.json();
      
      if (result.success) {
        setPackages(result.data);
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
  const handlePackageChange = (selectedPackageName) => {
    setSelectedPackage(selectedPackageName);
    
    const selectedPkg = packages.find(pkg => pkg.name === selectedPackageName);
    if (selectedPkg) {
      setPackageInfo(selectedPkg);
      setWalkinCharge(selectedPkg.b2cCharge || "");
      setWalkinB2BCharge(selectedPkg.b2bCharge || "");
    } else {
      setPackageInfo(null);
      setWalkinCharge("");
      setWalkinB2BCharge("");
    }
  };

  // Update Walk-in charges when corporate charges are entered
  const handleChargesChange = (value) => {
    setCharges(value);
    // Also update Walk-in charges
    if (value) {
      setWalkinCharge(value);
    }
  };

  const handleB2BChargesChange = (value) => {
    setB2bCharges(value);
    // Also update Walk-in B2B charges
    if (value) {
      setWalkinB2BCharge(value);
    }
  };

  const handleSaveCharges = async () => {
    // Validation
    if (!packageInfo) {
      alert("Please select a package!");
      return;
    }

    if (!walkinCharge || !walkinB2BCharge) {
      alert("Please enter Walk-in charges!");
      return;
    }

    if (parseFloat(walkinB2BCharge) > parseFloat(walkinCharge)) {
      setB2bError("B2B charge cannot be greater than B2C charge!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Update the package charges directly
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/packages/${packageInfo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          b2cCharge: parseFloat(walkinCharge),
          b2bCharge: parseFloat(walkinB2BCharge)
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowMessage(true);
        
        // Update local state with new charges
        setPackages(packages.map(pkg => 
          pkg.id === packageInfo.id 
            ? { ...pkg, b2cCharge: parseFloat(walkinCharge), b2bCharge: parseFloat(walkinB2BCharge) }
            : pkg
        ));
        
        // Update package info
        setPackageInfo({
          ...packageInfo,
          b2cCharge: parseFloat(walkinCharge),
          b2bCharge: parseFloat(walkinB2BCharge)
        });
        
        setTimeout(() => {
          setShowMessage(false);
        }, 3000);
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
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white text-cyan-700 rounded-t-lg">
            <h2 className="text-lg font-semibold">
              ADD PACKAGE CHARGES - {packageInfo ? packageInfo.name : "Select Package"}
            </h2>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-xl hover:text-cyan-500 text-cyan-800 px-3 py-1 rounded transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Success Message */}
          {showMessage && (
            <div className="mx-4 mt-3 p-2 bg-cyan-100 border border-cyan-400 text-cyan-700 rounded flex items-center justify-between text-sm">
              <span className="font-medium">✓ Package charges saved successfully!</span>
              <button 
                onClick={() => setShowMessage(false)}
                className="text-cyan-700 hover:text-cyan-900 font-bold text-lg"
              >
                ×
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mx-4 mt-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between text-sm">
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
          <div className="p-4">
            {/* Top Row - Search and Package Selection */}
            <div className="mb-4">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-cyan-600 text-white text-sm">
                    <th className="border border-gray-300 px-4 py-2 text-left w-1/4">Search By Corporate Name</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-1/4">Charges</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-1/4">B2B Charges</th>
                    <th className="border border-gray-300 px-4 py-2 text-left w-1/4">Package / Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-gray-300 px-2 py-2">
                      <div className="relative">
                        <Search size={16} className="absolute left-2 top-2 text-gray-400" />
                        <input
                          type="text"
                          value={searchCorporate}
                          onChange={(e) => setSearchCorporate(e.target.value)}
                          placeholder="Search by Corporate Name"
                          className="w-full pl-8 pr-2 py-1 border-0 bg-transparent focus:outline-none text-sm"
                        />
                      </div>
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="number"
                        value={charges}
                        onChange={(e) => handleChargesChange(e.target.value)}
                        placeholder="Enter charges"
                        className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none text-sm"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <input
                        type="number"
                        value={b2bCharges}
                        onChange={(e) => handleB2BChargesChange(e.target.value)}
                        placeholder="Enter B2B charges"
                        className="w-full px-2 py-1 border-0 bg-transparent focus:outline-none text-sm"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedPackage}
                          onChange={(e) => handlePackageChange(e.target.value)}
                          disabled={loading}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                        >
                          <option value="">Select Package</option>
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.name}>
                              {pkg.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveCharges}
                          disabled={loading || !packageInfo}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded text-sm transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Saving...' : 'Save Charges'}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Package Information */}
            {packageInfo && (
              <div className="bg-gray-50 rounded border p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Package Information:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Package ID:</strong> {packageInfo.id}</p>
                  <p><strong>Package Name:</strong> {packageInfo.name}</p>
                  <p><strong>Current B2C Charge:</strong> ₹{packageInfo.b2cCharge || '0'}</p>
                  <p><strong>Current B2B Charge:</strong> ₹{packageInfo.b2bCharge || '0'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B2B Error Popup */}
      {b2bError && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 text-center">
            <div className="text-red-500 text-4xl mb-3">⚠️</div>
            <h3 className="text-base font-semibold text-gray-800 mb-2">Invalid Charge</h3>
            <p className="text-sm text-gray-600 mb-4">{b2bError}</p>
            <button onClick={() => setB2bError("")} className="bg-cyan-600 text-white px-6 py-2 rounded hover:bg-cyan-700 text-sm">OK</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AddPackageCharges;