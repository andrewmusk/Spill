mkdir -p spill/{app/backend-api,infra,scripts}

# Create backend API files
cat > spill/app/backend-api/main.py <<EOF
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({"message": "Spill backend is alive!"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
EOF

cat > spill/app/backend-api/requirements.txt <<EOF
flask==2.3.2
EOF

cat > spill/app/backend-api/Dockerfile <<EOF
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["python", "main.py"]
EOF

# Create Terraform files
cat > spill/infra/main.tf <<EOF
provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "media" {
  name     = "\${var.project_id}-media"
  location = var.region
  uniform_bucket_level_access = true
}

resource "google_firestore_database" "default" {
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

resource "google_cloud_run_service" "backend" {
  name     = "backend-api"
  location = var.region

  template {
    spec {
      containers {
        image = var.backend_image
      }
    }
  }

  traffics {
    percent         = 100
    latest_revision = true
  }
}
EOF

cat > spill/infra/variables.tf <<EOF
variable "project_id" {}
variable "region" {
  default = "us-central1"
}
variable "backend_image" {}
EOF

cat > spill/infra/terraform.tfvars <<EOF
project_id    = "spill-prod-56049a"
backend_image = "us-central1-docker.pkg.dev/spill-prod-56049a/containers/backend:0.1"
EOF

# Create deploy script
cat > spill/scripts/deploy_backend.sh <<EOF
#!/bin/bash

PROJECT_ID="spill-prod-56049a"
REGION="us-central1"
IMAGE="us-central1-docker.pkg.dev/\$PROJECT_ID/containers/backend:0.1"

gcloud builds submit app/backend-api --tag \$IMAGE

gcloud run deploy backend-api \\
  --image=\$IMAGE \\
  --region=\$REGION \\
  --allow-unauthenticated \\
  --min-instances=0
EOF

chmod +x spill/scripts/deploy_backend.sh

# Create .gitignore
cat > spill/.gitignore <<EOF
# Terraform
*.tfstate
*.tfstate.*
.terraform/

# Python
__pycache__/
.env

# Node/Frontend (if added later)
node_modules/
dist/
EOF
