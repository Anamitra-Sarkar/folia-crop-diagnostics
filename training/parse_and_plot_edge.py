import re
import matplotlib.pyplot as plt
import os

LOG_FILE = "/home/anamitra/edge-model-logs.txt"
SAVE_DIR = "/home/anamitra/adaptive-edge-cloud-plant-diagnosis/training"

def parse_logs():
    epochs = []
    train_cls_losses = []
    train_dom_losses = []
    train_accs = []
    val_losses = []
    val_accs = []
    val_vacuities = []
    
    with open(LOG_FILE, "r") as f:
        content = f.read()
        
    # Match epoch summaries
    epoch_blocks = re.findall(
        r"==================== Epoch \[(\d+)/25\] Summary ====================\n"
        r".*?--> Train Loss Cls : ([\d.]+)\n"
        r".*?--> Train Loss Dom : ([\d.]+)\n"
        r".*?--> Final Train Acc: ([\d.]+)%\n"
        r".*?--> Val Loss       : ([\d.]+)\n"
        r".*?--> Val Accuracy   : ([\d.]+)%\n"
        r".*?--> Val Avg Vacuity: ([\d.]+)",
        content,
        re.DOTALL
    )
    
    for epoch_str, t_cls, t_dom, t_acc, v_loss, v_acc, v_vac in epoch_blocks:
        epochs.append(int(epoch_str))
        train_cls_losses.append(float(t_cls))
        train_dom_losses.append(float(t_dom))
        train_accs.append(float(t_acc))
        val_losses.append(float(v_loss))
        val_accs.append(float(v_acc))
        val_vacuities.append(float(v_vac))
        
    # Keep only the last 10 epochs of the final run
    epochs = epochs[-10:]
    train_cls_losses = train_cls_losses[-10:]
    train_dom_losses = train_dom_losses[-10:]
    train_accs = train_accs[-10:]
    val_losses = val_losses[-10:]
    val_accs = val_accs[-10:]
    val_vacuities = val_vacuities[-10:]
        
    print(f"Parsed {len(epochs)} epochs of training data.")
    return epochs, train_cls_losses, train_dom_losses, train_accs, val_losses, val_accs, val_vacuities

def generate_plots(epochs, train_cls_losses, train_dom_losses, train_accs, val_losses, val_accs, val_vacuities):
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.size"] = 11
    plt.rcParams["grid.color"] = "#E2E8F0"
    plt.rcParams["grid.linewidth"] = 0.8
    
    # 1. Plot Loss Curves (Classification Loss and Domain Loss)
    fig, ax = plt.subplots(figsize=(6, 4.5), dpi=300)
    ax.plot(epochs, train_cls_losses, label="Cls Loss (EDL+CE)", color="#EF4444", linewidth=2.5, marker="o")
    ax.plot(epochs, val_losses, label="Val Loss (EDL)", color="#3B82F6", linewidth=2.5, marker="s")
    ax.plot(epochs, train_dom_losses, label="Dom Loss (GRL)", color="#F59E0B", linewidth=2.0, linestyle="--", marker="^")
    
    ax.set_title("Edge Model Multi-Task Loss Convergence", fontsize=13, fontweight="bold", pad=12)
    ax.set_xlabel("Epoch", labelpad=8)
    ax.set_ylabel("Loss Value", labelpad=8)
    ax.grid(True, linestyle="--")
    ax.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#CBD5E1")
    ax.set_xticks(epochs)
    
    for spine in ["top", "right"]:
        ax.spines[spine].set_visible(False)
    for spine in ["left", "bottom"]:
        ax.spines[spine].set_color("#94A3B8")
        
    plt.tight_layout()
    loss_path = os.path.join(SAVE_DIR, "edge_loss_curve.png")
    plt.savefig(loss_path, bbox_inches="tight")
    plt.close()
    print(f"Saved edge loss curve to {loss_path}")
    
    # 2. Plot Accuracy and Vacuity Curves
    fig, ax1 = plt.subplots(figsize=(6, 4.5), dpi=300)
    
    color = "#10B981"
    ax1.set_xlabel("Epoch", labelpad=8)
    ax1.set_ylabel("Accuracy (%)", color=color, labelpad=8)
    line1 = ax1.plot(epochs, train_accs, label="Train Accuracy", color=color, linewidth=2.5, marker="o")
    line2 = ax1.plot(epochs, val_accs, label="Val Accuracy", color="#3B82F6", linewidth=2.5, marker="s")
    ax1.tick_params(axis='y', labelcolor=color)
    ax1.grid(True, linestyle="--")
    
    # Instantiate a second axes that shares the same x-axis
    ax2 = ax1.twinx()  
    color = "#8B5CF6"
    ax2.set_ylabel("Validation Vacuity (u)", color=color, labelpad=8)
    line3 = ax2.plot(epochs, val_vacuities, label="Val Vacuity (u)", color=color, linewidth=2.0, linestyle="-.", marker="d")
    ax2.tick_params(axis='y', labelcolor=color)
    
    # Add legends together
    lines = line1 + line2 + line3
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, frameon=True, facecolor="#F8FAFC", edgecolor="#CBD5E1", loc="lower left")
    
    ax1.set_xticks(epochs)
    ax1.set_title("Edge Model Accuracy & Vacuity Dynamics", fontsize=13, fontweight="bold", pad=12)
    
    for ax in [ax1, ax2]:
        for spine in ["top"]:
            ax.spines[spine].set_visible(False)
        for spine in ["left", "bottom", "right"]:
            ax.spines[spine].set_color("#94A3B8")
            
    plt.tight_layout()
    acc_path = os.path.join(SAVE_DIR, "edge_accuracy_curve.png")
    plt.savefig(acc_path, bbox_inches="tight")
    plt.close()
    print(f"Saved edge accuracy curve to {acc_path}")

if __name__ == "__main__":
    epochs, train_cls_losses, train_dom_losses, train_accs, val_losses, val_accs, val_vacuities = parse_logs()
    
    print("\n--- Edge Epoch Summary ---")
    for i in range(len(epochs)):
        print(f"Epoch {epochs[i]:02d} | Train Cls Loss: {train_cls_losses[i]:.4f} | Dom Loss: {train_dom_losses[i]:.4f} | Train Acc: {train_accs[i]:.2f}% | Val Loss: {val_losses[i]:.4f} | Val Acc: {val_accs[i]:.2f}% | Vacuity: {val_vacuities[i]:.4f}")
    print("---------------------------\n")
    
    if len(epochs) > 0:
        generate_plots(epochs, train_cls_losses, train_dom_losses, train_accs, val_losses, val_accs, val_vacuities)
    else:
        print("Error: No data found to plot!")
