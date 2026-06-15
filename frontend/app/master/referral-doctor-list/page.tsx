"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

import { UserCheck, RotateCcw } from "lucide-react";
import { getDoctors, deleteDoctor } from "@/src/api/master";

export default function ReferralListing() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;
  const router = useRouter();

  const fetchDoctors = (page: number = 1) => {
    setLoading(true);
    getDoctors(page, ITEMS_PER_PAGE)
      .then((res: any) => {
        setData(res);
        setPagination(null);
      })
      .catch((err) => console.error("Failed to fetch doctors:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDoctors(currentPage);
  }, [currentPage]);

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = () => setSearch("");

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoctor(id);
      setData((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete: " + (err.message || "Unknown error"));
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDoctors(1);
  };

  return (
    <>
    <Header />
    <div className="min-h-screen bg-white p-6">

      <PageHeader title="Referral Doctor List" icon={UserCheck} path="Master" />

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Search By Name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 bg-white rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={handleReset}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
        <button
          onClick={() => router.push("/master/referral-doctor/add")}
          className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
        >
          + Add New
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow-md">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Name</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Degree</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Compliment %</th>
              <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Mobile</th>
              <th className="border border-gray-300 px-3 py-1 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-300">Loading...</td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500 border border-gray-300">No records found</td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-2">Dr. {item.name}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.degree || "-"}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.compliment != null ? `${item.compliment}%` : "-"}</td>
                  <td className="border border-gray-300 px-3 py-2">{item.mobile || "-"}</td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="flex justify-center gap-1 flex-wrap">
                      <button
                        onClick={() => router.push(`/master/referral-doctor/edit/${item.id}`)}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && filteredData.length > 0 && (
        <div className="mt-3 bg-white rounded shadow-md p-3 flex items-center justify-between text-xs">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {pagination.totalPages} | Showing {filteredData.length} of {pagination.total} records
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={currentPage === pagination.totalPages}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-3 py-1 rounded transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
    </>
  );
}


