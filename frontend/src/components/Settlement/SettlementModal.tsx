"use client";

import { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { getOrganizations, saveOrgSettlement } from "@/src/api/patient";

interface SettlementFormData {
  orgId: string;
  orgName: string;
  orgDiscount: number;
  totalGrandAmount: number;
  afterOrgDiscount: number;
  tdsChecked: boolean;
  tdsPercent: number;
  tdsAmount: number;
  otherDiscountPercent: number;
  otherDiscountAmount: number;
  afterTdsAndOtherDiscount: number;
  amountPaid: number;
  balance: number;
  status: string;
  remark: string;
  visitIds: string[];
  patientCount: number;
}

interface PatientInOrg {
  patientId: string;
  patientName: string;
  visits: any[];
  totalAmount: number;
  totalBalance: number;
}

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  organizations: any[];
  onSaveSettlement?: (formData: SettlementFormData) => Promise<void>;
}

export default function SettlementModal({
  isOpen,
  onClose,
  data,
  organizations,
  onSaveSettlement,
}: SettlementModalProps) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [patientsInOrg, setPatientsInOrg] = useState<PatientInOrg[]>([]);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [showSettlementForm, setShowSettlementForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [settlementForm, setSettlementForm] = useState<SettlementFormData>({
    orgId: "",
    orgName: "",
    orgDiscount: 0,
    totalGrandAmount: 0,
    afterOrgDiscount: 0,
    tdsChecked: false,
    tdsPercent: 10,
    tdsAmount: 0,
    otherDiscountPercent: 0,
    otherDiscountAmount: 0,
    afterTdsAndOtherDiscount: 0,
    amountPaid: 0,
    balance: 0,
    status: "PENDING",
    remark: "",
    visitIds: [],
    patientCount: 0,
  });

  // Group data by organization and then by patient
  useEffect(() => {
    if (selectedOrgId) {
      const org = organizations.find((o) => o.id === selectedOrgId);
      setSelectedOrg(org);

      // Build patient groups for this organization
      const patientMap = new Map<string, PatientInOrg>();

      for (const row of data) {
        // Filter by organization
        if (!row.orgId || row.orgId !== selectedOrgId) continue;
        
        // ✅ SKIP if bill is fully settled/paid
        if (row.billStatus === 'PAID' || row.balance === 0) {
          console.log(`⏭️  Skipping settled patient: ${row.patientId} - Bill ${row.billNo} (Status: ${row.billStatus}, Balance: ${row.balance})`);
          continue;
        }

        const patientId = row.patientId || "unknown";
        const patientName = row.patient || "Unknown Patient";

        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            patientId,
            patientName,
            visits: [],
            totalAmount: 0,
            totalBalance: 0,
          });
        }

        const group = patientMap.get(patientId)!;
        const visitTotal = row.total || 0;
        const visitBalance = row.balance || 0;

        group.visits.push({
          billNo: row.billNo,
          date: row.date,
          total: visitTotal,
          balance: visitBalance,
          discount: row.discount || 0,
          mobile: row.mobile,
        });

        group.totalAmount += visitTotal;
        group.totalBalance += visitBalance;
      }

      setPatientsInOrg(Array.from(patientMap.values()));
      setExpandedPatients(new Set());
    } else {
      setPatientsInOrg([]);
      setExpandedPatients(new Set());
    }
  }, [selectedOrgId, data, organizations]);

  // Calculate settlement amounts
  const calculateSettlementAmount = (form: SettlementFormData) => {
    const grandTotal = form.totalGrandAmount || 0;
    const orgDiscount = form.orgDiscount || 0;
    const afterOrgDiscount = grandTotal - orgDiscount;

    const tdsAmount = form.tdsChecked
      ? (afterOrgDiscount * (form.tdsPercent || 10)) / 100
      : 0;

    const otherDiscountAmount = form.otherDiscountPercent
      ? (afterOrgDiscount * (form.otherDiscountPercent || 0)) / 100
      : form.otherDiscountAmount || 0;

    const afterTdsAndOtherDiscount =
      afterOrgDiscount - tdsAmount - otherDiscountAmount;

    const amountPaid = form.amountPaid || 0;
    const balance = afterTdsAndOtherDiscount - amountPaid;

    const status =
      balance === 0
        ? "FULLY_SETTLED"
        : balance < 0
          ? "OVERPAID"
          : "PARTIALLY_PAID";

    return {
      afterOrgDiscount,
      tdsAmount: Math.round(tdsAmount * 100) / 100,
      otherDiscountAmount: Math.round(otherDiscountAmount * 100) / 100,
      afterTdsAndOtherDiscount: Math.round(afterTdsAndOtherDiscount * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      status,
    };
  };

  const handleSettlementChange = (field: string, value: any) => {
    const updated = { ...settlementForm, [field]: value };
    const calculated = calculateSettlementAmount(updated);
    setSettlementForm({ ...updated, ...calculated });
  };

  const togglePatientExpansion = (patientId: string) => {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const openSettlementForm = () => {
    if (!selectedOrg) {
      setMessage({ type: "error", text: "Please select organization first" });
      return;
    }

    // Collect all visit IDs and calculate total for entire org
    const allVisitIds: string[] = [];
    let totalAmount = 0;

    for (const patient of patientsInOrg) {
      for (const visit of patient.visits) {
        allVisitIds.push(visit.billNo);
        totalAmount += visit.total;
      }
    }

    const orgDiscount = selectedOrg?.discount || 0;
    const afterOrgDiscount = totalAmount - orgDiscount;

    setSettlementForm({
      orgId: selectedOrg?.id,
      orgName: selectedOrg?.name,
      orgDiscount: orgDiscount,
      totalGrandAmount: totalAmount,
      afterOrgDiscount: afterOrgDiscount,
      tdsChecked: false,
      tdsPercent: 10,
      tdsAmount: 0,
      otherDiscountPercent: 0,
      otherDiscountAmount: 0,
      afterTdsAndOtherDiscount: afterOrgDiscount,
      amountPaid: 0,
      balance: afterOrgDiscount,
      status: "PENDING",
      remark: "",
      visitIds: allVisitIds,
      patientCount: patientsInOrg.length,
    });
    setShowSettlementForm(true);
  };

  const handleSaveSettlement = async () => {
    if (!settlementForm.orgId) {
      setMessage({ type: "error", text: "Organization ID is required" });
      return;
    }

    if (settlementForm.visitIds.length === 0) {
      setMessage({ type: "error", text: "No visits to settle" });
      return;
    }

    if (settlementForm.amountPaid <= 0 && settlementForm.balance > 0) {
      setMessage({
        type: "error",
        text: "Please enter amount paid",
      });
      return;
    }

    setSaving(true);
    try {
      // Call new org-wide settlement endpoint
      const response = await saveOrgSettlement({
        orgId: settlementForm.orgId,
        visitIds: settlementForm.visitIds,
        orgDiscount: settlementForm.orgDiscount,
        tdsChecked: settlementForm.tdsChecked,
        tdsPercent: settlementForm.tdsPercent,
        otherDiscountPercent: settlementForm.otherDiscountPercent,
        otherDiscountAmount: settlementForm.otherDiscountAmount,
        amountPaid: settlementForm.amountPaid,
        remark: settlementForm.remark,
      });

      if (response.success) {
        setMessage({
          type: "success",
          text: `✅ Organization settlement complete! Settled ${settlementForm.visitIds.length} visit(s) from ${settlementForm.patientCount} patient(s)`,
        });
        setShowSettlementForm(false);
        // Refresh data after 1.5 seconds
        setTimeout(() => {
          setMessage({ type: "", text: "" });
          if (onSaveSettlement) {
            onSaveSettlement(settlementForm);
          }
        }, 1500);
      } else {
        setMessage({
          type: "error",
          text: response.message || "Failed to save settlement",
        });
      }
    } catch (error: any) {
      console.error("Settlement save error:", error);
      setMessage({
        type: "error",
        text: error.message || "Failed to save settlement. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-cyan-800 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {showSettlementForm
              ? "🏢 Organization Settlement"
              : "🏪 Organization Billing"}
          </h2>
          <button
            onClick={onClose}
            className="hover:bg-cyan-700 p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {showSettlementForm ? (
            // Settlement Form
            <div className="space-y-1">
              <button
                onClick={() => setShowSettlementForm(false)}
                className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
              >
                ← Back
              </button>

              {message.text && (
                <div
                  className={`p-1.5 rounded text-xs ${
                    message.type === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="bg-white p-2 rounded-lg space-y-1 border-2 border-orange-300">
                {/* Organization Info Header - Ultra Compact */}
                <div className="pb-2 border-b-2 border-orange-300">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{settlementForm.orgName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-orange-600">Discount ₹{settlementForm.orgDiscount.toFixed(0)}</p>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout - Single Column for Compact */}
                <div className="grid grid-cols-1 gap-2">
                  {/* Left Column */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-gray-800 uppercase pb-0.5">💰 Discounts & Charges</h3>

                    {/* After Org Discount */}
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      <label className="text-xs font-bold text-gray-700 block">After Org Discount</label>
                      <div className="flex items-center gap-0.5">
                        <span className="font-bold text-orange-600">₹</span>
                        <input
                          type="text"
                          value={settlementForm.afterOrgDiscount || ""}
                          disabled
                          className="flex-1 px-1.5 py-0.5 rounded bg-gray-50 font-bold text-xs text-gray-900"
                        />
                      </div>
                    </div>

                    {/* TDS Section */}
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      <label className="flex items-center gap-1.5 cursor-pointer mb-1">
                        <input
                          type="checkbox"
                          checked={settlementForm.tdsChecked}
                          onChange={(e) =>
                            handleSettlementChange("tdsChecked", e.target.checked)
                          }
                          className="w-3 h-3 accent-orange-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-gray-800">Apply TDS (10%)</span>
                      </label>

                      {settlementForm.tdsChecked && (
                        <div className="grid grid-cols-2 gap-1 bg-gray-50 p-1 rounded">
                          <div>
                            <label className="text-xs font-bold text-gray-700 block">TDS %</label>
                            <input
                              type="text"
                              value={settlementForm.tdsPercent || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                                handleSettlementChange("tdsPercent", val);
                              }}
                              className="w-full px-1.5 py-0.5 rounded text-xs font-bold"
                              placeholder=""
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-700 block">Amount</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-bold text-gray-700">₹</span>
                              <input
                                type="text"
                                value={settlementForm.tdsAmount || ""}
                                disabled
                                className="flex-1 px-1.5 py-0.5 rounded bg-gray-50 font-bold text-xs text-gray-900"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Other Discount Section */}
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      <h4 className="text-xs font-bold text-gray-800 uppercase mb-1">Other Discount</h4>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <label className="text-xs font-bold text-gray-700 block">Discount %</label>
                          <input
                            type="text"
                            value={settlementForm.otherDiscountPercent || ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                              handleSettlementChange("otherDiscountPercent", val);
                            }}
                            className="w-full px-1.5 py-0.5 rounded text-xs font-bold focus:ring-2 focus:ring-orange-500"
                            placeholder=""
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 block">Amount</label>
                          <input
                            type="text"
                            value={settlementForm.otherDiscountAmount || ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                              handleSettlementChange("otherDiscountAmount", val);
                            }}
                            className="w-full px-1.5 py-0.5 rounded text-xs font-bold focus:ring-2 focus:ring-orange-500"
                            placeholder=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-gray-800 uppercase pb-0.5">💳 Payment</h3>

                    {/* Final Amount */}
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      <label className="text-xs font-bold text-gray-700 block">Final Amount</label>
                      <div className="flex items-center gap-0.5">
                        <span className="font-bold text-orange-600">₹</span>
                        <input
                          type="text"
                          value={settlementForm.afterTdsAndOtherDiscount || ""}
                          disabled
                          className="flex-1 px-1.5 py-0.5 rounded bg-gray-50 font-bold text-xs text-gray-900"
                        />
                      </div>
                    </div>

                    {/* Amount Paid */}
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      <label className="text-xs font-bold text-gray-700 block">Amount Paid</label>
                      <div className="flex items-center gap-0.5">
                        <span className="font-bold text-orange-600">₹</span>
                        <input
                          type="text"
                          value={settlementForm.amountPaid || ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0;
                            handleSettlementChange("amountPaid", val);
                          }}
                          className="flex-1 px-1.5 py-0.5 rounded text-xs font-bold focus:ring-2 focus:ring-orange-500"
                          placeholder=""
                        />
                      </div>
                    </div>

                    {/* Balance Amount */}
                    <div className={`bg-white p-1.5 rounded shadow-sm border-b-2 ${
                      settlementForm.balance === 0
                        ? "border-green-400"
                        : "border-gray-300"
                    }`}>
                      <label className="text-xs font-bold text-gray-700 block">Balance</label>
                      <div className="flex items-center gap-0.5">
                        <span className={`font-bold ${settlementForm.balance === 0 ? "text-green-600" : "text-orange-600"}`}>₹</span>
                        <input
                          type="text"
                          value={settlementForm.balance || ""}
                          disabled
                          className={`flex-1 px-1.5 py-0.5 rounded font-bold text-xs ${
                            settlementForm.balance === 0
                              ? "bg-green-50 text-green-900"
                              : "bg-gray-50 text-gray-900"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded text-center text-xs font-bold border-2 ${
                      settlementForm.status === "FULLY_SETTLED"
                        ? "bg-green-500 border-green-600 text-white"
                        : settlementForm.status === "OVERPAID"
                          ? "bg-yellow-500 border-yellow-600 text-white"
                          : "bg-orange-500 border-orange-600 text-white"
                    }`}>
                      {settlementForm.status === "FULLY_SETTLED"
                        ? "✅ Fully Settled"
                        : settlementForm.status === "OVERPAID"
                          ? "⚠️ Overpaid"
                          : "⏳ Partially Paid"}
                    </div>

                    {/* Remark */}
                    <div className="bg-white p-1.5 rounded shadow-sm">
                      <label className="text-xs font-bold text-gray-700 block">Remark</label>
                      <textarea
                        value={settlementForm.remark}
                        onChange={(e) =>
                          handleSettlementChange("remark", e.target.value)
                        }
                        className="w-full px-1.5 py-0.5 rounded text-xs font-semibold focus:ring-2 focus:ring-orange-500 resize-none bg-white"
                        rows={1}
                        placeholder="Notes..."
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1 pt-1 border-t-2 border-orange-300">
                  <button
                    onClick={() => setShowSettlementForm(false)}
                    className="flex-1 px-2 py-1 rounded font-bold text-xs text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveSettlement}
                    disabled={saving}
                    className="flex-1 px-2 py-1 bg-cyan-800 text-white rounded font-bold text-xs hover:bg-cyan-900 disabled:opacity-50 transition-all"
                  >
                    {saving ? "..." : `✅ Save`}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Organization Overview
            <div className="space-y-2">
              {/* Organization Selector */}
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  🏢 Select Organization:
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-orange-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">-- Select Organization --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} • Discount: ₹{org.discount || 0}
                    </option>
                  ))}
                </select>
              </div>

              {message.text && (
                <div
                  className={`p-1.5 rounded text-xs ${
                    message.type === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Organization Overview - With Scrollbar */}
              {selectedOrgId && patientsInOrg.length > 0 && (
                <div className="flex flex-col max-h-80 overflow-y-auto">
                  {/* Org Title and Summary */}
                  <div className="bg-white p-3 rounded mb-2 sticky top-0 z-10">
                    <h2 className="text-sm font-bold text-gray-900 mb-2">{selectedOrg?.name}</h2>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="font-bold text-gray-700">Patients:</span>
                        <span className="ml-2 text-orange-600 font-bold">{patientsInOrg.length}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Visits:</span>
                        <span className="ml-2 text-orange-600 font-bold">{patientsInOrg.reduce((sum, p) => sum + p.visits.length, 0)}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Total:</span>
                        <span className="ml-2 text-orange-600 font-bold">₹{patientsInOrg.reduce((sum, p) => sum + p.totalAmount, 0).toFixed(0)}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700">Balance:</span>
                        <span className="ml-2 text-orange-600 font-bold">₹{patientsInOrg.reduce((sum, p) => sum + p.totalBalance, 0).toFixed(0)}</span>
                      </div>
                    </div>
                    {/* Discount Row - Editable but not saved */}
                    <div className="flex items-center gap-2 text-xs">
                      <label className="font-bold text-gray-700">Discount:</label>
                      <input
                        type="number"
                        value={selectedOrg?.discount || 0}
                        onChange={(e) => {
                          // Editable but doesn't save to DB
                        }}
                        disabled
                        className="flex-1 px-2 py-1 rounded bg-gray-50 font-bold text-orange-600"
                        placeholder="₹0"
                      />
                    </div>
                    <button
                      onClick={openSettlementForm}
                      className="w-full mt-2 px-2 py-1.5 bg-cyan-800 text-white rounded font-bold text-xs hover:bg-cyan-900 transition-all"
                    >
                      💰 Settle
                    </button>
                  </div>

                  {/* Scrollable Patients List */}
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider px-2">Patients:</h3>
                    {patientsInOrg.map((patient) => (
                      <div key={patient.patientId} className="bg-white rounded p-2 text-xs mx-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-gray-900">{patient.patientName}</p>
                            <p className="text-gray-600">ID: {patient.patientId}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-600">₹{patient.totalAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-4 py-2 flex gap-2 justify-end border-t-2 border-orange-300">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg font-bold text-xs text-gray-700 hover:bg-gray-100 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
