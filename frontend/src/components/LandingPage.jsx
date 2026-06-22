import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import landingImg from "../assets/landing_plant.jpg";
import { Camera, ShieldCheck, ArrowRight, Leaf, MessageCircle, Sun, Moon } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("folia-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("folia-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const LeafIcon = () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary transition-colors">
      <path d="M14 2C14 2 21 8 21 15C21 18.866 17.866 22 14 22C10.134 22 7 18.866 7 15C7 8 14 2 14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 9C15.5 10.5 18 11 18 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 14C12.5 15.5 10 16 10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-bg text-text overflow-x-hidden font-sans transition-colors duration-200">
      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex justify-between items-center border-b border-border">
        <div className="flex items-center gap-2.5">
          <LeafIcon />
          <span className="font-display font-semibold text-xl tracking-tight text-text">
            Folia
          </span>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#how-it-works" className="text-text-muted hover:text-text transition-colors">How it Works</a>
            <a href="#features" className="text-text-muted hover:text-text transition-colors">Features</a>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface-2 border border-transparent hover:border-border text-text-muted hover:text-text cursor-pointer transition-all"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <Link
            to="/login"
            className="text-sm font-semibold text-text hover:text-primary transition-colors cursor-pointer"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Headline & Action */}
        <motion.div
          className="lg:col-span-7 space-y-6"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-border text-primary text-xs font-semibold">
            <Leaf className="w-3.5 h-3.5" />
            Smart Plant Care
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-text max-w-2xl">
            Healthy crops start here. <br className="hidden sm:block" />
            <span className="text-primary">Diagnose plant diseases</span> instantly.
          </h1>

          <p className="text-[15px] md:text-[16px] text-text-muted leading-[1.65] max-w-[480px]">
            Just snap a photo of your plant leaf. Folia identifies diseases in seconds, tells you what's wrong, and gives you a step-by-step care guide — even without internet.
          </p>

          <div className="flex flex-row items-center gap-6 pt-2">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-primary hover:bg-primary-hover text-white font-semibold text-[14px] h-[44px] cursor-pointer transition-colors duration-150"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                const howItWorksSec = document.getElementById("how-it-works");
                howItWorksSec?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-[14px] font-semibold text-text-muted hover:text-text hover:underline cursor-pointer transition-all"
            >
              See how it works
            </button>
          </div>
        </motion.div>

        {/* Right Column: Photograph */}
        <motion.div
          className="lg:col-span-5 flex justify-center"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <div className="relative w-full max-w-[480px]">
            <div className="rounded border border-border bg-surface p-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              <img
                src={landingImg}
                alt="Plant leaf being diagnosed by Folia"
                className="w-full aspect-[4/3] object-cover rounded-sm filter saturate-[0.85] contrast-[1.02]"
              />
              <div className="absolute bottom-6 left-6 rounded border border-border bg-surface px-3 py-1.5 shadow-sm text-xs font-semibold text-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Tomato — Early Blight</span>
                <span className="text-text-muted">|</span>
                <span className="text-primary font-bold">96% match</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-border">
        <motion.div
          className="max-w-2xl space-y-3 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-text">
            Built for the Field
          </h2>
          <p className="text-[15px] text-text-muted max-w-xl">
            Folia is designed to work where you need it most — right on your farm, with or without a stable internet connection.
          </p>
        </motion.div>

        <motion.div
          className="grid lg:grid-cols-10 gap-6 sm:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div
            className="lg:col-span-6 p-6 sm:p-8 rounded border border-border bg-surface space-y-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            variants={fadeInUp}
          >
            <div className="space-y-4">
              <Camera className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-semibold text-text">Instant Disease Detection</h3>
              <p className="text-[14px] text-text-muted leading-relaxed">
                Upload or snap a photo of your plant leaf. Folia analyzes it right on your device for fast results. If the diagnosis needs a deeper look, it automatically connects to our advanced system for a more accurate answer.
              </p>
            </div>

            <div className="pt-6 border-t border-border/60 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-primary">96.4%</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Detection Accuracy</span>
            </div>
          </motion.div>

          <div className="lg:col-span-4 flex flex-col gap-6 sm:gap-8">
            <motion.div
              className="p-6 rounded border border-border bg-surface space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              variants={fadeInUp}
            >
              <MessageCircle className="w-5 h-5 text-primary" />
              <h3 className="font-display text-[18px] font-semibold text-text">Plain Language Results</h3>
              <p className="text-[13px] text-text-muted leading-relaxed">
                Get clear explanations of what's affecting your plant, along with practical care steps you can follow right away — no farming degree needed.
              </p>
            </motion.div>

            <motion.div
              className="p-6 rounded border border-border bg-surface space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              variants={fadeInUp}
            >
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-display text-[18px] font-semibold text-text">Private & Secure</h3>
              <p className="text-[13px] text-text-muted leading-relaxed">
                Your data stays yours. Each account is fully private — no one else can see your scans, history, or plant records.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-border">
        <motion.div
          className="max-w-2xl space-y-3 mb-12 sm:mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-text">
            How It Works
          </h2>
          <p className="text-[15px] text-text-muted">
            From photo to care guide in three simple steps.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">

          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">01</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 1</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Take a Photo</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Snap or upload a clear photo of the affected leaf. Folia works with all common crops like tomato, potato, apple, corn, and more.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">02</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 2</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Get Your Diagnosis</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Folia scans the leaf and identifies any disease within seconds. You'll see what's wrong, how confident the result is, and a clear explanation.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">03</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 3</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Follow the Care Guide</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Get a practical, step-by-step treatment plan you can act on right away — including what to prune, what to spray, and how to prevent it from spreading.
            </p>
          </div>

          <div className="hidden md:block absolute top-12 left-0 right-0 h-[1px] bg-border z-0" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <LeafIcon />
              <span className="font-display font-semibold text-lg text-text">Folia</span>
            </div>
            <p className="text-[13px] text-text-muted">Smart crop diagnostics — works even offline.</p>
          </div>

          <div className="flex gap-6 text-[13px] text-text-muted">
            <a href="#" className="hover:text-text transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
