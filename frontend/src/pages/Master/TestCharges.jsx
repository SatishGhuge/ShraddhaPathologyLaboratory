import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/Header.jsx";

const TestCharges = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [b2bError, setB2bError] = useState("");
  
  const [charges, setCharges] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState(null);
  
  const [formData, setFormData] = useState({
    b2cCharge: "",
    b2bCharge: "",
    franchiseId: "",
    corporateId: "",
    collectionCenterId: "",
    discountPercent: "",
    specialPrice: "",
    effectiveFrom: "",
    effectiveTo: ""
  });

  const [franchises, setFranchises] = useState([]);
  const [corporates, setCorporates] = useState([]);
  const [collectionCenters, setCollectionCenters] = useState([]);

  useEffect(() => {
    fetchTestDetails();
    fetchCharges();
    fetchDropdownData();
  }, [testId]);

  const fetchTestDetails = async () => {
    try {
      const response = await fetch(`/api/master/tests/${testId}`);
      const result = await response.json();
      if (result.success) {
        setTest(result.data);
      }
    } catch (error) {
      console.error('Error fetching test:', error);
    }
  };

  const fetchCharges = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/master/tests/${testId}/charges`);
      const result = await response.json();
      if (result.success) {
        setCharges(result.data);
      }
    } catch (error) {
      console.error('Error fetching charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [franchiseRes, corporateRes, centerRes] = await Promise.all([
        fetch('/api/master/franchises'),
        fetch('/api/master/corporates'),
        fetch('/api/master/collection-centers')
      ]);

      const [franchiseData, corporateData, centerData] = await Promise.all([
        franchiseRes.json(),
        corporateRes.json(),
        centerRes.json()
      ]);

      if (franchiseData.success) setFranchises(franchiseData.data);
      if (corporateData.success) setCorporates(corporateData.data);
      if (centerData.success) setCollectionCenters(centerData.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.b2cCharge && !formData.b2bCharge) {
      alert('Please enter at least one charge (B2C or B2B)');
      return;
    }

    if (formData.b2cCharge && formData.b2bCharge && parseFloat(formData.b2bCharge) > parseFloat(formData.b2cCharge)) {
      setB2bError('B2B charge cannot be greater than B2C charge');
      return;
    }

    try {
      setLoading(true);
      const url = editingCharge 
        ? `/api/master/test-charges/${editingCharge.id}`
        : '/api/master/test-charges';
      
      const method = editingCharge ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          testId: parseInt(testId)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(editingCharge ? 'Charge updated successfully!' : 'Charge created successfully!');
        setShowForm(false);
        setEditingCharge(null);
        resetForm();
        fetchCharges();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving charge:', error);
      alert('Failed to save charge');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (charge) => {
    setEditingCharge(charge);
    setFormData({
      b2cCharge: charge.b2cCharge?.toString() || "",
      b2bCharge: charge.b2bCharge?.toString() || "",
      franchiseId: charge.franchiseId?.toString() || "",
      corporateId: charge.corporateId?.toString() || "",
      collectionCenterId: charge.collectionCenterId?.toString() || "",
      discountPercent: charge.discountPercent?.toString() || "",
      specialPrice: charge.specialPrice?.toString() || "",
      effectiveFrom: charge.effectiveFrom ? new Date(charge.effectiveFrom).toISOString().split('T')[0] : "",
      effectiveTo: charge.effectiveTo ? new Date(charge.effectiveTo).toISOString().split('T')[0] : ""
    });
    setShowForm(true);
  };

  const handleDelete = async (chargeId) => {
    if (!confirm('Are you sure you want to delete this charge?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/master/test-charges/${chargeId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Charge deleted successfully!');
        fetchCharges();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting charge:', error);
      alert('Failed to delete charge');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      b2cCharge: "",
      b2bCharge: "",
      franchiseId: "",
      corporateId: "",
      collectionCenterId: "",
      discountPercent: "",
      specialPrice: "",
      effectiveFrom: "",
      effectiveTo: ""
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCharge(null);
    resetForm();
  };

  return (
    <>
      <Header />
      <div className="p-4 bg-cyan-50 min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Test Charges - {test?.name}
            </h2>
            <p className="text-sm text-gray-600">Department: {test?.department?.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700"
            >
              Add Charge
            </button>
            <button
              onClick={() => navigate("/master/testlist")}
              className="text-cyan-700 px-4 py-2 rounded text-sm hover:bg-cyan-100"
            >
              Back to Tests
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white border rounded shadow-sm p-4 mb-4">
            <h3 className="text-md font-semibold mb-3">
              {editingCharge ? 'Edit Charge' : 'Add New Charge'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  B2C Charge *
                </label>
                <input
                  type="number"
                  name="b2cCharge"
                  value={formData.b2cCharge}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  B2B Charge *
                </label>
                <input
                  type="number"
                  name="b2bCharge"
                  value={formData.b2bCharge}
                  onChange={handleInputChange}
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600 ${formData.b2cCharge && formData.b2bCharge && parseFloat(formData.b2bCharge) > parseFloat(formData.b2cCharge) ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Franchise
                </label>
                <select
                  name="franchiseId"
                  value={formData.franchiseId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="">Select Franchise</option>
                  {franchises.map(franchise => (
                    <option key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corporate
                </label>
                <select
                  name="corporateId"
                  value={formData.corporateId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="">Select Corporate</option>
                  {corporates.map(corporate => (
                    <option key={corporate.id} value={corporate.id}>
                      {corporate.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection Center
                </label>
                <select
                  name="collectionCenterId"
                  value={formData.collectionCenterId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="">Select Collection Center</option>
                  {collectionCenters.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount %
                </label>
                <input
                  type="number"
                  name="discountPercent"
                  value={formData.discountPercent}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Price
                </label>
                <input
                  type="number"
                  name="specialPrice"
                  value={formData.specialPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective From
                </label>
                <input
                  type="date"
                  name="effectiveFrom"
                  value={formData.effectiveFrom}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Effective To
                </label>
                <input
                  type="date"
                  name="effectiveTo"
                  value={formData.effectiveTo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingCharge ? 'Update' : 'Save')}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Charges List */}
        <div className="bg-white border rounded shadow-sm">
          <div className="p-4 border-b">
            <h3 className="text-md font-semibold">Existing Charges</h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              <p className="mt-2 text-gray-600">Loading charges...</p>
            </div>
          ) : charges.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No charges configured for this test
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">B2C Charge</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">B2B Charge</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Franchise</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Corporate</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Collection Center</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Discount %</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Special Price</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Effective From</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {charges.map((charge) => (
                    <tr key={charge.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">₹{charge.b2cCharge}</td>
                      <td className="px-4 py-3">₹{charge.b2bCharge}</td>
                      <td className="px-4 py-3">{charge.franchise?.name || '-'}</td>
                      <td className="px-4 py-3">{charge.corporate?.name || '-'}</td>
                      <td className="px-4 py-3">{charge.collectionCenter?.name || '-'}</td>
                      <td className="px-4 py-3">{charge.discountPercent}%</td>
                      <td className="px-4 py-3">{charge.specialPrice ? `₹${charge.specialPrice}` : '-'}</td>
                      <td className="px-4 py-3">
                        {new Date(charge.effectiveFrom).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          charge.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {charge.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(charge)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(charge.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

export default TestCharges;