# Use lightweight Python base image
FROM python:3.10-slim

# HuggingFace Space metadata
# app_port: 7860

# Set environment variables for performance and python defaults
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_DIR=/model \
    MODEL_PATH=/model/convnext_large_cloud_best.safetensors

# Establish working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Pre-download cloud model weights to /model directory (to preserve caching and avoid being overwritten by COPY . .)
RUN mkdir -p /model
COPY download_model.py .
RUN python3 download_model.py /model

# Copy application code
COPY . .

# Set up user permissions for Hugging Face space compatibility (runs as user 1000)
RUN useradd -m -u 1000 user && \
    chown -R user:user /app /model
USER user

# Expose default API port
EXPOSE 7860

# Health check so HuggingFace knows the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860/ || exit 1

# Launch FastAPI app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
