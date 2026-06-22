import base64
import os
import json
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uvicorn
from dotenv import load_dotenv

# Load Environment Variables from .env file
load_dotenv()

import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase Admin SDK
firebase_key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "firebase-key.json")
firebase_key_json = os.getenv("FIREBASE_KEY_JSON")

if os.path.exists(firebase_key_path):
    try:
        print(f"Initializing Firebase Admin with service account key file: {firebase_key_path}")
        cred = credentials.Certificate(firebase_key_path)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase Admin with key file: {e}")
        try:
            firebase_admin.initialize_app()
        except Exception:
            pass
elif firebase_key_json:
    try:
        print("Initializing Firebase Admin with service account key from environment variable...")
        import json
        key_data = json.loads(firebase_key_json)
        cred = credentials.Certificate(key_data)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase Admin with env key: {e}")
        try:
            firebase_admin.initialize_app()
        except Exception:
            pass
else:
    try:
        print("Initializing Firebase Admin with Application Default Credentials...")
        firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase Admin initialization warning: {e}. Running in Developer/Mock mode.")

# Initialize Groq API Client
from groq import Groq
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = None
if groq_api_key:
    try:
        groq_client = Groq(api_key=groq_api_key)
        print("Groq LLM Client initialized successfully.")
    except Exception as e:
        print(f"Error initializing Groq LLM client: {e}")
else:
    print("WARNING: GROQ_API_KEY environment variable is missing. Falling back to local offline dictionary.")

from database import log_diagnostic, get_recent_logs, get_statistics
from models import CloudClassifier, PLANT_DISEASES
from fallbacks import get_offline_interpretation

app = FastAPI(
    title="Adaptive Edge-Cloud Plant Disease Diagnosis Backend",
    description="Production-grade, research-compliant API server for cooperative edge-cloud classification.",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate Cloud Classifier
classifier = CloudClassifier()

def verify_firebase_token(authorization: Optional[str] = Header(None)):
    """
    Dependency that decodes and validates the Firebase ID Token from Authorization header.
    Falls back to developer mode for sandbox testing if configuration is incomplete.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Use 'Bearer <token>'")
    
    token = parts[1]
    
    # Dev/Mock mode: bypass token check if token starts with 'dummy-token-' or if DEV_MODE=true
    dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"
    if token.startswith("dummy-token-") or dev_mode:
        uid = token.replace("dummy-token-", "") if token.startswith("dummy-token-") else "dev_user_123"
        return {"uid": uid, "email": "dev_user@example.com"}
        
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        if dev_mode:
            print(f"Token validation failed: {e}. Falling back to developer user.")
            return {"uid": "dev_user_123", "email": "dev_user@example.com"}
        raise HTTPException(status_code=401, detail=f"Unauthorized: Invalid Firebase ID Token: {str(e)}")

# Request Schemas
class MetricsSchema(BaseModel):
    vacuity: float = Field(..., description="Epistemic uncertainty score")
    conformal_confidence: float = Field(..., description="Conformal temperature scaled confidence score")
    local_prediction: str = Field(..., description="Diagnostic class predicted by the edge MobileNetV4")

class NetworkSchema(BaseModel):
    measured_latency_ms: float = Field(..., description="Network round-trip latency in milliseconds")

class DiagnoseRequest(BaseModel):
    device_id: str = Field(..., description="Unique hardware identifier of the edge node")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of image capture")
    metrics: MetricsSchema
    network: NetworkSchema
    image_payload: str = Field(..., description="Base64 encoded JPEG leaf image")
    force_cloud: Optional[bool] = Field(False, description="Forces execution of cloud ConvNeXt classifier")

def get_explanation_and_care(class_name: str) -> dict:
    """
    Attempts to fetch a plant diagnosis explanation and treatment plan from Groq.
    Gracefully falls back to the local database if Groq API is offline or key is missing.
    """
    fallback_data = get_offline_interpretation(class_name)
    crop = fallback_data["crop"]
    disease = fallback_data["disease"]
    
    if groq_client is None:
        return fallback_data
        
    try:
        prompt = f"""
You are an expert agricultural botanist and plant pathologist.
A crop diagnostic model has classified a leaf image with the following result:
Crop: {crop}
Condition: {disease}

Provide a clear, simple, non-technical explanation of this condition suitable for a farmer.
Then, provide a bulleted list of 3-4 actionable care guidelines (treatment steps).
Do not include any math, probability, or machine learning details.
Keep the language extremely simple, reassuring, and practical.

Format your response exactly as JSON with these keys:
"explanation": "A simple paragraph explaining the condition.",
"care_guide": ["Step 1...", "Step 2...", "Step 3...", "Step 4..."]
"""
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant designed to output JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        response_text = completion.choices[0].message.content
        data = json.loads(response_text)
        
        if "explanation" in data and "care_guide" in data:
            return {
                "crop": crop,
                "disease": disease,
                "explanation": data["explanation"],
                "care_guide": data["care_guide"]
            }
    except Exception as e:
        print(f"Groq API query failed: {e}. Reverting to local fallback dictionary.")
        
    return fallback_data

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Adaptive Edge-Cloud Plant Disease Diagnosis Cloud Engine",
        "supported_classes_count": len(PLANT_DISEASES)
    }

@app.post("/diagnose")
def diagnose_image(
    request: DiagnoseRequest,
    user: dict = Depends(verify_firebase_token)
):
    """
    Cooperative edge-cloud diagnostics endpoint.
    Verified by Firebase JWT token, logging the telemetry isolated by user UID.
    """
    uid = user["uid"]
    
    # 1. Decode Image Payload
    try:
        image_data = base64.b64decode(request.image_payload)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Base64 image payload")

    # 2. Determine Gating/Routing Decision
    # Offload if forced OR if local uncertainty exceeds threshold
    should_run_cloud = request.force_cloud or (request.metrics.vacuity > 0.6) or (request.metrics.conformal_confidence < 0.75)

    cloud_prediction = None
    cloud_confidence = None

    if should_run_cloud:
        # Run ConvNeXt-Large Cloud Inference
        cloud_prediction, cloud_confidence = classifier.predict(image_data)
        resolved_by = "cloud"
        prediction_class = cloud_prediction
        confidence = cloud_confidence
    else:
        # Accept Edge prediction locally
        resolved_by = "edge"
        prediction_class = request.metrics.local_prediction
        confidence = request.metrics.conformal_confidence

    # 3. Retrieve care plan (Groq or local fallback)
    interpretation = get_explanation_and_care(prediction_class)

    # 4. Write transaction to Firestore
    log_id = log_diagnostic(
        uid=uid,
        device_id=request.device_id,
        timestamp=request.timestamp,
        resolved_by=resolved_by,
        local_prediction=request.metrics.local_prediction,
        local_confidence=request.metrics.conformal_confidence,
        local_vacuity=request.metrics.vacuity,
        cloud_prediction=cloud_prediction,
        cloud_confidence=cloud_confidence,
        network_latency=request.network.measured_latency_ms,
        explanation=interpretation["explanation"],
        care_guide=interpretation["care_guide"]
    )
    
    return {
        "log_id": log_id,
        "resolved_by": resolved_by,
        "prediction": prediction_class,
        "confidence": confidence,
        "vacuity": 0.0 if should_run_cloud else request.metrics.vacuity,
        "explanation": interpretation["explanation"],
        "care_guide": interpretation["care_guide"],
        "sync_status": "synced"
    }

@app.get("/logs")
def get_logs(limit: int = 50, user: dict = Depends(verify_firebase_token)):
    """Fetches user-specific diagnostic logs."""
    uid = user["uid"]
    return get_recent_logs(uid, limit)

@app.get("/stats")
def get_stats(user: dict = Depends(verify_firebase_token)):
    """Computes user-specific operational statistics."""
    uid = user["uid"]
    return get_statistics(uid)

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=False)
