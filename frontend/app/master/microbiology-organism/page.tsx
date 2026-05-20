"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowLeft, Microscope, RotateCcw } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";

const initialData = [
  { id: 1, name: "E. coli" },
  { id: 2, name: "Klebsiella" },
  { id: 3, name: "Klebsiella pneumoniae" },
  { id: 4, name: "Klebsiella oxytoca" },
  { id: 5, name: "Acinetobacter" },
  { id: 6, name: "Pseudomonas" },
  { id: 7, name: "Pseudomonas aeruginosa" },
  { id: 8, name: "Acinetobacter lwoffii" },
  { id: 9, name: "Coagulase negative Staphylococcus (CONS)" },
  { id: 10, name: "Staphylococcus aureus" },
];

export default function MicrobiologyOrganism() {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<any>(null);
  const [organismName, setOrganismName] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const filteredData = data.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = () => setSearch("");

  const handleDelete = (id: any) => {
    if (window.confirm("Are you sure you want to delete this organism?")) {
      setData(data.filter((item) => item.id !== id));
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setOrganismName("");
    setShowModal(true);
    setErrorMsg("");
  };

  const openEditModal = (item: any) => {
    setEditId(item.id);
    setOrganismName(item.name);
    setShowModal(true);
    setErrorMsg("");
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!organismName.trim()) {
      setErrorMsg("Organism name is required");
      return;
    }

    if (editId) {
      setData(
        data.map((item) =>
          item.id === editId ? { ...item, name: organismName } : item
        )
      );
      setSuccessMsg("Updated successfully!");
    } else {
      const newItem = {
        id: data.length + 1,
        name: organismName,
      };
      setData([...data, newItem]);
      setSuccessMsg("Added successfully!");
    }

    setTimeout(() => {
      setShowModal(false);
      setSuccessMsg("");
    }, 1200);
  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-cyan-50 p-6">

        {/* Header */}
        <PageHeader 
          title="Microbiology Organism" 
          icon={Microscope}
          path="Master"
        />

        {/* Top Bar - Search, Reset, Add in Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded shadow-md">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search By Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-cyan-600 bg-cyan-50 rounded px-3 py-2 w-64 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-600"
            />

            <button
              onClick={handleReset}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded text-sm transition-colors flex items-center gap-1"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="bg-cyan-600 text-white px-4 py-2 rounded text-sm hover:bg-cyan-700 transition-colors"
          >
            + New Organism
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow-md">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gradient-to-r from-slate-800 via-cyan-700 to-cyan-600 text-white">
              <tr>
                <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Sr No.</th>
                <th className="border border-cyan-800 px-3 py-1 text-left font-semibold">Name</th>
                <th className="border border-cyan-800 px-3 py-1 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-1 text-center">{index + 1}</td>
                  <td className="border border-gray-300 px-3 py-1">{item.name}</td>
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

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-gray-500 border border-gray-300">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white w-[400px] p-6 rounded shadow-lg">

            {/* Back Button */}
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex items-center gap-1 text-cyan-600 hover:underline"
              >
                <ArrowLeft size={16} /> Back
              </button>
            </div>

            <h3 className="text-lg font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              {editId ? "Edit Organism" : "Add Organism"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm mb-1">Organism Name</label>
                <input
                  type="text"
                  value={organismName}
                  onChange={(e) => setOrganismName(e.target.value)}
                  className="w-full border px-3 py-2 rounded focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={!organismName.trim()}
                className={`w-full py-2 rounded text-white
                  ${
                    !organismName.trim()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-teal-600 to-cyan-600 hover:opacity-90"
                  }
                `}
              >
                Submit
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
