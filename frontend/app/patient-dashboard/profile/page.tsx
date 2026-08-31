"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Lock,
  CheckCircle,
} from "lucide-react";
import API_BASE_URL from "@/src/api/config";

export default function PatientProfilePage() {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    address: "",
    location: "",
    dob: "",
    gender: "",
  });
  const [errors, setErrors] = useState<any>({});
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const patientData = localStorage.getItem("patient");
    if (patientData) {
      const parsed = JSON.parse(patientData);
      setPatient(parsed);
      setFormData({
        firstName: parsed.firstName || "",
        lastName: parsed.lastName || "",
        mobile: parsed.mobile || "",
        email: parsed.email || "",
        address: parsed.address || "",
        location: parsed.location || "",
        dob: parsed.dob ? parsed.dob.split("T")[0] : "",
        gender: parsed.gender || "",
      });
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev: any) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.mobile || !/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Valid 10-digit mobile number is required";
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Valid email is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setSuccessMessage("");

    try {
      const token = localStorage.getItem("patientToken");
      const response = await fetch(
        `${API_BASE_URL}/patient/auth/profile/${patient.patientId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.mobile,
            address: formData.address,
            location: formData.location,
            dob: formData.dob,
            gender: formData.gender,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local storage
        const updatedPatient = { ...patient, ...data.data };
        setPatient(updatedPatient);
        localStorage.setItem("patient", JSON.stringify(updatedPatient));

        setSuccessMessage("Profile updated successfully!");
        setIsEditing(false);

        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrors({ general: data.message || "Failed to update profile" });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setErrors({ general: "An error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const profileFields = [
    {
      label: "Patient ID",
      value: patient.patientId,
      icon: User,
      editable: false,
    },
    {
      label: "Email",
      value: formData.email,
      icon: Mail,
      editable: true,
      name: "email",
      type: "email",
    },
    {
      label: "Mobile",
      value: formData.mobile,
      icon: Phone,
      editable: true,
      name: "mobile",
      type: "tel",
    },
    {
      label: "Date of Birth",
      value: formData.dob,
      icon: Calendar,
      editable: true,
      name: "dob",
      type: "date",
      displayValue: formData.dob
        ? new Date(formData.dob).toLocaleDateString("en-GB")
        : "Not set",
    },
    {
      label: "Gender",
      value: formData.gender,
      icon: User,
      editable: true,
      name: "gender",
      type: "select",
      options: ["Male", "Female", "Other"],
    },
    {
      label: "Location",
      value: formData.location,
      icon: MapPin,
      editable: true,
      name: "location",
      type: "text",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your personal information
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg hover:bg-[oklch(40%_0.075_224.283)] transition-colors font-medium"
          >
            <Edit size={18} />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setErrors({});
                // Reset form data
                setFormData({
                  firstName: patient.firstName || "",
                  lastName: patient.lastName || "",
                  mobile: patient.mobile || "",
                  email: patient.email || "",
                  address: patient.address || "",
                  location: patient.location || "",
                  dob: patient.dob ? patient.dob.split("T")[0] : "",
                  gender: patient.gender || "",
                });
              }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg hover:bg-[oklch(40%_0.075_224.283)] transition-colors font-medium disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errors.general && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {errors.general}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-white border-b border-gray-200 p-8 text-gray-800">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
              <User size={48} className="text-[oklch(45%_0.085_224.283)]" />
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="First Name"
                        className="w-full px-3 py-2 rounded-lg text-gray-800 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      {errors.firstName && (
                        <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 rounded-lg text-gray-800 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                      {errors.lastName && (
                        <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-gray-800">
                    {patient.title} {patient.firstName} {patient.lastName}
                  </h2>
                  <p className="text-gray-500 mt-2">
                    Registered since{" "}
                    {new Date(patient.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="p-6 space-y-4">
          {profileFields.map((field, index) => {
            const Icon = field.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="w-10 h-10 bg-white border border-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-[oklch(45%_0.085_224.283)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">{field.label}</p>
                  {isEditing && field.editable ? (
                    <div>
                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          value={field.value}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          name={field.name}
                          value={field.value}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
                        />
                      )}
                      {errors[field.name!] && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors[field.name!]}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-gray-800">
                      {field.displayValue || field.value || "Not set"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Address - Full Width */}
          <div className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-white border border-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-[oklch(45%_0.085_224.283)]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Address</p>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Enter your complete address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)] resize-none"
                  />
                ) : (
                  <p className="text-base font-medium text-gray-800">
                    {patient.address || "Not set"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lock size={24} className="text-[oklch(45%_0.085_224.283)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Account Security
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              To change your password or update security settings, please contact
              the lab support team.
            </p>
            <button
              className="px-4 py-2 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg hover:bg-[oklch(40%_0.075_224.283)] transition-colors font-medium"
              onClick={() => alert("Please contact lab support: +91 98765 43210")}
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
