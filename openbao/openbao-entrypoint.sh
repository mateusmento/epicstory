#!/bin/sh
set -o pipefail

function is_openbao_initialized() {
  INITIALIZED=$(vault status 2>/dev/null | jq -r '.initialized // "false"' 2>/dev/null)
  if [ "$INITIALIZED" = "true" ]; then
    return 0
  fi
  return 1
}

function is_migration_required() {
  MIGRATION_REQUIRED=$(vault status 2>/dev/null | jq -r '.migration // "false"' 2>/dev/null)
  echo $MIGRATION_REQUIRED
  if [ "$MIGRATION_REQUIRED" = "true" ]; then
    return 0
  fi
  return 1
}

function is_openbao_sealed() {
  SEALED=$(vault status | jq -r '.sealed // "false"')
  if [ "$SEALED" = "true" ]; then
    return 0
  fi
  return 1
}

function get_seal_type() {
  RECOVERY_SEAL=$(vault status 2>/dev/null | jq -r '.recovery_seal // "false"' 2>/dev/null)
  if [ "$RECOVERY_SEAL" = "true" ]; then
    echo "auto"
    return 0
  fi
  if [ "$RECOVERY_SEAL" = "false" ]; then
    echo "manual"
    return 0
  fi
  echo ""
  return 1
}

function get_root_token() {
  if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
    if [ -f $OPENBAO_SECRETS_PATH/root_token ]; then
      ROOT_TOKEN=$(cat $OPENBAO_SECRETS_PATH/root_token)
      echo $ROOT_TOKEN
    fi
  else
    ROOT_TOKEN_B64=$(kubectl get secret openbao-secrets -n $K8S_NAMESPACE -o jsonpath='{.data.root_token}' 2>/dev/null || echo "")
    if [ -n "$ROOT_TOKEN_B64" ]; then
      ROOT_TOKEN=$(echo "$ROOT_TOKEN_B64" | base64 -d)
      echo $ROOT_TOKEN
    fi
  fi
}

function initialize_with_cloud_kms() {
  echo "Initializing with Cloud KMS auto-unseal..."
  INIT_OUTPUT=$(vault operator init -recovery-shares=1 -recovery-threshold=1)

  if [ $? -eq 0 ]; then
    ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')
    RECOVERY_KEY=$(echo "$INIT_OUTPUT" | jq -r '.recovery_keys_b64[0]')

    if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
      echo "Storing recovery key locally for fallback..."
      echo "$RECOVERY_KEY" > $OPENBAO_SECRETS_PATH/recovery.key
      echo "$ROOT_TOKEN" > $OPENBAO_SECRETS_PATH/root_token
      chmod 600 $OPENBAO_SECRETS_PATH/recovery.key
      chmod 600 $OPENBAO_SECRETS_PATH/root_token
    else
      echo "Storing recovery key in Kubernetes secrets for fallback..."
      kubectl patch secret openbao-secrets \
        -n $K8S_NAMESPACE \
        -p "{\"data\":{\"recovery_key\":\"$(echo -n "$RECOVERY_KEY" | base64 -w 0)\",\"root_token\":\"$(echo -n "$ROOT_TOKEN" | base64 -w 0)\"}}" \
        --type=merge
    fi

    echo "OpenBao initialized with Cloud KMS auto-unseal"
    echo "Recovery key stored for offline fallback"
  else
    echo "Cloud KMS initialization failed, falling back to Shamir..."
    return 1
  fi

  return 0
}

function initialize_with_shamir() {
  echo "Initializing with Shamir seal..."
  INIT_OUTPUT=$(vault operator init -key-shares=1 -key-threshold=1)

  if [ $? -eq 0 ]; then
    ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')
    UNSEAL_KEY=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')

    if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
      echo "Storing unseal key locally..."
      echo "$UNSEAL_KEY" > $OPENBAO_SECRETS_PATH/unseal.key
      echo "$ROOT_TOKEN" > $OPENBAO_SECRETS_PATH/root_token
      chmod 600 $OPENBAO_SECRETS_PATH/unseal.key
      chmod 600 $OPENBAO_SECRETS_PATH/root_token
    else
      echo "Storing unseal key in Kubernetes secrets..."
      kubectl patch secret openbao-secrets \
        -n $K8S_NAMESPACE \
        -p "{\"data\":{\"unseal_key\":\"$(echo -n "$UNSEAL_KEY" | base64 -w 0)\",\"root_token\":\"$(echo -n "$ROOT_TOKEN" | base64 -w 0)\"}}" \
        --type=merge
    fi

    echo "OpenBao initialized with Shamir seal"
  else
    echo "Initialization failed!"
    exit 1
  fi
}

function get_recovery_key() {
  if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
    if [ -f $OPENBAO_SECRETS_PATH/recovery.key ]; then
      echo "$(cat $OPENBAO_SECRETS_PATH/recovery.key)"
    fi
  else
    RECOVERY_KEY_B64=$(kubectl get secret openbao-secrets -n $K8S_NAMESPACE -o jsonpath='{.data.recovery_key}' 2>/dev/null || echo "")
    if [ -n "$RECOVERY_KEY_B64" ]; then
      echo "$(echo "$RECOVERY_KEY_B64" | base64 -d)"
    fi
  fi
}

function unseal_with_recovery_keys() {
  local RECOVERY_KEY=$(get_recovery_key)
  if [ -z "$RECOVERY_KEY" ]; then
    echo "No recovery keys found for unseal with Cloud KMS auto-unseal"
    return 1
  fi

  local MIGRATION_REQUIRED=$(is_migration_required)
  unseal_openbao "$RECOVERY_KEY" "$MIGRATION_REQUIRED"
  echo "Openbao is unsealed with recovery keys"

  if [ "$MIGRATION_REQUIRED" = "true" ]; then
    migrate_keys
  fi
}

function unseal_openbao() {
  local UNSEAL_KEY=$1
  local MIGRATION_REQUIRED=$2

  if [ "$MIGRATION_REQUIRED" = "true" ]; then
    echo "Migration required, unsealing with migration..."
    vault operator unseal -migrate "$UNSEAL_KEY"
  else
    vault operator unseal "$UNSEAL_KEY"
  fi
}

function migrate_keys() {
  local SEAL_TYPE=$(get_seal_type)
  if [ "$SEAL_TYPE" = "auto" ]; then
    migrate_to_recovery_keys
  fi
  if [ "$SEAL_TYPE" = "manual" ]; then
    migrate_to_shamir_keys
  fi
}

function migrate_to_shamir_keys() {
  echo "Generating new Shamir unseal keys for future use..."

  REKEY_START=$(vault operator rekey -init -key-shares=1 -key-threshold=1 -format=json 2>&1)

  if [ $? -eq 0 ]; then
    echo "Rekey operation started"

    NONCE=$(echo "$REKEY_START" | jq -r '.nonce // ""')

    if [ -n "$NONCE" ]; then
      echo "Rekey nonce: $NONCE"

      echo "Completing rekey operation..."
      local RECOVERY_KEY=$(get_recovery_key)
      NEW_KEYS_OUTPUT=$(echo $RECOVERY_KEY | vault operator rekey -nonce="$NONCE" -format=json - 2>&1)

      if [ $? -eq 0 ]; then
        echo "New Shamir unseal keys generated"

        NEW_KEY=$(echo "$NEW_KEYS_OUTPUT" | jq -r '.keys_base64[0] // ""')

        if [ -n "$NEW_KEY" ]; then
          if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
            echo "$NEW_KEY" > $OPENBAO_SECRETS_PATH/unseal.key
            chmod 600 $OPENBAO_SECRETS_PATH/unseal.key
            echo "New Shamir unseal key saved to $OPENBAO_SECRETS_PATH/unseal.key"
          else
            kubectl patch secret openbao-secrets \
              -n $K8S_NAMESPACE \
              -p "{\"data\":{\"unseal_key\":\"$(echo -n "$NEW_KEY" | base64 -w 0)\"}}" \
              --type=merge
            echo "New Shamir unseal key saved to Kubernetes secrets"
          fi
        else
          echo "Warning: Could not extract new Shamir unseal key from JSON output"
          return 1
        fi
      else
        echo "Failed to complete rekey operation"
        return 1
      fi
    else
      echo "Failed to extract nonce from rekey start"
      return 1
    fi
  else
    echo "Failed to start rekey operation"
    return 1
  fi
}

function get_unseal_key() {
  if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
    if [ -f $OPENBAO_SECRETS_PATH/unseal.key ]; then
      echo "$(cat $OPENBAO_SECRETS_PATH/unseal.key 2> /dev/null)"
    fi
  else
    UNSEAL_KEY_B64=$(kubectl get secret openbao-secrets -n $K8S_NAMESPACE -o jsonpath='{.data.unseal_key}' 2>/dev/null || echo "")
    if [ -n "$UNSEAL_KEY_B64" ]; then
      echo "$(echo "$UNSEAL_KEY_B64" | base64 -d)"
    fi
  fi
}

function unseal_with_shamir_keys() {
  UNSEAL_KEY=$(get_unseal_key)
  if [ -z "$UNSEAL_KEY" ]; then
    echo "No shamir keys found for manual unseal"
    return 1
  fi

  local MIGRATION_REQUIRED=$(is_migration_required)

  if [ "$MIGRATION_REQUIRED" = "true" ]; then
    echo "Migration required, unsealing with migration..."
    vault operator unseal -migrate "$UNSEAL_KEY"
  else
    vault operator unseal "$UNSEAL_KEY"
  fi

  echo "Openbao is unsealed with shamir keys"

  if [ "$MIGRATION_REQUIRED" = "true" ]; then
    migrate_to_recovery_keys
  fi
}

function migrate_to_recovery_keys() {
  echo "Generating new recovery keys for future use..."

  REKEY_START=$(vault operator rekey -target=recovery -init -key-shares=1 -key-threshold=1 2>&1)

  if [ $? -eq 0 ]; then
    echo "Rekey operation started"

    NONCE=$(echo "$REKEY_START" | jq -r '.nonce // ""')

    if [ -n "$NONCE" ]; then
      echo "Rekey nonce: $NONCE"

      echo "Completing rekey operation..."
      local UNSEAL_KEY=$(get_unseal_key)
      NEW_KEYS_OUTPUT=$(echo $UNSEAL_KEY | vault operator rekey -target=recovery -nonce="$NONCE" -format=json - 2>&1)

      if [ $? -eq 0 ]; then
        echo "New recovery keys generated"

        NEW_KEY=$(echo "$NEW_KEYS_OUTPUT" | jq -r '.keys_base64[0] // ""')

        if [ -n "$NEW_KEY" ]; then
          if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
            echo "$NEW_KEY" > $OPENBAO_SECRETS_PATH/recovery.key
            chmod 600 $OPENBAO_SECRETS_PATH/recovery.key
            echo "New recovery key saved to $OPENBAO_SECRETS_PATH/recovery.key"
          else
            kubectl patch secret openbao-secrets \
              -n $K8S_NAMESPACE \
              -p "{\"data\":{\"recovery_key\":\"$(echo -n "$NEW_KEY" | base64 -w 0)\"}}" \
              --type=merge
            echo "New recovery key saved to Kubernetes secrets"
          fi
        else
          echo "Warning: Could not extract new recovery key from JSON output"
          return 1
        fi
      else
        echo "Failed to complete rekey operation"
        return 1
      fi
    else
      echo "Failed to extract nonce from rekey start"
      return 1
    fi
  else
    echo "Failed to start rekey operation"
    return 1
  fi
}

function wait_for_unseal_openbao() {
  for i in $(seq 1 15); do
    if vault status 2>/dev/null | jq -e '.sealed == false' > /dev/null 2>&1; then
      echo "OpenBao is unsealed!"
      break
    fi

    if [ $i -eq 15 ]; then
      echo "Timed out waiting for OpenBao to be unsealed"
      exit 1
    fi

    echo "Still waiting for unseal... ($i/15)"
    sleep 2
  done
}

function configure_authentication() {
  echo "Configuring authentication..."

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
}

function enable_openbao_configuration() {
  echo "Enabling OpenBao configuration..."

  # Enable Transit engine for encryption/decryption
  echo "Enabling Transit engine..."
  vault secrets enable transit || echo "Transit engine already enabled"

  # Create an encryption key
  echo "Creating encryption key..."
  vault write -f transit/keys/encryption-key exportable=true || echo "Encryption key already exists"

  # Enable KV secrets engine
  echo "Enabling KV secrets engine..."
  vault secrets enable -version=2 -path=secret kv || echo "KV secrets engine already enabled"

  # Store the root token in a secret for admin access
  # vault kv put secret/admin/credentials root_token="$ROOT_TOKEN"
}

function start_openbao() {
  echo "Starting OpenBao server..."

  local OPENBAO_CONFIG=$1
  vault server -config="$OPENBAO_CONFIG" -log-level=debug &
  export VAULT_PID=$!

  sleep 5

  echo "OpenBao server process started with PID: $VAULT_PID"

  # Check for any immediate error output from the server
  sleep 1
  if ! kill -0 $VAULT_PID 2>/dev/null; then
    echo "Error: OpenBao server process died immediately after start"
    exit 1
  fi

  echo "Checking initialization status..."

  SEAL_TYPE=$(get_seal_type)

  if ! is_openbao_initialized; then
    echo "OpenBao not initialized, running initialization..."

    if [ "$SEAL_TYPE" = "auto" ]; then
      initialize_with_cloud_kms
    fi

    if [ "$SEAL_TYPE" = "manual" ]; then
      initialize_with_shamir
    fi
  else
    echo "OpenBao is initialized, skipping initialization..."
  fi

  # Wait a bit for Cloud KMS auto-unseal to work
  if [ "$SEAL_TYPE" = "auto" ] && ! is_migration_required; then
    echo "Waiting for Cloud KMS auto-unseal to be ready..."
    wait_for_unseal_openbao
  fi

  if is_openbao_sealed; then
    echo "OpenBao is sealed, attempting to unseal..."
    if [ "$SEAL_TYPE" = "auto" ]; then
      if is_migration_required; then
        echo "Cloud KMS auto-unseal enabled but requires migration..."
        unseal_with_shamir_keys
      else
        echo "Cloud KMS auto-unseal failed, trying to unseal with recovery keys..."
        unseal_with_recovery_keys
      fi
    fi
    if [ "$SEAL_TYPE" = "manual" ]; then
      if is_migration_required; then
        echo "Migrating to manual unseal, unsealing with recovery keys..."
        unseal_with_recovery_keys
      else
        echo "Unsealing with shamir keys..."
        unseal_with_shamir_keys
      fi
    fi
  fi

  echo "Waiting for OpenBao to be unsealed..."
  wait_for_unseal_openbao

  # Configure authentication methods if we have a token
  echo "Retrieving stored root token..."
  export VAULT_TOKEN=$(get_root_token)
  if [ -z "${VAULT_TOKEN:-}" ]; then
    echo "No root token available. Authentication setup skipped."
    exit 1
  fi

  configure_authentication
  enable_openbao_configuration

  echo "OpenBao configuration complete!"
}

##########################################################
##### Main Script

export GOOGLE_APPLICATION_CREDENTIALS="/openbao/cloud-kms-secrets/key.json"
export BAO_API_ADDR="http://127.0.0.1:8200"
export VAULT_ADDR="http://127.0.0.1:8200"
export VAULT_SKIP_VERIFY=true
export VAULT_FORMAT="json"

export OPENBAO_DATA_PATH="/openbao/data"
export OPENBAO_SECRETS_PATH="/openbao/secrets"

export OPENBAO_CONFIG_FILE="/openbao/config/openbao.hcl"
export OPENBAO_CONFIG_FILE_AUTO="/openbao/config/openbao.auto.hcl"
export OPENBAO_CONFIG_FILE_MANUAL="/openbao/config/openbao.manual.hcl"

mkdir -p $OPENBAO_SECRETS_PATH

export K8S_NAMESPACE=${K8S_NAMESPACE:-"default"}
echo "using k8s namespace: $K8S_NAMESPACE"

# Function to cleanup on exit
cleanup() {
  if [ -n "${VAULT_PID:-}" ]; then
    echo "Cleaning up OpenBao server process..."
    kill $VAULT_PID 2>/dev/null || true
  fi
}

# Set trap to cleanup on script exit
trap cleanup EXIT

function get_migration_version() {
  if [ -f /openbao/data/migration_version ]; then
    echo $(cat /openbao/data/migration_version)
    return 0
  fi
  echo "0"
}

if ! [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
  if ! kubectl get secret openbao-secrets -n $K8S_NAMESPACE >/dev/null 2>&1; then
    echo "Creating openbao-secrets secret..."
    kubectl create secret generic openbao-secrets \
      -n $K8S_NAMESPACE \
      --from-literal=unseal_key="" \
      --from-literal=recovery_key="" \
      --from-literal=root_token=""
    echo "openbao-secrets secret created"
  else
    echo "openbao-secrets secret already exists"
  fi
fi

if [ $(get_migration_version) -eq 0 ]; then
  echo "Migrating from auto-unsealed OpenBao to manual-unsealed OpenBao..."

  if [ -f /openbao/data/root_token ]; then
    ROOT_TOKEN=$(cat /openbao/data/root_token)

    if [ -n "${LOCAL_DEVELOPMENT:-}" ]; then
      echo "Storing unseal key locally..."
      echo -n "$ROOT_TOKEN" > $OPENBAO_SECRETS_PATH/root_token
      chmod 600 $OPENBAO_SECRETS_PATH/root_token
    else
      echo "Storing unseal key in Kubernetes secrets..."
      kubectl patch secret openbao-secrets \
        -n $K8S_NAMESPACE \
        -p "{\"data\":{\"root_token\":\"$(echo -n "$ROOT_TOKEN" | base64 -w 0)\"}}" \
        --type=merge
    fi
  fi


  start_openbao "$OPENBAO_CONFIG_FILE_AUTO"
  echo "Exporting secrets from auto-unsealed OpenBao..."
  migrate -export-only -old-addr="http://127.0.0.1:8200" -old-token="$VAULT_TOKEN" -old-transit="encryption-key" -mount="secret" -out="secrets.json"

  kill $VAULT_PID 2>/dev/null
  wait $VAULT_PID 2>/dev/null

  rm -rf $OPENBAO_DATA_PATH/*

  start_openbao "$OPENBAO_CONFIG_FILE"
  echo "Importing secrets to manual-unsealed OpenBao..."
  migrate -import-only -new-addr="http://127.0.0.1:8200" -new-token="$VAULT_TOKEN" -new-transit="encryption-key" -mount="secret" -out="secrets.json"

  rm secrets.json

  kill $VAULT_PID 2>/dev/null
  wait $VAULT_PID 2>/dev/null

  start_openbao "$OPENBAO_CONFIG_FILE"
else
  echo "OpenBao is already migrated, skipping migration..."
  start_openbao "$OPENBAO_CONFIG_FILE"
fi


echo "1" > /openbao/data/migration_version

echo "OpenBao is ready!"
echo "UI available at: http://localhost:8200"
echo "API available at: http://localhost:8200/v1/"
echo ""

echo "OpenBao setup complete, waiting for server process..."
wait $VAULT_PID
