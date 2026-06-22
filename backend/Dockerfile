# Use lightweight Python base image
FROM python:3.10-slim

# Set environment variables for performance and python defaults
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Establish working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Pre-download cloud model weights
COPY download_model.py .
RUN python3 download_model.py

# Copy application code
COPY . .

# Set up user permissions for Hugging Face space compatibility (runs as user 1000)
RUN useradd -m -u 1000 user && \
    chown -R user:user /app
USER user

# Expose default API port
EXPOSE 7860

# Launch FastAPI app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
