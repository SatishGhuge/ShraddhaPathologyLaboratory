"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, TestTube, RotateCwIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { getSpecimenTypes, createSpecimenType, updateSpecimenType, deleteSpecimenType } from "@/src/api/master";

// Common color name <-> hex map
const COLOR_MAP = {
  red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00',
  orange: '#ffa500', purple: '#800080', pink: '#ffc0cb', brown: '#a52a2a',
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080',
  cyan: '#00ffff', magenta: '#ff00ff', lime: '#00ff00', maroon: '#800000',
  navy: '#000080', olive: '#808000', teal: '#008080', violet: '#ee82ee',
  gold: '#ffd700', silver: '#c0c0c0', indigo: '#4b0082', coral: '#ff7f50',
  salmon: '#fa8072', khaki: '#f0e68c', lavender: '#e6e6fa', beige: '#f5f5dc',
};

// Reverse: hex -> closest name
const HEX_TO_NAME = Object.fromEntries(Object.entries(COLOR_MAP).map(([k, v]) => [v, k]));

function hexToColorName(hex: any) {
  const lower = hex.toLowerCase();
  if (HEX_TO_NAME[lower]) return HEX_TO_NAME[lower];
  // Find closest by RGB distance
  let minDist = Infinity, closest = hex;
  const r1 = parseInt(hex.slice(1, 3), 16);
  const g1 = parseInt(hex.slice(3, 5), 16);
  const b1 = parseInt(hex.slice(5, 7), 16);
  for (const [name, h] of Object.entries(COLOR_MAP)) {
    const r2 = parseInt(h.slice(1, 3), 16);
    const g2 = parseInt(h.slice(3, 5), 16);
    const b2 = parseInt(h.slice(5, 7), 16);
    const dist = Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
    if (dist < minDist) { minDist = dist; closest = name; }
  }
  return closest;
}

// Resolve any color string to a valid CSS color for the picker (must be hex)
function toHex(color: any) {
  if (!color) return '#cccccc';
  const lower = color.trim().toLowerCase();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  // Try browser canvas resolution
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      const computed = ctx.fillStyle;
      if (typeof computed === 'string' && /^#[0-9a-f]{6}$/i.test(computed)) return computed;
    }
  } catch (_) {}
  return '#cccccc';
}

export default function SampleTypes() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  const [showModal, setShowModal] = useState(false);
  const [sampleType, setSampleType] = useState("");
  const [sampleColor, setSampleColor] = useState("");

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [editId, setEditId] = useState<any>(null);

  // Fetch specimen types from API
  const fetchSpecimenTypes = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await getSpecimenTypes(page, ITEMS_PER_PAGE);
      setData(response);
      setPagination(null);
    } catch (error) {
      console.error('Error fetching specimen types:', error);
      setErrorMsg('Failed to fetch specimen types');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchSpecimenTypes(1);
  }, []);

  const filteredData = data.filter((item) =>
    item?.Sample_Type?.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    fetchSpecimenTypes(1);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this specimen type?")) {
      try {
        const result = await deleteSpecimenType(id);
        
        if (result?.success) {
          setSuccessMsg('Specimen type deleted successfully');
          setCurrentPage(1);
          fetchSpecimenTypes(1);
          setTimeout(() => setSuccessMsg(''), 3000);
        } else {
          setErrorMsg(result?.message || 'Failed to delete specimen type');
        }
      } catch (error: any) {
        console.error('Error deleting specimen type:', error);
        const errorMessage = error?.response?.message || error?.message || 'Failed to delete specimen type';
        setErrorMsg(errorMessage);
      }
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setSampleType("");
    setSampleColor("");
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditId(item.id);
    setSampleType(item.Sample_Type);
    setSampleColor(item.Sample_Color);
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const type = sampleType.trim();
    const color = sampleColor.trim();

    if (!type || !color) {
      setErrorMsg("Both Sample Type and Sample Color are required.");
      setSuccessMsg("");
      return;
    }

    try {
      const requestData = {
        Sample_Type: type,
        Sample_Color: color
      };

      let result;
      if (editId) {
        // Update existing specimen type
        result = await updateSpecimenType(editId, requestData);
      } else {
        // Create new specimen type
        result = await createSpecimenType(requestData);
      }

      // Handle response from API
      if (result?.success) {
        setSuccessMsg(editId ? 'Specimen type updated successfully' : 'Specimen type created successfully');
        setErrorMsg("");
        setShowModal(false);
        setSampleType("");
        setSampleColor("");
        setCurrentPage(1);
        fetchSpecimenTypes(1);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else if (result?.message) {
        setErrorMsg(result.message);
        setSuccessMsg("");
      } else {
        setErrorMsg('Failed to save specimen type');
        setSuccessMsg("");
      }
    } catch (error: any) {
      console.error('Error saving specimen type:', error);
      const errorMessage = error?.response?.message || error?.message || 'Failed to save specimen type';
      setErrorMsg(errorMessage);
      setSuccessMsg("");
    }
  };

  return (
    <>

      <div className="min-h-screen bg-white p-6">

        {/* Success/Error Messages */}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMsg}
          </div>
        )}
        
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {errorMsg}
          </div>
        )}

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search By Sample Types"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <button
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCwIcon size={18} />
              Reset
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            + Add
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
              <p className="mt-2 text-gray-600">Loading specimen types...</p>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Sample Type</th>
                  <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Sample Color</th>
                  <th className="border border-gray-300 px-3 py-1 text-center font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{item.Sample_Type}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex items-center gap-2">
                        {/* Colored test tube SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(45deg)' }}>
                          <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={item.Sample_Color || '#cccccc'} stroke="#555" strokeWidth="1.2"/>
                          <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                          <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                        </svg>
                        <span>{item.Sample_Color}</span>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button
                          onClick={() => openEditModal(item)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredData.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-gray-500 border border-gray-300">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* PAGINATION CONTROLS */}
          {pagination && data.length > 0 && (
            <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
              <div className="text-gray-600">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of{' '}
                {pagination.total} records
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    fetchSpecimenTypes(newPage);
                  }}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <span className="px-3 py-1">
                  Page {currentPage} of {pagination.totalPages}
                </span>

                <button
                  onClick={() => {
                    const newPage = Math.min(pagination.totalPages, currentPage + 1);
                    setCurrentPage(newPage);
                    fetchSpecimenTypes(newPage);
                  }}
                  disabled={currentPage === pagination.totalPages}
                  className={`flex items-center gap-1 px-3 py-1 rounded ${currentPage === pagination.totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>

              <div className="text-gray-600">
                Total: {pagination.total} records
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50">

          <div className="bg-white w-[400px] p-6 rounded-lg shadow-lg relative">

            {/* Back Button Right */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 flex items-center gap-1 text-slate-900 hover:underline"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editId ? "Edit Sample Type" : "Add Sample Type"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm mb-1">Sample Type</label>
                <input
                  type="text"
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Sample Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={toHex(sampleColor)}
                    onChange={(e) => setSampleColor(hexToColorName(e.target.value))}
                    className="w-10 h-10 rounded border cursor-pointer p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    value={sampleColor}
                    onChange={(e) => setSampleColor(e.target.value)}
                    placeholder="e.g. red or #ff0000"
                    className="flex-1 border px-3 py-2 rounded focus:ring-2 focus:ring-orange-500 text-sm"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M9 3h6v11a3 3 0 0 1-6 0V3z" fill={sampleColor || '#cccccc'} stroke="#555" strokeWidth="1.2"/>
                    <rect x="8" y="2" width="8" height="2" rx="1" fill="#888" stroke="#555" strokeWidth="0.8"/>
                    <line x1="9" y1="10" x2="15" y2="10" stroke="white" strokeWidth="1" opacity="0.5"/>
                  </svg>
                </div>
              </div>

              <button
                type="submit"
                disabled={!sampleType.trim() || !sampleColor.trim()}
                className={`w-full py-2 rounded text-white
                  ${
                    !sampleType.trim() || !sampleColor.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-orange-500 hover:bg-orange-600"
                  }
                `}
              >
                {editId ? "Update" : "Submit"}
              </button>

              {errorMsg && (
                <p className="text-red-600 text-center text-sm">{errorMsg}</p>
              )}

              {successMsg && (
                <p className="text-green-600 text-center text-sm">{successMsg}</p>
              )}

            </form>
          </div>
        </div>
      )}
    </>
  );
}


