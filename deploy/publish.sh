#!/bin/bash

service_name=$1
service_version=$2
AWS_REGION=$3
#(sudo aws configure get region | tr -d '\n')
AWS_REGISTRY=$(aws sts get-caller-identity --query "Account" --output text | tr -d '\n')

# Creating AWS ECR repository
aws ecr describe-repositories --repository-names "epicstory-$service_name" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    repo_uri=$(aws ecr create-repository \
        --repository-name "epicstory-$service_name" \
        --region ${AWS_REGION} \
        --query 'repository.repositoryUri' \
        --output text \
        | tr -d '\n')
else
    repo_uri=$(aws ecr describe-repositories \
        --repository-names "epicstory-$service_name" \
        --query 'repositories[0].repositoryUri' \
        --output text \
        | tr -d '\n')
fi

# Login docker to AWS ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $repo_uri

# Build and publish docker image
cd ../$service_name
./docker-build.sh epicstory-$service_name $service_version
docker tag epicstory-$service_name:$service_version $repo_uri:$service_version
docker push $repo_uri:$service_version
