"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, ArrowLeft, Key, Eye, EyeOff, Home, Instagram, Facebook, Twitter } from "lucide-react";
import { adminLogin, forgotPassword, verifyCode, resetPassword } from "@/src/api/adminAuth";
import API_BASE_URL from "@/src/api/config";

const logo = "/logo.png";

/* ── Floating orange dots scattered on bg ── */
const Dots = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
    {[
      { top:"8%",  left:"6%",  size:8,  delay:"0s"   },
      { top:"18%", left:"30%", size:6,  delay:"1s"   },
      { top:"5%",  right:"8%", size:7,  delay:"0.5s" },
      { top:"42%", right:"4%", size:5,  delay:"2s"   },
      { top:"72%", left:"8%",  size:6,  delay:"1.5s" },
      { top:"85%", right:"12%",size:5,  delay:"0.8s" },
    ].map((d,i) => (
      <div key={i} className="absolute rounded-full bg-orange-500 animate-pulse"
        style={{ top:d.top, left:(d as any).left, right:(d as any).right,
          width:d.size, height:d.size, opacity:0.7, animationDelay:d.delay,
          boxShadow:`0 0 ${d.size*2}px ${d.size}px rgba(200,101,26,0.6)` }} />
    ))}
  </div>
);

/* ── Thin molecular connection lines ── */
const Lines = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" aria-hidden>
    <line x1="6%" y1="8%"  x2="30%" y2="18%" stroke="#C8651A" strokeWidth="0.7"/>
    <line x1="30%" y1="18%" x2="18%" y2="30%" stroke="#C8651A" strokeWidth="0.7"/>
    <line x1="94%" y1="5%"  x2="82%" y2="20%" stroke="#C8651A" strokeWidth="0.7"/>
    <line x1="8%"  y1="72%" x2="18%" y2="60%" stroke="#C8651A" strokeWidth="0.7"/>
  </svg>
);

/* ── Left floating icons (matching design) ── */
const LeftIcons = () => (
  <>
    {/* Test tube icon top-center-left */}
    <div className="absolute anim-float-up" style={{ top:"16%", left:"27%", opacity:0.55, animationDelay:"0.5s" }}>
      <div className="w-10 h-10 rounded-xl border border-orange-500/50 flex items-center justify-center text-xl"
        style={{ background:"rgba(200,101,26,0.12)" }}>🧪</div>
    </div>
    {/* DNA icon mid-left */}
    <div className="absolute anim-float-side" style={{ top:"35%", left:"24%", opacity:0.50, animationDelay:"1.2s" }}>
      <div className="w-10 h-10 rounded-xl border border-orange-500/50 flex items-center justify-center text-xl"
        style={{ background:"rgba(200,101,26,0.12)" }}>🧬</div>
    </div>
    {/* Flask icon lower-left */}
    <div className="absolute anim-float-up" style={{ top:"52%", left:"22%", opacity:0.50, animationDelay:"2s" }}>
      <div className="w-10 h-10 rounded-xl border border-orange-500/50 flex items-center justify-center text-xl"
        style={{ background:"rgba(200,101,26,0.12)" }}>⚗️</div>
    </div>
  </>
);

const AdminLogin = ({ onLogin }: { onLogin?: () => void }) => {
  const router = useRouter();
  const [currentView, setCurrentView]               = useState("login");
  const [showPassword, setShowPassword]             = useState(false);
  const [showNewPassword, setShowNewPassword]       = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    username:"", password:"", email:"", code:"", newPassword:"", confirmPassword:"",
  });
  const [errors, setErrors]               = useState<any>({});
  const [loading, setLoading]             = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [otpTimer, setOtpTimer]           = useState(0);
  const timerRef = useRef<any>(null);

  const validatePassword = (p: string) => p.length < 6 ? "Password must be at least 6 characters" : null;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };
  const validateLogin = () => {
    const e: any = {};
    if (!formData.username.trim()) e.username = "Username / Email is required";
    if (!formData.password.trim()) e.password = "Password is required";
    setErrors(e); return Object.keys(e).length === 0;
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!validateLogin()) return;
    setLoading(true); 
    setErrors({});
    
    try {
      // Try admin login first
      try {
        const res = await adminLogin(formData.username, formData.password);
        localStorage.clear();
        document.cookie = `token=${res.token}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem("token", res.token);
        localStorage.setItem("admin", JSON.stringify(res.admin));
        
        // Dispatch custom event to notify Header component of login (after a small delay to ensure storage is set)
        setTimeout(() => {
          const loginEvent = new CustomEvent('userLoggedIn', { detail: res.admin });
          window.dispatchEvent(loginEvent);
          console.log('📢 Admin logged in:', res.admin?.username || res.admin?.email);
        }, 100);
        
        if (onLogin) onLogin();
        const role = res.admin?.role;
        router.replace(
          role === "Collection Center" ? "/Dashboard/collectiondashboard" :
          role === "Franchise"         ? "/Dashboard/franchisedashboard"  :
          role === "Patient"           ? "/Dashboard/patientdash" : "/labdashboard"
        );
        return;
      } catch (adminError) {
        console.log('ℹ️ Admin login failed, trying patient login...');
        // Admin login failed, try patient login
      }

      // Try patient login (using username/email as email for patient)
      try {
        const patientRes = await fetch(`${API_BASE_URL}/patient/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.username, // Username field can be email for patients
            password: formData.password
          })
        });

        const patientData = await patientRes.json();

        if (!patientRes.ok) {
          throw new Error(patientData.message || "Invalid credentials");
        }

        localStorage.clear();
        document.cookie = `token=${patientData.token}; path=/; max-age=604800; SameSite=Lax`;
        localStorage.setItem("token", patientData.token);
        localStorage.setItem("patient", JSON.stringify(patientData.data));

        // Dispatch custom event for patient login
        const loginEvent = new CustomEvent('patientLoggedIn', { detail: patientData.data });
        window.dispatchEvent(loginEvent);
        console.log('📢 Patient logged in:', patientData.data?.patientId);

        if (onLogin) onLogin();
        router.replace("/Dashboard/patientdash");
        return;
      } catch (patientError) {
        console.log('ℹ️ Patient login also failed');
        // Both failed
      }

      // Both admin and patient login failed
      setErrors({ submit: "Invalid credentials. Please try again." });
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ submit: "Invalid credentials. Please try again." });
    } finally {
      setLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    if (!formData.email.trim()) { setErrors({ email: "Email is required" }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { setErrors({ email: "Invalid email" }); return; }
    setLoading(true); setErrors({}); setSuccessMessage("");
    try {
      await forgotPassword(formData.email);
      setSuccessMessage("OTP sent. Valid for 1 minute.");
      setOtpTimer(60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setOtpTimer(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
      }, 1000);
      setCurrentView("verifyCode");
    } catch { setErrors({ submit: "Failed to send OTP." }); } finally { setLoading(false); }
  };
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) { setErrors({ code: "Code is required" }); return; }
    setLoading(true); setErrors({});
    try {
      await verifyCode(formData.email, formData.code);
      setSuccessMessage("Verified!"); setCurrentView("resetPassword");
    } catch (err: any) { setErrors({ code: err.message || "Invalid code" }); } finally { setLoading(false); }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); const ne: any = {};
    if (!formData.newPassword) ne.newPassword = "Required";
    else { const pe = validatePassword(formData.newPassword); if (pe) ne.newPassword = pe; }
    if (!formData.confirmPassword) ne.confirmPassword = "Required";
    else if (formData.newPassword !== formData.confirmPassword) ne.confirmPassword = "Passwords do not match";
    setErrors(ne); if (Object.keys(ne).length > 0) return;
    setLoading(true);
    try {
      await resetPassword(formData.email, formData.code, formData.newPassword);
      setSuccessMessage("Password reset! Redirecting to login…");
      setTimeout(() => {
        setCurrentView("login");
        setFormData({ username:"", password:"", email:"", code:"", newPassword:"", confirmPassword:"" });
        setSuccessMessage("");
      }, 2000);
    } catch (err: any) { setErrors({ submit: err.message || "Failed to reset" }); } finally { setLoading(false); }
  };
  const goBackToLogin = () => { setCurrentView("login"); setErrors({}); };
  const viewTitle = currentView === "login" ? "LOGIN" : currentView === "forgotPassword" ? "RESET PASSWORD" : currentView === "verifyCode" ? "VERIFY OTP" : "NEW PASSWORD";

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">

  {/* ── Full page background image ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/loginimage.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {/* Very light overlay — just enough to keep text readable */}
        {/* <div className="absolute inset-0" style={{ background:"rgba(5,14,26,0.45)" }} /> */}
      </div>

      {/* Molecular dots + lines */}
      <Dots />
      <Lines />

      {/* Floating lab icons — stay on left side matching the image */}
      <LeftIcons />

      {/* ── LOGIN CARD — Compact with curved corners ── */}
      <div className="relative z-10 w-full max-w-sm mx-4 anim-slide-right group">

        {/* Card with float animation */}
        <div className="relative animate-float"
          style={{ filter:"drop-shadow(0 0 32px rgba(200,101,26,0.35))" }}>

          {/* Glowing border with curved corners */}
          <div className="absolute inset-0 -z-10 rounded-3xl"
            style={{
              background:"linear-gradient(160deg,rgba(18, 58, 126, 0.4),rgba(200,101,26,0.3),rgba(43, 45, 138, 0.4))"
            }}
          />

          {/* Glass card — Curved corners, relative positioning for button */}
          <div className="relative rounded-3xl"
            style={{
              background:"rgba(8,18,32,0.15)",
              backdropFilter:"blur(8px)",
              WebkitBackdropFilter:"blur(8px)",
              border:"1px solid rgba(200,101,26,0.2)",
              minHeight:"420px",
              display:"flex",
              flexDirection:"column",
              padding:"32px"
            }}>

            {/* Home link */}
            <div className="mb-4">
              <button onClick={() => router.push("/")}
                className="flex items-center gap-1.5 text-gray-300 hover:text-white text-xs transition-colors">
                <Home size={13} /> Home
              </button>
            </div>

            {/* Card header */}
            <div className="mb-6 anim-fade-down" style={{ animationDelay:"0.15s" }}>
              <p className="text-orange-500 text-2xl font-extrabold tracking-widest">SHRADDHA</p>
              <p className="text-gray-200 text-xs">Pathology Laboratory</p>
              <p className="text-orange-400 text-[11px] font-bold tracking-[0.25em] mt-1">{viewTitle}</p>
            </div>

            {/* ── Forms — flex-1 to push button to bottom ── */}
            <div className="flex-1">

            {/* LOGIN FORM */}
            {currentView === "login" && (
              <form className="space-y-3" onSubmit={handleLogin}>
                {errors.submit && (
                  <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2">
                    <p className="text-red-300 text-xs text-center">{errors.submit}</p>
                  </div>
                )}
                {/* Username */}
                <div className="anim-fade-up" style={{ animationDelay:"0.25s" }}>
                  <label className="block text-[10px] font-bold text-white uppercase tracking-widest mb-1.5">Username / Email</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input name="username" value={formData.username} onChange={handleChange} placeholder="Admin username, patient email, or staff email"
                      className="w-full pl-9 pr-3 py-3 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                </div>
                {/* Password */}
                <div className="anim-fade-up" style={{ animationDelay:"0.35s" }}>
                  <label className="block text-[10px] font-bold text-white uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type={showPassword ? "text" : "password"} name="password"
                      value={formData.password} onChange={handleChange} placeholder="Enter password"
                      className="w-full pl-9 pr-10 py-3 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                      {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>
                {/* Remember + Forgot */}
                <div className="flex items-center justify-between anim-fade-up" style={{ animationDelay:"0.42s" }}>
                  <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-orange-500" /> Remember me
                  </label>
                  <button type="button" onClick={() => setCurrentView("forgotPassword")}
                    className="text-xs text-orange-400 hover:text-orange-300 underline">Forgot Password?</button>
                </div>
                {/* Login button — positioned in bottom-right corner */}
                <div className="anim-fade-up mt-6" style={{ animationDelay:"0.50s" }}>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-lg text-white font-extrabold text-sm uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-50"
                    style={{ background:"#C8651A", boxShadow:"0 4px 18px rgba(200,101,26,0.45)" }}
                    onMouseOver={e => (e.currentTarget.style.filter="brightness(1.12)")}
                    onMouseOut={e =>  (e.currentTarget.style.filter="")}>
                    {loading ? "Logging in…" : "LOGIN"}
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD */}
            {currentView === "forgotPassword" && (
              <form className="space-y-3" onSubmit={handleForgotPassword}>
                <p className="text-xs text-gray-400 text-center">Enter your email to receive a verification code</p>
                {errors.submit && <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2"><p className="text-red-300 text-xs text-center">{errors.submit}</p></div>}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email"
                      className="w-full pl-9 pr-3 py-3 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-extrabold text-sm uppercase tracking-[0.2em] disabled:opacity-50"
                  style={{ background:"#C8651A", boxShadow:"0 4px 18px rgba(200,101,26,0.45)" }}>
                  {loading ? "Sending…" : "Send Code"}
                </button>
                <button type="button" onClick={goBackToLogin} className="w-full flex items-center justify-center gap-2 text-orange-400 hover:text-orange-300 text-xs">
                  <ArrowLeft size={12}/> Back to Login
                </button>
              </form>
            )}

            {/* VERIFY CODE */}
            {currentView === "verifyCode" && (
              <form className="space-y-3" onSubmit={handleVerifyCode}>
                <p className="text-xs text-gray-400 text-center">OTP sent to <span className="text-white font-semibold">{formData.email}</span></p>
                <div className="text-center">
                  {otpTimer > 0
                    ? <span className={`text-xs font-semibold ${otpTimer <= 15 ? "text-red-400" : "text-orange-400"}`}>Expires in {otpTimer}s</span>
                    : <span className="text-xs text-red-400">Expired — <button type="button" onClick={(e:any)=>handleForgotPassword(e)} className="underline text-orange-400">Resend</button></span>}
                </div>
                {errors.submit && <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2"><p className="text-red-300 text-xs text-center">{errors.submit}</p></div>}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Verification Code</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input type="text" name="code" value={formData.code} onChange={handleChange}
                      placeholder="000000" maxLength={6}
                      className="w-full pl-9 pr-3 py-3 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-center tracking-[0.4em]" />
                  </div>
                  {errors.code && <p className="text-red-400 text-xs mt-1">{errors.code}</p>}
                </div>
                <button type="submit" disabled={loading || otpTimer === 0}
                  className="w-full py-3 rounded-lg text-white font-extrabold text-sm uppercase tracking-[0.2em] disabled:opacity-50"
                  style={{ background:"#C8651A", boxShadow:"0 4px 18px rgba(200,101,26,0.45)" }}>
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>
                <button type="button" onClick={goBackToLogin} className="w-full flex items-center justify-center gap-2 text-orange-400 hover:text-orange-300 text-xs">
                  <ArrowLeft size={12}/> Back to Login
                </button>
              </form>
            )}

            {/* RESET PASSWORD */}
            {currentView === "resetPassword" && (
              <form className="space-y-3" onSubmit={handleResetPassword}>
                <p className="text-xs text-gray-400 text-center">Create your new password</p>
                {successMessage && <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-3 py-2"><p className="text-green-300 text-xs text-center">{successMessage}</p></div>}
                {errors.submit && <div className="bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2"><p className="text-red-300 text-xs text-center">{errors.submit}</p></div>}
                {[
                  { name:"newPassword",     label:"New Password",     show:showNewPassword,     toggle:()=>setShowNewPassword(v=>!v),     err:errors.newPassword     },
                  { name:"confirmPassword", label:"Confirm Password",  show:showConfirmPassword, toggle:()=>setShowConfirmPassword(v=>!v), err:errors.confirmPassword },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{f.label}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input type={f.show?"text":"password"} name={f.name} value={(formData as any)[f.name]}
                        onChange={handleChange} placeholder={f.label}
                        className="w-full pl-9 pr-10 py-3 text-sm rounded-lg bg-gray-100 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                      <button type="button" onClick={f.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                        {f.show ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                    {f.err && <p className="text-red-400 text-xs mt-1">{f.err}</p>}
                  </div>
                ))}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-lg text-white font-extrabold text-sm uppercase tracking-[0.2em] disabled:opacity-50"
                  style={{ background:"#C8651A", boxShadow:"0 4px 18px rgba(200,101,26,0.45)" }}>
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
                <button type="button" onClick={goBackToLogin} className="w-full flex items-center justify-center gap-2 text-orange-400 hover:text-orange-300 text-xs">
                  <ArrowLeft size={12}/> Back to Login
                </button>
              </form>
            )}
            </div>

            {/* Card footer */}
            <p className="text-center text-[10px] text-white mt-4 tracking-widest uppercase">
              © 2026 Shraddha Diagnostic Center
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
