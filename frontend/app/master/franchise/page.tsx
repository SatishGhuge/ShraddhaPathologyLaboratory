"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { RotateCcw, Building2 } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import { getFranchises, deleteFranchise } from "@/src/api/master.js";

const FranchiseList = () => {
  const router = useRouter();

  const [searchName, setSearchName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [franchises, setFranchises] = useState<any[]>([]);
  const [filteredFranchises, setFilteredFranchises] = useState<any[]>([]);

  useEffect(() => {
    getFranchises()
      .then((res: any) => {
        const data = Array.isArray(res) ? res : res?.data || [];
        setFranchises(data);
        setFilteredFranchises(data);
      })
      .catch(console.error);
  }, []);

  const handleSearch = () => {
    const filtered = franchises.filter((f) =>
      f.name.toLowerCase().includes(searchName.toLowerCase()) &&
      (f.location || "").toLowerCase().includes(searchLocation.toLowerCase())
    );
    setFilteredFranchises(filtered);
  };

  const handleReset = () => {
    setSearchName("");
    setSearchLocation("");
    setFilteredFranchises(franchises);
  };

  /* DELETE HANDLER */
  const handleDelete = (franchise: any) => {
    if (window.confirm(`Are you sure you want to delete "${franchise.name}"?`)) {
      deleteFranchise(franchise.id)
        .then(() => {
          const updated = franchises.filter((f) => f.id !== franchise.id);
          setFranchises(updated);
          setFilteredFranchises(updated);
        })
        .catch(() => alert("Failed to delete franchise"));
    }
  };

  /* TOGGLE ACTIVE/INACTIVE */
  const handleToggleActive = (id: any) => {
    const current = franchises.find((f) => f.id === id);
    const message = current.isActive ? "Do you want to Inactivate Franchise?" : "Do you want to Activate Franchise?";
    if (!window.confirm(message)) return;
    const updated = franchises.map((f) => f.id === id ? { ...f, isActive: !f.isActive } : f);
    setFranchises(updated);
    setFilteredFranchises(updated);
  };

  return (
    <>
      <Header />

      <div className="p-6 bg-white min-h-screen">
        {/* Page Header */}
        <PageHeader 
          title="Franchise List" 
          icon={Building2}
          path="Master"
        />

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Search By Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-48 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <input
              type="text"
              placeholder="Search By Location"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="border border-gray-300 bg-white rounded px-3 py-2 w-48 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <button
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <button
            onClick={() => router.push("/master/franchise/add")}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            + New Franchise
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">id</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Name</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Code</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Location</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Address</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Mobile No</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Date</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Active</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredFranchises.length > 0 ? (
                filteredFranchises.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{f.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{f.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{f.code}</td>
                    <td className="border border-gray-300 px-3 py-1">{f.location}</td>
                    <td className="border border-gray-300 px-3 py-1 max-w-xs">{f.address}</td>
                    <td className="border border-gray-300 px-3 py-1">{f.mobile}</td>
                    <td className="border border-gray-300 px-3 py-1">{f.date ? new Date(f.date).toLocaleDateString("en-GB") : ""}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center font-semibold">{f.isActive ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1 flex-wrap">
                        {/* VIEW */}
                        <button
                          onClick={() => router.push(`/master/franchise/view/${f.id}`)}
                          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 transition-colors"
                        >
                          View
                        </button>

                        {/* EDIT */}
                        <button
                          onClick={() => router.push(`/master/franchise/edit/${f.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>

                        {/* ACTIVE/INACTIVE */}
                        <button
                          onClick={() => handleToggleActive(f.id)}
                          className={`px-2 py-1 rounded text-xs text-white transition-colors ${
                            f.isActive
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-500 hover:bg-gray-600"
                          }`}
                        >
                          {f.isActive ? "Active" : "Inactive"}
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => handleDelete(f)}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
             ) : (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500 border border-gray-300">
                    No franchises found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default FranchiseList;

