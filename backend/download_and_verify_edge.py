import os
import glob
import sys
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
from huggingface_hub import hf_hub_download, HfApi, CommitOperationCopy, CommitOperationDelete
from safetensors.torch import save_file, load_file

# Add training directory to sys.path to load MobileNetV4ConvMedium & EDLHead definitions
sys.path.insert(0, "/home/anamitra/adaptive-edge-cloud-plant-diagnosis/training")
from models import MobileNetV4ConvMedium, EDLHead

# Configuration
HF_TOKEN = os.getenv("HF_TOKEN", "")
REPO_ID = "Arko007/adaptive-edge-plant-model"
FILENAME = "mobilenetv4_edge_best.pth"
LOCAL_DIR = "/home/anamitra/adaptive-edge-cloud-plant-diagnosis/backend"
TEST_DIR = "/home/anamitra/plant_test"

# Import Class list from backend models
sys.path.insert(0, "/home/anamitra/adaptive-edge-cloud-plant-diagnosis/backend")
if 'models' in sys.modules:
    sys.modules.pop('models')
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

def get_edge_model():
    print("Initializing MobileNetV4-Conv-Medium backbone and EDL Head...")
    backbone = MobileNetV4ConvMedium()
    classifier_head = EDLHead(in_features=backbone.features_dim, num_classes=len(PLANT_DISEASES))
    return backbone, classifier_head

def test_model(backbone, classifier_head, device, use_safetensors=False):
    backbone.eval()
    classifier_head.eval()
    
    backbone = backbone.to(device)
    classifier_head = classifier_head.to(device)
    
    # 384x384 resolution matches the training resolution
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
        target_class = basename.replace(".jpg", "")
        
        try:
            image = Image.open(img_path).convert("RGB")
            tensor = transform(image).unsqueeze(0).to(device)
            
            with torch.no_grad():
                features = backbone(tensor)
                logits, evidence = classifier_head(features)
                
                # EDL logic for class and uncertainty (vacuity)
                alpha = evidence + 1
                S = torch.sum(alpha, dim=1, keepdim=True)
                p_hat = alpha / S
                confidence, class_idx = torch.max(p_hat, dim=1)
                vacuity = len(PLANT_DISEASES) / S.item()
                
            predicted_class = PLANT_DISEASES[class_idx.item()]
            conf_val = confidence.item()
            is_correct = (predicted_class == target_class)
            
            if is_correct:
                correct_predictions += 1
                
            results[target_class] = {
                "predicted": predicted_class,
                "confidence": conf_val,
                "vacuity": vacuity,
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
        print(f"Target: {target:35} | Pred: {res['predicted']:35} | Conf: {res['confidence']:.4f} | Vacuity: {res['vacuity']:.4f} | Correct: {res['correct']}")
    print("--------------------------------------------\n")
    
    return results, accuracy

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # 1. Download Model
    checkpoint_path = download_model()
    
    # 2. Load PTH checkpoint
    print("Loading PTH checkpoint state dicts...")
    checkpoint = torch.load(checkpoint_path, map_location=device)
    backbone_state = checkpoint["backbone_state_dict"]
    head_state = checkpoint["classifier_state_dict"]
    
    # Initialize models and load weights
    backbone, classifier_head = get_edge_model()
    backbone.load_state_dict(backbone_state)
    classifier_head.load_state_dict(head_state)
    
    # 3. Test PTH Model
    print("Evaluating downloaded PTH model on test images...")
    pth_results, pth_acc = test_model(backbone, classifier_head, device, use_safetensors=False)
    
    # 4. Convert to Safetensors (combined model)
    safetensors_path = os.path.join(LOCAL_DIR, "mobilenetv4_edge_best.safetensors")
    print(f"Combining backbone and head state dicts to safetensors and saving to: {safetensors_path}...")
    combined_state_dict = {}
    for k, v in backbone_state.items():
        combined_state_dict[f"backbone.{k}"] = v.cpu()
    for k, v in head_state.items():
        combined_state_dict[f"head.{k}"] = v.cpu()
        
    save_file(combined_state_dict, safetensors_path)
    print("Safetensors conversion completed.")
    
    # 5. Reload from Safetensors and Test Again
    print("Loading model state dicts from safetensors...")
    sf_state_dict = load_file(safetensors_path)
    
    sf_backbone_state = {}
    sf_head_state = {}
    for k, v in sf_state_dict.items():
        if k.startswith("backbone."):
            sf_backbone_state[k.replace("backbone.", "")] = v
        elif k.startswith("head."):
            sf_head_state[k.replace("head.", "")] = v
            
    backbone_sf, classifier_head_sf = get_edge_model()
    backbone_sf.load_state_dict(sf_backbone_state)
    classifier_head_sf.load_state_dict(sf_head_state)
    
    print("Evaluating converted Safetensors model on test images...")
    sf_results, sf_acc = test_model(backbone_sf, classifier_head_sf, device, use_safetensors=True)
    
    # Verify exact match
    print("Verifying that PTH and Safetensors predictions are identical...")
    mismatches = 0
    for target, pth_res in pth_results.items():
        sf_res = sf_results[target]
        pred_match = (pth_res["predicted"] == sf_res["predicted"])
        conf_match = (abs(pth_res["confidence"] - sf_res["confidence"]) < 1e-6)
        vac_match = (abs(pth_res["vacuity"] - sf_res["vacuity"]) < 1e-6)
        
        if not (pred_match and conf_match and vac_match):
            print(f"Mismatch for class {target}: PTH={pth_res}, Safetensors={sf_res}")
            mismatches += 1
            
    if mismatches == 0:
        print("SUCCESS: PTH and Safetensors models produced 100% identical outputs!")
    else:
        raise ValueError(f"CRITICAL: Found {mismatches} mismatches between PTH and Safetensors outputs!")
        
    # 6. Upload Safetensors to HF Repo
    api = HfApi()
    
    print(f"Uploading safetensors model to HF repository {REPO_ID}...")
    api.upload_file(
        path_or_fileobj=safetensors_path,
        path_in_repo="mobilenetv4_edge_best.safetensors",
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
