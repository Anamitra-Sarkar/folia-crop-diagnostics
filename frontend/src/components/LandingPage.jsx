import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Cpu, ShieldCheck, ArrowRight, Activity, 
  CloudLightning, Sun, Moon 
} from "lucide-react";

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

  // Custom 3-stroke Leaf SVG
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
      <nav className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center border-b border-border">
        <div className="flex items-center gap-2.5">
          <LeafIcon />
          <span className="font-display font-semibold text-xl tracking-tight text-text">
            Folia
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#how-it-works" className="text-text-muted hover:text-text transition-colors">How it Works</a>
            <a href="#science" className="text-text-muted hover:text-text transition-colors">Science</a>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface-2 border border-transparent hover:border-border text-text-muted hover:text-text cursor-pointer transition-all"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-semibold text-text hover:text-primary transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headline & Action */}
        <motion.div 
          className="lg:col-span-7 space-y-6"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface border border-border text-primary text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            Adaptive Edge-Cloud Agriculture
          </div>
          
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-text max-w-2xl">
            Precision crop diagnosis. <br />
            Anywhere on the field.
          </h1>
          
          <p className="text-[15px] md:text-[16px] text-text-muted leading-[1.65] max-w-[480px]">
            Folia runs advanced plant pathology locally on your device — and automatically calls in cloud AI only when it needs extra classification confidence.
          </p>

          <div className="flex flex-row items-center gap-6 pt-2">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-primary hover:bg-primary-hover text-white font-semibold text-[14px] h-[44px] cursor-pointer transition-colors duration-150"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </button>
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

        {/* Right Column: Split Composition Photograph Layout */}
        <motion.div 
          className="lg:col-span-5 flex justify-center"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <div className="relative w-full max-w-[480px]">
            {/* Real photograph leaf representation */}
            <div className="rounded border border-border bg-surface p-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
              <img 
                src="https://picsum.photos/seed/leaf-scan/560/420" 
                alt="Foliar diagnostic leaf scan sample" 
                className="w-full h-72 object-cover rounded-sm filter saturate-[0.85] contrast-[1.02]"
              />
              {/* Minimal data badge overlay */}
              <div className="absolute bottom-6 left-6 rounded border border-border bg-surface px-3 py-1.5 shadow-sm text-xs font-semibold text-text flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Tomato Leaf (Early Blight)</span>
                <span className="text-text-muted">|</span>
                <span className="text-primary font-bold">96.42% Conf</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Science Section: Asymmetric Features Grid */}
      <section id="science" className="max-w-7xl mx-auto px-6 py-20 border-t border-border">
        <motion.div 
          className="max-w-2xl space-y-3 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-text">
            Designed for Field Resiliency
          </h2>
          <p className="text-[15px] text-text-muted max-w-xl">
            A state-of-the-art diagnostic system combining evidential deep learning and conformal inference calibration to secure crop yield.
          </p>
        </motion.div>

        <motion.div 
          className="grid lg:grid-cols-10 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {/* Asymmetric Left Large Card (60%) */}
          <motion.div 
            className="lg:col-span-6 p-8 rounded border border-border bg-surface space-y-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            variants={fadeInUp}
          >
            <div className="space-y-4">
              <Cpu className="w-5 h-5 text-primary" />
              <h3 className="font-display text-xl font-semibold text-text">Cooperative Gating Logic</h3>
              <p className="text-[14px] text-text-muted leading-relaxed">
                By analytically evaluating epistemic vacuity on device, Folia prevents false positives. Standard cases resolve instantly at the edge. High-uncertainty pathogenetic visual details offload dynamically to our deep cloud ConvNeXt models.
              </p>
            </div>
            
            <div className="pt-6 border-t border-border/60 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold text-primary">96.4%</span>
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Validated Field Accuracy</span>
            </div>
          </motion.div>

          {/* Asymmetric Right Stacked Cards (40%) */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Top small card */}
            <motion.div 
              className="p-6 rounded border border-border bg-surface space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              variants={fadeInUp}
            >
              <CloudLightning className="w-5 h-5 text-primary" />
              <h3 className="font-display text-[18px] font-semibold text-text">Language Interpretation</h3>
              <p className="text-[13px] text-text-muted leading-relaxed">
                Integrated Groq API routes diagnoses to advanced models that explain pathogenic conditions and list care guide points in clear, plain language.
              </p>
            </motion.div>

            {/* Bottom small card */}
            <motion.div 
              className="p-6 rounded border border-border bg-surface space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              variants={fadeInUp}
            >
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-display text-[18px] font-semibold text-text">Isolated Firestore Sync</h3>
              <p className="text-[13px] text-text-muted leading-relaxed">
                User accounts are isolated. Firebase Rules prevent any diagnostic, geographical, or telemetry log interception across accounts.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How It Works Section: Pipeline Flow */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20 border-t border-border">
        <motion.div 
          className="max-w-2xl space-y-3 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="font-display text-3xl font-bold tracking-tight text-text">
            The Diagnostic Pipeline
          </h2>
          <p className="text-[15px] text-text-muted">
            The five stages of conformal, latency-aware crop analysis.
          </p>
        </motion.div>

        {/* Horizontal Flow Timeline */}
        <div className="grid md:grid-cols-5 gap-8 relative">
          
          {/* Step 1 */}
          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">01</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Stage 1</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Binary Filter</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Local HOG + Logistic Regression pre-filter terminates early if the leaf is healthy.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">02</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Stage 2</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">MobileNetV4 EDL</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Extracts features locally using Evidential Deep Learning (Dirichlet categorization).
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">03</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Stage 3</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Uncertainty Calc</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Quantifies model ignorance (epistemic vacuity) analytically on the device.
            </p>
          </div>

          {/* Step 4 */}
          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">04</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Stage 4</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Adaptive Gating</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Adjusts confidence thresholds dynamically based on measured network latency.
            </p>
          </div>

          {/* Step 5 */}
          <div className="space-y-4 relative z-10">
            <div className="relative h-16 flex items-end">
              <span className="font-display text-5xl font-bold text-primary/15 absolute top-0 left-0 pointer-events-none select-none">05</span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Stage 5</span>
            </div>
            <h4 className="font-display font-semibold text-[15px] text-text">Cloud Offloading</h4>
            <p className="text-[13px] text-text-muted leading-[1.65]">
              Routes uncertain targets to high-capacity cloud ConvNeXt models.
            </p>
          </div>

          {/* Connected horizontal line (desktop only) */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-[1px] bg-border z-0" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <LeafIcon />
              <span className="font-display font-semibold text-lg text-text">Folia</span>
            </div>
            <p className="text-[13px] text-text-muted">Precision agricultural diagnostics, secure and offline-first.</p>
          </div>
          
          <div className="flex gap-6 text-[13px] text-text-muted">
            <a href="https://github.com/Anamitra-Sarkar/folia-crop-diagnostics" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">GitHub Repository</a>
            <a href="#" className="hover:text-text transition-colors">Privacy Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
