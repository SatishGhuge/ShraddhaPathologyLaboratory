import { useRouter } from "next/navigation";
"use client";

import React, { useState } from "react";

import { User, IdCard, Lock, Users } from "lucide-react";
const logo = "/logo.png";

const Login = ({ onLogin }: { onLogin?: (data: any) => void }) => {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [formData, setFormData] = useState({
    accountId: "",
    userId: "",
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  /* ================= HANDLERS ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    let newErrors: any = {};

    if (!role) newErrors.role = "Please select a role";

    if (
      ["Lab Admin", "Collection Center Admin", "Franchise Admin"].includes(role)
    ) {
      if (!formData.username.trim()) {
        newErrors.username = "Username / Email is required";
      }
    }

    if (role === "Employee") {
      if (!formData.accountId.trim()) {
        newErrors.accountId = "Account ID is required";
      }
      if (!formData.username.trim()) {
        newErrors.username = "Username / Email is required";
      }
    }

    if (role === "User") {
      if (!formData.userId.trim()) {
        newErrors.userId = "User ID is required";
      }
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      // Only authenticate Lab Admin, Collection Center Admin, and Franchise Admin with backend
      if (["Lab Admin", "Collection Center Admin", "Franchise Admin"].includes(role)) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          setErrors({ general: data.message || 'Login failed' });
          setLoading(false);
          return;
        }

        // Store token and admin data
        localStorage.setItem('token', data.token);
        localStorage.setItem('admin', JSON.stringify(data.admin));
        
        // Also set token in cookie for middleware
        document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        
        if (onLogin) onLogin(data);
      }

      // ✅ ROLE BASED ROUTING
      if (role === "Lab Admin") {
        router.replace("/labdashboard");
      }
      else if (role === "Collection Center Admin") {
        router.replace("/collection");
      }
      else if (role === "Franchise Admin") {
        router.replace("/franchise");
      }
      else if (role === "Employee") {
        // For now, just navigate without backend auth
        router.replace("/employee");
      }
      else if (role === "User") {
        router.replace("/patientdashboard");
      }

    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };


  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-800 to-slate-800">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl w-[90%] max-w-md p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="w-16 h-16 rounded-full hover:scale-110 transition-transform duration-200" />

          <h1 className="text-2xl font-bold text-white">
                  Shraddha Pathology Laboratory
                <h4 className="text-xs text-center font-medium bg-gradient-to-r from-green-300 via-blue-300 to-pink-400 bg-clip-text text-transparent">
                  Empowering Life Transforming Health
                </h4>
                 </h1>
          <p className="text-sm text-cyan-100">Login Portal</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>

          {/* General Error */}
          {errors.general && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3">
              <p className="text-red-200 text-sm">{errors.general}</p>
            </div>
          )}

          {/* ROLE */}
          <div>
            <label className="block text-sm text-cyan-100 mb-1">
              Select Role
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 px-4 py-2 rounded-md bg-white/90"
              >
                <option value="">-- Select Role --</option>
                <option>Lab Admin</option>
                <option>Collection Center Admin</option>
                <option>Franchise Admin</option>
                <option>Employee</option>
                <option>User</option>
              </select>
            </div>
            {errors.role && (
              <p className="text-red-400 text-sm mt-1">{errors.role}</p>
            )}
          </div>

          {/* ACCOUNT ID (Employee) */}
          {role === "Employee" && (
            <div>
              <label className="block text-sm text-cyan-100 mb-1">
                Account ID
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  name="accountId"
                  onChange={handleChange}
                  className="w-full pl-10 px-4 py-2 rounded-md bg-white/90"
                />
              </div>
              {errors.accountId && (
                <p className="text-red-400 text-sm mt-1">{errors.accountId}</p>
              )}
            </div>
          )}

          {/* USER ID (User) */}
          {role === "User" && (
            <div>
              <label className="block text-sm text-cyan-100 mb-1">
                User ID
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  name="userId"
                  onChange={handleChange}
                  className="w-full pl-10 px-4 py-2 rounded-md bg-white/90"
                />
              </div>
              {errors.userId && (
                <p className="text-red-400 text-sm mt-1">{errors.userId}</p>
              )}
            </div>
          )}

          {/* USERNAME / EMAIL */}
          {role && role !== "User" && (
            <div>
              <label className="block text-sm text-cyan-100 mb-1">
                Username / Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  name="username"
                  onChange={handleChange}
                  className="w-full pl-10 px-4 py-2 rounded-md bg-white/90"
                />
              </div>
              {errors.username && (
                <p className="text-red-400 text-sm mt-1">{errors.username}</p>
              )}
            </div>
          )}

          {/* PASSWORD */}
          {role && (
            <div>
              <label className="block text-sm text-cyan-100 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
                <input
                  type="password"
                  name="password"
                  onChange={handleChange}
                  className="w-full pl-10 px-4 py-2 rounded-md bg-white/90"
                />
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password}</p>
              )}
            </div>
          )}

          {/* LOGIN BUTTON */}
          {role && (
            <button
              type="submit"
              disabled={loading}
              className="block mx-auto px-8 py-2 rounded-md text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          )}
        </form>

        <p className="text-center text-xs text-cyan-100 mt-6">
          © 2026 Shraddha Diagnostic Center
        </p>
      </div>
    </div>
  );
};

export default Login;

