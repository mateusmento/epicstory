#!/bin/bash

# Script to create OpenBao ConfigMap from external file
# Usage: ./create-configmap.sh [namespace]

NAMESPACE=${1:-"default"}

echo "Creating OpenBao ConfigMap from openbao.hcl file..."
kubectl create configmap openbao-config \
  --from-file=openbao.hcl \
  --namespace="$NAMESPACE" \
  --dry-run=client -o yaml > configmap.yaml

echo "ConfigMap created as configmap.yaml"
echo "Apply it with: kubectl apply -f configmap.yaml"