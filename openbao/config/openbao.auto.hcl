storage "file" {
  path = "/openbao/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

ui = true

log_level = "info"

seal "gcpckms" {
  project     = "frenos-389613"
  region      = "us-central1"
  key_ring    = "openbao-ring"
  crypto_key  = "openbao-key"
  credentials = "/openbao/cloud-kms-secrets/key.json"
}
