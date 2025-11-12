storage "file" {
  path = "/openbao/data"
}

seal "awskms" {
  region     = "<AWS_REGION>"
  kms_key_id = "<KMS_KEY_ID>"
}

listener "tcp" {
  address     = "0.0.0.0:3002"
  tls_disable = 1
}

disable_mlock = true
