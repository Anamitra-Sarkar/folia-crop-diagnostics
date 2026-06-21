import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { motion } from "framer-motion";
import { Leaf, Mail, Lock, ShieldAlert, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPortal() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("Passwords do not match!");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters!");
        setLoading(false);
        return;
      }

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("Account created successfully!");
        navigate("/dashboard");
      } catch (err) {
        console.error("Sign up error:", err);
        setError(getReadableErrorMessage(err.code));
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged in successfully!");
        navigate("/dashboard");
      } catch (err) {
        console.error("Sign in error:", err);
        setError(getReadableErrorMessage(err.code));
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("Google logged in successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", err);
      // Suppress error if user closed popup
      if (err.code !== "auth/popup-closed-by-user") {
        setError(getReadableErrorMessage(err.code));
      }
    }
    setLoading(false);
  };

  // Convert Firebase error codes into clean user-friendly explanations
  const getReadableErrorMessage = (code) => {
    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
        return "No account found matching this email.";
      case "auth/wrong-password":
        return "Incorrect password. Please try again.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password is too weak. Please use a stronger password.";
      case "auth/invalid-credential":
        return "Incorrect email or password.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] flex items-center justify-center p-6 relative font-sans">
      {/* Radial background glows */}
      <div className="absolute top-[10%] left-[20%] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />

      {/* Main card */}
      <motion.div 
        className="w-full max-w-md rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md p-8 shadow-2xl relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Top brand */}
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Leaf className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-xs text-slate-500 text-center">
            {isSignUp 
              ? "Register to begin secure crop diagnostics" 
              : "Access your private agricultural telemetry panel"}
          </p>
        </div>

        {/* Error panel */}
        {error && (
          <motion.div 
            className="flex items-start gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mb-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Input Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@agromind.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-1" key="confirm-pwd">
              <label className="text-xs font-semibold text-slate-400">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/40 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-slate-950 font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isSignUp ? "Sign Up" : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="flex items-center gap-3 my-6">
          <div className="h-[1px] bg-slate-800 expand w-full" />
          <span className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">OR</span>
          <div className="h-[1px] bg-slate-800 expand w-full" />
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-slate-850/40 hover:bg-slate-850/60 border border-slate-800 text-sm text-slate-300 font-medium transition-all duration-300 cursor-pointer disabled:opacity-50"
        >
          {/* Flat Google logo */}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.811 0-8.711-3.9-8.711-8.711s3.9-8.711 8.711-8.711c2.148 0 4.13.787 5.674 2.213l3.056-3.056C18.146 1.485 15.356 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 12.24-5.48 12.24-12.24 0-.822-.075-1.616-.213-2.385H12.24Z" />
          </svg>
          Sign in with Google
        </button>

        {/* Footer Toggle */}
        <div className="mt-8 text-center text-xs text-slate-500">
          {isSignUp ? "Already have an account? " : "New to Folia? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-emerald-400 font-bold hover:underline cursor-pointer bg-transparent border-none"
          >
            {isSignUp ? "Sign In" : "Create Account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
