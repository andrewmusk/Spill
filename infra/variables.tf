variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "backend_image" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}