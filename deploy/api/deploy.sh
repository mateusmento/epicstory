#!/bin/bash

# Install dependencies
echo "Install dependencies"
yum update -y
yum install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker $USER
newgrp docker

# Configure AWS CLI
echo "Configure AWS CLI"
aws configure set aws_access_key_id ${AWS_ACCESS_KEY_ID}
aws configure set aws_secret_access_key ${AWS_SECRET_ACCESS_KEY}
aws configure set region ${AWS_REGION}

# Find load balancer arn by tag

TAG_KEY="Name"
TAG_VALUE=${LB_NAME_TAG}

get_lb_arn_by_tag() {
  load_balancer_arns=$(aws elbv2 describe-load-balancers --query "LoadBalancers[*].LoadBalancerArn" --output text)

  for lb_arn in $load_balancer_arns; do
    tag_value=$(aws elbv2 describe-tags --resource-arns "$lb_arn" --query "TagDescriptions[*].Tags[?Key=='$TAG_KEY'].Value" --output text)
    if [ "$tag_value" == "$TAG_VALUE" ]; then
      echo "$lb_arn"
      return 0
    fi
  done

  return 1
}

LB_ARN=$(get_lb_arn_by_tag)

if [ -z "$LB_ARN" ]; then
  echo "Error: No Load Balancer found with tag $TAG_KEY=$TAG_VALUE"
  exit 1
fi

# Wait until the Load Balancer is in the 'active' state
aws elbv2 wait load-balancer-available --load-balancer-arns "$LB_ARN"

# Querying load balancer public dns
echo "Querying load balancer public dns"

API_HOSTNAME=$(
  aws elbv2 describe-load-balancers \
  --load-balancer-arns "$LB_ARN" \
  --query "LoadBalancers[0].DNSName" \
  --output text \
  | tr -d '\n'
)

APP_LB_URL="http://$API_HOSTNAME"

IMAGE_NAME=${AWS_REGISTRY}.dkr.ecr.${AWS_REGION}.amazonaws.com/${SERVICE_NAME}:${SERVICE_VERSION}

# Run application
echo "Run application"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $IMAGE_NAME

echo ""
echo "callback uri $APP_LB_URL/${GOOGLE_CALLBACK_URI}"
echo "redirect url $APP_LB_URL/${GOOGLE_APP_REDIRECT_URL}"
echo ""

docker run -it -d --rm -p 80:80 \
  -e GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  -e GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" \
  -e GOOGLE_CALLBACK_URI="$APP_LB_URL/${GOOGLE_CALLBACK_URI}" \
  -e GOOGLE_APP_REDIRECT_URL="$APP_LB_URL/${GOOGLE_APP_REDIRECT_URL}" \
  $IMAGE_NAME
