"use client";

import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import Header from "@/src/components/Header";
import { getUserById, createUser, updateUser } from "@/src/api/master.js";
import { getRoles, getCollectionCenters } from "@/src/api/master.js";

const defaultModuleAllocation = {
  patient: {
    registration: false,
    tests: false,
    outsourcing: false,
  },
  masters: {
    center: false,
    centerlist: false,
    charges: false,
    corporate: false,
    corporateWiseCharges: false,
    corporatelist: false,
    departmentlist: false,
    franchise: false,
    microbiologyOrganism: false,
    outsourcing: false,
    packagelist: false,
    referralDoctor: false,
    referralDoctorList: false,
    rolelist: false,
    specimenType: false,
    testCharges: false,
    testTemplates: false,
    testlist: false,
    units: false,
    user: false,
    userlist: false,
  },
  reports: {
    dashboard: false,
    dailyCollection: false,
    monthlyCollectionSummary: false,
    patientList: false,
    centerWiseCostReport: false,
    b2bTestwiseCostReport: false,
    discountReport: false,
    testReport: false,
    testCompliment: false,
    serviceCountReport: false,
    paymentReceipt: false,
    sampleRejectionReport: false,
    detailedWorksheet: false,
    hospitalBills: false,
  },
  signature: false,
  help: false,
  result: false,
};

export default function AddUserForm() {
  const router = useRouter();
  const { id } = useParams();
  const pathname = usePathname();
  const isEditMode = pathname.includes("/edit/");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [moduleAllocation, setModuleAllocation] = useState(defaultModuleAllocation);

  const [formData, setFormData] = useState({
    center: "", role: "", username: "", gender: "",
    name: "", password: "", confirmPassword: "",
    mobile: "", email: "", address: ""
  });
  const [errors, setErrors] = useState<any>({});

  const inputClass = "w-full px-2 py-1 text-base border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";
  const labelClass = "text-sm text-gray-700 font-medium mb-1 block";

  useEffect(() => {
    getRoles().then((res) => {
      const rolesArray = Array.isArray(res) ? res : res?.data || [];
      setRoles(rolesArray);
    }).catch(() => setRoles([]));
    getCollectionCenters().then((res) => {
      const centersArray = Array.isArray(res) ? res : res?.data || res || [];
      setCenters(centersArray);
    }).catch(() => setCenters([]));
  }, []);

  useEffect(() => {
    if (id && isEditMode) {
      setLoading(true);
      getUserById((Array.isArray(id) ? id[0] : id) as string)
        .then((user) => {
          if (user) {
            setFormData({
              center: user.center || "",
              role: user.role || "",
              username: user.username || "",
              gender: user.gender || "",
              name: user.name || "",
              password: "",
              confirmPassword: "",
              mobile: user.mobile || "",
              email: user.email || "",
              address: user.address || ""
            });
            if (user.moduleAllocation) {
              try {
                const allocation = typeof user.moduleAllocation === 'string' 
                  ? JSON.parse(user.moduleAllocation) 
                  : user.moduleAllocation;
                setModuleAllocation(allocation);
              } catch (e) {
                setModuleAllocation(defaultModuleAllocation);
              }
            }
          }
        })
        .catch((err) => setErrorMessage(err.message || "Failed to load user"))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (name === "name" && !/^[a-zA-Z\s]*$/.test(value)) return;
    if (name === "mobile" && !/^\d*$/.test(value)) return;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const toggleModule = (path: string) => {
    const keys = path.split('.');
    const newAllocation = JSON.parse(JSON.stringify(moduleAllocation));
    let current = newAllocation;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = !current[keys[keys.length - 1]];
    setModuleAllocation(newAllocation);
  };

  const validate = () => {
    const newErrors: any = {};
    if (!formData.center) newErrors.center = "Center is required";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.name) newErrors.name = "Name is required";
    if (!isEditMode && !formData.password) newErrors.password = "Password is required";
    if (formData.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(formData.password)) {
      newErrors.password = "Password must have uppercase, lowercase, number and special character (min 8 chars)";
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
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
      delete payload.confirmPassword;
      if (isEditMode && !payload.password) delete payload.password;

      console.log('📤 Submitting user payload:', payload);

      if (isEditMode) {
        await updateUser((Array.isArray(id) ? id[0] : id) as string, payload);
      } else {
        await createUser(payload);
      }
      setSuccessMessage(isEditMode ? "User updated successfully ✅" : "User added successfully ✅");
      setTimeout(() => router.push("/master/userlist"), 1500);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setErrorMessage(err.message || "Failed to save user");
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
              {isEditMode ? "Edit User Details" : "Enter User Details"}
            </h2>
            <button onClick={() => router.push("/master/userlist")} className="text-slate-700 hover:text-slate-900">
              <ArrowLeft size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Center *</label>
              <select name="center" value={formData.center} onChange={handleChange} className={inputClass}>
                <option value="">Please Select</option>
                {Array.isArray(centers) && centers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              {errors.center && <p className="text-red-700 text-xs">{errors.center}</p>}
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} className={inputClass}>
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
              <label className={labelClass}>Username *</label>
              <input name="username" value={formData.username} onChange={handleChange} className={inputClass} />
              {errors.username && <p className="text-red-700 text-xs">{errors.username}</p>}
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className={inputClass}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
              {errors.gender && <p className="text-red-700 text-xs">{errors.gender}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} className={inputClass} />
            {errors.name && <p className="text-red-700 text-xs">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="relative">
              <label className={labelClass}>Password {!isEditMode && "*"}</label>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder={isEditMode ? "Leave blank to keep current" : ""}
                className={`${inputClass} pr-8`}
              />
              <span className="absolute right-2 top-7 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
              {errors.password && <p className="text-red-700 text-xs">{errors.password}</p>}
            </div>
            <div className="relative">
              <label className={labelClass}>Confirm Password</label>
              <input
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`${inputClass} pr-8`}
              />
              <span className="absolute right-2 top-7 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </span>
              {errors.confirmPassword && <p className="text-red-700 text-xs">{errors.confirmPassword}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelClass}>Mobile Number</label>
              <input name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} placeholder="10 digit mobile" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@domain.com" className={inputClass} />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={inputClass} />
          </div>

          <div className="border-t border-gray-300 pt-4 mt-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Module Allocation</h3>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Patient Module */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Patient Module
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.patient.registration} onChange={() => toggleModule('patient.registration')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Registration</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.patient.tests} onChange={() => toggleModule('patient.tests')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Tests</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.patient.outsourcing} onChange={() => toggleModule('patient.outsourcing')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Outsourcing</span>
                  </label>
                </div>
              </div>

              {/* Masters Module */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Masters Module
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.center} onChange={() => toggleModule('masters.center')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Center</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.centerlist} onChange={() => toggleModule('masters.centerlist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Center List</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.charges} onChange={() => toggleModule('masters.charges')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Charges</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.corporate} onChange={() => toggleModule('masters.corporate')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Corporate</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.corporateWiseCharges} onChange={() => toggleModule('masters.corporateWiseCharges')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Corp. Wise Charges</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.corporatelist} onChange={() => toggleModule('masters.corporatelist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Corporate List</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.departmentlist} onChange={() => toggleModule('masters.departmentlist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Department</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.franchise} onChange={() => toggleModule('masters.franchise')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Franchise</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.microbiologyOrganism} onChange={() => toggleModule('masters.microbiologyOrganism')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Microbiology</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.outsourcing} onChange={() => toggleModule('masters.outsourcing')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Outsourcing</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.packagelist} onChange={() => toggleModule('masters.packagelist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Package</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.referralDoctor} onChange={() => toggleModule('masters.referralDoctor')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Referral Doctor</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.referralDoctorList} onChange={() => toggleModule('masters.referralDoctorList')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Ref. Doctor List</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.rolelist} onChange={() => toggleModule('masters.rolelist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Role</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.specimenType} onChange={() => toggleModule('masters.specimenType')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Specimen Type</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.testCharges} onChange={() => toggleModule('masters.testCharges')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Test Charges</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.testTemplates} onChange={() => toggleModule('masters.testTemplates')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Test Template</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.testlist} onChange={() => toggleModule('masters.testlist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Test List</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.units} onChange={() => toggleModule('masters.units')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Units</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.user} onChange={() => toggleModule('masters.user')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">User</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.masters.userlist} onChange={() => toggleModule('masters.userlist')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">User List</span>
                  </label>
                </div>
              </div>

              {/* Reports Module */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  Reports Module
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.dashboard} onChange={() => toggleModule('reports.dashboard')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Dashboard</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.dailyCollection} onChange={() => toggleModule('reports.dailyCollection')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Daily Collection</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.monthlyCollectionSummary} onChange={() => toggleModule('reports.monthlyCollectionSummary')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Monthly Summary</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.patientList} onChange={() => toggleModule('reports.patientList')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Patient List</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.centerWiseCostReport} onChange={() => toggleModule('reports.centerWiseCostReport')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Center Cost</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.b2bTestwiseCostReport} onChange={() => toggleModule('reports.b2bTestwiseCostReport')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">B2B Cost</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.discountReport} onChange={() => toggleModule('reports.discountReport')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Discount</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.testReport} onChange={() => toggleModule('reports.testReport')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Test Report</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.testCompliment} onChange={() => toggleModule('reports.testCompliment')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Test Compliment</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.serviceCountReport} onChange={() => toggleModule('reports.serviceCountReport')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Service Count</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.paymentReceipt} onChange={() => toggleModule('reports.paymentReceipt')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Payment Receipt</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.sampleRejectionReport} onChange={() => toggleModule('reports.sampleRejectionReport')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Sample Rejection</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.detailedWorksheet} onChange={() => toggleModule('reports.detailedWorksheet')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Worksheet</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.reports.hospitalBills} onChange={() => toggleModule('reports.hospitalBills')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Hospital Bills</span>
                  </label>
                </div>
              </div>

              {/* Other Modules */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Other Modules
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.result} onChange={() => toggleModule('result')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Result</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.signature} onChange={() => toggleModule('signature')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Signature</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded">
                    <input type="checkbox" checked={moduleAllocation.help} onChange={() => toggleModule('help')} className="w-4 h-4 accent-orange-500" />
                    <span className="text-sm text-gray-700">Help</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="bg-green-100 text-green-700 p-2 rounded text-center text-sm mb-3 mt-4">{successMessage}</div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-400 p-2 rounded text-sm mb-3 mt-4">{errorMessage}</div>
          )}

          <div className="flex justify-center gap-3 mt-6">
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
          </div>

        </div>
      </div>
    </>
  );
}
