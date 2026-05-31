"use client";

import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";

import Header from "@/src/components/Header";
import { getUserById, createUser, updateUser, getRoles } from "@/src/api/master.js";

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

  const [formData, setFormData] = useState({
    center: "", role: "", username: "", gender: "",
    name: "", password: "", confirmPassword: "",
    mobile: "", email: "", address: ""
  });
  const [errors, setErrors] = useState<any>({});

  const inputClass = "w-full px-2 py-1 text-base border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";
  const labelClass = "text-sm text-gray-700 font-medium mb-1 block";

  // Load roles for dropdown
  useEffect(() => {
    getRoles().then(setRoles).catch(() => {});
  }, []);

  // Load user in edit mode
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
          }
        })
        .catch((err) => setErrorMessage(err.message || "Failed to load user"))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    // Name: only letters and spaces
    if (name === "name" && !/^[a-zA-Z\s]*$/.test(value)) return;

    // Mobile: only digits
    if (name === "mobile" && !/^\d*$/.test(value)) return;

    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
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
      const payload = { ...formData };
      delete payload.confirmPassword;
      if (isEditMode && !payload.password) delete payload.password;

      if (isEditMode) {
        await updateUser((Array.isArray(id) ? id[0] : id) as string, payload);
      } else {
        await createUser(payload);
      }
      setSuccessMessage(isEditMode ? "User updated successfully ✅" : "User added successfully ✅");
      setTimeout(() => router.push("/master/userlist"), 1500);
    } catch (err) {
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
      <div className="p-6 bg-white min-h-screen flex justify-center">
        <div className="w-[500px] bg-white p-4 rounded-lg shadow-lg border border-gray-200 h-fit">

          <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
            <h2 className="text-xl text-slate-900 font-semibold">
              {isEditMode ? "Edit User Details" : "Enter User Details"}
            </h2>
            <button onClick={() => router.push("/master/userlist")} className="text-slate-700 hover:text-slate-900">
              <ArrowLeft size={24} />
            </button>
          </div>

          {/* Center & Role */}
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <label className={labelClass}>Center *</label>
              <input name="center" value={formData.center} onChange={handleChange} className={inputClass} placeholder="Enter center name" />
              {errors.center && <p className="text-red-700 text-xs">{errors.center}</p>}
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} className={inputClass}>
                <option value="">Please Select</option>
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              {errors.role && <p className="text-red-700 text-xs">{errors.role}</p>}
            </div>
          </div>

          {/* Username & Gender */}
          <div className="grid grid-cols-2 gap-3 mb-2">
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

          {/* Name */}
          <div className="mb-2">
            <label className={labelClass}>Name *</label>
            <input name="name" value={formData.name} onChange={handleChange} className={inputClass} />
            {errors.name && <p className="text-red-700 text-xs">{errors.name}</p>}
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-3 mb-2">
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

          {/* Mobile & Email */}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className={labelClass}>Mobile Number</label>
              <input name="mobile" type="tel" value={formData.mobile} onChange={handleChange} maxLength={10} placeholder="10 digit mobile" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email Address</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="example@domain.com" className={inputClass} />
            </div>
          </div>

          {/* Address */}
          <div className="mb-2">
            <label className={labelClass}>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} rows={2} className={inputClass} />
          </div>

          {successMessage && (
            <div className="bg-green-100 text-green-700 p-2 rounded text-center text-sm mb-3">{successMessage}</div>
          )}
          {errorMessage && (
            <div className="bg-red-50 text-red-700 border border-red-400 p-2 rounded text-sm mb-3">{errorMessage}</div>
          )}

          <div className="flex justify-center gap-3 mt-4">
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

