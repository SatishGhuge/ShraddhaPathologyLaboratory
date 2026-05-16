import { useState, useEffect } from "react";
import { Eye, Edit, Trash2, Plus, Layers, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import PageHeader from "../../components/BreadCrumb.jsx";

const DepartmentTable = () => {
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const navigate = useNavigate();

  // Fetch departments on component mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/departments/all`);
      const result = await response.json();
      
      if (result.success) {
        setDepartments(result.data);
      } else {
        setError('Failed to load departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredDepartments = departments.filter((dept) => {
    // When "Show Inactive" is checked, show ONLY inactive departments
    if (showInactive && dept.isActive) return false;
    
    // When "Show Inactive" is unchecked, show ONLY active departments
    if (!showInactive && !dept.isActive) return false;
    
    // Filter by search
    return (
      dept.name.toLowerCase().includes(search.toLowerCase()) ||
      dept.code?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the department "${name}"?`)) {
      try {
        setLoading(true);
        
        const response = await fetch(`${import.meta.env.VITE_API_URL}/master/departments/${id}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert('Department deleted successfully!');
          fetchDepartments(); // Refresh the list
        } else {
          alert(`Error: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deleting department:', error);
        alert('Failed to delete department');
      } finally {
        setLoading(false);
      }
    }
  };

  // Toggle Active / Inactive with dynamic message (like TestList)
  const handleToggleActive = async (id) => {
    const currentDept = departments.find((d) => d.id === id);

    const message = currentDept.isActive
      ? `Do you want to Inactivate "${currentDept.name}"?\n\nThe department will be hidden from the list but can be reactivated later.`
      : `Do you want to Activate "${currentDept.name}"?\n\nThe department will be visible in the list again.`;

    const confirm = window.confirm(message);
    if (!confirm) return;

    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/departments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isActive: !currentDept.isActive
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(currentDept.isActive ? "Department inactivated successfully!" : "Department activated successfully!");
        fetchDepartments(); // Refresh the list
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  // Reset search
  const handleReset = () => {
    setSearch("");
  };

  return ( 
        <>
      <Header />
            <div className="p-4 sm:p-6 bg-cyan-50 min-h-screen">

      {/* Header */}
      <PageHeader 
        title="Department" 
        icon={Layers}
        path="Master"
      />

      {/* Top Bar - Search, Reset, Show Inactive, Add in Single Row */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 mb-4 bg-white p-4 rounded shadow-md">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search By Keywords"
            className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-full sm:w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600"
          />
          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center justify-center gap-1 w-full sm:w-auto disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <label className="flex items-center gap-2 px-3 py-2 bg-cyan-50 border border-cyan-600 rounded text-sm cursor-pointer hover:bg-cyan-100 transition-colors w-full sm:w-auto">
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
          onClick={() => navigate("/master/departmentlist/add")}
          disabled={loading}
          className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700 transition-colors w-full sm:w-auto disabled:opacity-50"
        >
          + Add Department
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
          <p className="mt-2 text-gray-600">Loading departments...</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow-md">
        <div className="min-w-[700px]">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
            <tr>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Id</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Name</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Code</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Sort Order</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Active</th>
              <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500 border border-gray-300">
                  {departments.length === 0 
                    ? "No departments found. Click 'Add Department' to create one."
                    : showInactive 
                      ? "No inactive departments found. All departments are currently active."
                      : "No active departments found. Check 'Show Inactive' to see inactive departments."
                  }
                </td>
              </tr>
            ) : (
              filteredDepartments.map((dept) => (
                <tr 
                  key={dept.id} 
                  className={`hover:bg-gray-50 border-b border-gray-200 ${
                    !dept.isActive ? 'bg-gray-100 opacity-60' : ''
                  }`}
                >
                  <td className="border border-gray-300 px-3 py-1">{dept.id}</td>
                  <td className="border border-gray-300 px-3 py-1">{dept.name}</td>
                  <td className="border border-gray-300 px-3 py-1">{dept.code || '-'}</td>
                  <td className="border border-gray-300 px-3 py-1">{dept.sortOrder || '-'}</td>
                  
                  {/* Active column - just display text */}
                  <td className="border border-gray-300 px-3 py-1 text-center font-semibold text-sm">
                    {dept.isActive ? "Yes" : "No"}
                  </td>

                  {/* Action column */}
                  <td className="border border-gray-300 px-3 py-1">
                    <div className="flex gap-1 justify-center flex-wrap">
                      <button 
                        onClick={() => navigate(`/master/departmentlist/view/${dept.id}`)}
                        disabled={loading}
                        className="bg-cyan-600 text-white px-2 py-1 rounded text-xs hover:bg-cyan-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button 
                        onClick={() => navigate(`/master/departmentlist/edit/${dept.id}`)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Edit size={14} /> Edit
                      </button>

                      {/* Active/Inactive Toggle Button (like TestList) */}
                      <button
                        onClick={() => handleToggleActive(dept.id)}
                        disabled={loading}
                        className={`px-2 py-1 rounded text-xs text-white transition-colors disabled:opacity-50 ${
                          dept.isActive
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-gray-900 hover:bg-gray-900"
                        }`}
                        title={dept.isActive ? "Click to inactivate department" : "Click to activate department"}
                      >
                        {dept.isActive ? "Active" : "Inactive"}
                      </button>

                      <button
                        onClick={() => handleDelete(dept.id, dept.name)}
                        disabled={loading}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Permanently delete department"
                      >
                        <Trash2 size={14} /> Delete
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
    </div>
    </>
  );
};

export default DepartmentTable;
