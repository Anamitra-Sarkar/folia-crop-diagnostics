import os
from huggingface_hub import hf_hub_download

print("Pre-downloading cloud ConvNeXt-Large model weights...")
REPO_ID = "Arko007/adaptive-cloud-plant-model"
HF_TOKEN = os.getenv("HF_TOKEN", "")

try:
    hf_hub_download(
        repo_id=REPO_ID,
        filename="convnext_large_cloud_best.safetensors",
        token=HF_TOKEN or None,
        local_dir="."
    )
    print("Cloud model weights downloaded successfully.")
except Exception as e:
    print(f"Error pre-downloading model weights: {e}")
    import sys
    sys.exit(1)
