import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header.jsx";
import PageHeader from "../../components/BreadCrumb.jsx";
import {
  Search,
  RotateCcw,
  Pencil,
  IndianRupee,
  Trash2,
  Package,
  Eye,
  Edit
} from "lucide-react";

const PackagesTable = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
  }, []);

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

  const filteredData = packages.filter((pkg) => {
    // When "Show Inactive" is checked, show ONLY inactive packages
    if (showInactive && pkg.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active packages
    if (!showInactive && !pkg.isActive) return false;
    
    // Filter by search
    return (
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.code?.toLowerCase().includes(search.toLowerCase()) ||
      pkg.center?.toLowerCase().includes(search.toLowerCase())
    );
  });
  
  // Reset search
  const handleReset = () => {
    setSearch("");
  };

  // Toggle Active / Inactive with dynamic message (like TestList)
  const handleToggleActive = async (id) => {
    const currentPkg = packages.find((p) => p.id === id);

    const message = currentPkg.isActive
      ? `Do you want to Inactivate "${currentPkg.name}"?\n\nThe package will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentPkg.name}"?\n\nThe package will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/packages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentPkg.isActive
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(currentPkg.isActive ? "Package inactivated successfully!" : "Package activated successfully!");
        fetchPackages(); // Refresh the list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating package:', error);
      alert('Failed to update package');
    } finally {
      setLoading(false);
    }
  };

  // Delete package
  const handleDelete = async (id, name) => {
    const confirm = window.confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/packages/${id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Package deleted successfully!');
        fetchPackages(); // Refresh the list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      alert('Failed to delete package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Header/>
    <div className="p-3 sm:p-4 md:p-6 bg-cyan-50 min-h-screen">
      {/* Header */}
      <PageHeader 
        title="Packages" 
        icon={Package}
        path="Master"
      />

      {/* Top Bar - Search, Reset, Show Inactive, Add in Single Row */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search By Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-full sm:w-64 text-xs sm:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />

          <button 
            onClick={handleReset}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-xs sm:text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto disabled:opacity-50"
          >
            <RotateCcw size={16} />
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
          onClick={() => navigate("/master/packagelist/add")}
          disabled={loading}
          className="bg-cyan-600 text-white px-4 py-2 rounded text-xs sm:text-sm hover:bg-cyan-700 transition-colors w-full sm:w-auto disabled:opacity-50"
        >
          + Add New Package
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mb-4 p-4 bg-white rounded shadow-md text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
          <p className="mt-2 text-gray-600">Loading packages...</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow-md">
        <table className="w-full text-xs sm:text-sm border-collapse min-w-[700px]">
          <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
            <tr>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Sr.No</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Name</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Code</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Department</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Center</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Tests</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Active</th>
              <th className="border border-cyan-800 px-3 py-1 text-center font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500 border border-gray-300">
                  {packages.length === 0 
                    ? "No packages found. Click 'Add New Package' to create one."
                    : showInactive 
                      ? "No inactive packages found. All packages are currently active."
                      : "No active packages found. Check 'Show Inactive' to see inactive packages."
                  }
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`hover:bg-gray-50 border-b border-gray-200 ${
                    !item.isActive ? 'bg-gray-100 opacity-60' : ''
                  }`}
                >
                  <td className="border border-gray-300 px-3 py-1">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-1 font-medium">{item.name}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.code || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.department?.name || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.center || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">
                    <span className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs">
                      {item.packageTests?.length || 0} tests
                    </span>
                  </td>
                  
                  {/* Active column - just display text */}
                  <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-sm">
                    {item.isActive ? "Yes" : "No"}
                  </td>

                  <td className="border border-gray-300 px-3 py-1">
                    <div className="flex justify-center gap-1 flex-wrap">
                      <button 
                        onClick={() => navigate(`/master/packagelist/view/${item.id}`)}
                        disabled={loading}
                        className="bg-cyan-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-cyan-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Eye size={12} /> View
                      </button>

                      <button 
                        onClick={() => navigate(`/master/packagelist/edit/${item.id}`)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit size={12} /> Edit
                      </button>

                      <button 
                        onClick={() => navigate(`/master/packagelist/charges/${item.id}`)}
                        disabled={loading}
                        className="bg-yellow-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-yellow-700 transition-colors disabled:opacity-50"
                      >
                        Charges
                      </button>

                      {/* Active/Inactive Toggle Button (like TestList) */}
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        disabled={loading}
                        className={`px-2 py-1 rounded text-[10px] sm:text-xs text-white transition-colors disabled:opacity-50 ${
                          item.isActive
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-900 hover:bg-gray-900"
                        }`}
                        title={item.isActive ? "Click to inactivate package" : "Click to activate package"}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>

                      <button 
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={loading}
                        className="bg-red-500 text-white px-2 py-1 rounded text-[10px] sm:text-xs hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Permanently delete package"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default PackagesTable;
