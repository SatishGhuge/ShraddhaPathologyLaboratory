"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, ArrowLeft, Key, Eye, EyeOff, Home } from "lucide-react";
import { adminLogin, forgotPassword, verifyCode, resetPassword } from "@/src/api/adminAuth";

// Image from public folder
const logo = "/logo.png";

const AdminLogin = ({ onLogin }: { onLogin?: () => void }) => {
  const router = useRouter();
  const [currentView, setCurrentView] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef(null);

  const validatePassword = (password: any) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateLogin = () => {
    let newErrors: any = {};
    if (!formData.username.trim()) newErrors.username = "Username / Email is required";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoading(true);
    setErrors({});

    try {
      console.log('🔐 Attempting login with:', { username: formData.username });
      const response = await adminLogin(formData.username, formData.password);
      console.log('✅ Login successful:', response);
      
      document.cookie = `token=${response.token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('token', response.token);
      localStorage.setItem('admin', JSON.stringify(response.admin));

      if (onLogin) onLogin();

      const userRole = response.admin?.role;
      let dashboardPath = '/labdashboard';
      
      if (userRole === 'Collection Center') {
        dashboardPath = '/Dashboard/collectiondashboard';
      } else if (userRole === 'Franchise') {
        dashboardPath = '/Dashboard/franchisedashboard';
      } else if (userRole === 'Patient') {
        dashboardPath = '/patientdashboard';
      }
      
      console.log('🚀 Routing to', dashboardPath);
      router.replace(dashboardPath);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setErrors({ submit: error.message || 'Login failed. Please check your credentials.' });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      console.log('🔐 Sending forgot password request for:', formData.email);
      await forgotPassword(formData.email);
      setSuccessMessage("OTP sent to your email. Valid for 1 minute.");
      setOtpTimer(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setOtpTimer(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      setCurrentView("verifyCode");
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      setErrors({ submit: error.message || 'Failed to send OTP' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setErrors({ code: "Verification code is required" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      await verifyCode(formData.email, formData.code);
      setSuccessMessage("Code verified successfully");
      setCurrentView("resetPassword");
    } catch (error) {
      setErrors({ code: error.message || 'Invalid verification code' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: any) => {
    e.preventDefault();
    let newErrors: any = {};

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else {
      const passwordError = validatePassword(formData.newPassword);
      if (passwordError) {
        newErrors.newPassword = passwordError;
      }
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      await resetPassword(formData.email, formData.code, formData.newPassword);
      setSuccessMessage("Password reset successful! Please login with your new password.");
      
      setTimeout(() => {
        setCurrentView("login");
        setFormData({
          username: "",
          password: "",
          email: "",
          code: "",
          newPassword: "",
          confirmPassword: "",
        });
        setSuccessMessage("");
      }, 2000);
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    setCurrentView("login");
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative overflow-hidden">
      {/* Floating particles - minimal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-orange-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-orange-400/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-orange-400/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-orange-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-orange-400/20 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-orange-400/20 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>
      </div>

      {/* Main Card */}
      <div className="bg-slate-700/40 backdrop-blur-md border border-slate-600/50 rounded-2xl shadow-2xl w-[90%] max-w-md p-8 relative z-10">

        {/* Home Button */}
        <button
          onClick={() => router.push("/")}
          className="absolute top-6 left-6 flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-xs transition hover:bg-white/10 px-2 py-1 rounded-lg"
        >
          <Home size={14} /> Home
        </button>

        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Logo" className="w-20 h-20 mb-4 hover:scale-110 transition-transform duration-200" />
          <h1 className="text-3xl font-bold text-white text-center">SHRADDHA</h1>
          <p className="text-sm text-gray-300 text-center">Pathology Laboratory</p>
          <p className="text-xs text-gray-400 text-center mt-1">Login</p>
        </div>

        {/* LOGIN FORM */}
        {currentView === "login" && (
          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-500/20 border border-green-500 rounded-md p-2">
                <p className="text-green-200 text-xs text-center">{successMessage}</p>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-500/20 border border-red-500 rounded-md p-2">
                <p className="text-red-200 text-xs text-center">{errors.submit}</p>
              </div>
            )}

            {/* USERNAME */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {errors.username && (
                <p className="text-red-400 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setCurrentView("forgotPassword")}
                className="text-xs text-orange-400 hover:text-orange-300 underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {currentView === "forgotPassword" && (
          <form className="space-y-4" onSubmit={handleForgotPassword}>
            <p className="text-xs text-gray-300 text-center mb-4">
              Enter your email to receive a verification code
            </p>

            {successMessage && (
              <div className="bg-green-500/20 border border-green-500 rounded-md p-2">
                <p className="text-green-200 text-xs text-center">{successMessage}</p>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-500/20 border border-red-500 rounded-md p-2">
                <p className="text-red-200 text-xs text-center">{errors.submit}</p>
              </div>
            )}

            {/* EMAIL */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-orange-400 hover:text-orange-300 text-xs mt-2"
            >
              <ArrowLeft size={12} /> Back to Login
            </button>
          </form>
        )}

        {/* VERIFY CODE FORM */}
        {currentView === "verifyCode" && (
          <form className="space-y-4" onSubmit={handleVerifyCode}>
            <p className="text-xs text-gray-300 text-center mb-2">
              Enter the 6-digit OTP sent to <span className="font-semibold text-white">{formData.email}</span>
            </p>

            {/* OTP Timer */}
            <div className="text-center">
              {otpTimer > 0 ? (
                <span className={`text-xs font-semibold ${otpTimer <= 15 ? 'text-red-400' : 'text-orange-400'}`}>
                  OTP expires in {otpTimer}s
                </span>
              ) : (
                <span className="text-xs text-red-400">OTP expired —&nbsp;
                  <button type="button" onClick={(e) => handleForgotPassword(e)} className="underline text-orange-400 hover:text-orange-300">
                    Resend OTP
                  </button>
                </span>
              )}
            </div>

            {successMessage && (
              <div className="bg-green-500/20 border border-green-500 rounded-md p-2">
                <p className="text-green-200 text-xs text-center">{successMessage}</p>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-500/20 border border-red-500 rounded-md p-2">
                <p className="text-red-200 text-xs text-center">{errors.submit}</p>
              </div>
            )}

            {/* CODE */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">Verification Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center tracking-widest"
                />
              </div>
              {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code}</p>}
            </div>

            {/* VERIFY BUTTON */}
            <button
              type="submit"
              disabled={loading || otpTimer === 0}
              className="w-full px-4 py-2.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-orange-400 hover:text-orange-300 text-xs mt-2"
            >
              <ArrowLeft size={12} /> Back to Login
            </button>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {currentView === "resetPassword" && (
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <p className="text-xs text-gray-300 text-center mb-4">
              Create your new password
            </p>

            {successMessage && (
              <div className="bg-green-500/20 border border-green-500 rounded-md p-2">
                <p className="text-green-200 text-xs text-center">{successMessage}</p>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-500/20 border border-red-500 rounded-md p-2">
                <p className="text-red-200 text-xs text-center">{errors.submit}</p>
              </div>
            )}

            {/* NEW PASSWORD */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-xs text-gray-300 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" size={16} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* RESET BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg text-white bg-orange-500 hover:bg-orange-600 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-orange-400 hover:text-orange-300 text-xs mt-2"
            >
              <ArrowLeft size={12} /> Back to Login
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Shraddha Pathology Laboratory
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
