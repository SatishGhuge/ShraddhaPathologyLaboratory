"use client";

import { ArrowLeft, ChevronDown, User, Settings, BarChart3, HelpCircle, ClipboardCheck, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import Header from "@/src/components/Header";
import { getUserById, createUser, updateUser, getRoles, getOrganizations } from "@/src/api/master.js";

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

const defaultModuleAllocation = {
  patient: {
    registration: false,
    tests: false,
  },
  masters: {
    testlist: false,
    testTemplates: false,
    departmentlist: false,
    packagelist: false,
    charges: false,
    rolelist: false,
    userlist: false,
    referralDoctorList: false,
    organization: false,
    specimenType: false,
    units: false,
  },
  reports: {
    dashboard: false,
    collectionReport: false,
    patientList: false,
    referralDoctorRevenue: false,
    testReport: false,
    turnAroundTime: false,
  },
  configuration: {
    letterhead: false,
    signature: false,
  },
  help: {
    userManual: false,
    ultraviewer: false,
    anydesk: false,
  },
  result: false,
};

export default function AddUserForm() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const isViewMode = pathname.includes("/view/");
  const isEditMode = pathname.includes("/edit/");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [moduleAllocation, setModuleAllocation] = useState(defaultModuleAllocation);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    organizationId: "", role: "", gender: "",
    name: "",
    mobile: "", email: "", address: ""
  });
  const [errors, setErrors] = useState<any>({});

  const inputClass = "w-full px-2 py-1 text-base border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";
  const labelClass = "text-sm text-gray-700 font-medium mb-1 block";

  useEffect(() => {
    getRoles().then((res: any) => {
      const rolesArray = Array.isArray(res) ? res : res?.data || [];
      setRoles(rolesArray);
    }).catch(() => setRoles([]));
    getOrganizations().then((res: any) => {
      const orgsArray = Array.isArray(res) ? res : res?.data || res || [];
      setOrganizations(orgsArray);
    }).catch(() => setOrganizations([]));
  }, []);

  useEffect(() => {
    if (id && (isViewMode || isEditMode)) {
      setLoading(true);
      getUserById((Array.isArray(id) ? id[0] : id) as string)
        .then((user) => {
          if (user) {
        setFormData({
            organizationId: user.organizationId || "",
            role: user.role || "",
            gender: user.gender || "",
            name: user.name || "",
            mobile: user.mobile || "",
            email: user.email || "",
            address: user.address || ""
          });
            // Organization is already set in formData
            if (user.moduleAllocation) {
              try {
                let allocationData = user.moduleAllocation;
                console.log('📦 Raw moduleAllocation from API:', allocationData, 'Type:', typeof allocationData);
                console.log('📦 Full user object:', JSON.stringify(user, null, 2));
                
                // If it's an object with modules property, extract it
                if (allocationData && typeof allocationData === 'object' && 'modules' in allocationData) {
                  allocationData = allocationData.modules;
                  console.log('✅ Extracted modules from object:', allocationData);
                }
                
                // Parse if it's a string
                const allocation = typeof allocationData === 'string' 
                  ? JSON.parse(allocationData) 
                  : allocationData;
                console.log('✅ Final parsed allocation:', allocation);
                  
                setModuleAllocation(allocation || defaultModuleAllocation);
              } catch (e) {
                console.error('❌ Error parsing module allocation:', e);
                setModuleAllocation(defaultModuleAllocation);
              }
            } else {
              console.log('⚠️ No moduleAllocation found in user object');
            }
          }
        })
        .catch((err) => setErrorMessage(err.message || "Failed to load user"))
        .finally(() => setLoading(false));
    }
  }, [id, isViewMode, isEditMode, organizations]);

  const handleChange = (e: any) => {
    if (isViewMode) return;
    const { name, value } = e.target;
    if (name === "name" && !/^[a-zA-Z\s]*$/.test(value)) return;
    if (name === "mobile" && !/^\d*$/.test(value)) return;
    
    // When organization changes, update selectedOrganization
    if (name === "organizationId") {
      // Just handle the change, no need to track selected organization
    }
    
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const toggleModule = (path: string) => {
    if (isViewMode) return;
    const keys = path.split('.');
    const newAllocation = JSON.parse(JSON.stringify(moduleAllocation));
    let current = newAllocation;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = !current[keys[keys.length - 1]];
    setModuleAllocation(newAllocation);
  };

  const toggleSelectAll = (items: any[], shouldEnable: boolean) => {
    if (isViewMode) return;
    // Update all modules at once in a single state update
    const newAllocation = JSON.parse(JSON.stringify(moduleAllocation));
    
    items.forEach((item: any) => {
      const keys = item.key.split('.');
      let current = newAllocation;
      
      // Navigate to parent
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      // Set the value directly
      current[keys[keys.length - 1]] = shouldEnable;
    });
    
    setModuleAllocation(newAllocation);
  };

  const validate = () => {
    const newErrors: any = {};
    // Organization is now optional (removed mandatory check)
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.name) newErrors.name = "Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const payload = { 
        ...formData,
        moduleAllocation: JSON.stringify(moduleAllocation)
      };

      console.log('📤 Submitting user payload:', payload);

      if (isEditMode) {
        await updateUser((Array.isArray(id) ? id[0] : id) as string, payload);
        
        // If the current user is being updated, refresh their data in localStorage
        const currentUser = JSON.parse(localStorage.getItem("admin") || "{}");
        if (currentUser.id === parseInt((Array.isArray(id) ? id[0] : id) as string)) {
          console.log('🔄 Updating current user in localStorage...');
          const updatedUser = {
            ...currentUser,
            ...payload,
            moduleAllocation: moduleAllocation
          };
          localStorage.setItem("admin", JSON.stringify(updatedUser));
          window.dispatchEvent(new Event('storage'));
          console.log('✅ Current user updated in localStorage');
        }
      } else {
        await createUser(payload);
      }
      setSuccessMessage(isEditMode ? "User updated successfully ✅" : "User added successfully ✅");
      setTimeout(() => router.push("/master/userlist"), 1500);
    } catch (err: any) {
      console.error('❌ Error:', err);
      const errorMessage = err.detail || err.message || "Failed to save user";
      setErrorMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="p-6 bg-white min-h-screen flex justify-center items-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    </>
  );

  return (
    <>
      <Header />
      <div className="p-6 bg-white min-h-screen">
        <div className="max-w-4xl mx-auto bg-white p-4 rounded-lg shadow-lg border border-gray-200">

          <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
            <h2 className="text-xl text-slate-900 font-semibold">
              {isViewMode ? "View User Details" : isEditMode ? "Edit User Details" : "Enter User Details"}
            </h2>
            <button onClick={() => router.push("/master/userlist")} className="text-slate-700 hover:text-slate-900">
              <ArrowLeft size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Organization</label>
              <select name="organizationId" value={formData.organizationId} onChange={handleChange} disabled={isViewMode} className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}>
                <option value="">Please Select</option>
                {Array.isArray(organizations) && organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
              {errors.organizationId && <p className="text-red-700 text-xs">{errors.organizationId}</p>}
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} disabled={isViewMode} className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}>
                <option value="">Please Select</option>
                {Array.isArray(roles) && roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              {errors.role && <p className="text-red-700 text-xs">{errors.role}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input name="name" value={formData.name} onChange={handleChange} disabled={isViewMode} className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`} />
              {errors.name && <p className="text-red-700 text-xs">{errors.name}</p>}
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} disabled={isViewMode} className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {errors.gender && <p className="text-red-700 text-xs">{errors.gender}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelClass}>Mobile Number</label>
              <input name="mobile" type="tel" value={formData.mobile} onChange={handleChange} disabled={isViewMode} maxLength={10} placeholder="10 digit mobile" className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} disabled={isViewMode} placeholder="example@domain.com" className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`} />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} disabled={isViewMode} rows={2} className={`${inputClass} ${isViewMode ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`} />
          </div>

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
                  { key: 'masters.specimenType', label: 'Specimen Type' },
                  { key: 'masters.units', label: 'Units' },
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
                  { key: 'configuration.letterhead', label: 'Letterhead' },
                  { key: 'configuration.signature', label: 'Signature' },
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

          {successMessage && (
            <div className="bg-green-100 text-green-700 p-2 rounded text-center text-sm mb-3 mt-4">{successMessage}</div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-400 p-2 rounded text-sm mb-3 mt-4">{errorMessage}</div>
          )}

          <div className="flex justify-center gap-3 mt-6">
            {!isViewMode && (
              <>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-1.5 text-sm rounded-md"
                >
                  {saving ? "Saving..." : isEditMode ? "Update" : "Save"}
                </button>
                <button onClick={() => router.push("/master/userlist")} className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-1.5 text-sm rounded-md">
                  Cancel
                </button>
              </>
            )}
            {isViewMode && (
              <button onClick={() => router.push("/master/userlist")} className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-1.5 text-sm rounded-md">
                Back
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
