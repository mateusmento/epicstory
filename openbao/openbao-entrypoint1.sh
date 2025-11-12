#!/bin/sh
set -euo pipefail

echo "Starting old OpenBao..."

export GOOGLE_APPLICATION_CREDENTIALS="/openbao/secrets/key.json"
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_SKIP_VERIFY=true

vault server -config=/openbao/config/openbao.auto.hcl &
VAULT_PID=$!
echo "OpenBao server started with PID $VAULT_PID"

sleep 10

INIT_STATUS=$(vault status -format=json 2>/dev/null | jq -r '.initialized' 2>/dev/null || echo "false")

if [ "$INIT_STATUS" != "true" ]; then
  vault operator init -format=json > /tmp/init.json
  
  if [ $? -eq 0 ]; then
    ROOT_TOKEN=$(jq -r '.root_token' /tmp/init.json)
    echo "$ROOT_TOKEN" > /openbao/data/root_token
    export VAULT_TOKEN=$ROOT_TOKEN
  else
    echo "Initialization failed!"
    exit 1
  fi
else
  echo "OpenBao is already initialized"

  # Try to get the root token if it exists
  if [ -f /openbao/data/root_token ]; then
    ROOT_TOKEN=$(cat /openbao/data/root_token)
    export VAULT_TOKEN=$ROOT_TOKEN
    echo "Retrieved existing root token"
  fi
fi

echo "Vault status:"
vault status -format=json

# Wait for OpenBao to be unsealed
echo "Waiting for OpenBao to be unsealed..."
for i in $(seq 1 30); do
  if vault status -format=json 2>/dev/null | jq -e '.sealed == false' > /dev/null 2>&1; then
    echo "OpenBao is unsealed!"
    break
  fi
  
  if [ $i -eq 30 ]; then
    echo "Timed out waiting for OpenBao to be unsealed"
    exit 1
  fi
  
  echo "Still waiting for unseal... ($i/30)"
  sleep 5
done

# Configure authentication methods if we have a token
if [ -n "${VAULT_TOKEN:-}" ]; then
  # Create a policy for applications
  echo "Creating application policy..."
  vault policy write app-policy - <<EOF
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "transit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "transit/encrypt/*" {
  capabilities = ["create", "update"]
}

path "transit/decrypt/*" {
  capabilities = ["create", "update"]
}
EOF

  # Check DEV environment variable to determine auth method
  if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
    echo "Development mode detected - configuring token authentication..."
    
    # Create a token with the app-policy and set it to "root"
    echo "Creating token with app-policy..."
    vault token create \
      -id="root" \
      -policy="app-policy" \
      -ttl="0" \
      -renewable=true \
      -display-name="app-root-token" || echo "Token 'root' may already exist"

    echo "Token authentication configured!"
  else
    echo "Production mode detected - configuring Kubernetes authentication..."

    # Enable Kubernetes auth method
    echo "Enabling Kubernetes authentication..."
    vault auth enable kubernetes || echo "Kubernetes auth already enabled"
    
    # Configure Kubernetes auth method
    echo "Configuring Kubernetes auth method..."
    vault write auth/kubernetes/config \
      token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token \
      kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT" \
      kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    
    # Create a role for the application
    echo "Creating Kubernetes auth role..."
    vault write auth/kubernetes/role/app-role \
      bound_service_account_names="openbao-sa" \
      bound_service_account_namespaces="*" \
      policies="app-policy" \
      ttl="24h"

    echo "Kubernetes authentication configured!"
  fi

  # Enable Transit engine for encryption/decryption
  echo "Enabling Transit engine..."
  vault secrets enable transit || echo "Transit engine already enabled"

  # Create an encryption key
  echo "Creating encryption key..."
  vault write -f transit/keys/encryption-key || echo "Encryption key already exists"

  # Enable KV secrets engine
  echo "Enabling KV secrets engine..."
  vault secrets enable -version=2 -path=secret kv || echo "KV secrets engine already enabled"
  
  # Store the root token in a secret for admin access
  vault kv put secret/admin/credentials root_token="$ROOT_TOKEN"

  echo "OpenBao configuration complete!"
else
  echo "No root token available. Authentication setup skipped."
fi

echo "OpenBao is ready!"
echo "UI available at: http://localhost:8200"
echo "API available at: http://localhost:8200/v1/"
echo ""

# Keep the container running
echo "OpenBao setup complete, waiting for server process..."
wait $VAULT_PID
