"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import {
  Save, ArrowLeft, Building2, MapPin, Hash, Phone,
  CalendarDays, Eye, Mail, CheckCircle, XCircle, X,
  Plus, Trash2, DollarSign, ChevronDown, User, Settings, BarChart3, HelpCircle, ClipboardCheck, Lock, Package
} from "lucide-react";
import Header from "@/src/components/Header";
import { updateOrganization, getOrganizationById, createOrganizationWithCredentials } from "@/src/api/master";
import { defaultModuleAllocation } from "@/utils/modulePermissions";

// Module Accordion Component with Select All and Auto-close functionality
const ModuleAccordion = ({ title, icon: Icon, items, moduleAllocation, toggleModule, onToggleAll, activeModule, onModuleChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = title.toLowerCase() === activeModule;

  // Close this accordion if another module opens
  useEffect(() => {
    if (!isActive && isOpen) {
      setIsOpen(false);
    }
  }, [activeModule, isActive]);

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

  const allEnabled = enabledCount === items.length && items.length > 0;
  const someEnabled = enabledCount > 0 && enabledCount < items.length;

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      onModuleChange?.(title.toLowerCase());
    }
  };

  const toggleSelectAll = () => {
    const shouldEnable = !allEnabled;
    onToggleAll(items, shouldEnable);
  };

  return (
    <div className="border rounded-lg bg-white border-gray-200">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-200"
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
        <div className="p-4 space-y-3 bg-white">
          {/* Select All Checkbox */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) {
                    (el as any).indeterminate = someEnabled;
                  }
                }}
                checked={allEnabled}
                onChange={toggleSelectAll}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700">Select All</span>
            </div>
            <span className="text-xs text-gray-500">{enabledCount}/{items.length}</span>
          </div>

          {/* Individual Items */}
          <div className="space-y-2">
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
                <div key={item.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleModule(item.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Single Toggle Component for Result
const SingleToggle = ({ title, icon: Icon, moduleKey, moduleAllocation, toggleModule }: any) => {
  const isEnabled = moduleAllocation[moduleKey];

  return (
    <div className="border rounded-lg bg-white border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon size={24} className="text-gray-700" />
          <h4 className="font-semibold text-slate-800">{title}</h4>
        </div>
        <button
          type="button"
          onClick={() => toggleModule(moduleKey)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? 'bg-orange-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
};



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
            <div className="mt-3 bg-white border border-cyan-200 rounded p-3 text-xs space-y-1">
              <p className="font-semibold text-gray-700">Login Credentials (sent to email):</p>
              <p>Username: <span className="font-bold text-slate-900">{credentials.username}</span></p>
              <p>Password: <span className="font-bold text-slate-900">{credentials.password}</span></p>
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

const EditOrganization = () => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  const isViewMode = pathname ? pathname.includes("/view/") : false;
  const isEditMode = pathname ? pathname.includes("/edit/") : false;

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
  const [moduleAllocation, setModuleAllocation] = useState(defaultModuleAllocation);
  const [activeModule, setActiveModule] = useState<string | null>(null);

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
          
          // ✅ FIXED: Properly handle moduleAllocation parsing
          if (organization.moduleAllocation) {
            try {
              const allocation = typeof organization.moduleAllocation === 'string' 
                ? JSON.parse(organization.moduleAllocation) 
                : organization.moduleAllocation;
              setModuleAllocation(allocation);
            } catch (e) {
              setModuleAllocation(defaultModuleAllocation);
            }
          } else {
            setModuleAllocation(defaultModuleAllocation);
          }
        }
      }).catch(error => {
        console.error('❌ Error fetching organization:', error);
        setModuleAllocation(defaultModuleAllocation);
      });
    }
  }, [id, isViewMode, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (isViewMode) return;
    const { name, type, value, checked } = e.target as any;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const toggleModule = (path: string) => {
    const keys = path.split('.');
    const newAllocation = JSON.parse(JSON.stringify(moduleAllocation));
    let current = newAllocation;
    
    // Navigate to the parent object
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    // Toggle the final key
    const lastKey = keys[keys.length - 1];
    if (current && typeof current === 'object') {
      current[lastKey] = !current[lastKey];
    }
    
    setModuleAllocation(newAllocation);
  };

  const toggleSelectAll = (items: any[], shouldEnable: boolean) => {
    // Update all modules at once in a single state update
    const newAllocation = JSON.parse(JSON.stringify(moduleAllocation));
    
    items.forEach((item: any) => {
      const keys = item.key.split('.');
      let current = newAllocation;
      
      // Navigate to parent, create objects if they don't exist
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      // Set the value directly
      current[keys[keys.length - 1]] = shouldEnable;
    });
    
    setModuleAllocation(newAllocation);
  };

  const closeToast = () => {
    const wasSuccess = toast?.type === "success";
    setToast(null);
    if (wasSuccess) router.back();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        moduleAllocation: JSON.stringify(moduleAllocation),
        sendReportsViaWhatsApp: formData.sendReportsViaWhatsApp,
        sendReportsViaMail: formData.sendReportsViaMail,
        discount: parseFloat(formData.discountPercent) || parseFloat(formData.discountAmount) || 0,
        isHomeCollection: formData.isHomeCollection,
        isOPD: formData.isOPD,
        isIPD: formData.isIPD,
      };

      if (isEditMode) {
        const response = await updateOrganization((Array.isArray(id) ? id[0] : id) as string, payload);
        
        // Update local state with returned moduleAllocation to confirm it saved
        if (response.data?.moduleAllocation) {
          try {
            const savedAllocation = typeof response.data.moduleAllocation === 'string'
              ? JSON.parse(response.data.moduleAllocation)
              : response.data.moduleAllocation;
            setModuleAllocation(savedAllocation);
          } catch (e) {
            // Silent fail - data still saved
          }
        }
        
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

      <div className="p-6 bg-white min-h-screen flex justify-center">
        <div className="bg-white rounded-lg shadow py-3 px-4 w-full max-w-4xl h-fit">

          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              {isViewMode && <Eye size={20} className="inline" />} {getTitle()}
            </h2>
            <button type="button" onClick={() => router.back()}
              className="p-1.5 rounded-full bg-orange-100 hover:bg-cyan-200 transition" title="Back">
              <ArrowLeft size={18} className="text-slate-900" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">

            {/* Organization Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-gray-700 text-sm">Name</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Building2 size={14} className="text-cyan-600" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Code</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Hash size={14} className="text-cyan-600" />
                  <input type="text" name="code" value={formData.code} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Location</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <MapPin size={14} className="text-cyan-600" />
                  <input type="text" name="location" value={formData.location} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Mobile No.</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Phone size={14} className="text-cyan-600" />
                  <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange}
                    disabled={isViewMode} maxLength={10} placeholder="10 digit mobile number"
                    required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Date of Establishment</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <CalendarDays size={14} className="text-cyan-600" />
                  <input type="date" name="date" value={formData.date} onChange={handleChange}
                    disabled={isViewMode} required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Active Status</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <select name="active" value={formData.active} onChange={handleChange}
                    disabled={isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent">
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-gray-700 text-sm">Email Address</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <Mail size={14} className="text-cyan-600" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    disabled={isViewMode} placeholder="example@domain.com" required={!isViewMode}
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-gray-700 text-sm">Address</label>
                <textarea name="address" value={formData.address} onChange={handleChange}
                  disabled={isViewMode} rows={2} required={!isViewMode}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50 bg-white" />
              </div>

              {/* Discount Section */}
              <div>
                <label className="font-medium text-gray-700 text-sm">Discount (%)</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <span className="text-orange-600 font-semibold">%</span>
                  <input type="number" name="discountPercent" value={formData.discountPercent} onChange={handleChange}
                    disabled={isViewMode} placeholder="0" step="0.01" min="0" max="100"
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>

              <div>
                <label className="font-medium text-gray-700 text-sm">Discount (₹)</label>
                <div className="flex items-center border border-gray-300 rounded px-2 bg-white">
                  <span className="text-orange-600 font-semibold">₹</span>
                  <input type="number" name="discountAmount" value={formData.discountAmount} onChange={handleChange}
                    disabled={isViewMode} placeholder="0" step="0.01" min="0"
                    className="w-full px-2 py-1.5 outline-none text-sm disabled:bg-gray-50 bg-transparent" />
                </div>
              </div>
            </div>

            {/* Report Delivery Preferences Section */}
            <div className="border-t border-gray-300 pt-4 mt-4 pb-4">
              <p className="font-semibold text-gray-700 text-sm mb-3">📧 Report Delivery Preferences</p>
              <div className="flex items-center gap-6 ml-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="sendReportsViaWhatsApp" checked={formData.sendReportsViaWhatsApp} onChange={handleChange}
                    disabled={isViewMode} className="w-4 h-4 accent-green-600" />
                  <span className="text-sm text-gray-700">Send via WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="sendReportsViaMail" checked={formData.sendReportsViaMail} onChange={handleChange}
                    disabled={isViewMode} className="w-4 h-4 accent-cyan-600" />
                  <span className="text-sm text-gray-700">Send via Email</span>
                </label>
              </div>
            </div>

            {/* Organization Type Section */}
            <div className="border-t border-gray-300 pt-4 mt-4 pb-4">
              <p className="font-semibold text-gray-700 text-sm mb-3">🏥 Organization Type</p>
              <div className="flex items-center gap-6 ml-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isHomeCollection" checked={formData.isHomeCollection} onChange={handleChange}
                    disabled={isViewMode} className="w-4 h-4 accent-blue-600" />
                  <span className="text-sm text-gray-700">Home Collection</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isOPD" checked={formData.isOPD} onChange={handleChange}
                    disabled={isViewMode} className="w-4 h-4 accent-purple-600" />
                  <span className="text-sm text-gray-700">OPD</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="isIPD" checked={formData.isIPD} onChange={handleChange}
                    disabled={isViewMode} className="w-4 h-4 accent-orange-600" />
                  <span className="text-sm text-gray-700">IPD</span>
                </label>
              </div>
            </div>

            {/* Module Allocation Section */}
            {!isViewMode && (
              <div className="border-t border-gray-300 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Module Allocation</h3>
                
                <div className="space-y-3">
                  {/* Patient Module */}
                  <ModuleAccordion
                    title="Patient"
                    icon={User}
                    items={[
                      { key: 'patient.registration', label: 'Registration' },
                      { key: 'patient.tests', label: 'Tests' },
                    ]}
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                    onToggleAll={toggleSelectAll}
                    activeModule={activeModule}
                    onModuleChange={(module: string) => setActiveModule(module === activeModule ? null : module)}
                  />

                  {/* Masters Module */}
                  <ModuleAccordion
                    title="Masters"
                    icon={Settings}
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
                      { key: 'masters.specimenType', label: 'Sample Type' },
                      { key: 'masters.units', label: 'Units' },
                      { key: 'masters.outsourcing', label: 'Outsourcing' },
                    ]}
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                    onToggleAll={toggleSelectAll}
                    activeModule={activeModule}
                    onModuleChange={(module: string) => setActiveModule(module === activeModule ? null : module)}
                  />

                  {/* Reports Module */}
                  <ModuleAccordion
                    title="Reports"
                    icon={BarChart3}
                    items={[
                      { key: 'reports.dashboard', label: 'Dashboard' },
                      { key: 'reports.collectionReport', label: 'Collection Report' },
                      { key: 'reports.organizationSettlement', label: 'Organization Settlement' },
                      { key: 'reports.referralDoctorSettlement', label: 'Referral Doctor Settlement' },
                      { key: 'reports.patientList', label: 'Patient List' },
                      { key: 'reports.referralDoctorRevenue', label: 'Referral Doctor Revenue' },
                      { key: 'reports.testReport', label: 'Test Report' },
                      { key: 'reports.turnAroundTime', label: 'Turn Around Time' },
                    ]}
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                    onToggleAll={toggleSelectAll}
                    activeModule={activeModule}
                    onModuleChange={(module: string) => setActiveModule(module === activeModule ? null : module)}
                  />

                  {/* Configuration Module */}
                  <ModuleAccordion
                    title="Configuration"
                    icon={Lock}
                    items={[
                      { key: 'configuration.signature', label: 'Signature' },
                      { key: 'configuration.machines', label: 'Machines' },
                      { key: 'configuration.reportSettings', label: 'Report Settings' },
                    ]}
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                    onToggleAll={toggleSelectAll}
                    activeModule={activeModule}
                    onModuleChange={(module: string) => setActiveModule(module === activeModule ? null : module)}
                  />

                  {/* Help Module */}
                  <ModuleAccordion
                    title="Help"
                    icon={HelpCircle}
                    items={[
                      { key: 'help.userManual', label: 'User Manual' },
                      { key: 'help.ultraviewer', label: 'Download Ultraviewer' },
                      { key: 'help.anydesk', label: 'Download Anydesk' },
                    ]}
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                    onToggleAll={toggleSelectAll}
                    activeModule={activeModule}
                    onModuleChange={(module: string) => setActiveModule(module === activeModule ? null : module)}
                  />

                  {/* Inventory Module */}
                  <ModuleAccordion
                    title="Inventory"
                    icon={Package}
                    items={[
                      { key: 'inventory.stockTransactions', label: 'Stock Transactions' },
                      { key: 'inventory.item', label: 'Item' },
                      { key: 'inventory.supplier', label: 'Supplier' },
                      { key: 'inventory.stockEntry', label: 'Stock Entry' },
                      { key: 'inventory.orgTransfer', label: 'Organization Transfer' },
                    ]}
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                    onToggleAll={toggleSelectAll}
                    activeModule={activeModule}
                    onModuleChange={(module: string) => setActiveModule(module === activeModule ? null : module)}
                  />

                  {/* Result Module */}
                  <SingleToggle
                    title="Result"
                    icon={ClipboardCheck}
                    moduleKey="result"
                    moduleAllocation={moduleAllocation}
                    toggleModule={toggleModule}
                  />
                </div>
              </div>
            )}

            {!isViewMode && (
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-1.5 rounded text-sm transition-colors">
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

export default EditOrganization;
