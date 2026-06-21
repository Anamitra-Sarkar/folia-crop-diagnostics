import re
import matplotlib.pyplot as plt
import os

LOG_FILE = "/home/anamitra/cloud-model-logs.txt"
SAVE_DIR = "/home/anamitra/adaptive-edge-cloud-plant-diagnosis/training"

def parse_logs():
    epochs = []
    train_losses = []
    train_accs = []
    val_losses = []
    val_accs = []
    
    with open(LOG_FILE, "r") as f:
        content = f.read()
        
    # Match epoch summaries
    epoch_blocks = re.findall(
        r"==================== Epoch \[(\d+)/\d+\] Summary ====================\n"
        r".*?--> Train Loss    : ([\d.]+)\n"
        r".*?--> Final Train Acc: ([\d.]+)%\n"
        r".*?--> Val Loss      : ([\d.]+)\n"
        r".*?--> Val Accuracy  : ([\d.]+)%",
        content,
        re.DOTALL
    )
    
    for epoch_str, t_loss, t_acc, v_loss, v_acc in epoch_blocks:
        epochs.append(int(epoch_str))
        train_losses.append(float(t_loss))
        train_accs.append(float(t_acc))
        val_losses.append(float(v_loss))
        val_accs.append(float(v_acc))
        
    print(f"Parsed {len(epochs)} epochs of training data.")
    return epochs, train_losses, train_accs, val_losses, val_accs

def generate_plots(epochs, train_losses, train_accs, val_losses, val_accs):
    # Set professional style parameters
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.size"] = 11
    plt.rcParams["grid.color"] = "#E2E8F0"
    plt.rcParams["grid.linewidth"] = 0.8
    
    # 1. Plot Loss Curves
    fig, ax = plt.subplots(figsize=(6, 4.5), dpi=300)
    ax.plot(epochs, train_losses, label="Training Loss", color="#EF4444", linewidth=2.5, marker="o")
    ax.plot(epochs, val_losses, label="Validation Loss", color="#3B82F6", linewidth=2.5, marker="s")
    
    ax.set_title("ConvNeXt-Large Loss Convergence", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Epoch", labelpad=8)
    ax.set_ylabel("Cross Entropy Loss", labelpad=8)
    ax.grid(True, linestyle="--")
    ax.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#CBD5E1")
    ax.set_xticks(epochs)
    
    # Border styling
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    for spine in ["left", "bottom"]:
        ax.spines[spine].set_color("#94A3B8")
        
    plt.tight_layout()
    loss_path = os.path.join(SAVE_DIR, "loss_curve.png")
    plt.savefig(loss_path, bbox_inches="tight")
    plt.close()
    print(f"Saved loss curve to {loss_path}")
    
    # 2. Plot Accuracy Curves
    fig, ax = plt.subplots(figsize=(6, 4.5), dpi=300)
    ax.plot(epochs, train_accs, label="Training Accuracy", color="#10B981", linewidth=2.5, marker="o")
    ax.plot(epochs, val_accs, label="Validation Accuracy", color="#3B82F6", linewidth=2.5, marker="s")
    
    ax.set_title("ConvNeXt-Large Accuracy Curve", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Epoch", labelpad=8)
    ax.set_ylabel("Accuracy (%)", labelpad=8)
    ax.grid(True, linestyle="--")
    ax.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#CBD5E1", loc="lower right")
    ax.set_xticks(epochs)
    
    # Border styling
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    for spine in ["left", "bottom"]:
        ax.spines[spine].set_color("#94A3B8")
        
    plt.tight_layout()
    acc_path = os.path.join(SAVE_DIR, "accuracy_curve.png")
    plt.savefig(acc_path, bbox_inches="tight")
    plt.close()
    print(f"Saved accuracy curve to {acc_path}")

if __name__ == "__main__":
    epochs, train_losses, train_accs, val_losses, val_accs = parse_logs()
    if len(epochs) > 0:
        generate_plots(epochs, train_losses, train_accs, val_losses, val_accs)
    else:
        print("Error: No data found to plot!")
