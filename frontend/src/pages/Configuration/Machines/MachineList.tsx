"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Info, Search, RefreshCw, Trash2 } from "lucide-react";
import { getMachines, toggleMachine, Machine, MachineUsage, getMachineUsage } from "../../../api/machines";
import MachineForm from "./MachineForm";
import MachineUsageDialog from "./MachineUsageDialog";

const MachineList: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [usageOpen, setUsageOpen] = useState(false);
  const [selectedMachineUsage, setSelectedMachineUsage] = useState<MachineUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    // Filter machines based on search term
    let filtered = machines;

    if (searchTerm) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMachines(filtered);
  }, [machines, searchTerm]);

  const loadMachines = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMachines();
      setMachines(data);
    } catch (err) {
      setError("Failed to load machines");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMachine = () => {
    setEditingMachine(null);
    setFormOpen(true);
  };

  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingMachine(null);
  };

  const handleFormSuccess = () => {
    setSuccess(
      editingMachine ? "Machine updated successfully" : "Machine created successfully"
    );
    handleFormClose();
    loadMachines();
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleMachine = async (machine: Machine) => {
    try {
      await toggleMachine(machine.id);
      setSuccess(
        `Machine ${machine.isActive ? "disabled" : "enabled"} successfully`
      );
      loadMachines();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to toggle machine status");
      console.error(err);
    }
  };

  const handleShowUsage = async (machine: Machine) => {
    try {
      const usage = await getMachineUsage(machine.id);
      if (usage) {
        setSelectedMachineUsage(usage);
        setUsageOpen(true);
      }
    } catch (err) {
      setError("Failed to load machine usage");
      console.error(err);
    }
  };

  const handleUsageClose = () => {
    setUsageOpen(false);
    setSelectedMachineUsage(null);
  };

  return (
    <div className="w-full px-3 sm:px-6 pt-4">
      {/* Search and Action Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search machines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>
          <button
            onClick={() => setSearchTerm("")}
            className="bg-orange-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-orange-700"
          >
            <RefreshCw size={14} /> Reset
          </button>
          <button
            onClick={handleAddMachine}
            className="bg-orange-600 text-white px-3 py-2 rounded text-sm flex items-center gap-1 hover:bg-orange-700"
          >
            <Plus size={16} /> Add Machine
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {/* Machines Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-gradient-to-r from-slate-800 via-orange-700 to-orange-600 text-white">
              <tr>
                {["Name", "Status", "Tests", "Action"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredMachines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-400 text-sm">
                    {machines.length === 0 ? "No machines found" : "No machines match your filters"}
                  </td>
                </tr>
              ) : (
                filteredMachines.map((machine, i) => (
                  <tr key={machine.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2 text-xs font-medium">{machine.name}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          machine.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {machine.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">{machine.testCount || 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleShowUsage(machine)}
                          className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"
                          title="View Usage"
                        >
                          <Info size={12} />
                        </button>
                        <button
                          onClick={() => handleEditMachine(machine)}
                          className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleToggleMachine(machine)}
                          className={`text-white p-1 rounded ${
                            machine.isActive
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                          title={machine.isActive ? "Disable" : "Enable"}
                        >
                          {machine.isActive ? <Trash2 size={12} /> : "✓"}
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

      {/* Machine Form Dialog */}
      <MachineForm
        isOpen={formOpen}
        onClose={handleFormClose}
        machine={editingMachine}
        onSuccess={handleFormSuccess}
      />

      {/* Machine Usage Dialog */}
      {selectedMachineUsage && (
        <MachineUsageDialog
          isOpen={usageOpen}
          onClose={handleUsageClose}
          usage={selectedMachineUsage}
        />
      )}
    </div>
  );
};

export default MachineList;
