#!/bin/bash

service_name=$1
service_version=$2

NODE_VERSION=$(cat .nvmrc | sed 's/^v//')
NGINX_VERSION=1.27.0

docker build \
    -t $service_name:$service_version \
    --build-arg NODE_IMAGE_VERSION=$NODE_VERSION-bullseye-slim \
    --build-arg NGINX_IMAGE_VERSION=$NGINX_VERSION \
    .
