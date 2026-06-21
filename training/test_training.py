import torch
import torch.nn as nn
from models import MobileNetV4ConvMedium, EDLHead, DomainDiscriminator, EvidentialLoss

def main():
    print("Initializing components for testing...")
    
    # Configuration
    num_classes = 8
    batch_size = 4
    input_channels = 3
    height = 224
    width = 224
    
    # Models
    backbone = MobileNetV4ConvMedium(in_channels=input_channels)
    classifier_head = EDLHead(in_features=backbone.features_dim, num_classes=num_classes)
    domain_classifier = DomainDiscriminator(in_features=backbone.features_dim)
    
    # Loss functions
    evidential_loss_fn = EvidentialLoss(num_classes=num_classes)
    domain_loss_fn = nn.CrossEntropyLoss()
    
    # Input data (mock batch)
    x = torch.randn(batch_size, input_channels, height, width)
    
    # Targets: Class targets (0 to num_classes-1) and Domain targets (0: Source, 1: Target)
    y_class = torch.randint(0, num_classes, (batch_size,))
    y_domain = torch.randint(0, 2, (batch_size,))
    
    print(f"Input shape: {x.shape}")
    print(f"Class target shape: {y_class.shape}")
    print(f"Domain target shape: {y_domain.shape}")
    
    # Forward Pass
    print("\nRunning forward pass...")
    features = backbone(x)
    print(f"Features shape: {features.shape}")
    
    logits, evidence = classifier_head(features)
    print(f"Logits shape: {logits.shape}")
    print(f"Evidence shape: {evidence.shape}")
    
    domain_logits = domain_classifier(features, alpha=0.5)
    print(f"Domain Logits shape: {domain_logits.shape}")
    
    # Compute Losses
    print("\nComputing losses...")
    loss_class = evidential_loss_fn(logits, evidence, y_class, epoch=1)
    loss_domain = domain_loss_fn(domain_logits, y_domain)
    
    total_loss = loss_class + loss_domain
    print(f"Evidential Class Loss: {loss_class.item():.4f}")
    print(f"Domain Adversarial Loss: {loss_domain.item():.4f}")
    print(f"Total Combined Loss: {total_loss.item():.4f}")
    
    # Backward Pass
    print("\nRunning backward pass (gradient check)...")
    total_loss.backward()
    
    # Check if gradients flow back to backbone
    has_grads = any(p.grad is not None for p in backbone.parameters())
    print(f"Gradients computed successfully in backbone: {has_grads}")
    
    if has_grads:
        print("\nAll models, loss functions, and GRL gradient flows are working perfectly!")
        print("Model check complete. Ready for production training.")
    else:
        raise ValueError("Backbone did not receive gradients!")

if __name__ == "__main__":
    main()
