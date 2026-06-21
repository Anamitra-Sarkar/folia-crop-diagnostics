import os
import uuid
from datetime import datetime
import firebase_admin
from google.cloud import firestore as g_firestore

# Global client holder
db = None
IN_MEMORY_LOGS = {}  # Fallback for dev mode when Firestore credentials are not set

def get_db_client():
    """Retrieves or initializes the Firestore client securely."""
    global db
    if db is not None:
        return db
    try:
        # Check if initialized, otherwise initialize
        try:
            app = firebase_admin.get_app()
        except ValueError:
            # Fallback initialization in case credentials are set via environment ADC
            app = firebase_admin.initialize_app()
            
        # Create Google Cloud Firestore client pointing explicitly to the 'default' database ID
        try:
            cred = app.credential
            g_cred = cred.get_credential() if cred else None
            db = g_firestore.Client(project=app.project_id, credentials=g_cred, database="default")
        except Exception:
            db = g_firestore.Client(database="default")
            
        return db
    except Exception as e:
        print(f"Firestore initialization warning: {e}. Using in-memory fallback for diagnostics logging.")
        return None

def log_diagnostic(
    uid: str,
    device_id: str,
    timestamp: str,
    resolved_by: str,
    local_prediction: str = None,
    local_confidence: float = None,
    local_vacuity: float = None,
    cloud_prediction: str = None,
    cloud_confidence: float = None,
    network_latency: float = None,
    explanation: str = None,
    care_guide: list = None
) -> str:
    """Inserts a new diagnostic log entry into Firestore isolated under user's UID."""
    if not uid:
        uid = "anonymous_user"

    log_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat() + "Z"
    
    data = {
        "id": log_id,
        "device_id": device_id,
        "timestamp": timestamp,
        "resolved_by": resolved_by,
        "local_prediction": local_prediction,
        "local_confidence": local_confidence,
        "local_vacuity": local_vacuity,
        "cloud_prediction": cloud_prediction,
        "cloud_confidence": cloud_confidence,
        "network_latency": network_latency,
        "explanation": explanation,
        "care_guide": care_guide,
        "created_at": created_at
    }
    
    client = get_db_client()
    if client:
        try:
            client.collection("users").document(uid).collection("diagnostics").document(log_id).set(data)
            return log_id
        except Exception as e:
            print(f"Firestore write error: {e}. Falling back to local logging.")

    # Fallback to local memory storage for offline/dev
    if uid not in IN_MEMORY_LOGS:
        IN_MEMORY_LOGS[uid] = []
    IN_MEMORY_LOGS[uid].append(data)
    return log_id

def get_recent_logs(uid: str, limit: int = 50):
    """Retrieves the most recent diagnostic records for a specific user UID."""
    if not uid:
        uid = "anonymous_user"

    client = get_db_client()
    if client:
        try:
            docs = client.collection("users").document(uid).collection("diagnostics")\
                .order_by("created_at", direction=g_firestore.Query.DESCENDING)\
                .limit(limit).stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Firestore read error: {e}. Falling back to in-memory query.")
            
    # Fallback to in-memory logs
    user_logs = IN_MEMORY_LOGS.get(uid, [])
    user_logs_sorted = sorted(user_logs, key=lambda x: x["created_at"], reverse=True)
    return user_logs_sorted[:limit]

def get_statistics(uid: str):
    """Computes operational telemetry metrics scoped strictly to a user UID."""
    if not uid:
        uid = "anonymous_user"

    logs = get_recent_logs(uid, limit=1000)
    total_diagnoses = len(logs)
    
    cloud_resolved = sum(1 for log in logs if log.get("resolved_by") == "cloud")
    edge_resolved = sum(1 for log in logs if "edge" in str(log.get("resolved_by", "")).lower())
    
    latencies = [log.get("network_latency") for log in logs if log.get("network_latency") is not None]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0
    
    return {
        "total_diagnoses": total_diagnoses,
        "cloud_resolved": cloud_resolved,
        "edge_resolved": edge_resolved,
        "avg_latency_ms": round(avg_latency, 2)
    }
