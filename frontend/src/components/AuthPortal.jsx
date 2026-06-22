import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";
import { motion } from "framer-motion";
import { 
  Mail, Lock, ShieldAlert, ArrowRight, 
  Loader2, Sun, Moon 
} from "lucide-react";

export default function AuthPortal() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("folia-theme") || "light";
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate("/dashboard", { replace: true });
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("folia-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

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
        navigate("/dashboard");
      } catch (err) {
        console.error("Sign up error:", err);
        setError(getReadableErrorMessage(err.code));
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
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
      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(getReadableErrorMessage(err.code));
      }
    }
    setLoading(false);
  };

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

  // Custom 3-stroke Leaf SVG
  const LeafIcon = ({ className }) => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M14 2C14 2 21 8 21 15C21 18.866 17.866 22 14 22C10.134 22 7 18.866 7 15C7 8 14 2 14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 9C15.5 10.5 18 11 18 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 14C12.5 15.5 10 16 10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Left Panel: Field Image & Tagline (40% width on desktop) */}
      <div className="hidden md:flex md:w-[40%] bg-primary relative items-center justify-center p-8 overflow-hidden select-none">
        {/* Field crop photograph overlay background */}
        <div className="absolute inset-0 opacity-45 mix-blend-multiply">
          <img 
            src="https://picsum.photos/seed/field-crop/640/900" 
            alt="Field cultivation backdrop" 
            className="w-full h-full object-cover filter saturate-[0.7] contrast-[1.05]"
          />
        </div>
        
        {/* Branding content */}
        <div className="relative z-10 text-center space-y-6 max-w-sm">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white">
              <LeafIcon className="w-7 h-7" />
            </div>
          </div>
          <h1 className="font-display font-semibold text-2xl text-white">Folia</h1>
          <p className="font-display italic font-normal text-2xl text-white leading-relaxed">
            "Know your crop, protect your yield."
          </p>
        </div>
      </div>

      {/* Right Panel: Form Control Panel (60% width on desktop) */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative bg-bg">
        
        {/* Top bar with theme switch */}
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface border border-transparent hover:border-border text-text-muted hover:text-text cursor-pointer transition-all"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>

        {/* Outer Form Container (max-width 360px) */}
        <motion.div 
          className="w-full max-w-[360px] space-y-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 md:hidden">
              <LeafIcon className="text-primary" />
              <span className="font-display font-semibold text-lg">Folia</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-text">
              {isSignUp ? "Create account" : "Sign in"}
            </h2>
            <p className="text-[13px] text-text-muted font-medium">
              {isSignUp
                ? "Create your account to start diagnosing plant diseases"
                : "Sign in to scan and protect your crops"}
            </p>
          </div>

          {/* Errors panel */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded border border-danger/20 bg-danger/5 text-danger text-[13px]">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-text-muted block">Email Address</label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 rounded border border-border bg-surface-2 text-[14px] text-text placeholder-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-text-muted block">Password</label>
              <input 
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded border border-border bg-surface-2 text-[14px] text-text placeholder-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-[44px]"
              />
            </div>

            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-text-muted block">Confirm Password</label>
                <input 
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded border border-border bg-surface-2 text-[14px] text-text placeholder-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-[44px]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded bg-primary hover:bg-primary-hover text-white font-semibold text-[14px] h-[44px] cursor-pointer transition-colors duration-150 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Sign Up" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="h-[1px] bg-border w-full" />
            <span className="text-[10px] font-semibold text-text-faint uppercase tracking-widest">or</span>
            <div className="h-[1px] bg-border w-full" />
          </div>

          {/* Google Access Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded border border-border bg-surface hover:bg-surface-2 text-[14px] text-text font-semibold h-[44px] cursor-pointer transition-colors duration-150 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-6.887 4.114-4.811 0-8.711-3.9-8.711-8.711s3.9-8.711 8.711-8.711c2.148 0 4.13.787 5.674 2.213l3.056-3.056C18.146 1.485 15.356 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 12.24-5.48 12.24-12.24 0-.822-.075-1.616-.213-2.385H12.24Z" />
            </svg>
            Continue with Google
          </button>

          {/* Footer toggle */}
          <div className="text-center text-[13px] text-text-muted pt-4">
            {isSignUp ? "Already have an account? " : "New to Folia? "}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-primary font-bold hover:underline cursor-pointer bg-transparent border-none"
            >
              {isSignUp ? "Sign In" : "Create Account"}
            </button>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
