"""
Kaggle Training Script for:
A Confidence-Aware Adaptive Edge-Cloud Framework for Reliable Plant Disease Diagnosis

Model: Edge Model (MobileNetV4-Conv-Medium with Evidential Head and Domain Adaptation GRL)
Hugging Face Integration: Automatically uploads checkpoints to Hugging Face Repository after every epoch.
"""

import os
import glob
import math
import argparse
import random
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
from huggingface_hub import HfApi, create_repo

# Hardcoded Hugging Face credentials for private Kaggle environments
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_REPO = "Arko007/adaptive-edge-plant-model"

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
# 1. Gradient Reversal Layer & UDA Discriminator
# ==========================================
class GradientReversal(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, alpha=1.0):
        ctx.alpha = alpha
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output):
        return grad_output.neg() * ctx.alpha, None

class GradientReversalLayer(nn.Module):
    def __init__(self, alpha=1.0):
        super().__init__()
        self.alpha = alpha

    def forward(self, x):
        return GradientReversal.apply(x, self.alpha)

class DomainDiscriminator(nn.Module):
    def __init__(self, in_features):
        super().__init__()
        self.grl = GradientReversalLayer()
        self.net = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 2)  # 2 domains: 0 = Source (Lab), 1 = Target (Field)
        )

    def forward(self, x, alpha=1.0):
        self.grl.alpha = alpha
        return self.net(self.grl(x))

# ==========================================
# 2. Squeeze & Excitation
# ==========================================
class SqueezeExcitation(nn.Module):
    def __init__(self, channels, reduction=4):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction, bias=False),
            nn.ReLU(),
            nn.Linear(channels // reduction, channels, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        b, c, _, _ = x.shape
        return x * self.se(x).view(b, c, 1, 1)

# ==========================================
# 3. Universal Inverted Bottleneck (UIB)
# ==========================================
class UIBBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride, expansion_factor=4, use_se=True, start_dw_kernel=0, middle_dw_kernel=3):
        super().__init__()
        self.use_shortcut = (stride == 1 and in_channels == out_channels)
        hidden_dim = in_channels * expansion_factor

        layers = []
        if start_dw_kernel > 0:
            layers.append(nn.Conv2d(in_channels, in_channels, start_dw_kernel, padding=start_dw_kernel//2, groups=in_channels, bias=False))
            layers.append(nn.BatchNorm2d(in_channels))
            layers.append(nn.ReLU6())

        if expansion_factor != 1:
            layers.append(nn.Conv2d(in_channels, hidden_dim, 1, bias=False))
            layers.append(nn.BatchNorm2d(hidden_dim))
            layers.append(nn.ReLU6())
        else:
            hidden_dim = in_channels

        if middle_dw_kernel > 0:
            layers.append(nn.Conv2d(hidden_dim, hidden_dim, middle_dw_kernel, stride=stride, padding=middle_dw_kernel//2, groups=hidden_dim, bias=False))
            layers.append(nn.BatchNorm2d(hidden_dim))
            layers.append(nn.ReLU6())

        if use_se:
            layers.append(SqueezeExcitation(hidden_dim))

        layers.append(nn.Conv2d(hidden_dim, out_channels, 1, bias=False))
        layers.append(nn.BatchNorm2d(out_channels))

        self.conv = nn.Sequential(*layers)

    def forward(self, x):
        if self.use_shortcut:
            return x + self.conv(x)
        return self.conv(x)

# ==========================================
# 4. MobileNetV4 Conv Medium Backbone
# ==========================================
class MobileNetV4ConvMedium(nn.Module):
    def __init__(self, in_channels=3, features_dim=960):
        super().__init__()
        self.features_dim = features_dim
        self.init_conv = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU6()
        )
        self.stages = nn.Sequential(
            UIBBlock(32, 48, stride=2, expansion_factor=2, use_se=False),
            UIBBlock(48, 80, stride=2, expansion_factor=4, use_se=True),
            UIBBlock(80, 80, stride=1, expansion_factor=4, use_se=True),
            UIBBlock(80, 160, stride=2, expansion_factor=4, use_se=True),
            UIBBlock(160, 160, stride=1, expansion_factor=4, use_se=True),
            UIBBlock(160, 256, stride=2, expansion_factor=6, use_se=True),
            UIBBlock(256, 256, stride=1, expansion_factor=6, use_se=True),
            UIBBlock(256, 512, stride=1, expansion_factor=6, use_se=True),
        )
        self.final_conv = nn.Sequential(
            nn.Conv2d(512, features_dim, kernel_size=1, bias=False),
            nn.BatchNorm2d(features_dim),
            nn.ReLU6()
        )
        self.pool = nn.AdaptiveAvgPool2d(1)

    def forward(self, x):
        x = self.init_conv(x)
        x = self.stages(x)
        x = self.final_conv(x)
        x = self.pool(x)
        return torch.flatten(x, 1)

# ==========================================
# 5. Evidential Head
# ==========================================
class EDLHead(nn.Module):
    def __init__(self, in_features, num_classes):
        super().__init__()
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x):
        logits = self.fc(x)
        evidence = F.softplus(logits)
        return logits, evidence

# ==========================================
# 6. Evidential Loss (MSE + KL Divergence)
# ==========================================
class EvidentialLoss(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.num_classes = num_classes
        # Precompute mathematically constant terms to avoid runtime graph overhead
        self.lgamma_K = nn.Parameter(torch.lgamma(torch.tensor(num_classes, dtype=torch.float32)), requires_grad=False)

    def forward(self, logits, evidence, target, epoch):
        if len(target.shape) == 1 or target.shape[1] == 1:
            target = F.one_hot(target.view(-1), num_classes=self.num_classes).float()

        alpha = evidence + 1
        S = torch.sum(alpha, dim=1, keepdim=True)
        p_hat = alpha / S

        err = (target - p_hat) ** 2
        var = alpha * (S - alpha) / (S ** 2 * (S + 1))
        loss_mse = torch.sum(err + var, dim=1)

        alpha_tilde = target + (1 - target) * alpha
        S_tilde = torch.sum(alpha_tilde, dim=1, keepdim=True)

        term1 = torch.lgamma(S_tilde) - self.lgamma_K - torch.sum(torch.lgamma(alpha_tilde), dim=1, keepdim=True)
        term2 = torch.sum((alpha_tilde - 1) * (torch.digamma(alpha_tilde) - torch.digamma(S_tilde)), dim=1, keepdim=True)
        loss_kl = torch.squeeze(term1 + term2, dim=1)

        lambda_t = min(1.0, epoch / 10.0)
        return torch.mean(loss_mse + lambda_t * loss_kl)

# ==========================================
# 7. Stratified Dataset Split & Loader
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

        # Detect domain source dynamically from the absolute image path to keep UDA labels aligned
        is_target = "plantdoc" in path.lower() or "mango" in path.lower() or "wild" in path.lower() or "field" in path.lower()
        domain_label = 1 if is_target else 0

        return image, label, domain_label

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
# 8. Calibration Module (Conformal Temperature Scaling)
# ==========================================
class ConformalTemperatureScaler(nn.Module):
    def __init__(self):
        super().__init__()
        self.temperature = nn.Parameter(torch.ones(1) * 1.5)

    def forward(self, logits):
        return logits / self.temperature

    def calibrate(self, val_loader, backbone, classifier_head, device):
        print("Starting Conformal Temperature Scaling calibration...")
        backbone.eval()
        classifier_head.eval()
        
        logits_list = []
        labels_list = []
        
        with torch.no_grad():
            for x, y, _ in val_loader:
                x = x.to(device)
                features = backbone(x)
                logits, _ = classifier_head(features)
                logits_list.append(logits.cpu())
                labels_list.append(y)

        logits = torch.cat(logits_list).to(device)
        labels = torch.cat(labels_list).to(device)

        nll_criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.LBFGS([self.temperature], lr=0.01, max_iter=50)

        def eval_val():
            optimizer.zero_grad()
            loss = nll_criterion(logits / self.temperature, labels)
            loss.backward()
            return loss

        optimizer.step(eval_val)
        print(f"Calibrated Temperature T*: {self.temperature.item():.4f}")
        return self.temperature.item()

# ==========================================
# 9. Main Edge Training Pipeline
# ==========================================
def train_model(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    train_transform = transforms.Compose([
        transforms.Resize((384, 384)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
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

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, drop_last=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    num_classes = len(PLANT_CLASSES)
    print(f"Number of classes: {num_classes}")

    backbone = MobileNetV4ConvMedium().to(device)
    classifier_head = EDLHead(in_features=backbone.features_dim, num_classes=num_classes).to(device)
    domain_classifier = DomainDiscriminator(in_features=backbone.features_dim).to(device)

    # UNFREEZE ALL LAYERS:
    # Since we train this custom architecture from scratch (no pre-trained MobileNetV4 weights exist on hub),
    # freezing early layers locks them as random initialization noise. We train the full network.
    print("Training custom MobileNetV4 backbone from scratch (all layers unfrozen)...")

    optimizer_g = torch.optim.AdamW(
        list(backbone.parameters()) + list(classifier_head.parameters()),
        lr=args.lr,
        weight_decay=1e-4
    )
    optimizer_d = torch.optim.AdamW(domain_classifier.parameters(), lr=args.lr, weight_decay=1e-4)

    evidential_loss_fn = EvidentialLoss(num_classes=num_classes).to(device)
    domain_loss_fn = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    total_epochs = args.epochs

    for epoch in range(1, total_epochs + 1):
        backbone.train()
        classifier_head.train()
        domain_classifier.train()

        total_loss_cls = 0
        total_loss_dom = 0
        train_correct = 0
        train_total = 0

        len_dataloader = len(train_loader)

        for i, (images, labels, domain_targets) in enumerate(train_loader):
            images, labels, domain_targets = images.to(device), labels.to(device), domain_targets.to(device)

            p = float(i + epoch * len_dataloader) / (total_epochs * len_dataloader)
            alpha_uda = 2. / (1. + math.exp(-10 * p)) - 1

            optimizer_g.zero_grad()
            optimizer_d.zero_grad()

            features = backbone(images)
            logits, evidence = classifier_head(features)
            
            # Evidential classification loss
            loss_edl = evidential_loss_fn(logits, evidence, labels, epoch)
            
            # Auxiliary Cross-Entropy loss to solve gradient vanishing for K=88 classes
            loss_ce = F.cross_entropy(logits, labels)
            
            # Total Classification Loss
            loss_cls = loss_edl + loss_ce

            domain_preds = domain_classifier(features, alpha=alpha_uda)
            loss_dom = domain_loss_fn(domain_preds, domain_targets)

            total_loss = loss_cls + loss_dom
            total_loss.backward()

            optimizer_g.step()
            optimizer_d.step()

            total_loss_cls += loss_cls.item()
            total_loss_dom += loss_dom.item()

            preds = torch.argmax(logits, dim=1)
            train_correct += torch.sum(preds == labels).item()
            train_total += labels.size(0)

            # LIVE TRAINING LOGS: Print stepwise progress metrics continuously
            if (i + 1) % 10 == 0 or (i + 1) == len_dataloader:
                current_acc = (train_correct / train_total) * 100
                print(f"Epoch [{epoch}/{total_epochs}] | Step [{i+1}/{len_dataloader}] | Cls Loss: {loss_cls.item():.4f} | Dom Loss: {loss_dom.item():.4f} | Live Train Acc: {current_acc:.2f}%", flush=True)

        # Validation Step
        backbone.eval()
        classifier_head.eval()
        val_correct = 0
        val_total = 0
        val_loss = 0.0
        total_vacuity = 0.0
        
        with torch.no_grad():
            for val_x, val_y, _ in val_loader:
                val_x, val_y = val_x.to(device), val_y.to(device)
                feats = backbone(val_x)
                val_logits, val_evidence = classifier_head(feats)
                
                # Combine EDL and CE for validation logging consistency
                loss = evidential_loss_fn(val_logits, val_evidence, val_y, epoch) + F.cross_entropy(val_logits, val_y)
                val_loss += loss.item()
                
                preds = torch.argmax(val_logits, dim=1)
                val_correct += torch.sum(preds == val_y).item()
                val_total += val_y.size(0)

                val_alpha = val_evidence + 1
                val_S = torch.sum(val_alpha, dim=1)
                val_u = num_classes / val_S
                total_vacuity += torch.sum(val_u).item()

        train_acc = (train_correct / train_total) * 100 if train_total > 0 else 0.0
        val_acc = (val_correct / val_total) * 100 if val_total > 0 else 0.0
        avg_val_loss = val_loss / len(val_loader)
        avg_vacuity = total_vacuity / val_total if val_total > 0 else 0.0

        print(f"\n==================== Epoch [{epoch}/{total_epochs}] Summary ====================")
        print(f"--> Train Loss Cls : {total_loss_cls/len_dataloader:.4f}")
        print(f"--> Train Loss Dom : {total_loss_dom/len_dataloader:.4f}")
        print(f"--> Final Train Acc: {train_acc:.2f}%")
        print(f"--> Val Loss       : {avg_val_loss:.4f}")
        print(f"--> Val Accuracy   : {val_acc:.2f}%")
        print(f"--> Val Avg Vacuity: {avg_vacuity:.4f}")
        print("========================================================================\n", flush=True)

        local_checkpoint_path = f"mobilenetv4_edge_epoch_{epoch}.pth"
        torch.save({
            'epoch': epoch,
            'backbone_state_dict': backbone.state_dict(),
            'classifier_state_dict': classifier_head.state_dict(),
            'val_acc': val_acc
        }, local_checkpoint_path)

        is_best = val_acc > best_val_acc
        if is_best:
            best_val_acc = val_acc
            print(f"New best validation accuracy: {best_val_acc:.2f}%. Marking for best.pth...")

        upload_checkpoint_to_hf(
            local_path=local_checkpoint_path,
            hf_path=f"mobilenetv4_edge_epoch_{epoch}.pth",
            epoch=epoch,
            is_best=is_best
        )

    # Perform Calibration
    scaler = ConformalTemperatureScaler().to(device)
    t_star = scaler.calibrate(val_loader, backbone, classifier_head, device)

    # Save final calibration configurations to HF
    cal_file = "calibration_config.txt"
    with open(cal_file, "w") as f:
        f.write(f"T_STAR={t_star}\n")
    upload_checkpoint_to_hf(cal_file, "calibration_config.txt", epoch="final", is_best=False)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Adaptive Edge Model Training Script")
    parser.add_argument("--data_dir", type=str, default="/kaggle/input/plant-disease-classification-merged-dataset", help="Dataset directory path")
    parser.add_argument("--epochs", type=str, default="25", help="Number of training epochs")
    parser.add_argument("--batch_size", type=str, default="32", help="Training batch size")
    parser.add_argument("--lr", type=str, default="0.001", help="Optimizer learning rate")
    args, unknown = parser.parse_known_args()

    args.epochs = int(args.epochs)
    args.batch_size = int(args.batch_size)
    args.lr = float(args.lr)

    train_model(args)
