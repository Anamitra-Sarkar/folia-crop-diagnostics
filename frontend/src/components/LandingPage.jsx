import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Cpu, ShieldCheck, ArrowRight, Activity, CloudLightning } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  // Animation configurations
  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] overflow-x-hidden font-sans relative">
      {/* Background radial glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Leaf className="w-8 h-8 text-emerald-400 animate-pulse" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Folia
          </span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-medium text-sm transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.05)] cursor-pointer"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 relative z-10 grid lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headline & Action */}
        <motion.div 
          className="lg:col-span-7 space-y-8"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Activity className="w-4 h-4 animate-pulse" />
            Adaptive Edge-Cloud Agriculture
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-white">
            Smart Crop Diagnostics <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Anytime, Anywhere.
            </span>
          </h1>
          
          <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
            Protect your crop yields with edge-computing plant pathology. Folia dynamically uses local mobile AI filtering when offline and offloads complex cases to cloud servers when online—ensuring 96.4% medical-grade diagnosis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 group cursor-pointer"
            >
              Join Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const featuresSec = document.getElementById("features");
                featuresSec?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-8 py-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 text-slate-300 font-medium transition-all duration-300 cursor-pointer"
            >
              Explore Features
            </button>
          </div>
        </motion.div>

        {/* Right Column: Dynamic Telemetry UI Graphic */}
        <motion.div 
          className="lg:col-span-5 relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        >
          {/* Decorative glows */}
          <div className="absolute top-[20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-emerald-500/20 blur-[50px] animate-pulse" />
          
          {/* Glassmorphic Mockup Frame */}
          <div className="w-full rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md p-6 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Header info bar */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live Diagnostics Telemetry</span>
            </div>

            {/* Simulated Scanning Graphic */}
            <div className="h-44 rounded-xl bg-slate-950/60 border border-slate-800/60 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent animate-pulse" />
              <Leaf className="w-20 h-20 text-emerald-500/30" />
              {/* Laser scanning line */}
              <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-0 animate-[scan_3s_infinite_linear]" />
            </div>

            {/* Health status block */}
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Diagnostic Status:</span>
                <span className="text-emerald-400 font-bold uppercase tracking-wider animate-pulse">Scanning Complete</span>
              </div>
              <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[96.4%] rounded-full" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Classification Certainty:</span>
                <span className="text-white font-bold">96.42%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative z-10 border-t border-slate-900">
        <motion.div 
          className="text-center max-w-2xl mx-auto space-y-4 mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl font-black text-white">How Folia Protects Your Crops</h2>
          <p className="text-slate-400 leading-relaxed">
            A state-of-the-art diagnostic system designed for high-stakes, real-world deployment in deep agricultural fields.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {/* Card 1 */}
          <motion.div 
            className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm space-y-4 hover:border-emerald-500/30 transition-all duration-300"
            variants={fadeInUp}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Adaptive Edge Routing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Runs lightweight diagnosis locally on your phone. Highly uncertain images are automatically offloaded to cloud servers to guarantee diagnostic accuracy.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm space-y-4 hover:border-teal-500/30 transition-all duration-300"
            variants={fadeInUp}
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <CloudLightning className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Groq AI Interpretation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Decodes technical diagnostic outputs into simple, human-readable treatment steps, explaining exactly what is wrong and how to fix it immediately.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80 backdrop-blur-sm space-y-4 hover:border-violet-500/30 transition-all duration-300"
            variants={fadeInUp}
          >
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Rigorous Privacy Rules</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Built on secure Firebase architecture. Firestore constraints isolate logs strictly per user, making sure other users can never view or intercept your logs.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-900 relative z-10 text-slate-500 text-xs">
        <div>&copy; 2026 Folia. All rights reserved.</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
}
