#!/bin/sh

export VAULT_ADDR="http://127.0.0.1:8200"

list_secrets() {
  local root=$1
  local keys=$(vault kv list -format=json "$root" 2>/dev/null | jq -r '.[]?')
  for key in $keys; do
    case "$key" in
      */)
        folder=${key%/}
        list_secrets "$root/$folder"
        ;;
      *)
        echo "$root/$key"
        ;;
    esac
  done
}

list_secrets "secret"

OLD_TRANSIT_KEY=encryption-key

list_secrets "secret" | while IFS= read -r path; do
  secret_json=$(vault kv get -format=json "$path" 2>/dev/null)
  echo "$path: $secret_json"
  # if [ $? = 0 ] && [[ -n "$secret_json" ]]; then
  #   for field in $(echo "$secret_json" | jq -r '.data.data | keys[]'); do
  #     secret_value=$(echo "$secret_json" | jq -r ".data.data[\"$field\"]")
  #     plaintext=$(vault write -field=plaintext "transit/decrypt/$OLD_TRANSIT_KEY" ciphertext="$ciphertext" 2> /dev/null | base64 --decode 2> /dev/null)
  #     if [ $? = 0 ]; then
  #       echo "{\"path\":\"$path/$field\",\"value\":\"$plaintext\"}"
  #     else
  #       echo "{\"path\":\"$path/$field\",\"value\":\"$ciphertext\"}"
  #     fi
  #   done
  # fi
done
