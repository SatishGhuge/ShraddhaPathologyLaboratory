"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

const outsourcingData = [
  {
    id: 1,
    labName: "PathLab Diagnostics",
    code: "PL001",
    mobile: "9876543210",
    address: "123 Medical Street, Mumbai - 400001",
    active: "Yes",
  },
  {
    id: 2,
    labName: "MediTest Laboratory",
    code: "MT002",
    mobile: "9876543211",
    address: "456 Health Avenue, Delhi - 110001",
    active: "Yes",
  },
];

const OutsourcingList = () => {
  const router = useRouter();

  const [searchName, setSearchName] = useState("");
  const [filteredLabs, setFilteredLabs] = useState(outsourcingData);
  const [labs, setLabs] = useState(outsourcingData);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);

    const filtered = labs.filter((lab) => {
      const matchName = lab.labName
        .toLowerCase()
        .includes(searchName.toLowerCase());
      return matchName;
    });

    setFilteredLabs(filtered);
  };

  const handleReset = () => {
    setSearchName("");
    setFilteredLabs(labs);
    setHasSearched(false);
  };

  /* DELETE HANDLER */
  const handleDelete = (lab: any) => {
    if (window.confirm(`Are you sure you want to delete "${lab.labName}"?`)) {
      const updatedLabs = labs.filter((l) => l.id !== lab.id);
      setLabs(updatedLabs);
      setFilteredLabs(updatedLabs);
      alert(`Lab "${lab.labName}" deleted successfully!`);
    }
  };

  /* TOGGLE ACTIVE/INACTIVE */
  const handleToggleActive = (id: any) => {
    const currentLab = labs.find((l) => l.id === id);

    const message =
      currentLab.active === "Yes"
        ? "Do you want to Inactivate Lab?"
        : "Do you want to Activate Lab?";

    const confirm = window.confirm(message);
    if (!confirm) return;

    const updatedLabs = labs.map((lab) =>
      lab.id === id
        ? { ...lab, active: lab.active === "Yes" ? "No" : "Yes" }
        : lab
    );

    setLabs(updatedLabs);
    setFilteredLabs(updatedLabs);
  };

  return (
    <>

      <div className="p-6 bg-white min-h-screen">

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Search By Lab Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
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
            onClick={() => router.push("/master/outsourcing/add")}
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
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Id</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Lab Name</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Code</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Mobile</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Address</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Active</th>
                <th className="border border-gray-300 px-3 py-1 text-left font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredLabs.length > 0 ? (
                filteredLabs.map((lab) => (
                  <tr key={lab.id} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="border border-gray-300 px-3 py-1">{lab.id}</td>
                    <td className="border border-gray-300 px-3 py-1 font-medium">{lab.labName}</td>
                    <td className="border border-gray-300 px-3 py-1">{lab.code}</td>
                    <td className="border border-gray-300 px-3 py-1">{lab.mobile}</td>
                    <td className="border border-gray-300 px-3 py-1">{lab.address}</td>
                    <td className="border border-gray-300 px-3 py-1 text-center font-semibold">{lab.active}</td>
                    <td className="border border-gray-300 px-3 py-1">
                      <div className="flex gap-1 flex-wrap">
                        {/* VIEW */}
                        <button
                          onClick={() => router.push(`/master/outsourcing/view/${lab.id}`)}
                          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600 transition-colors"
                        >
                          View
                        </button>

                        {/* EDIT */}
                        <button
                          onClick={() => router.push(`/master/outsourcing/edit/${lab.id}`)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>

                        {/* ACTIVE/INACTIVE */}
                        <button
                          onClick={() => handleToggleActive(lab.id)}
                          className={`px-2 py-1 rounded text-xs text-white transition-colors ${
                            lab.active === "Yes"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-gray-500 hover:bg-gray-600"
                          }`}
                        >
                          {lab.active === "Yes" ? "Active" : "Inactive"}
                        </button>

                        {/* DELETE */}
                        <button
                          onClick={() => handleDelete(lab)}
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
                  <td colSpan={7} className="text-center py-4 text-gray-500 border border-gray-300">
                    No outsourcing labs found
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

export default OutsourcingList;

