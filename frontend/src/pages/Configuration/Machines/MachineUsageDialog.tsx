"use client";

import React from "react";
import { X } from "lucide-react";
import { MachineUsage } from "../../../api/machines";

interface MachineUsageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  usage: MachineUsage;
}

const MachineUsageDialog: React.FC<MachineUsageDialogProps> = ({ isOpen, onClose, usage }) => {
  if (!isOpen) return null;

  const { machine, usage: stats, tests } = usage;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {machine.name} - Usage Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-1">Total Tests</p>
              <p className="text-3xl font-bold text-blue-900">{stats.totalTests}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-1">Active Tests</p>
              <p className="text-3xl font-bold text-green-900">{stats.activeTests}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600 font-medium mb-1">Inactive Tests</p>
              <p className="text-3xl font-bold text-red-900">{stats.inactiveTests}</p>
            </div>
          </div>

          {/* Tests Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Tests Assigned to This Machine
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {tests.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-slate-600">
                    No tests assigned to this machine yet
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Note: Tests can be assigned to this machine when creating or editing tests in the Test Management module.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Test Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Test Code
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                          Department
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tests.map((test, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {test.name}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                              {test.testCode || "N/A"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {test.department?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                test.isActive && !test.isDeleted
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {test.isActive && !test.isDeleted
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MachineUsageDialog;
