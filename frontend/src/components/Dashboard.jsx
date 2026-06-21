import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Leaf, Wifi, WifiOff, Battery, ShieldAlert, 
  UploadCloud, Play, FileText, CheckCircle2, 
  Activity, Loader2, LogOut, RefreshCw, AlertCircle,
  Download, Trash2, Server
} from "lucide-react";

// Mock leaf samples for sandbox testing (matching models.py classes)
const MOCK_SAMPLES = [
  {
    id: "tomato_healthy",
    name: "Tomato (Healthy)",
    crop: "Tomato",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231B4D3E'/><circle cx='50' cy='50' r='30' fill='%2310B981'/><path d='M50 10 C60 30, 40 40, 50 90' stroke='%23065F46' stroke-width='3' fill='none'/></svg>",
    isHealthy: true,
    localPred: "Tomato__healthy",
    localConf: 0.98,
    vacuity: 0.05
  },
  {
    id: "tomato_early_blight",
    name: "Tomato (Early Blight)",
    crop: "Tomato",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%233E2B1B'/><circle cx='50' cy='50' r='30' fill='%23F59E0B'/><circle cx='40' cy='40' r='5' fill='%2378350F'/><circle cx='60' cy='55' r='7' fill='%2378350F'/></svg>",
    isHealthy: false,
    localPred: "Tomato__early_blight",
    localConf: 0.88,
    vacuity: 0.22
  },
  {
    id: "potato_late_blight",
    name: "Potato (Late Blight)",
    crop: "Potato",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%233B2B1B'/><ellipse cx='50' cy='50' rx='30' ry='20' fill='%23B45309'/><circle cx='45' cy='48' r='4' fill='%23451A03'/><circle cx='58' cy='52' r='6' fill='%23451A03'/></svg>",
    isHealthy: false,
    localPred: "Potato__late_blight",
    localConf: 0.74,
    vacuity: 0.35
  },
  {
    id: "apple_black_rot",
    name: "Apple (Black Rot)",
    crop: "Apple",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231E1E1E'/><circle cx='50' cy='50' r='28' fill='%23991B1B'/><circle cx='42' cy='45' r='6' fill='%23111827'/><circle cx='54' cy='56' r='8' fill='%23111827'/></svg>",
    isHealthy: false,
    localPred: "Apple__black_rot",
    localConf: 0.65,
    vacuity: 0.48
  }
];

const API_BASE_URL = "http://localhost:7860";

// Client-side local diagnostic care guide fallback map (Javascript)
function getLocalInterpretation(className) {
  if (!className) {
    return {
      crop: "Unknown", disease: "Unknown",
      explanation: "No diagnosis received. Please upload a clear leaf image.",
      care_guide: ["Ensure bright light.", "Align leaf in center of camera frame."]
    };
  }
  
  const cleanName = className.replace("___", "__");
  const parts = cleanName.split("__");
  const crop = parts[0].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const disease = parts[1] ? parts[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Condition";

  if (className.toLowerCase().includes("healthy")) {
    return {
      crop, disease: "Healthy",
      explanation: `Your ${crop} plant leaf appears healthy, vibrant, and free of visible diseases or pests. The leaf tissues are intact, indicating optimal water transport and photosynthetic efficiency.`,
      care_guide: [
        "Maintain consistent watering according to the crop's specific needs, ensuring well-drained soil.",
        "Inspect the underside of leaves weekly to spot any early insect infestations or spore formations.",
        "Ensure proper weed control around the base of the plant to prevent nutrient competition and reduce pest harborages.",
        "Apply balanced organic compost to maintain optimal soil nutrition and build robust plant immunity."
      ]
    };
  }

  const diseaseLower = disease.toLowerCase();
  let explanation = `Signs of ${disease} have been detected on your ${crop} plant. `;
  let care_guide = [];

  if (diseaseLower.includes("rust")) {
    explanation += "Rust is a fungal disease that produces powdery orange, yellow, or brown spore pustules on leaves, disrupting photosynthesis and weakening the plant's overall health.";
    care_guide = [
      "Immediately prune and safely destroy infected leaves to limit spore dispersal.",
      "Avoid overhead irrigation; water directly at the root zone to keep the foliage dry.",
      "Apply a copper-based or sulfur-based organic fungicide, ensuring thorough coverage of both leaf surfaces.",
      "Improve plant spacing to enhance airflow and accelerate leaf drying."
    ];
  } else if (diseaseLower.includes("rot")) {
    explanation += "Rot is typically caused by fungal or bacterial pathogens thriving in high humidity, leading to localized tissue death, decay, and darkening of plant structures.";
    care_guide = [
      "Prune infected foliage using sanitized tools, disinfecting the blades between cuts with rubbing alcohol.",
      "Ensure the soil has excellent drainage and reduce watering frequency to allow the topsoil to dry.",
      "Apply a suitable bio-fungicide (like Bacillus subtilis) or targeted treatment to halt pathogen spread.",
      "Clear away fallen crop debris from around the plant base to eliminate overwintering spores."
    ];
  } else if (diseaseLower.includes("blight")) {
    explanation += "Blight refers to rapid, extensive yellowing, browning, and death of plant tissues (leaves, stems, flowers) caused by fungal or bacterial pathogens.";
    care_guide = [
      "Remove and discard all affected leaves; do not compost diseased material to avoid spreading spores.",
      "Ensure foliage remains dry by watering early in the morning and using drip lines.",
      "Apply protective fungicides (such as Chlorothalonil or copper fungicides) at the first sign of symptoms.",
      "Mulch around the base of the plant to prevent rain from splashing soil-borne spores onto lower leaves."
    ];
  } else if (diseaseLower.includes("spot")) {
    explanation += "Leaf spot diseases are caused by fungi or bacteria that produce distinct circular or irregular lesions, often leading to premature leaf drop and reduced plant vigor.";
    care_guide = [
      "Pick off and dispose of spotted leaves to prevent the infection from spreading upward.",
      "Water the plant at soil level and prune lower branches to keep them away from damp soil.",
      "Apply a natural neem oil spray or copper-based fungicide to protect unaffected foliage.",
      "Keep the garden bed free of weeds and crop residues where the pathogen can multiply."
    ];
  } else if (diseaseLower.includes("mildew")) {
    explanation += "Powdery or Downy Mildew is a fungal disease characterized by a white-to-gray powdery coating on leaves, causing curling, yellowing, and growth stunting.";
    care_guide = [
      "Isolate the plant if possible and prune heavily infected areas to improve sunlight penetration.",
      "Spray leaves with a diluted neem oil solution or potassium bicarbonate mixture to inhibit mildew growth.",
      "Maintain adequate spacing between crops to minimize humidity build-up in the canopy.",
      "Grow the plant in a location with plenty of direct sunlight, which naturally suppresses mildew."
    ];
  } else if (diseaseLower.includes("virus") || diseaseLower.includes("mosaic") || diseaseLower.includes("curl")) {
    explanation += "Viral infections cause leaf curling, mottling, stunting, and mosaic patterns. They are systemic, meaning they infect the entire plant, and are often spread by insect vectors like aphids or whiteflies.";
    care_guide = [
      "Note: Viral infections cannot be cured. Prune and destroy heavily infected plants immediately to protect healthy crops.",
      "Control sap-sucking insect vectors (aphids, whiteflies, thrips) using insecticidal soaps or neem oil.",
      "Plant virus-resistant cultivars in the future and source certified disease-free seeds.",
      "Sanitize hands and all tools thoroughly after handling infected plants to prevent mechanical transmission."
    ];
  } else if (["mite", "spider", "vector", "pest", "insect", "bug", "hispa", "caterpillar", "whitefly"].some(term => diseaseLower.includes(term))) {
    explanation += "This indicates a pest infestation where active feeding by insects or mites damages leaf structures, reduces plant vigor, and potentially transmits pathogens.";
    care_guide = [
      "Introduce natural predators like ladybugs, lacewings, or predatory mites to help control the pest population.",
      "Apply organic insecticide sprays, such as neem oil or insecticidal soap, targeting the undersides of the leaves.",
      "Use physical traps (e.g., yellow sticky cards) around the perimeter to catch flying pests.",
      "Spray the foliage with a strong stream of water to dislodge light infestations of mites or aphids."
    ];
  } else {
    explanation += "This condition can lead to leaf lesions, premature drop, and reduced photosynthetic capability if left untreated.";
    care_guide = [
      "Inspect the entire plant and prune leaves showing advanced symptoms.",
      "Water directly at the root zone and avoid wetting leaf surfaces.",
      "Apply a broad-spectrum organic fungicide or neem oil as a preventive measure.",
      "Sanitize tools and wash hands thoroughly to prevent transmitting the condition to nearby plants."
    ];
  }

  return { crop, disease, explanation, care_guide };
}

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Environment Controller states
  const [latency, setLatency] = useState(55); 
  const [battery, setBattery] = useState(100); 
  const [isOnline, setIsOnline] = useState(true); 
  const [forceCloud, setForceCloud] = useState(false); 

  // Diagnostics workflow states
  const [selectedSample, setSelectedSample] = useState(MOCK_SAMPLES[0]);
  const [customImage, setCustomImage] = useState(null);
  const [runningInference, setRunningInference] = useState(false);
  const [inferenceSteps, setInferenceSteps] = useState([]);
  const [diagnosisResult, setDiagnosisResult] = useState(null);

  // Per-user DB telemetry stats
  const [stats, setStats] = useState({
    total_diagnoses: 0,
    cloud_resolved: 0,
    edge_resolved: 0,
    avg_latency_ms: 0.0
  });
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // PWA Local Model Caching states & helpers
  const MODEL_URL = "https://huggingface.co/Arko007/adaptive-edge-plant-model/resolve/main/mobilenetv4_edge_best.safetensors";
  const [modelCached, setModelCached] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const fileInputRef = useRef(null);

  const checkModelCache = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open("folia-model-cache");
        const matched = await cache.match(MODEL_URL);
        setModelCached(!!matched);
      } catch (err) {
        console.log("Error checking cache:", err);
      }
    }
  };

  const downloadEdgeModel = async () => {
    if (!('caches' in window)) {
      alert("Browser caching not supported in this environment.");
      return;
    }
    setDownloadingModel(true);
    setDownloadProgress(0);
    try {
      const response = await fetch(MODEL_URL);
      if (!response.ok) throw new Error("Hugging Face model download failed.");
      
      const reader = response.body.getReader();
      const contentLength = +response.headers.get('Content-Length') || 46000000;
      
      let receivedLength = 0;
      let chunks = [];
      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        setDownloadProgress(Math.min(99, Math.round((receivedLength / contentLength) * 100)));
      }
      
      const blob = new Blob(chunks);
      const mockResponse = new Response(blob, {
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      const cache = await caches.open("folia-model-cache");
      await cache.put(MODEL_URL, mockResponse);
      setModelCached(true);
      setDownloadProgress(100);
    } catch (err) {
      console.error(err);
      alert("Failed to download local model. Ensure your connection is active and try again.");
    } finally {
      setDownloadingModel(false);
    }
  };

  const clearModelCache = async () => {
    if ('caches' in window) {
      try {
        const cache = await caches.open("folia-model-cache");
        await cache.delete(MODEL_URL);
        setModelCached(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Authenticated headers helper
  const getAuthHeaders = async () => {
    const user = auth.currentUser;
    if (!user) {
      return { "Authorization": "Bearer dummy-token-dev_user_123" };
    }
    try {
      const token = await user.getIdToken();
      return { "Authorization": `Bearer ${token}` };
    } catch {
      return { "Authorization": "Bearer dummy-token-dev_user_123" };
    }
  };

  // Fetch metrics per-user
  const fetchTelemetry = async () => {
    try {
      const headers = await getAuthHeaders();
      
      const statsRes = await fetch(`${API_BASE_URL}/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const logsRes = await fetch(`${API_BASE_URL}/logs?limit=10`, { headers });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.log("Offline mode: Skipping telemetry fetch, showing locally cached logs.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    checkModelCache();
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setCustomImage(uploadEvent.target.result);
        setSelectedSample(null);
        setDiagnosisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const runDiagnostics = async () => {
    if (!isOnline && !modelCached) {
      alert("Offline Mode is active but the local edge model has not been downloaded/cached yet. Please connect online to download the local model first.");
      return;
    }
    setRunningInference(true);
    setDiagnosisResult(null);

    // Initial state: stage 1 check
    const steps = [
      { id: 1, title: "Crop Image Scanning", status: "processing", desc: "Analyzing leaf geometry and structure..." }
    ];
    setInferenceSteps(steps);

    const activeImage = customImage || selectedSample.image;
    const isHealthy = selectedSample ? selectedSample.isHealthy : false;
    const localPrediction = selectedSample ? selectedSample.localPred : "Tomato__early_blight";
    const rawLocalConf = selectedSample ? selectedSample.localConf : 0.85;
    const localVacuity = selectedSample ? selectedSample.vacuity : 0.18;

    // Conformal & offloading boundary calculations
    const tau_base = 0.85;
    const beta = 0.005;
    const tau_min = 0.50;
    const tau_vac = 0.60;
    const tau_conf = isOnline 
      ? parseFloat((tau_base * Math.exp(-beta * latency) + tau_min).toFixed(3))
      : tau_min;

    const calibratedConfidence = parseFloat((rawLocalConf / 1.22).toFixed(3));
    const gatingTriggered = localVacuity > tau_vac || calibratedConfidence < tau_conf;
    const shouldOffload = isOnline && (forceCloud || gatingTriggered);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Stage 1 Filter outcome
    if (isHealthy && selectedSample?.id === "tomato_healthy") {
      setInferenceSteps([
        { id: 1, title: "Scan Complete", status: "complete", desc: "No disease markers found. Terminating early." }
      ]);
      const healthyResult = {
        resolved_by: "Local Analyzer (Edge)",
        prediction: "Healthy Leaf",
        confidence: 0.98,
        explanation: "No disease detected. Keep monitoring regularly, maintain proper watering, and ensure adequate sunlight.",
        care_guide: [
          "Maintain consistent watering according to the crop's specific needs, ensuring well-drained soil.",
          "Inspect the underside of leaves weekly to spot any early insect infestations or spore formations.",
          "Ensure proper weed control around the base of the plant to prevent nutrient competition."
        ]
      };
      setDiagnosisResult(healthyResult);
      setRunningInference(false);

      // Save locally
      const localLog = {
        id: Math.random().toString(36).substring(7),
        device_id: "rpi5-orchard-042",
        timestamp: new Date().toISOString(),
        resolved_by: "edge",
        local_prediction: "healthy",
        local_confidence: 0.98,
        network_latency: 0.0,
        explanation: healthyResult.explanation,
        care_guide: healthyResult.care_guide,
        created_at: new Date().toISOString()
      };
      setLogs(prev => [localLog, ...prev]);
      return;
    }

    steps[0].status = "complete";
    steps[0].desc = "Foliar anomalies found. Running edge classifier model.";
    steps.push({ id: 2, title: "Edge Analytics Model", status: "processing", desc: "Evaluating disease features locally..." });
    setInferenceSteps([...steps]);

    await new Promise(resolve => setTimeout(resolve, 700));

    steps[1].status = "complete";
    steps[1].desc = `Edge prediction: ${localPrediction.replace("__", " ")}`;

    if (shouldOffload) {
      steps.push({ id: 3, title: "Cloud Offloading System", status: "processing", desc: `Routing complex diagnostic target to server (WAN: ${latency}ms)...` });
      setInferenceSteps([...steps]);

      try {
        const headers = await getAuthHeaders();
        const base64Payload = activeImage.split(',')[1] || "MOCK_BASE64_IMAGE_DATA_JPEG";
        
        const res = await fetch(`${API_BASE_URL}/diagnose`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers
          },
          body: JSON.stringify({
            device_id: "rpi5-orchard-042",
            timestamp: new Date().toISOString(),
            metrics: {
              vacuity: localVacuity,
              conformal_confidence: calibratedConfidence,
              local_prediction: localPrediction
            },
            network: {
              measured_latency_ms: latency
            },
            image_payload: base64Payload,
            force_cloud: forceCloud
          })
        });

        if (res.ok) {
          const data = await res.json();
          steps[2].status = "complete";
          steps[2].desc = "Cloud classifier resolved diagnosis.";
          setDiagnosisResult({
            resolved_by: "Cloud Classifier (ConvNeXt)",
            prediction: data.prediction,
            confidence: data.confidence,
            explanation: data.explanation,
            care_guide: data.care_guide
          });
          fetchTelemetry();
        } else {
          throw new Error("Cloud request failed");
        }
      } catch (err) {
        steps[2].status = "failed";
        steps[2].desc = "Cloud server unreachable. Deploying edge fallback.";
        
        const fallback = getLocalInterpretation(localPrediction);
        setDiagnosisResult({
          resolved_by: "Local Analyzer (Fallback)",
          prediction: localPrediction,
          confidence: calibratedConfidence,
          explanation: fallback.explanation,
          care_guide: fallback.care_guide
        });
      }
    } else {
      steps.push({ id: 3, title: "Edge Processing Accepted", status: "complete", desc: "Local confidence high. Accept local model output." });
      setInferenceSteps([...steps]);

      const localInterpretation = getLocalInterpretation(localPrediction);
      const resolvedBy = !isOnline ? "Local Analyzer (Offline)" : "Local Analyzer (Edge)";

      setDiagnosisResult({
        resolved_by: resolvedBy,
        prediction: localPrediction,
        confidence: calibratedConfidence,
        explanation: localInterpretation.explanation,
        care_guide: localInterpretation.care_guide
      });

      const localLog = {
        id: Math.random().toString(36).substring(7),
        device_id: "rpi5-orchard-042",
        timestamp: new Date().toISOString(),
        resolved_by: "edge",
        local_prediction: localPrediction,
        local_confidence: calibratedConfidence,
        network_latency: isOnline ? latency : 0.0,
        explanation: localInterpretation.explanation,
        care_guide: localInterpretation.care_guide,
        created_at: new Date().toISOString()
      };
      setLogs(prev => [localLog, ...prev]);

      // Sync backend in background if online
      if (isOnline) {
        try {
          const headers = await getAuthHeaders();
          const base64Payload = activeImage.split(',')[1] || "MOCK_BASE64_IMAGE_DATA_JPEG";
          await fetch(`${API_BASE_URL}/diagnose`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...headers
            },
            body: JSON.stringify({
              device_id: "rpi5-orchard-042",
              timestamp: new Date().toISOString(),
              metrics: {
                vacuity: localVacuity,
                conformal_confidence: calibratedConfidence,
                local_prediction: localPrediction
              },
              network: {
                measured_latency_ms: latency
              },
              image_payload: base64Payload,
              force_cloud: false
            })
          });
          fetchTelemetry();
        } catch {
          console.log("Background sync offline.");
        }
      }
    }
    
    setRunningInference(false);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#F8FAFC] font-sans pb-12 relative">
      {/* Dynamic ambient glows */}
      <div className="absolute top-[5%] left-[-10%] w-[30%] h-[30%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#090D16]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Leaf className="w-6 h-6 text-emerald-400" />
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            Folia Telemetry
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Authenticated User: {auth.currentUser?.email || "developer@folia.com"}
          </div>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Dashboard Core Layout */}
      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Environmental Telemetry Settings & Database Stats (4 columns) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Controllers glassmorphic card */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Environment Controllers
            </h2>
            
            {/* Connectivity Switch */}
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <div className="flex items-center gap-2.5">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-emerald-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-400" />
                )}
                <div>
                  <div className="text-sm font-semibold">Network Uplink</div>
                  <div className="text-[10px] text-slate-500">{isOnline ? "Connected to Cloud" : "Offline Gating Active"}</div>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* WAN Latency slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">WAN Latency</span>
                <span className={isOnline ? "text-emerald-400" : "text-slate-500"}>
                  {isOnline ? `${latency} ms` : "Offline"}
                </span>
              </div>
              <input 
                type="range"
                min="10"
                max="500"
                value={latency}
                disabled={!isOnline}
                onChange={(e) => setLatency(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>

            {/* Battery status slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400 flex items-center gap-1">
                  <Battery className="w-4 h-4 text-emerald-400" />
                  Edge Node Battery
                </span>
                <span className={battery > 20 ? "text-emerald-400" : "text-red-400"}>
                  {battery}%
                </span>
              </div>
              <input 
                type="range"
                min="5"
                max="100"
                value={battery}
                onChange={(e) => setBattery(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Cloud Forcing Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs font-semibold">
              <span className="text-slate-400">Always Route to Cloud</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={forceCloud}
                  disabled={!isOnline}
                  onChange={(e) => setForceCloud(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 disabled:opacity-50"></div>
              </label>
            </div>
          </div>

          {/* Offline Model Cache Card */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Offline Model Cache
            </h2>
            <p className="text-xs text-slate-400">
              Download and cache the 45MB Edge Diagnostic Model locally to perform crop diagnostics offline.
            </p>

            {modelCached ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Model is cached on this device</span>
                </div>
                <button
                  onClick={clearModelCache}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/30 hover:bg-red-900/30 border border-red-800/40 text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Model Cache
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {downloadingModel ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        Downloading...
                      </span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-150"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={downloadEdgeModel}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-800/40 text-emerald-400 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Edge Model
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Database Analytics Stats */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                User Telemetry Stats
              </h2>
              <button 
                onClick={fetchTelemetry}
                className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/60 text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Total Scans</div>
                <div className="text-2xl font-black text-white mt-1">{stats.total_diagnoses}</div>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/60 text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Cloud Diagnostics</div>
                <div className="text-2xl font-black text-brandBlue mt-1">
                  {stats.total_diagnoses > 0 ? `${Math.round((stats.cloud_resolved / stats.total_diagnoses) * 100)}%` : "0%"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/60 text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Edge Diagnostics</div>
                <div className="text-2xl font-black text-brandGreen mt-1">{stats.edge_resolved}</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850/60 text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">WAN Latency</div>
                <div className="text-2xl font-black text-brandYellow mt-1">{stats.avg_latency_ms} <span className="text-xs">ms</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Center Column: Sandbox Diagnostics Leaf Capture (4 columns) */}
        <section className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Crop Sample Sandbox
            </h2>

            {/* Grid of sample crops */}
            <div className="grid grid-cols-2 gap-2.5">
              {MOCK_SAMPLES.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setSelectedSample(sample);
                    setCustomImage(null);
                    setDiagnosisResult(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 text-left cursor-pointer transition-all duration-300 ${
                    selectedSample?.id === sample.id 
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" 
                      : "bg-slate-950/40 border-slate-850/80 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="w-5 h-5 rounded overflow-hidden shrink-0 border border-slate-800" dangerouslySetInnerHTML={{ __html: sample.image.replace("data:image/svg+xml;utf8,", "") }} />
                  <span className="truncate">{sample.name}</span>
                </button>
              ))}
            </div>

            {/* Leaf Image Upload Card */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-950/20 relative overflow-hidden h-48"
            >
              {customImage || selectedSample ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                  {customImage ? (
                    <img src={customImage} alt="Crop Scan Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-24 h-24" dangerouslySetInnerHTML={{ __html: selectedSample.image.replace("data:image/svg+xml;utf8,", "") }} />
                  )}
                  {/* Laser effect overlay */}
                  {runningInference && (
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent animate-pulse">
                      <div className="h-[2px] bg-emerald-400/80 absolute left-0 right-0 top-0 animate-[scan_2s_infinite_linear]" style={{ animation: "scan 2s infinite linear" }} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-white">Upload Crop Leaf Image</div>
                    <div className="text-[10px] text-slate-500 mt-1">PNG, JPEG (supports HD resolution)</div>
                  </div>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Run Button */}
            <button
              onClick={runDiagnostics}
              disabled={runningInference || (!selectedSample && !customImage)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-slate-950 font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {runningInference ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Crop Tissues...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  Analyze Foliar Diagnostics
                </>
              )}
            </button>

            {/* Interactive pipeline step indicator */}
            {inferenceSteps.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800/60">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analysis Steps</div>
                {inferenceSteps.map(step => (
                  <div key={step.id} className="flex gap-3 text-xs bg-slate-950/30 p-2.5 rounded-lg border border-slate-850">
                    <div className="shrink-0">
                      {step.status === "processing" ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      ) : step.status === "failed" ? (
                        <AlertCircle className="w-4 h-4 text-brandRed" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-300">{step.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Diagnostic Outcomes & Logs (4 columns) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Outcome card: Simplified, no ML jargon */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md p-6 space-y-5 relative overflow-hidden">
            
            {/* Background highlights */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Diagnostics Outcome
            </h2>

            {diagnosisResult ? (
              <div className="space-y-4">
                
                {/* Result header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 px-2 py-0.5 rounded bg-slate-950/60 border border-slate-850">
                      Resolved via {diagnosisResult.resolved_by}
                    </span>
                    <h3 className="text-xl font-black text-white mt-1.5">
                      {diagnosisResult.prediction.replace(/___/g, " ").replace(/__/g, " ").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </h3>
                  </div>
                  
                  {/* Gauge Certainty Circle */}
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="28" cy="28" r="24" stroke="#1E293B" strokeWidth="3" fill="transparent" />
                        <circle cx="28" cy="28" r="24" stroke="#10B981" strokeWidth="3" fill="transparent" 
                          strokeDasharray={150.7}
                          strokeDashoffset={150.7 - (150.7 * (diagnosisResult.confidence || 0.95))}
                        />
                      </svg>
                      <span className="absolute text-[10px] font-black text-emerald-400">
                        {Math.round((diagnosisResult.confidence || 0.95) * 100)}%
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase mt-1">Certainty</span>
                  </div>
                </div>

                {/* Explanation text */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-300">Explanation</div>
                  <p className="text-slate-400 leading-relaxed bg-slate-950/30 p-3.5 rounded-xl border border-slate-850/60">
                    {diagnosisResult.explanation}
                  </p>
                </div>

                {/* Actionable treatment plan */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-300">Agricultural Care Guide</div>
                  <ul className="space-y-2">
                    {diagnosisResult.care_guide?.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5 text-slate-400 leading-relaxed">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Leaf className="w-8 h-8 mx-auto text-slate-700 animate-pulse mb-3" />
                No active diagnosis.<br />Click 'Analyze Foliar Diagnostics' to begin.
              </div>
            )}
          </div>

          {/* User's recent transaction logs */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Your Diagnostic Logs
            </h2>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {loadingLogs ? (
                <div className="text-center py-8 text-slate-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  Loading database records...
                </div>
              ) : logs.length > 0 ? (
                logs.map(log => {
                  const resolvedClass = log.cloud_prediction || log.local_prediction;
                  const parsedName = resolvedClass 
                    ? resolvedClass.replace(/___/g, " ").replace(/__/g, " ").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                    : "Unknown Diagnosis";
                  
                  return (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-950/30 border border-slate-850/60 text-xs flex flex-col gap-1.5 hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 font-semibold">Device: {log.device_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                          log.resolved_by === "cloud" 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}>
                          {log.resolved_by}
                        </span>
                      </div>
                      <div className="font-bold text-slate-300 truncate">{parsedName}</div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5 border-t border-slate-850/40">
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Latency: {log.network_latency ? `${log.network_latency} ms` : "0 ms"}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No scan logs stored in your secure account.
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Embedded scanning CSS keyframe */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
          100% { top: 0%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
