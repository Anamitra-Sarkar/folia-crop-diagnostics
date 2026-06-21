import torch
import torch.nn as nn
import torch.nn.functional as F

# ==========================================
# 1. Gradient Reversal Layer (for UDA)
# ==========================================
class GradientReversal(torch.autograd.Function):
    @staticmethod
    def forward(ctx, x, alpha=1.0):
        ctx.alpha = alpha
        return x.view_as(x)

    @staticmethod
    def backward(ctx, grad_output):
        # Reverse the gradient and scale by alpha
        return grad_output.neg() * ctx.alpha, None

class GradientReversalLayer(nn.Module):
    def __init__(self, alpha=1.0):
        super().__init__()
        self.alpha = alpha

    def forward(self, x):
        return GradientReversal.apply(x, self.alpha)

# ==========================================
# 2. Domain Discriminator (for UDA)
# ==========================================
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
            nn.Linear(128, 2)  # 2 Domains: 0 = Source (Lab), 1 = Target (Field)
        )

    def forward(self, x, alpha=1.0):
        self.grl.alpha = alpha
        x_reversed = self.grl(x)
        return self.net(x_reversed)

# ==========================================
# 3. Squeeze and Excitation Module
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
        w = self.se(x).view(b, c, 1, 1)
        return x * w

# ==========================================
# 4. Universal Inverted Bottleneck (UIB) Block
# ==========================================
class UIBBlock(nn.Module):
    """
    Universal Inverted Bottleneck (UIB) Block as proposed in MobileNetV4.
    Supports flexible combinations of depthwise and pointwise convolutions:
    - Extra depthwise (start_dw)
    - Inverted Bottleneck depthwise (middle_dw)
    - Squeeze and Excitation (SE)
    """
    def __init__(self, in_channels, out_channels, stride, expansion_factor=4, use_se=True, start_dw_kernel=0, middle_dw_kernel=3):
        super().__init__()
        self.use_shortcut = (stride == 1 and in_channels == out_channels)
        hidden_dim = in_channels * expansion_factor

        layers = []
        
        # 1. Optional Start Depthwise Conv (for extraction before expansion)
        if start_dw_kernel > 0:
            layers.append(nn.Conv2d(in_channels, in_channels, start_dw_kernel, padding=start_dw_kernel//2, groups=in_channels, bias=False))
            layers.append(nn.BatchNorm2d(in_channels))
            layers.append(nn.ReLU6())

        # 2. Expansion Pointwise Conv
        if expansion_factor != 1:
            layers.append(nn.Conv2d(in_channels, hidden_dim, 1, bias=False))
            layers.append(nn.BatchNorm2d(hidden_dim))
            layers.append(nn.ReLU6())
        else:
            hidden_dim = in_channels

        # 3. Middle Depthwise Conv
        if middle_dw_kernel > 0:
            layers.append(nn.Conv2d(hidden_dim, hidden_dim, middle_dw_kernel, stride=stride, padding=middle_dw_kernel//2, groups=hidden_dim, bias=False))
            layers.append(nn.BatchNorm2d(hidden_dim))
            layers.append(nn.ReLU6())

        # 4. Squeeze-and-Excitation
        if use_se:
            layers.append(SqueezeExcitation(hidden_dim))

        # 5. Projection Pointwise Conv
        layers.append(nn.Conv2d(hidden_dim, out_channels, 1, bias=False))
        layers.append(nn.BatchNorm2d(out_channels))

        self.conv = nn.Sequential(*layers)

    def forward(self, x):
        if self.use_shortcut:
            return x + self.conv(x)
        else:
            return self.conv(x)

# ==========================================
# 5. MobileNetV4 Conv Medium Backbone
# ==========================================
class MobileNetV4ConvMedium(nn.Module):
    """
    Custom lightweight implementation of MobileNetV4-Conv-Medium backbone.
    """
    def __init__(self, in_channels=3, features_dim=960):
        super().__init__()
        self.features_dim = features_dim

        # Initial Block
        self.init_conv = nn.Sequential(
            nn.Conv2d(in_channels, 32, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU6()
        )

        # UIB Blocks Stages
        self.stages = nn.Sequential(
            # Stage 1
            UIBBlock(32, 48, stride=2, expansion_factor=2, use_se=False),
            # Stage 2
            UIBBlock(48, 80, stride=2, expansion_factor=4, use_se=True),
            UIBBlock(80, 80, stride=1, expansion_factor=4, use_se=True),
            # Stage 3
            UIBBlock(80, 160, stride=2, expansion_factor=4, use_se=True),
            UIBBlock(160, 160, stride=1, expansion_factor=4, use_se=True),
            # Stage 4
            UIBBlock(160, 256, stride=2, expansion_factor=6, use_se=True),
            UIBBlock(256, 256, stride=1, expansion_factor=6, use_se=True),
            # Stage 5
            UIBBlock(256, 512, stride=1, expansion_factor=6, use_se=True),
        )

        # Final Conv
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
        x = torch.flatten(x, 1)
        return x

# ==========================================
# 6. Evidential Head
# ==========================================
class EDLHead(nn.Module):
    def __init__(self, in_features, num_classes):
        super().__init__()
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x):
        logits = self.fc(x)
        # Evidence must be non-negative
        evidence = F.softplus(logits)
        return logits, evidence

# ==========================================
# 7. Evidential Loss (MSE + KL Divergence)
# ==========================================
class EvidentialLoss(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.num_classes = num_classes

    def forward(self, logits, evidence, target, epoch):
        """
        Calculates the Evidential Deep Learning loss.
        - MSE term: fits the Dirichlet parameters to target labels and measures variance.
        - KL divergence term: penalizes false evidence on non-target classes.
        """
        # Convert target to one-hot if it's class indices
        if len(target.shape) == 1 or target.shape[1] == 1:
            target = F.one_hot(target.view(-1), num_classes=self.num_classes).float()

        # Dirichlet parameters
        alpha = evidence + 1
        S = torch.sum(alpha, dim=1, keepdim=True)
        p_hat = alpha / S

        # 1. MSE loss term
        # (y_k - p_hat_k)^2
        err = (target - p_hat) ** 2
        # Variance of Dirichlet: alpha_k * (S - alpha_k) / (S^2 * (S + 1))
        var = alpha * (S - alpha) / (S ** 2 * (S + 1))
        loss_mse = torch.sum(err + var, dim=1)

        # 2. KL Divergence term
        # Reconstruct Dirichlet parameters with target evidence removed: alpha_tilde
        alpha_tilde = target + (1 - target) * alpha
        S_tilde = torch.sum(alpha_tilde, dim=1, keepdim=True)

        # KL(Dir(alpha_tilde) || Dir(1))
        term1 = torch.lgamma(S_tilde) - torch.lgamma(torch.tensor(self.num_classes, dtype=torch.float32, device=logits.device)) - torch.sum(torch.lgamma(alpha_tilde), dim=1, keepdim=True)
        term2 = torch.sum((alpha_tilde - 1) * (torch.digamma(alpha_tilde) - torch.digamma(S_tilde)), dim=1, keepdim=True)
        loss_kl = torch.squeeze(term1 + term2, dim=1)

        # Annealing coefficient lambda_t = min(1.0, epoch / 10)
        lambda_t = min(1.0, epoch / 10.0)

        # Return mean of combined loss
        total_loss = torch.mean(loss_mse + lambda_t * loss_kl)
        return total_loss
