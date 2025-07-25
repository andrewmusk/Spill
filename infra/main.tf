terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "${var.project_id}-tf-state"   # create this bucket once
    prefix = "state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ----------------------------
#  Storage bucket for media
# ----------------------------
resource "google_storage_bucket" "media" {
  name                         = "${var.project_id}-media"
  location                     = var.region
  uniform_bucket_level_access  = true
  lifecycle_rule {
    condition { age = 30 }
    action    { type = "Delete" }
  }
}

# ----------------------------
#  Secret holding DB password
# ----------------------------
resource "google_secret_manager_secret" "db_password" {
  secret_id   = "db-pass"
  replication { automatic = true }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# ----------------------------
#  Service account for backend
# ----------------------------
resource "google_service_account" "backend" {
  account_id   = "backend-sa"
  display_name = "Backend runtime"
}

resource "google_project_iam_member" "sa_sql_client" {
  role   = "roles/cloudsql.client"
  member = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "sa_secret_accessor" {
  role   = "roles/secretmanager.secretAccessor"
  member = "serviceAccount:${google_service_account.backend.email}"
}

# ----------------------------
#  Artifact Registry repo
# ----------------------------
resource "google_artifact_registry_repository" "containers" {
  location       = var.region
  repository_id  = "containers"
  format         = "DOCKER"
  description    = "Container images for Spill"
}

# ----------------------------
#  Cloud SQL – PostgreSQL 15
# ----------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "spill-postgres"
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = "db-f1-micro"
    ip_configuration {
      ipv4_enabled    = false         # use Cloud Run socket
    }
    deletion_protection_enabled = false
  }
}

resource "google_sql_database" "app" {
  name     = "spill"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = "spill_app"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ----------------------------
#  Cloud Run service
# ----------------------------
resource "google_cloud_run_service" "backend" {
  name     = "backend-api"
  location = var.region

  template {
    spec {
      containers {
        image = var.backend_image

        env {
          name  = "INSTANCE_CONNECTION_NAME"
          value = google_sql_database_instance.postgres.connection_name
        }
        env {
          name  = "DB_USER"
          value = google_sql_user.app_user.name
        }
        env {
          name  = "DB_NAME"
          value = google_sql_database.app.name
        }
        env {
          name = "DB_PASS"
          value_source {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }
      }
      service_account_name = google_service_account.backend.email
    }
  }

  metadata {
    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.postgres.connection_name
    }
  }

  traffics {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_iam_member.sa_sql_client,
    google_project_iam_member.sa_secret_accessor
  ]
}

output "cloud_run_url" {
  description = "Public URL of the backend service"
  value       = google_cloud_run_service.backend.status[0].url
}