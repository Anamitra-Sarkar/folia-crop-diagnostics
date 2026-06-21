import os
import glob
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from huggingface_hub import hf_hub_download, HfApi, create_repo, CommitOperationCopy, CommitOperationDelete
from safetensors.torch import save_file, load_file

# Hugging Face Configuration
HF_TOKEN = os.getenv("HF_TOKEN", "")
REPO_ID = "Arko007/adaptive-cloud-plant-model"
FILENAME = "convnext_large_cloud_best.pth"
LOCAL_DIR = "/home/anamitra/adaptive-edge-cloud-plant-diagnosis/backend"
TEST_DIR = "/home/anamitra/plant_test"

# Import Class list
from models import PLANT_DISEASES

def download_model():
    print(f"Downloading {FILENAME} from HF repo {REPO_ID}...")
    checkpoint_path = hf_hub_download(
        repo_id=REPO_ID,
        filename=FILENAME,
        token=HF_TOKEN,
        local_dir=LOCAL_DIR
    )
    print(f"Downloaded model checkpoint saved to: {checkpoint_path}")
    return checkpoint_path

def get_convnext_large_model():
    # Initialize ConvNeXt-Large structure
    print("Initializing ConvNeXt-Large model structure...")
    model = models.convnext_large()
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, len(PLANT_DISEASES))
    return model

def test_model(model, device, use_safetensors=False):
    # Set model to evaluation
    model.eval()
    model = model.to(device)
    
    # 384x384 resolution is what the cloud model was trained on
    transform = transforms.Compose([
        transforms.Resize((384, 384)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    test_images = glob.glob(os.path.join(TEST_DIR, "*.jpg"))
    print(f"Found {len(test_images)} test images in {TEST_DIR}")
    
    correct_predictions = 0
    results = {}
    
    for img_path in sorted(test_images):
        basename = os.path.basename(img_path)
        # Class name is the filename without extension (e.g. Apple__black_rot.jpg)
        target_class = basename.replace(".jpg", "")
        
        try:
            image = Image.open(img_path).convert("RGB")
            tensor = transform(image).unsqueeze(0).to(device)
            
            with torch.no_grad():
                logits = model(tensor)
                probs = torch.softmax(logits, dim=1)
                confidence, class_idx = torch.max(probs, dim=1)
                
            predicted_class = PLANT_DISEASES[class_idx.item()]
            conf_val = confidence.item()
            is_correct = (predicted_class == target_class)
            
            if is_correct:
                correct_predictions += 1
                
            results[target_class] = {
                "predicted": predicted_class,
                "confidence": conf_val,
                "correct": is_correct
            }
        except Exception as e:
            print(f"Error testing image {basename}: {e}")
            
    accuracy = (correct_predictions / len(test_images)) * 100 if len(test_images) > 0 else 0
    print(f"[{'Safetensors' if use_safetensors else 'PTH'}] Test Complete. Accuracy: {accuracy:.2f}% ({correct_predictions}/{len(test_images)})")
    
    # Print out a brief sample of predictions
    print("\n--- Sample Predictions (First 5 classes) ---")
    sorted_targets = sorted(list(results.keys()))
    for target in sorted_targets[:5]:
        res = results[target]
        print(f"Target: {target:35} | Pred: {res['predicted']:35} | Conf: {res['confidence']:.4f} | Correct: {res['correct']}")
    print("--------------------------------------------\n")
    
    return results, accuracy

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # 1. Download Model
    checkpoint_path = download_model()
    
    # 2. Load PTH state dict
    print("Loading PTH checkpoint state dict...")
    checkpoint = torch.load(checkpoint_path, map_location=device)
    state_dict = checkpoint["model_state_dict"]
    
    # Initialize model and load state dict
    model = get_convnext_large_model()
    model.load_state_dict(state_dict)
    
    # 3. Test PTH Model
    print("Evaluating downloaded PTH model on test images...")
    pth_results, pth_acc = test_model(model, device, use_safetensors=False)
    
    # 4. Convert to Safetensors
    safetensors_path = os.path.join(LOCAL_DIR, "convnext_large_cloud_best.safetensors")
    print(f"Converting state dict to safetensors and saving to: {safetensors_path}...")
    cpu_state_dict = {k: v.cpu() for k, v in state_dict.items()}
    save_file(cpu_state_dict, safetensors_path)
    print("Safetensors conversion completed.")
    
    # 5. Reload using Safetensors and Test Again
    print("Loading model state dict from safetensors...")
    sf_state_dict = load_file(safetensors_path)
    
    model_sf = get_convnext_large_model()
    model_sf.load_state_dict(sf_state_dict)
    
    print("Evaluating converted Safetensors model on test images...")
    sf_results, sf_acc = test_model(model_sf, device, use_safetensors=True)
    
    # Verify exact match between PTH and Safetensors predictions
    print("Verifying that PTH and Safetensors predictions are identical...")
    mismatches = 0
    for target, pth_res in pth_results.items():
        sf_res = sf_results[target]
        if pth_res["predicted"] != sf_res["predicted"] or abs(pth_res["confidence"] - sf_res["confidence"]) > 1e-6:
            print(f"Mismatch for class {target}: PTH={pth_res}, Safetensors={sf_res}")
            mismatches += 1
            
    if mismatches == 0:
        print("SUCCESS: PTH and Safetensors models produced 100% identical outputs!")
    else:
        raise ValueError(f"CRITICAL: Found {mismatches} mismatches between PTH and Safetensors outputs!")
        
    # 6. Upload Safetensors to HF Repo and update checkpoints folder
    api = HfApi()
    
    print(f"Uploading safetensors model to HF repository {REPO_ID}...")
    api.upload_file(
        path_or_fileobj=safetensors_path,
        path_in_repo="convnext_large_cloud_best.safetensors",
        repo_id=REPO_ID,
        token=HF_TOKEN
    )
    print("Safetensors model uploaded successfully!")
    
    # 7. Move all .pth files to checkpoints/ directory
    print("Scanning repository files to relocate .pth files to 'checkpoints/' directory...")
    repo_files = api.list_repo_files(repo_id=REPO_ID, token=HF_TOKEN)
    
    pth_files = [f for f in repo_files if f.endswith(".pth") and not f.startswith("checkpoints/")]
    print(f"Found {len(pth_files)} .pth files to move: {pth_files}")
    
    operations = []
    for pth_file in pth_files:
        dest_path = f"checkpoints/{pth_file}"
        print(f"Staging move of {pth_file} -> {dest_path}...")
        operations.append(CommitOperationCopy(src_path_in_repo=pth_file, path_in_repo=dest_path))
        operations.append(CommitOperationDelete(path_in_repo=pth_file))
        
    if operations:
        print(f"Moving {len(pth_files)} files in a single atomic commit...")
        api.create_commit(
            repo_id=REPO_ID,
            token=HF_TOKEN,
            operations=operations,
            commit_message=f"Move {len(pth_files)} .pth checkpoints to checkpoints/ folder"
        )
        print("Hugging Face repository updates completed successfully!")
    else:
        print("No .pth files needed relocation.")

if __name__ == "__main__":
    main()
