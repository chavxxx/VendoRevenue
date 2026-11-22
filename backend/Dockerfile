FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for psycopg2, openpyxl, reportlab
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt email-validator psycopg2-binary

# Copy application source
COPY . .

# Create uploads directories
RUN mkdir -p /app/uploads/signatures /app/uploads/harvests /app/uploads/receipts

EXPOSE 8000

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
