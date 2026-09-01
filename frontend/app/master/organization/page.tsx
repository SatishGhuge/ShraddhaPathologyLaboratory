"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrganizations, deleteOrganization } from "@/src/api/master";

import { RotateCcw, Building2 } from "lucide-react";

const OrganizationList = () => {
  const router = useRouter();

  const [searchName, setSearchName] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [showInactive, setShowInactive] = useState(false); // Checkbox for showing inactive
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    getOrganizations()
      .then((res: any) => {
        setOrganizations(res);
        setFilteredOrganizations(res);
      })
      .catch(console.error);
  }, []);

  // Apply filters whenever search or showInactive changes
  useEffect(() => {
    const filtered = organizations.filter((o) => {
      const nameMatch = o.name.toLowerCase().includes(searchName.toLowerCase());
      const locationMatch = (o.location || "").toLowerCase().includes(searchLocation.toLowerCase());
      
      // If showInactive is false, show only active organizations
      // If showInactive is true, show only inactive organizations
      const statusMatch = showInactive ? o.isActive === false : o.isActive === true;
      
      return nameMatch && locationMatch && statusMatch;
    });
    setFilteredOrganizations(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [searchName, searchLocation, showInactive, organizations]);

  const handleReset = () => {
    setSearchName("");
    setSearchLocation("");
    setShowInactive(false);
  };

  /* DELETE HANDLER */
  const handleDelete = (organization: any) => {
    if (window.confirm(`Are you sure you want to delete "${organization.name}"?`)) {
      deleteOrganization(organization.id)
        .then(() => {
          const updated = organizations.filter((o) => o.id !== organization.id);
          setOrganizations(updated);
          setFilteredOrganizations(updated);
        })
        .catch(() => alert("Failed to delete organization"));
    }
  };

  /* TOGGLE ACTIVE/INACTIVE */
  const handleToggleActive = (id: any) => {
    const current = organizations.find((o) => o.id === id);
    const message = current.isActive ? "Do you want to Inactivate Organization?" : "Do you want to Activate Organization?";
    if (!window.confirm(message)) return;
    const updated = organizations.map((o) => o.id === id ? { ...o, isActive: !o.isActive } : o);
    setOrganizations(updated);
    setFilteredOrganizations(updated);
  };

  return (
    <>

      <div className="p-6 bg-white min-h-screen">

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap items-center">
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

            {/* Show Inactive Checkbox */}
            <label className="flex items-center gap-2 px-3 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 cursor-pointer accent-orange-500 rounded"
              />
              <span>Show Inactive</span>
            </label>

            <button
              onClick={handleReset}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <button
            onClick={() => router.push("/master/organization/add")}
            className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 transition-colors"
          >
            + New Organization
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
              {(() => {
                const totalPages = Math.ceil(filteredOrganizations.length / ITEMS_PER_PAGE);
                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const paginatedData = filteredOrganizations.slice(startIndex, endIndex);

                // Update pagination state
                if (pagination?.total !== filteredOrganizations.length || pagination?.totalPages !== totalPages) {
                  setPagination({
                    total: filteredOrganizations.length,
                    totalPages: totalPages,
                    currentPage: currentPage
                  });
                }

                return paginatedData.length > 0 ? (
                  paginatedData.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{o.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{o.name}</td>
                    <td className="border border-gray-300 px-3 py-1">{o.code}</td>
                    <td className="border border-gray-300 px-3 py-1">{o.location}</td>
                    <td className="border border-gray-300 px-3 py-1 max-w-xs">{o.address}</td>
                    <td className="border border-gray-300 px-3 py-1">{o.mobile}</td>
                    <td className="border border-gray-300 px-3 py-1">{o.date ? new Date(o.date).toLocaleDateString("en-GB") : ""}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center font-semibold">{o.isActive ? "Yes" : "No"}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1 flex-wrap">
                        {/* EDIT */}
                        <button
                          onClick={() => router.push(`/master/organization/edit/${o.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>

                        {/* CHARGES */}
                        <button
                          onClick={() => router.push(`/master/organization/charges/${o.id}`)}
                          className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                        >
                          Charges
                        </button>

                        {/* ACTIVE/INACTIVE */}
                        <button
                          onClick={() => handleToggleActive(o.id)}
                          className={`px-2 py-1 rounded text-xs text-white transition-colors ${
                            o.isActive
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-500 hover:bg-gray-600"
                          }`}
                        >
                          {o.isActive ? "Active" : "Inactive"}
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => handleDelete(o)}
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
                    No organizations found
                  </td>
                </tr>
              );
              })()}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between bg-white p-3 rounded shadow-md">
            <div className="text-sm text-gray-600">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.total)} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, pagination.total)} of {pagination.total} records
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-700 font-semibold">
                Page {currentPage} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                disabled={currentPage === pagination.totalPages}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default OrganizationList;
