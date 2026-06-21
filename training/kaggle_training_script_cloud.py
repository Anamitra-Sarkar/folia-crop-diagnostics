"""
Kaggle Training Script for:
A Confidence-Aware Adaptive Edge-Cloud Framework for Reliable Plant Disease Diagnosis

Model: Cloud Model (ConvNeXt-Large)
Hugging Face Integration: Automatically uploads checkpoints to Hugging Face Repository after every epoch.
"""

import os
import glob
import argparse
import random
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from PIL import Image
from huggingface_hub import HfApi, create_repo

# Hardcoded Hugging Face credentials for private Kaggle environments
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_REPO = "Arko007/adaptive-cloud-plant-model"

# The 88 production-grade classes
PLANT_CLASSES = [
    "Apple__black_rot",
    "Apple__healthy",
    "Apple__rust",
    "Apple__scab",
    "Cassava__bacterial_blight",
    "Cassava__brown_streak_disease",
    "Cassava__green_mottle",
    "Cassava__healthy",
    "Cassava__mosaic_disease",
    "Cherry__healthy",
    "Cherry__powdery_mildew",
    "Chili__healthy",
    "Chili__leaf curl",
    "Chili__leaf spot",
    "Chili__whitefly",
    "Chili__yellowish",
    "Coffee__cercospora_leaf_spot",
    "Coffee__healthy",
    "Coffee__red_spider_mite",
    "Coffee__rust",
    "Corn__common_rust",
    "Corn__gray_leaf_spot",
    "Corn__healthy",
    "Corn__northern_leaf_blight",
    "Cucumber__diseased",
    "Cucumber__healthy",
    "Gauva__diseased",
    "Gauva__healthy",
    "Grape__black_measles",
    "Grape__black_rot",
    "Grape__healthy",
    "Grape__leaf_blight_(isariopsis_leaf_spot)",
    "Jamun__diseased",
    "Jamun__healthy",
    "Lemon__diseased",
    "Lemon__healthy",
    "Mango__diseased",
    "Mango__healthy",
    "Peach__bacterial_spot",
    "Peach__healthy",
    "Pepper_bell__bacterial_spot",
    "Pepper_bell__healthy",
    "Pomegranate__diseased",
    "Pomegranate__healthy",
    "Potato__early_blight",
    "Potato__healthy",
    "Potato__late_blight",
    "Rice__brown_spot",
    "Rice__healthy",
    "Rice__hispa",
    "Rice__leaf_blast",
    "Rice__neck_blast",
    "Soybean__bacterial_blight",
    "Soybean__caterpillar",
    "Soybean__diabrotica_speciosa",
    "Soybean__downy_mildew",
    "Soybean__healthy",
    "Soybean__mosaic_virus",
    "Soybean__powdery_mildew",
    "Soybean__rust",
    "Soybean__southern_blight",
    "Strawberry___leaf_scorch",
    "Strawberry__healthy",
    "Sugarcane__bacterial_blight",
    "Sugarcane__healthy",
    "Sugarcane__red_rot",
    "Sugarcane__red_stripe",
    "Sugarcane__rust",
    "Tea__algal_leaf",
    "Tea__anthracnose",
    "Tea__bird_eye_spot",
    "Tea__brown_blight",
    "Tea__healthy",
    "Tea__red_leaf_spot",
    "Tomato__bacterial_spot",
    "Tomato__early_blight",
    "Tomato__healthy",
    "Tomato__late_blight",
    "Tomato__leaf_mold",
    "Tomato__mosaic_virus",
    "Tomato__septoria_leaf_spot",
    "Tomato__spider_mites_(two_spotted_spider_mite)",
    "Tomato__target_spot",
    "Tomato__yellow_leaf_curl_virus",
    "Wheat__brown_rust",
    "Wheat__healthy",
    "Wheat__septoria",
    "Wheat__yellow_rust"
]

CLASS_TO_IDX = {cls: i for i, cls in enumerate(PLANT_CLASSES)}

def upload_checkpoint_to_hf(local_path, hf_path, epoch, is_best=False):
    """Securely uploads checkpoints directly to Hugging Face Model Hub."""
    print(f"Syncing checkpoint to Hugging Face repository {HF_REPO}...")
    try:
        api = HfApi()
        create_repo(repo_id=HF_REPO, token=HF_TOKEN, repo_type="model", exist_ok=True)
        
        api.upload_file(
            path_or_fileobj=local_path,
            path_in_repo=hf_path,
            repo_id=HF_REPO,
            token=HF_TOKEN
        )
        print(f"Successfully uploaded epoch {epoch} checkpoint to HF: {hf_path}")

        if is_best:
            best_hf_path = hf_path.split("_epoch_")[0] + "_best.pth"
            api.upload_file(
                path_or_fileobj=local_path,
                path_in_repo=best_hf_path,
                repo_id=HF_REPO,
                token=HF_TOKEN
            )
            print(f"Successfully updated best model on HF: {best_hf_path}")
    except Exception as e:
        print(f"Warning: Failed to sync checkpoint to Hugging Face: {e}")

# ==========================================
# 1. Stratified Pre-split Dataset
# ==========================================
class StratifiedPlantDataset(Dataset):
    def __init__(self, file_paths, labels, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx):
        path = self.file_paths[idx]
        label = self.labels[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            image = Image.new("RGB", (384, 384))
            
        if self.transform:
            image = self.transform(image)
        return image, label

def get_stratified_split(data_dir, val_ratio=0.15):
    """
    Scans each of the 88 folders individually, shuffles them,
    and splits into train/val. Reports missing directories immediately.
    """
    train_paths = []
    train_labels = []
    val_paths = []
    val_labels = []

    print(f"Loading dataset from: {data_dir}")
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Root data directory {data_dir} does not exist!")

    for class_name in PLANT_CLASSES:
        class_dir = os.path.join(data_dir, class_name)
        if not os.path.exists(class_dir):
            matching = [d for d in os.listdir(data_dir) if d.lower() == class_name.lower()]
            if matching:
                class_dir = os.path.join(data_dir, matching[0])
            else:
                print(f"ERROR: Dataset folder '{class_name}' is missing from directory!")
                continue

        images = []
        for file in os.listdir(class_dir):
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                images.append(os.path.join(class_dir, file))
        
        if len(images) == 0:
            print(f"WARNING: Dataset folder '{class_name}' contains zero images!")
            continue

        random.seed(42)
        random.shuffle(images)

        split_idx = int(len(images) * (1 - val_ratio))
        class_idx = CLASS_TO_IDX[class_name]

        train_paths.extend(images[:split_idx])
        train_labels.extend([class_idx] * split_idx)

        val_paths.extend(images[split_idx:])
        val_labels.extend([class_idx] * (len(images) - split_idx))

    print(f"Stratified Split Completed: {len(train_paths)} training, {len(val_paths)} validation samples.")
    return train_paths, train_labels, val_paths, val_labels

# ==========================================
# 2. Main Cloud Training Pipeline
# ==========================================
def train_cloud_model(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training cloud model on device: {device}")

    # Increased Resolution to 384x384
    train_transform = transforms.Compose([
        transforms.Resize((384, 384)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((384, 384)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_paths, train_y, val_paths, val_y = get_stratified_split(args.data_dir)

    train_dataset = StratifiedPlantDataset(train_paths, train_y, transform=train_transform)
    val_dataset = StratifiedPlantDataset(val_paths, val_y, transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    num_classes = len(PLANT_CLASSES)
    print(f"Number of classes: {num_classes}")

    print("Initializing ConvNeXt-Large model...")
    model = models.convnext_large(weights=models.ConvNeXt_Large_Weights.DEFAULT)
    
    in_features = model.classifier[2].in_features
    model.classifier[2] = nn.Linear(in_features, num_classes)
    model = model.to(device)

    # Freeze stages 1-3 to save GPU memory and compile faster
    print("Applying parameter-efficient setup: Freezing early cloud model stages (1-3)...")
    for name, param in model.named_parameters():
        if any(f"features.{i}" in name for i in [0, 1, 2, 3, 4, 5]):
            param.requires_grad = False

    # Optimize only active parameters
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr,
        weight_decay=1e-3
    )
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    total_epochs = args.epochs

    for epoch in range(1, total_epochs + 1):
        model.train()
        total_loss = 0.0
        train_correct = 0
        train_total = 0
        
        len_dataloader = len(train_loader)

        for i, (images, targets) in enumerate(train_loader):
            images, targets = images.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            total_loss += loss.item()

            preds = torch.argmax(outputs, dim=1)
            train_correct += torch.sum(preds == targets).item()
            train_total += targets.size(0)

            # LIVE TRAINING LOGS: Print step-wise progress metrics continuously
            if (i + 1) % 10 == 0 or (i + 1) == len_dataloader:
                current_acc = (train_correct / train_total) * 100
                print(f"Epoch [{epoch}/{total_epochs}] | Step [{i+1}/{len_dataloader}] | Train Loss: {loss.item():.4f} | Live Train Acc: {current_acc:.2f}%", flush=True)

        # Validation Step
        model.eval()
        val_correct = 0
        val_total = 0
        val_loss = 0.0
        with torch.no_grad():
            for images, targets in val_loader:
                images, targets = images.to(device), targets.to(device)
                outputs = model(images)
                loss = criterion(outputs, targets)
                val_loss += loss.item()

                preds = torch.argmax(outputs, dim=1)
                val_correct += torch.sum(preds == targets).item()
                val_total += targets.size(0)

        train_acc = (train_correct / train_total) * 100 if train_total > 0 else 0.0
        val_acc = (val_correct / val_total) * 100 if val_total > 0 else 0.0
        avg_train_loss = total_loss / len(train_loader)
        avg_val_loss = val_loss / len(val_loader)

        print(f"\n==================== Epoch [{epoch}/{total_epochs}] Summary ====================")
        print(f"--> Train Loss    : {avg_train_loss:.4f}")
        print(f"--> Final Train Acc: {train_acc:.2f}%")
        print(f"--> Val Loss      : {avg_val_loss:.4f}")
        print(f"--> Val Accuracy  : {val_acc:.2f}%")
        print("========================================================================\n", flush=True)

        local_checkpoint_path = f"convnext_large_cloud_epoch_{epoch}.pth"
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'val_acc': val_acc
        }, local_checkpoint_path)

        is_best = val_acc > best_val_acc
        if is_best:
            best_val_acc = val_acc
            print(f"New best validation accuracy: {best_val_acc:.2f}%. Marking for best.pth...")

        # Sync checkpoint to Hugging Face
        upload_checkpoint_to_hf(
            local_path=local_checkpoint_path,
            hf_path=f"convnext_large_cloud_epoch_{epoch}.pth",
            epoch=epoch,
            is_best=is_best
        )

    print("Cloud model training finished. Best validation accuracy: {:.2f}%".format(best_val_acc))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Adaptive Cloud Model Training Script")
    parser.add_argument("--data_dir", type=str, default="/kaggle/input/plant-disease-classification-merged-dataset", help="Dataset directory path")
    parser.add_argument("--epochs", type=str, default="25", help="Number of training epochs")
    parser.add_argument("--batch_size", type=str, default="32", help="Training batch size")
    parser.add_argument("--lr", type=str, default="0.0001", help="Optimizer learning rate")
    args, unknown = parser.parse_known_args()

    args.epochs = int(args.epochs)
    args.batch_size = int(args.batch_size)
    args.lr = float(args.lr)

    train_cloud_model(args)
