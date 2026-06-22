import os
import sys
from huggingface_hub import hf_hub_download

print("Pre-downloading cloud ConvNeXt-Large model weights...")
REPO_ID = "Arko007/adaptive-cloud-plant-model"
HF_TOKEN = os.getenv("HF_TOKEN", "")

# Allow specifying target directory as command-line argument or env var
local_dir = sys.argv[1] if len(sys.argv) > 1 else os.getenv("MODEL_DIR", ".")
os.makedirs(local_dir, exist_ok=True)

try:
    hf_hub_download(
        repo_id=REPO_ID,
        filename="convnext_large_cloud_best.safetensors",
        token=HF_TOKEN or None,
        local_dir=local_dir,
        local_dir_use_symlinks=False,
    )
    print(f"Cloud model weights downloaded successfully to {local_dir}.")
except Exception as e:
    print(f"Warning: could not pre-download model weights: {e}")
    print("Continuing without bundled weights; the backend will fall back to runtime download or simulator mode.")
