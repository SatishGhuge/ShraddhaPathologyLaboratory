"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { RotateCcw, Building } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getCorporates, deleteCorporate, updateCorporate } from "@/src/api/master.js";

const CorporateList = () => {
  const router = useRouter();

  const [corporates,   setCorporates]   = useState<any[]>([]);
  const [filtered,     setFiltered]     = useState<any[]>([]);
  const [searchName,   setSearchName]   = useState("");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");

  const fetchCorporates = async () => {
    setLoading(true); setError("");
    try {
      const res = await getCorporates();
      const data = Array.isArray(res) ? res : res?.data || [];
      setCorporates(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load corporates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCorporates(); }, []);

  const handleSearch = () => {
    const q = searchName.toLowerCase();
    setFiltered(corporates.filter(c => c.name.toLowerCase().includes(q)));
  };

  const handleReset = () => {
    setSearchName("");
    setFiltered(corporates);
  };

  const handleDelete = async (c: any) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await deleteCorporate(c.id);
      await fetchCorporates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleToggleActive = async (c: any) => {
    const msg = c.isActive ? "Inactivate this corporate?" : "Activate this corporate?";
    if (!window.confirm(msg)) return;
    try {
      await updateCorporate(c.id, { isActive: !c.isActive });
      await fetchCorporates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <>
      <Header />
      <div className="p-6 bg-cyan-50 min-h-screen">
        <PageHeader title="Corporate" icon={Building} path="Master" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap">
            <input type="text" placeholder="Search By Name" value={searchName}
              onChange={e => setSearchName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-48 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600" />
            <button onClick={handleSearch}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm transition-colors">
              Search
            </button>
            <button onClick={handleReset}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1">
              <RotateCcw size={16}/> Reset
            </button>
          </div>
          <button onClick={() => router.push("/master/corporate/add")}
            className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700 transition-colors">
            + New Corporate
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
              <tr>
                <th className="border border-cyan-800 px-3 py-1 text-left">ID</th>
                <th className="border border-cyan-800 px-3 py-1 text-left">Name</th>
                <th className="border border-cyan-800 px-3 py-1 text-left">Created</th>
                <th className="border border-cyan-800 px-3 py-1 text-left">Active</th>
                <th className="border border-cyan-800 px-3 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-4 text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-300">No corporates found</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-1">{i + 1}</td>
                  <td className="border border-gray-300 px-3 py-1 font-medium">{c.name}</td>
                  <td className="border border-gray-300 px-3 py-1">{new Date(c.createdAt).toLocaleDateString("en-GB")}</td>
                  <td className="border border-gray-300 px-3 py-1 font-semibold">{c.isActive ? "Yes" : "No"}</td>
                  <td className="border border-gray-300 px-3 py-1">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => router.push(`/master/corporate/view/${c.id}`)}
                        className="bg-cyan-600 text-white px-2 py-1 rounded text-xs hover:bg-cyan-700">View</button>
                      <button onClick={() => router.push(`/master/corporate/edit/${c.id}`)}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Edit</button>
                      <button onClick={() => handleToggleActive(c)}
                        className={`px-2 py-1 rounded text-xs text-white ${c.isActive ? "bg-green-600 hover:bg-green-700" : "bg-gray-500 hover:bg-gray-600"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </button>
                      <button onClick={() => handleDelete(c)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default CorporateList;
