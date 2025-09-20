#!/bin/bash

if ! command -v jq &> /dev/null; then
  echo "❌ jq is not installed. Please install jq first."
  echo "   Ubuntu/Debian: sudo apt-get install jq"
  echo "   macOS: brew install jq"
  echo "   CentOS/RHEL: sudo yum install jq"
  exit 1
fi

if [ ! -f "docker-build.json" ]; then
  echo "❌ docker-build.json file not found in current directory"
  echo "   Please create docker-build.json with the following structure:"
  echo "   {"
  echo "     \"name\": \"your-service-name\","
  echo "     \"version\": \"1.0.0\","
  echo "     \"nginx_version\": \"1.27.0\","
  echo "     \"node_version\": \"20.18.0-bullseye-slim\""
  echo "   }"
  exit 1
fi

service_name=$(jq -r '.name' docker-build.json)
service_version=$(jq -r '.version' docker-build.json)

NODE_VERSION=$(jq -r '.node_version' docker-build.json)
NGINX_VERSION=$(jq -r '.nginx_version' docker-build.json)

echo "=== Build Configuration ==="
echo "Service: $service_name"
echo "Version: $service_version"
echo "Node Version: $NODE_VERSION"
echo "Nginx Version: $NGINX_VERSION"
echo "=========================="

docker build \
  -t $service_name:$service_version \
  --build-arg NODE_IMAGE_VERSION=$NODE_VERSION-bullseye-slim \
  .
