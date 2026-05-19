"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { RotateCcw, Building2 } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getCollectionCenters, deleteCollectionCenter, updateCollectionCenter } from "@/src/api/master.js";

const CenterList = () => {
  const router = useRouter();
  const [searchName, setSearchName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchCenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCollectionCenters();
      const data = Array.isArray(res) ? res : res?.data || [];
      setCenters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch centers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCenters(); }, []);

  const handleDelete = async (center: any) => {
    if (!window.confirm(`Delete "${center.name}"?`)) return;
    try {
      await deleteCollectionCenter(center.id);
      setCenters(prev => prev.filter(c => c.id !== center.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete center");
    }
  };

  const handleToggleActive = async (center: any) => {
    const msg = center.isActive
      ? `Do you want to Inactivate "${center.name}"?\n\nThe center will be hidden but can be reactivated later.`
      : `Do you want to Activate "${center.name}"?\n\nThe center will be visible again.`;
    if (!window.confirm(msg)) return;
    try {
      await updateCollectionCenter(center.id, { isActive: !center.isActive });
      // Update local state directly
      setCenters(prev => prev.map(c => c.id === center.id ? { ...c, isActive: !center.isActive } : c));
      alert(center.isActive ? `"${center.name}" inactivated successfully!` : `"${center.name}" activated successfully!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update center");
    }
  };

  const [showInactive, setShowInactive] = useState(false);

  const filtered = centers.filter(c => {
    if (showInactive && c.isActive) return false;   // show only inactive
    if (!showInactive && !c.isActive) return false; // show only active
    return (
      c.name.toLowerCase().includes(searchName.toLowerCase()) &&
      (c.location || "").toLowerCase().includes(searchLocation.toLowerCase())
    );
  });

  return (
    <>
      <Header />
      <div className="p-6 bg-cyan-50 min-h-screen">
        <PageHeader title="Centers" icon={Building2} path="Master" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Search By Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-48 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
            />
            <input
              type="text"
              placeholder="Search By Location"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-48 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600"
            />
            <button
              onClick={() => { setSearchName(""); setSearchLocation(""); }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm flex items-center gap-1"
            >
              <RotateCcw size={16} /> Reset
            </button>
            <label className="flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-cyan-600"
              />
              Show Inactive
            </label>
          </div>
          <button
            onClick={() => router.push("/master/center/add")}
            className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700"
          >
            + New Center
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 text-sm px-3 py-2 rounded mb-3">{error}</div>
        )}

        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
              <tr>
                <th className="border border-cyan-800 px-3 py-2 text-left">ID</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Name</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Code</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Location</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Address</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Mobile No</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Date</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Active</th>
                <th className="border border-cyan-800 px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-6 text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-6 text-gray-500">No centers found</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{c.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{c.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{c.code || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1">{c.location || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1 max-w-xs truncate">{c.address || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1">{c.mobile || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      {c.date ? new Date(c.date).toLocaleDateString('en-GB') : "-"}
                    </td>
                    <td className="border border-gray-300 px-3 py-1 text-center font-semibold">
                      {c.isActive ? "Yes" : "No"}
                    </td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => router.push(`/master/center/view/${c.id}`)}
                          className="bg-cyan-600 text-white px-2 py-1 rounded text-xs hover:bg-cyan-700"
                        >View</button>
                        <button
                          onClick={() => router.push(`/master/center/edit/${c.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >Edit</button>
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`px-2 py-1 rounded text-xs text-white transition-colors ${c.isActive ? "bg-green-600 hover:bg-green-700" : "bg-gray-900 hover:bg-gray-800"}`}
                          title={c.isActive ? "Click to inactivate" : "Click to activate"}
                        >{c.isActive ? "Active" : "Inactive"}</button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >Delete</button>
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

export default CenterList;
