import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Mail, ArrowLeft, Key, Eye, EyeOff, Home } from "lucide-react";
import logo from "../assets/logo.png";
import { adminLogin, forgotPassword, verifyCode, resetPassword } from "../api/adminAuth";

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState("login"); // login, forgotPassword, verifyCode, resetPassword
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

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [otpTimer, setOtpTimer] = useState(0); // seconds remaining
  const timerRef = useRef(null);

  /* ================= PASSWORD VALIDATION ================= */
  const validatePassword = (password) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  };

  /* ================= HANDLERS ================= */

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateLogin = () => {
    let newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username / Email is required";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;

    setLoading(true);
    setErrors({});

    try {
      console.log('🔐 Attempting login with:', { username: formData.username });
      const response = await adminLogin(formData.username, formData.password);
      console.log('✅ Login successful:', response);
      
      // Store token and admin data
      localStorage.setItem('token', response.token);
      localStorage.setItem('admin', JSON.stringify(response.admin));

      if (onLogin) onLogin();

      // Route based on userType/role
      if (response.admin.userType === 'user') {
        navigate("/labdashboard");
      } else {
        navigate("/labdashboard");
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setErrors({ submit: error.message || 'Login failed. Please check your credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    // Basic email validation
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
      // Start 60-second countdown
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

  const handleResetPassword = async (e) => {
    e.preventDefault();
    let newErrors = {};

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

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-cyan-800 to-slate-800 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large animated blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400/40 rounded-full animate-float"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-purple-400/40 rounded-full animate-float animation-delay-2000"></div>
        <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-cyan-400/40 rounded-full animate-float animation-delay-3000"></div>
        <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-purple-400/40 rounded-full animate-float animation-delay-500"></div>
        <div className="absolute bottom-1/2 right-1/2 w-2 h-2 bg-cyan-400/40 rounded-full animate-float animation-delay-1500"></div>
        <div className="absolute top-3/4 left-2/3 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-2500"></div>
        <div className="absolute bottom-2/3 left-1/2 w-2 h-2 bg-purple-400/40 rounded-full animate-float animation-delay-3500"></div>
        <div className="absolute top-1/4 right-2/3 w-2 h-2 bg-cyan-400/40 rounded-full animate-float animation-delay-4500"></div>
        <div className="absolute bottom-1/4 right-1/2 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-5000"></div>
        <div className="absolute top-2/3 left-3/4 w-2 h-2 bg-purple-400/40 rounded-full animate-float animation-delay-5500"></div>
        <div className="absolute bottom-3/4 right-3/4 w-2 h-2 bg-cyan-400/40 rounded-full animate-float animation-delay-6000"></div>
        <div className="absolute top-1/3 left-2/3 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-6500"></div>
        <div className="absolute bottom-2/3 right-2/3 w-2 h-2 bg-purple-400/40 rounded-full animate-float animation-delay-7000"></div>
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-cyan-400/40 rounded-full animate-float animation-delay-7500"></div>
        <div className="absolute bottom-1/3 left-3/4 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-8000"></div>
        <div className="absolute top-1/2 right-3/4 w-2 h-2 bg-purple-400/40 rounded-full animate-float animation-delay-8500"></div>
        <div className="absolute bottom-1/2 left-1/3 w-2 h-2 bg-cyan-400/40 rounded-full animate-float animation-delay-9000"></div>
        <div className="absolute top-2/3 right-1/2 w-3 h-3 bg-blue-400/40 rounded-full animate-float animation-delay-9500"></div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          50% {
            transform: translateY(-100px) translateX(50px);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-float {
          animation: float 10s infinite;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-3000 {
          animation-delay: 3s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        
        .animation-delay-1500 {
          animation-delay: 1.5s;
        }
        
        .animation-delay-2500 {
          animation-delay: 2.5s;
        }
        
        .animation-delay-3500 {
          animation-delay: 3.5s;
        }
        
        .animation-delay-4500 {
          animation-delay: 4.5s;
        }
        
        .animation-delay-5000 {
          animation-delay: 5s;
        }
        
        .animation-delay-5500 {
          animation-delay: 5.5s;
        }
        
        .animation-delay-6000 {
          animation-delay: 6s;
        }
        
        .animation-delay-6500 {
          animation-delay: 6.5s;
        }
        
        .animation-delay-7000 {
          animation-delay: 7s;
        }
        
        .animation-delay-7500 {
          animation-delay: 7.5s;
        }
        
        .animation-delay-8000 {
          animation-delay: 8s;
        }
        
        .animation-delay-8500 {
          animation-delay: 8.5s;
        }
        
        .animation-delay-9000 {
          animation-delay: 9s;
        }
        
        .animation-delay-9500 {
          animation-delay: 9.5s;
        }
      `}</style>

      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl w-[90%] max-w-sm p-6 relative z-10">

        {/* Home Button */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-3 left-3 flex items-center gap-1.5 text-cyan-300 hover:text-white text-xs transition hover:bg-white/10 px-2 py-1 rounded-lg"
        >
          <Home size={14} /> Home
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center mb-4">
          <img src={logo} alt="Logo" className="w-16 h-16 rounded-full hover:scale-110 transition-transform duration-200 " />
         
                   <h1 className="text-2xl font-bold text-white">
                           SilverLeaf  Diagnostics
                         <h4 className="text-xs text-center font-medium bg-gradient-to-r from-green-300 via-blue-200 to-pink-400 bg-clip-text text-transparent">
                           Empowering Life Transforming Health
                         </h4>
                          </h1>
          <p className="text-xs text-cyan-100">
            {currentView === "login" && "Login"}
            {currentView === "forgotPassword" && "Forgot Password"}
            {currentView === "verifyCode" && "Verify Code"}
            {currentView === "resetPassword" && "Reset Password"}
          </p>
        </div>

        {/* LOGIN FORM */}
        {currentView === "login" && (
          <form className="space-y-3" onSubmit={handleLogin}>
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
              <label className="block text-xs text-cyan-100 mb-1">
                Username / Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" size={16} />
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              {errors.username && (
                <p className="text-red-400 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-xs text-cyan-100 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-md bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
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
                className="text-xs text-cyan-300 hover:text-cyan-100 underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 rounded-md text-white bg-cyan-600 hover:bg-cyan-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {currentView === "forgotPassword" && (
          <form className="space-y-3" onSubmit={handleForgotPassword}>
            <p className="text-xs text-cyan-200 text-center mb-3">
              Enter your email to receive a verification code
            </p>

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

            {/* EMAIL */}
            <div>
              <label className="block text-xs text-cyan-100 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" size={16} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
              className="w-full px-4 py-2 rounded-md text-white bg-cyan-600 hover:bg-cyan-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Code"}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-cyan-300 hover:text-cyan-100 text-xs"
            >
              <ArrowLeft size={12} /> Back to Login
            </button>
          </form>
        )}

        {/* VERIFY CODE FORM */}
        {currentView === "verifyCode" && (
          <form className="space-y-3" onSubmit={handleVerifyCode}>
            <p className="text-xs text-cyan-200 text-center mb-1">
              Enter the 6-digit OTP sent to <span className="font-semibold text-white">{formData.email}</span>
            </p>

            {/* OTP Timer */}
            <div className="text-center">
              {otpTimer > 0 ? (
                <span className={`text-xs font-semibold ${otpTimer <= 15 ? 'text-red-400' : 'text-cyan-300'}`}>
                  OTP expires in {otpTimer}s
                </span>
              ) : (
                <span className="text-xs text-red-400">OTP expired —&nbsp;
                  <button type="button" onClick={(e) => handleForgotPassword(e)} className="underline text-cyan-300 hover:text-white">
                    Resend OTP
                  </button>
                </span>
              )}
            </div>

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

            {/* CODE */}
            <div>
              <label className="block text-xs text-cyan-100 mb-1">Verification Code</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" size={16} />
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center tracking-widest"
                />
              </div>
              {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code}</p>}
            </div>

            {/* VERIFY BUTTON */}
            <button
              type="submit"
              disabled={loading || otpTimer === 0}
              className="w-full px-4 py-2 rounded-md text-white bg-cyan-600 hover:bg-cyan-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-cyan-300 hover:text-cyan-100 text-xs"
            >
              <ArrowLeft size={12} /> Back to Login
            </button>
          </form>
        )}

        {/* RESET PASSWORD FORM */}
        {currentView === "resetPassword" && (
          <form className="space-y-3" onSubmit={handleResetPassword}>
            <p className="text-xs text-cyan-200 text-center mb-3">
              Create your new password
            </p>

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

            {/* NEW PASSWORD */}
            <div>
              <label className="block text-xs text-cyan-100 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" size={16} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-md bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
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
              <label className="block text-xs text-cyan-100 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" size={16} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-md bg-white/90 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800"
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
              className="w-full px-4 py-2 rounded-md text-white bg-cyan-600 hover:bg-cyan-700 transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            {/* Back to Login */}
            <button
              type="button"
              onClick={goBackToLogin}
              className="w-full flex items-center justify-center gap-2 text-cyan-300 hover:text-cyan-100 text-xs"
            >
              <ArrowLeft size={12} /> Back to Login
            </button>
          </form>
        )}

        <p className="text-center text-xs text-cyan-100 mt-3">
          © 2026 SilverLeaf Diagnostic Center
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
