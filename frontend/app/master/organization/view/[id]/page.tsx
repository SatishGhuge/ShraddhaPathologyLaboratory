"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import {
  Save, ArrowLeft, Building2, MapPin, Hash, Phone,
  CalendarDays, Eye, Mail, CheckCircle, XCircle, X,
  User, Settings, BarChart3, HelpCircle, ClipboardCheck, Lock, ChevronDown
} from "lucide-react";
import Header from "@/src/components/Header";
import { updateOrganization, getOrganizationById, createOrganizationWithCredentials } from "@/src/api/master.js";

const Toast = ({ type, message, credentials, onClose }: { type: string; message: string; credentials?: any; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
    <div className={`bg-white rounded-xl shadow-2xl border-2 ${type === "success" ? "border-green-400" : "border-red-400"} p-6 max-w-sm w-full mx-4`}>
      <div className="flex items-start gap-3">
        {type === "success"
          ? <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={22} />
          : <XCircle className="text-red-500 mt-0.5 flex-shrink-0" size={22} />}
        <div className="flex-1">
          <p className={`font-semibold text-sm ${type === "success" ? "text-green-700" : "text-red-700"}`}>{message}</p>
          {credentials && (
            <div className="mt-3 bg-cyan-50 border border-cyan-200 rounded p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-700">Login Credentials (sent to email):</p>
              <p>Username: <span className="font-bold text-cyan-700">{credentials.username}</span></p>
              <p>Password: <span className="font-bold text-cyan-700">{credentials.password}</span></p>
            </div>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
          <X size={16} />
        </button>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={onClose}
          className={`px-4 py-1.5 rounded text-sm text-white ${type === "success" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
          OK
        </button>
      </div>
    </div>
  </div>
);

// Module Accordion Component (Read-only)
const ModuleAccordionView = ({ title, icon: Icon, color, items, moduleAllocation }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const enabledCount = items.filter((item: any) => {
    const keys = item.key.split('.');
    let current = moduleAllocation;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }
    return current;
  }).length;

  const colorMap: any = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`border rounded-lg ${colorMap[color] || 'bg-gray-50 border-gray-200'}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={24} className="text-gray-700" />
          <div className="text-left">
            <h4 className="font-semibold text-slate-800">{title}</h4>
            <p className="text-xs text-gray-500">{enabledCount} of {items.length} enabled</p>
          </div>
        </div>
        <ChevronDown size={20} className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 p-4 space-y-2 bg-white/50">
          {items.map((item: any) => {
            const keys = item.key.split('.');
            let current = moduleAllocation;
            for (const key of keys) {
              if (current && typeof current === 'object' && key in current) {
                current = current[key];
              } else {
                current = false;
                break;
              }
            }
            const isEnabled = current;

            return (
              <div key={item.key} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded">
                <span className="text-sm text-gray-700">{item.label}</span>
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    isEnabled ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white ${
                      isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Single Toggle Component (Read-only)
const SingleToggleView = ({ title, icon: Icon, color, moduleKey, moduleAllocation }: any) => {
  const isEnabled = moduleAllocation[moduleKey];

  const colorMap: any = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`border rounded-lg ${colorMap[color] || 'bg-gray-50 border-gray-200'} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon size={24} className="text-gray-700" />
          <h4 className="font-semibold text-slate-800">{title}</h4>
        </div>
        <div
          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
            isEnabled ? 'bg-orange-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

const AddOrganization = () => {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();

  const isViewMode = pathname.includes("/view/");
  const isEditMode = pathname.includes("/edit/");

  const [formData, setFormData] = useState({
    name: "", organizationType: "", address: "", code: "",
    location: "", mobile: "", email: "", date: "", active: "Yes",
    sendReportsViaWhatsApp: false,
    sendReportsViaMail: false,
    discountPercent: "",
    discountAmount: "",
    isHomeCollection: false,
    isOPD: false,
    isIPD: false,
  });

  const [toast, setToast] = useState<any>(null); // { type, message, credentials }
  const [saving, setSaving] = useState(false);
  const [moduleAllocation, setModuleAllocation] = useState<any>(null);

  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      getOrganizationById((Array.isArray(id) ? id[0] : id) as string).then(organization => {
        if (organization) {
          setFormData({
            name: organization.name || "",
            organizationType: organization.organizationType || "",
            address: organization.address || "",
            code: organization.code || "",
            location: organization.location || "",
            mobile: organization.mobile || "",
            email: organization.email || "",
            date: organization.date ? new Date(organization.date).toISOString().split("T")[0] : "",
            active: organization.isActive ? "Yes" : "No",
            sendReportsViaWhatsApp: organization.sendReportsViaWhatsApp || false,
            sendReportsViaMail: organization.sendReportsViaMail || false,
            discountPercent: organization.discount || "",
            discountAmount: organization.discount || "",
            isHomeCollection: organization.isHomeCollection || false,
            isOPD: organization.isOPD || false,
            isIPD: organization.isIPD || false,
          });
          if (organization.moduleAllocation) {
            try {
              const allocation = typeof organization.moduleAllocation === 'string' 
                ? JSON.parse(organization.moduleAllocation) 
                : organization.moduleAllocation;
              setModuleAllocation(allocation);
            } catch (e) {
              setModuleAllocation(null);
            }
          }
        }
      }).catch(console.error);
    }
  }, [id, isViewMode, isEditMode]);

  const handleChange = (e: any) => {
    if (isViewMode) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const closeToast = () => {
    const wasSuccess = toast?.type === "success";
    setToast(null);
    if (wasSuccess) router.back();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    if (!/^\d{10}$/.test(formData.mobile)) {
      setToast({ type: "error", message: "Mobile number must be exactly 10 digits!" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setToast({ type: "error", message: "Please enter a valid email address!" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        location: formData.location,
        address: formData.address,
        mobile: formData.mobile,
        email: formData.email,
        date: formData.date || null,
        isActive: formData.active === "Yes",
      };

      if (isEditMode) {
        await updateOrganization((Array.isArray(id) ? id[0] : id) as string, payload);
        setToast({ type: "success", message: "Organization updated successfully! Update notification sent to email." });
      } else {
        const res = await createOrganizationWithCredentials(payload);
        setToast({
          type: "success",
          message: "Organization added successfully!",
          credentials: res.data?.credentials || null,
        });
      }
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to save organization" });
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => isViewMode ? "VIEW ORGANIZATION" : isEditMode ? "EDIT ORGANIZATION" : "ADD ORGANIZATION";

  return (
    <>
      <Header />
      {toast && <Toast {...toast} onClose={closeToast} />}

      <div className="p-6 bg-cyan-50 min-h-screen flex justify-center">
        <div className="bg-white rounded-lg shadow py-3 px-4 w-full max-w-2xl h-fit">

          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-cyan-700 flex items-center gap-2">
              {isViewMode && <Eye size={20} className="inline" />} {getTitle()}
            </h2>
            <button type="button" onClick={() => router.back()}
              className="p-1.5 rounded-full bg-cyan-100 hover:bg-cyan-200 transition" title="Back">
              <ArrowLeft size={18} className="text-cyan-700" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

            <div>
              <label className="font-medium text-cyan-800 text-sm">Name</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Building2 size={14} className="text-cyan-600" />
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  disabled={isViewMode} required={!isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="font-medium text-cyan-800 text-sm">Code</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Hash size={14} className="text-cyan-600" />
                <input type="text" name="code" value={formData.code} onChange={handleChange}
                  disabled={isViewMode} required={!isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="font-medium text-cyan-800 text-sm">Location</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <MapPin size={14} className="text-cyan-600" />
                <input type="text" name="location" value={formData.location} onChange={handleChange}
                  disabled={isViewMode} required={!isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="font-medium text-cyan-800 text-sm">Mobile No.</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Phone size={14} className="text-cyan-600" />
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange}
                  disabled={isViewMode} maxLength={10} placeholder="10 digit mobile number"
                  required={!isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="font-medium text-cyan-800 text-sm">Date of Establishment</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <CalendarDays size={14} className="text-cyan-600" />
                <input type="date" name="date" value={formData.date} onChange={handleChange}
                  disabled={isViewMode} required={!isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            <div>
              <label className="font-medium text-cyan-800 text-sm">Active Status</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <select name="active" value={formData.active} onChange={handleChange}
                  disabled={isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-cyan-800 text-sm">Email Address</label>
              <div className="flex items-center border border-cyan-600 rounded px-2 bg-cyan-50">
                <Mail size={14} className="text-cyan-600" />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  disabled={isViewMode} placeholder="example@domain.com" required={!isViewMode}
                  className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-cyan-800 text-sm">Address</label>
              <textarea name="address" value={formData.address} onChange={handleChange}
                disabled={isViewMode} rows={2} required={!isViewMode}
                className="w-full border border-cyan-600 rounded px-2 py-1.5 text-sm disabled:bg-gray-50 bg-cyan-50" />
            </div>

            {/* Organization Type Display in View Mode */}
            {isViewMode && (
              <div className="md:col-span-2 border-t border-gray-300 pt-4 mt-4 pb-4">
                <p className="font-semibold text-gray-700 text-sm mb-3">🏥 Organization Type</p>
                <div className="flex items-center gap-6 ml-1">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.isHomeCollection} disabled className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm text-gray-700">Home Collection</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.isOPD} disabled className="w-4 h-4 accent-purple-600" />
                    <span className="text-sm text-gray-700">OPD</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.isIPD} disabled className="w-4 h-4 accent-orange-600" />
                    <span className="text-sm text-gray-700">IPD</span>
                  </label>
                </div>
              </div>
            )}

            {/* Module Allocation Section - Read-only in View Mode */}
            {isViewMode && moduleAllocation && (
              <div className="md:col-span-2 border-t border-gray-300 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Module Allocation</h3>
                
                <div className="space-y-3">
                  {/* Patient Module */}
                  <ModuleAccordionView
                    title="Patient"
                    icon={User}
                    color="blue"
                    items={[
                      { key: 'patient.registration', label: 'Patient Registration' },
                      { key: 'patient.tests', label: 'Search for Test' },
                    ]}
                    moduleAllocation={moduleAllocation}
                  />

                  {/* Masters Module */}
                  <ModuleAccordionView
                    title="Masters"
                    icon={Settings}
                    color="green"
                    items={[
                      { key: 'masters.testlist', label: 'Tests' },
                      { key: 'masters.testTemplates', label: 'Test Template' },
                      { key: 'masters.departmentlist', label: 'Department' },
                      { key: 'masters.packagelist', label: 'Packages' },
                      { key: 'masters.charges', label: 'Charges' },
                      { key: 'masters.rolelist', label: 'Roles' },
                      { key: 'masters.userlist', label: 'Users' },
                      { key: 'masters.referralDoctorList', label: 'Referral Doctors' },
                      { key: 'masters.organization', label: 'Organization' },
                      { key: 'masters.sampleType', label: 'Sample Type' },
                      { key: 'masters.units', label: 'Units' },
                    ]}
                    moduleAllocation={moduleAllocation}
                  />

                  {/* Reports Module */}
                  <ModuleAccordionView
                    title="Reports"
                    icon={BarChart3}
                    color="purple"
                    items={[
                      { key: 'reports.dashboard', label: 'Dashboard' },
                      { key: 'reports.collectionReport', label: 'Collection Report' },
                      { key: 'reports.patientList', label: 'Patient List' },
                      { key: 'reports.referralDoctorRevenue', label: 'Referral Doctor Revenue' },
                      { key: 'reports.centerWiseCostReport', label: 'Center Cost' },
                      { key: 'reports.b2bTestwiseCostReport', label: 'B2B Cost' },
                      { key: 'reports.discountReport', label: 'Discount' },
                      { key: 'reports.testReport', label: 'Test Report' },
                    ]}
                    moduleAllocation={moduleAllocation}
                  />

                  {/* Configuration Module */}
                  <ModuleAccordionView
                    title="Configuration"
                    icon={Lock}
                    color="orange"
                    items={[
                      { key: 'configuration.signature', label: 'Signature' },
                    ]}
                    moduleAllocation={moduleAllocation}
                  />

                  {/* Help Module */}
                  <ModuleAccordionView
                    title="Help"
                    icon={HelpCircle}
                    color="blue"
                    items={[
                      { key: 'help.userManual', label: 'User Manual' },
                      { key: 'help.ultraviewer', label: 'Download Ultraviewer' },
                      { key: 'help.anydesk', label: 'Download Anydesk' },
                    ]}
                    moduleAllocation={moduleAllocation}
                  />

                  {/* Result Module */}
                  <SingleToggleView
                    title="Result"
                    icon={ClipboardCheck}
                    color="green"
                    moduleKey="result"
                    moduleAllocation={moduleAllocation}
                  />
                </div>
              </div>
            )}

            {!isViewMode && (
              <div className="md:col-span-2 flex gap-3 mt-2">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white px-4 py-1.5 rounded text-sm transition-colors">
                  <Save size={14} /> {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
                </button>
                <button type="button" onClick={() => router.back()}
                  className="px-4 py-1.5 rounded bg-gray-500 hover:bg-gray-600 text-white text-sm transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
};

export default AddOrganization;
