terraform {
  required_version = ">= 1.2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  backend "s3" {
    bucket = "epicstory-terraform"
    key    = "api/terraform.tfstate"
    region = "sa-east-1"
  }

  # backend "local" {
  #   workspace_dir = "../"
  #   path          = "terraform.tfstate"
  # }
}

provider "aws" {
  region = "sa-east-1"
}

data "aws_vpc" "main" {
  tags = {
    Name = "epicstory-vpc"
  }
}

data "aws_subnets" "api" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Name = "epicstory-pub"
    # Name = "epicstory-priv"
  }
}

data "aws_lb" "main" {
  name = "epicstory-main-lb"
}

data "aws_lb_listener" "main" {
  load_balancer_arn = data.aws_lb.main.arn
  port              = 80
  tags = {
    Name = "epicstory-lb-listener"
  }
}

resource "aws_lb_listener_rule" "api" {
  listener_arn = data.aws_lb_listener.main.arn
  priority     = 1
  condition {
    path_pattern {
      values = ["/api*"]
    }
  }
  action {
    type             = "forward"
    target_group_arn = module.api.target_group.arn
  }
  tags = {
    Name = "epicstory-api"
  }
}

module "api" {
  source            = "../modules/service"
  instance_count    = 1
  ami               = "ami-05dc908211c15c11d"
  vpc_id            = data.aws_vpc.main.id
  subnet_ids        = data.aws_subnets.api.ids
  security_group_id = aws_security_group.api.id
  user_data = templatefile("./deploy.sh", {
    AWS_ACCESS_KEY_ID       = var.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY   = var.AWS_SECRET_ACCESS_KEY,
    AWS_REGION              = var.AWS_REGION,
    AWS_REGISTRY            = var.AWS_REGISTRY,
    SERVICE_NAME            = var.SERVICE_NAME,
    SERVICE_VERSION         = var.SERVICE_VERSION,
    LB_NAME_TAG             = var.LB_NAME_TAG,
    GOOGLE_CLIENT_ID        = var.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET    = var.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URI     = var.GOOGLE_CALLBACK_URI,
    GOOGLE_APP_REDIRECT_URL = var.GOOGLE_APP_REDIRECT_URL
  })
  key_name = "ec2-key"
  name_tag = "epicstory-api"
}

resource "aws_security_group" "api" {
  name   = "epicstory-api-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol        = "tcp"
    from_port       = 80
    to_port         = 80
    security_groups = data.aws_lb.main.security_groups
  }

  egress {
    protocol    = -1
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "epicstory-app-sg"
  }
}
