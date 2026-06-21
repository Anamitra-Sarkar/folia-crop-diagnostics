---
language:
- en
license: mit
tags:
- agriculture
- plant-pathology
- convnext
- deep-learning
- edge-cloud
metrics:
- accuracy
pipeline_tag: image-classification
model-index:
- name: convnext_large_cloud_best
  results:
  - task:
      type: image-classification
      name: Image Classification
    dataset:
      name: Plant Disease Classification Merged Dataset
      type: plant-disease-classification-merged-dataset
    metrics:
    - type: accuracy
      value: 96.42
      name: Validation Accuracy
---

# ConvNeXt-Large Cloud Plant Disease Diagnostician

This repository hosts the high-capacity **Cloud Classifier (ConvNeXt-Large)** for the *Adaptive Edge-Cloud Plant Disease Diagnosis* framework. The model is dynamically queried by edge nodes running `MobileNetV4-EDL` when classification confidence is low or uncertainty is high.

## 1. Mathematical and Framework Documentation
A complete mathematical report detailing the Evidential Deep Learning (EDL), Unsupervised Domain Adaptation (UDA), and Conformal Calibration models is compiled as a PDF and available in this repository:
👉 **[Read the Mathematical Report (PDF)](https://huggingface.co/Arko007/adaptive-cloud-plant-model/blob/main/model_report.pdf)**

---

## 2. Model Architecture and Training Details

- **Model Type**: ConvNeXt-Large
- **Number of Classes**: 88 (spanning various crop types including Apple, Tomato, Wheat, Soybean, Sugarcane, Tea, etc.)
- **Resolution**: $384 	imes 384$ pixels
- **Optimization Strategy**: Stages 1-3 of the backbone were frozen to optimize GPU efficiency.
- **Optimizer**: AdamW (Learning Rate: $10^{-4}$, Weight Decay: $10^{-3}$)
- **Loss Function**: Categorical Cross-Entropy

### Training & Validation Loss Curves
![Loss Curve](https://huggingface.co/Arko007/adaptive-cloud-plant-model/resolve/main/loss_curve.png)

### Training & Validation Accuracy Curves
![Accuracy Curve](https://huggingface.co/Arko007/adaptive-cloud-plant-model/resolve/main/accuracy_curve.png)

---

## 3. Convergence Metrics Summary
The model was trained for 7 epochs on Kaggle GPU environments using a stratified dataset split (30,103 training images, 5,347 validation images):

| Epoch | Training Loss | Training Accuracy (%) | Validation Loss | Validation Accuracy (%) |
|:---:|:---:|:---:|:---:|:---:|
| 1 | 0.6872 | 82.83% | 0.1986 | 93.44% |
| 2 | 0.2168 | 93.04% | 0.1420 | 95.05% |
| 3 | 0.1629 | 94.61% | 0.1330 | 95.37% |
| 4 | 0.1394 | 95.45% | 0.1153 | 95.80% |
| 5 | 0.1235 | 95.83% | 0.1167 | 96.08% |
| 6 | 0.1104 | 96.24% | 0.1152 | 95.84% |
| 7 | **0.1039** | **96.47%** | **0.1028** | **96.42%** |

*Note: Checkpoints for all epochs, including the best-performing `convnext_large_cloud_best.pth`, are stored directly in the Hugging Face model repository.*

---

## 4. Collaborative Gating Mechanism
The Cloud model acts as a secondary diagnostician in the cooperative pipeline. The lightweight edge node decides whether to query this model by checking:
1. **Evidential Vacuity Threshold ($u > \tau_{vac}$)**: Triggers if the leaf image has out-of-distribution patterns or high epistemic uncertainty.
2. **Conformal Confidence Threshold ($p_{max} < \tau_{conf}$)**: Triggers if the calibrated categorical prediction confidence is low.
