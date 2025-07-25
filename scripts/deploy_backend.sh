#!/bin/bash
# scripts/build_backend.sh   (build-only)

PROJECT_ID="spill-prod-56049a"
IMAGE="us-central1-docker.pkg.dev/$PROJECT_ID/containers/backend:$(git rev-parse --short HEAD)"

gcloud builds submit spill/app/backend-api --tag "$IMAGE"

# Update the image in terraform.tfvars (or via TF var override) and:
cd spill/infra
terraform apply -var="backend_image=$IMAGE"
