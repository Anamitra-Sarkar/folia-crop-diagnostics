import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Leaf, Wifi, WifiOff, Battery, ShieldAlert, 
  UploadCloud, Play, FileText, CheckCircle2, 
  Activity, Loader2, LogOut, RefreshCw, AlertCircle,
  Download, Trash2, Server, Sun, Moon
} from "lucide-react";

// Mock leaf samples for sandbox testing (matching models.py classes)
const MOCK_SAMPLES = [
  {
    id: "tomato_healthy",
    name: "Tomato (Healthy)",
    crop: "Tomato",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f5f3ef'/><path d='M50 10 C70 30, 30 50, 50 90 C30 50, 70 30, 50 10' fill='%232d7a4f'/></svg>",
    isHealthy: true,
    localPred: "Tomato__healthy",
    localConf: 0.98,
    vacuity: 0.05
  },
  {
    id: "tomato_early_blight",
    name: "Tomato (Early Blight)",
    crop: "Tomato",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f5f3ef'/><path d='M50 10 C70 30, 30 50, 50 90 C30 50, 70 30, 50 10' fill='%238b6914'/><circle cx='45' cy='35' r='5' fill='%23b03030'/><circle cx='55' cy='55' r='7' fill='%23b03030'/></svg>",
    isHealthy: false,
    localPred: "Tomato__early_blight",
    localConf: 0.88,
    vacuity: 0.22
  },
  {
    id: "potato_late_blight",
    name: "Potato (Late Blight)",
    crop: "Potato",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f5f3ef'/><path d='M50 15 C80 35, 20 65, 50 85 C20 65, 80 35, 50 15' fill='%238b6914'/><circle cx='40' cy='45' r='8' fill='%231f1c17'/></svg>",
    isHealthy: false,
    localPred: "Potato__late_blight",
    localConf: 0.74,
    vacuity: 0.35
  },
  {
    id: "apple_black_rot",
    name: "Apple (Black Rot)",
    crop: "Apple",
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23f5f3ef'/><path d='M50 10 C80 20, 80 80, 50 90 C20 80, 20 20, 50 10' fill='%23b03030'/><circle cx='50' cy='50' r='12' fill='%231f1c17'/></svg>",
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("folia-theme") || "light";
  });

  // PWA Local Model Caching states & helpers
  const MODEL_URL = "https://huggingface.co/Arko007/adaptive-edge-plant-model/resolve/main/mobilenetv4_edge_best.safetensors";
  const [modelCached, setModelCached] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const fileInputRef = useRef(null);

  // Finite State Machine dynamic mapping
  let fsmState = "S1";
  let fsmDesc = "Low latency. Decides locally.";
  if (!isOnline) {
    fsmState = "S4";
    fsmDesc = "Offline blackout. Full local offline fallback.";
  } else if (forceCloud) {
    fsmState = "S3";
    fsmDesc = "Forced cloud routing active.";
  } else if (latency > 150) {
    fsmState = "S2";
    fsmDesc = "Normal state. Offloads uncertain cases dynamically.";
  } else {
    fsmState = "S1";
    fsmDesc = "Low latency. Decides locally.";
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("folia-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

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
        vacuity: 0.05,
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
            vacuity: 0.0,
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
          vacuity: localVacuity,
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
        vacuity: localVacuity,
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

  const getFSMClass = (stateId) => {
    if (fsmState !== stateId) return "fsm-state-item";
    let activeClass = "active";
    if (stateId === "S3") activeClass = "active cloud-first";
    if (stateId === "S4") activeClass = "active offline";
    return `fsm-state-item ${activeClass}`;
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans pb-12 transition-colors duration-200">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border px-6 py-4 flex justify-between items-center transition-colors">
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
            <path d="M14 2C14 2 21 8 21 15C21 18.866 17.866 22 14 22C10.134 22 7 18.866 7 15C7 8 14 2 14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M14 9C15.5 10.5 18 11 18 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M14 14C12.5 15.5 10 16 10 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-lg font-display font-semibold text-text">
            Folia
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Dynamic dot indicator */}
          <div className="flex items-center gap-2 text-[13px] font-medium text-text font-sans">
            <span className={`w-2 h-2 rounded-full inline-block ${
              !isOnline ? "bg-danger" : forceCloud ? "bg-accent" : "bg-primary"
            }`} />
            <span>{!isOnline ? "Edge Isolated Fallback" : forceCloud ? "Cloud-First Routing" : "Edge Connected"}</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-surface-2 border border-transparent hover:border-border text-text-muted hover:text-text cursor-pointer transition-all"
            aria-label="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-4 py-2 rounded border border-border bg-surface-2 hover:bg-surface text-text text-xs font-semibold cursor-pointer transition-colors"
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
          
          {/* Controllers Card */}
          <div className="telemetry-card">
            <div className="panel-header">
              <h2>Environment Controllers</h2>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            
            {/* Connectivity Switch */}
            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-2.5">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-primary" />
                ) : (
                  <WifiOff className="w-5 h-5 text-danger" />
                )}
                <div>
                  <div className="text-[13px] font-semibold">Network Uplink</div>
                  <div className="text-[10px] text-text-muted">{isOnline ? "Connected to Cloud" : "Offline Gating Active"}</div>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-faint after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* WAN Latency Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-text-muted">WAN Latency</span>
                <span className={isOnline ? "text-primary" : "text-text-faint"}>
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
                className="slider-input accent-primary disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>

            {/* Battery Status Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-text-muted flex items-center gap-1">
                  <Battery className="w-4 h-4 text-primary" />
                  Edge Node Battery
                </span>
                <span className={battery > 20 ? "text-primary" : "text-danger"}>
                  {battery}%
                </span>
              </div>
              <input 
                type="range"
                min="5"
                max="100"
                value={battery}
                onChange={(e) => setBattery(parseInt(e.target.value))}
                className="slider-input accent-primary"
              />
            </div>

            {/* Cloud Forcing Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-border text-xs font-semibold">
              <span className="text-text-muted">Always Route to Cloud</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={forceCloud}
                  disabled={!isOnline}
                  onChange={(e) => setForceCloud(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-faint after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary disabled:opacity-50"></div>
              </label>
            </div>

            {/* Edge Decision Engine State (FSM) */}
            <div className="space-y-3 pt-2 border-t border-border">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">Decision Engine State (FSM)</span>
              <div className="fsm-state-viewer">
                <div className={getFSMClass("S1")}>
                  <span className="state-title">S1: Edge Processing Only</span>
                  <span className="state-desc">Low latency. Decides locally.</span>
                </div>
                <div className={getFSMClass("S2")}>
                  <span className="state-title">S2: Adaptive Offloading</span>
                  <span className="state-desc">Normal state. Offloads uncertain cases dynamically.</span>
                </div>
                <div className={getFSMClass("S3")}>
                  <span className="state-title">S3: Cloud-First Forcing</span>
                  <span className="state-desc">Forced cloud routing active.</span>
                </div>
                <div className={getFSMClass("S4")}>
                  <span className="state-title">S4: Edge Isolated Fallback</span>
                  <span className="state-desc">Offline blackout. Full local offline fallback.</span>
                </div>
              </div>
            </div>

          </div>

          {/* Offline Model Cache Card */}
          <div className="telemetry-card">
            <div className="panel-header">
              <h2>Offline Model Cache</h2>
              <Server className="w-4 h-4 text-primary" />
            </div>
            
            <p className="text-xs text-text-muted leading-relaxed">
              Download and cache the 45MB Edge Diagnostic Model locally to perform crop diagnostics offline.
            </p>

            {modelCached ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Model is cached on this device</span>
                </div>
                <button
                  onClick={clearModelCache}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded border border-danger/30 bg-surface-2 hover:bg-surface text-danger text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Model Cache
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {downloadingModel ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-text">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        Downloading...
                      </span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="confidence-track">
                      <div
                        className="confidence-fill"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={downloadEdgeModel}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded border border-primary/30 bg-surface-2 hover:bg-surface text-primary text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Edge Model
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Database Analytics Stats */}
          <div className="telemetry-card">
            <div className="panel-header">
              <h2>User Telemetry Stats</h2>
              <button 
                onClick={fetchTelemetry}
                className="p-1 rounded hover:bg-surface-2 border border-border text-text-muted hover:text-text cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded bg-surface-2 border border-border text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-faint">Total Scans</div>
                <div className="text-2xl font-bold text-text mt-1">{stats.total_diagnoses}</div>
              </div>
              
              <div className="p-4 rounded bg-surface-2 border border-border text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-faint">Cloud Diagnostics</div>
                <div className="text-2xl font-bold text-cloud mt-1">
                  {stats.total_diagnoses > 0 ? `${Math.round((stats.cloud_resolved / stats.total_diagnoses) * 100)}%` : "0%"}
                </div>
              </div>

              <div className="p-4 rounded bg-surface-2 border border-border text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-faint">Edge Diagnostics</div>
                <div className="text-2xl font-bold text-primary mt-1">{stats.edge_resolved}</div>
              </div>

              <div className="p-4 rounded bg-surface-2 border border-border text-center">
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-faint">WAN Latency</div>
                <div className="text-2xl font-bold text-accent mt-1">{stats.avg_latency_ms} <span className="text-xs">ms</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Center Column: Sandbox Diagnostics Leaf Capture (4 columns) */}
        <section className="lg:col-span-4 space-y-6">
          <div className="telemetry-card">
            <div className="panel-header">
              <h2>Crop Sample Sandbox</h2>
            </div>

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
                  className={`crop-sample-btn ${selectedSample?.id === sample.id ? "selected" : ""}`}
                >
                  <span className={selectedSample?.id === sample.id ? "font-display italic font-semibold text-primary" : ""}>
                    {sample.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Leaf Image Upload Card */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="upload-area h-48 relative overflow-hidden"
            >
              {customImage || selectedSample ? (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
                  {customImage ? (
                    <img src={customImage} alt="Crop Scan Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-24 h-24" dangerouslySetInnerHTML={{ __html: selectedSample.image.replace("data:image/svg+xml;utf8,", "") }} />
                  )}
                  {/* Laser effect overlay */}
                  {runningInference && (
                    <div className="absolute inset-0 bg-primary/5">
                      <div className="h-[1px] bg-primary/80 absolute left-0 right-0 top-0 animate-[scan_2s_infinite_linear]" style={{ animation: "scan 2s infinite linear" }} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <UploadCloud className="upload-icon" />
                  <div className="text-center font-sans">
                    <div className="text-xs font-semibold text-text">Drop leaf image here or click to browse</div>
                    <div className="text-[10px] text-text-faint mt-1">PNG, JPEG (supports HD resolution)</div>
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
              className="btn-primary w-full"
            >
              {runningInference ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Crop Tissues...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Analyze Foliar Diagnostics
                </>
              )}
            </button>

            {/* Interactive pipeline step indicator */}
            {inferenceSteps.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block">Analysis Steps</span>
                <div className="inference-flow">
                  {inferenceSteps.map((step, idx) => (
                    <div key={step.id} className={`flow-step ${step.status === "complete" ? "complete" : step.status === "processing" ? "processing" : ""}`}>
                      <div className="step-node">
                        {step.status === "complete" ? "✓" : `0${idx + 1}`}
                      </div>
                      <div className="step-details">
                        <h4>{step.title}</h4>
                        <p>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Diagnostic Outcomes & Logs (4 columns) */}
        <section className="lg:col-span-4 space-y-6">
          
          {/* Outcome card */}
          <div className="telemetry-card">
            <div className="panel-header">
              <h2>Diagnostics Outcome</h2>
              <FileText className="w-4 h-4 text-primary" />
            </div>

            {diagnosisResult ? (
              <div className="space-y-4">
                
                {/* Result header */}
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Resolved via {diagnosisResult.resolved_by}
                    </span>
                    {/* Vacuity badge */}
                    {diagnosisResult.vacuity !== undefined && (
                      <span className="vacuity-badge">
                        Vacuity: {diagnosisResult.vacuity}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="results-title">
                    {diagnosisResult.prediction.replace(/___/g, " ").replace(/__/g, " ").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </h3>
                  
                  {/* Confidence Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-text-muted">
                      <span>Certainty</span>
                      <span className="text-primary font-bold">{Math.round((diagnosisResult.confidence || 0.95) * 100)}%</span>
                    </div>
                    <div className="confidence-track">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${(diagnosisResult.confidence || 0.95) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Explanation text */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-text">Explanation</div>
                  <p className="text-text-muted leading-relaxed bg-surface-2 p-3.5 rounded border border-border">
                    {diagnosisResult.explanation}
                  </p>
                </div>

                {/* Actionable treatment plan */}
                <div className="space-y-3 text-xs">
                  <div className="font-bold text-text">Agricultural Care Guide</div>
                  <ul className="space-y-3">
                    {diagnosisResult.care_guide?.map((step, idx) => (
                      <li key={idx} className="care-guide-step">
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-text-muted text-xs font-sans">
                <Leaf className="w-8 h-8 mx-auto text-text-faint mb-3" />
                No active diagnosis.<br />Click 'Analyze Foliar Diagnostics' to begin.
              </div>
            )}
          </div>

          {/* User's recent transaction logs */}
          <div className="telemetry-card">
            <div className="panel-header">
              <h2>Your Diagnostic Logs</h2>
            </div>

            <div className="overflow-x-auto max-h-[300px] border border-border rounded">
              {loadingLogs ? (
                <div className="text-center py-8 text-text-muted text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading database records...
                </div>
              ) : logs.length > 0 ? (
                <table className="logs-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Diagnosis</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => {
                      const resolvedClass = log.cloud_prediction || log.local_prediction;
                      const parsedName = resolvedClass 
                        ? resolvedClass.replace(/___/g, " ").replace(/__/g, " ").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                        : "Unknown Diagnosis";
                      
                      const isHealthy = parsedName.toLowerCase().includes("healthy");
                      const isCloud = log.resolved_by === "cloud";
                      
                      let chipClass = "status-chip healthy";
                      if (isCloud) {
                        chipClass = "status-chip cloud";
                      } else if (!isHealthy) {
                        chipClass = "status-chip disease";
                      }
                      
                      return (
                        <tr key={log.id}>
                          <td>
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="font-semibold truncate max-w-[140px]" title={parsedName}>
                            {parsedName}
                          </td>
                          <td>
                            <span className={chipClass}>
                              <span className="status-chip-dot" />
                              {log.resolved_by}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-text-muted text-xs">
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
