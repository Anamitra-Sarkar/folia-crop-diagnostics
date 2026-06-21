---
language:
- en
license: mit
tags:
- agriculture
- plant-pathology
- mobilenetv4
- evidential-deep-learning
- domain-adaptation
- edge-cloud
metrics:
- accuracy
pipeline_tag: image-classification
model-index:
- name: mobilenetv4_edge_best
  results:
  - task:
      type: image-classification
      name: Image Classification
    dataset:
      name: Plant Disease Classification Merged Dataset
      type: plant-disease-classification-merged-dataset
    metrics:
    - type: accuracy
      value: 92.23
      name: Validation Accuracy
---

# MobileNetV4 Edge Plant Classifier (with EDL & GRL)

This repository hosts the lightweight **Edge Classifier (MobileNetV4-Conv-Medium)** for the *Adaptive Edge-Cloud Plant Disease Diagnosis* framework. The model features:
1. **Evidential Deep Learning (EDL) Head** to calculate epistemic uncertainty (vacuity $u$) in a single forward pass.
2. **Gradient Reversal Layer (GRL) Domain Adaptation** to reconcile lab-to-field domain shifts.
3. **Conformal Temperature Scaling** configuration parameters to provide distribution-free confidence guarantees.

## 1. Mathematical and Framework Documentation
A complete mathematical report detailing the Evidential Deep Learning (EDL), Unsupervised Domain Adaptation (UDA), and Conformal Calibration models is compiled as a PDF and available in this repository:
👉 **[Read the Mathematical Report (PDF)](https://huggingface.co/Arko007/adaptive-edge-plant-model/blob/main/model_report.pdf)**

---

## 2. Model Architecture and Training Details

- **Model Type**: MobileNetV4-Conv-Medium with Evidential Classification Head & Domain Discriminator
- **Number of Classes**: 88 (spanning various crop types including Apple, Tomato, Wheat, Soybean, Sugarcane, Tea, etc.)
- **Optimization Strategy**: Trained from scratch with all layers unfrozen to adapt features to the plant classification domain.
- **Optimizer**: AdamW (Learning Rate: $10^{-3}$, Weight Decay: $10^{-3}$)
- **Loss Function**: Multi-Task Evidential Loss ($\mathcal{L}_{mse} + \lambda_t \mathcal{L}_{kl}$) with auxiliary Cross-Entropy ($\gamma = 0.1$) to prevent gradient vanishing.
- **Domain Adaptation**: Unsupervised Domain Adaptation (UDA) with Gradient Reversal Layer (GRL) mapping source (lab) to target (field) domains.

### Training & Validation Loss Curves
![Edge Loss Curve](https://huggingface.co/Arko007/adaptive-edge-plant-model/resolve/main/edge_loss_curve.png)

### Accuracy & Validation Vacuity Dynamics
![Edge Accuracy Curve](https://huggingface.co/Arko007/adaptive-edge-plant-model/resolve/main/edge_accuracy_curve.png)

---

## 3. Convergence Metrics Summary
The model was trained for 10 epochs on Kaggle GPU environments using a stratified dataset split (30,103 training images, 5,347 validation images):

| Epoch | Train Cls Loss | Train Dom Loss | Train Accuracy (%) | Validation Loss | Validation Accuracy (%) | Val Avg Vacuity ($u$) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | 2.0984 | 0.0245 | 67.60% | 1.5441 | 81.49% | 0.9606 |
| 2 | 1.5398 | 0.0119 | 81.84% | 1.5426 | 82.20% | 0.9557 |
| 3 | 1.4037 | 0.0110 | 85.19% | 1.4969 | 83.47% | 0.9433 |
| 4 | 1.3306 | 0.0118 | 86.85% | 1.2157 | 88.87% | 0.8990 |
| 5 | 1.2750 | 0.0122 | 87.91% | 1.2090 | 88.82% | 0.9011 |
| 6 | 1.2260 | 0.0201 | 88.87% | 1.1313 | 90.27% | 0.8808 |
| 7 | 1.1976 | 0.0199 | 89.49% | 1.0826 | 91.61% | 0.8664 |
| 8 | 1.1430 | 0.0199 | 90.36% | 1.1093 | 90.55% | 0.8598 |
| 9 | **1.1305** | **0.0212** | **90.40%** | **0.9965** | **92.23%** | **0.8219** |
| 10 | 1.1171 | 0.0213 | 90.99% | 1.0341 | 91.97% | 0.8321 |

*Note: The best-performing checkpoint was recorded at Epoch 9 with **92.23% validation accuracy** and the lowest average evidential uncertainty (vacuity = 0.8219).*

---

## 4. Collaborative Gating Mechanism
The Edge classifier is designed to run locally on resource-constrained devices. It makes predictions and computes the epistemic uncertainty (vacuity $u$) in a single forward pass.
- If vacuity exceeds the threshold ($u > 	au_{vac}$) OR maximum calibrated conformal confidence is below the threshold ($p_{max} < 	au_{conf}$), the diagnostic request is offloaded to the heavy cloud model (`ConvNeXt-Large`).
