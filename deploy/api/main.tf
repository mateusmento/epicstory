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

data "aws_lb_listener" "http" {
  load_balancer_arn = data.aws_lb.main.arn
  port              = 80
}

data "aws_lb_listener" "https" {
  load_balancer_arn = data.aws_lb.main.arn
  port              = 443
}

resource "aws_lb_listener_rule" "api" {
  count = 2
  listener_arn = [
    data.aws_lb_listener.https.arn,
    data.aws_lb_listener.http.arn
  ][count.index]

  priority = 1

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
    Name = "epicstory-api-${["https", "http"][count.index]}"
  }
}

# generate keys with:
#   ssh-keygen -t rsa -f epicstory
# resource "aws_key_pair" "key_pair" {
#   key_name = "epicstory"
#   public_key = file("../epicstory.pub")
# }

data "aws_key_pair" "key_pair" {
  key_name = "epicstory"
}

data "aws_instance" "dependencies" {
  instance_tags = {
    Name = "epicstory-dependencies"
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

module "api" {
  source            = "../modules/service"
  instance_count    = 1
  ami               = "ami-05dc908211c15c11d"
  vpc_id            = data.aws_vpc.main.id
  subnet_ids        = data.aws_subnets.api.ids
  security_group_id = aws_security_group.api.id
  health_check_path = "/api"
  user_data = templatefile("./deploy.sh", {
    SERVICE_NAME    = var.SERVICE_NAME,
    SERVICE_VERSION = var.SERVICE_VERSION,
    LB_DOMAIN       = data.aws_lb.main.dns_name,
    LB_NAME_TAG     = var.LB_NAME_TAG,
    DEPENDENCIES_IP = data.aws_instance.dependencies.private_ip,

    APP_URL                      = var.APP_URL,
    API_PORT                     = var.API_PORT,
    CORS_ORIGINS                 = var.CORS_ORIGINS,
    AWS_ACCESS_KEY_ID            = var.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY        = var.AWS_SECRET_ACCESS_KEY,
    AWS_REGISTRY                 = var.AWS_REGISTRY,
    AWS_REGION                   = var.AWS_REGION,
    AWS_BUCKET                   = var.AWS_BUCKET,
    GOOGLE_CLIENT_ID             = var.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET         = var.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URI          = var.GOOGLE_CALLBACK_URI,
    GOOGLE_APP_REDIRECT_URL      = var.GOOGLE_APP_REDIRECT_URL,
    LINEAR_CLIENT_ID             = var.LINEAR_CLIENT_ID,
    LINEAR_CLIENT_SECRET         = var.LINEAR_CLIENT_SECRET,
    LINEAR_CALLBACK_URI          = var.LINEAR_CALLBACK_URI,
    INTEGRATIONS_ENCRYPTION_KEY  = var.INTEGRATIONS_ENCRYPTION_KEY,
    DATABASE_NAME                = var.DATABASE_NAME,
    DATABASE_USER                = var.DATABASE_USER,
    DATABASE_PASSWORD            = var.DATABASE_PASSWORD,
    DATABASE_HOST                = data.aws_instance.dependencies.private_ip,
    DATABASE_MIGRATION_HOST      = data.aws_instance.dependencies.private_ip,
    DATABASE_PORT                = var.DATABASE_PORT,
    COOKIE_SECRET                = var.COOKIE_SECRET,
    TRUST_PROXY                  = var.TRUST_PROXY,
    REDIS_URL                    = var.REDIS_URL,
    JWT_SECRET                   = var.JWT_SECRET,
    JWT_EXPIRES_IN               = var.JWT_EXPIRES_IN,
    PASSWORD_ROUNDS              = var.PASSWORD_ROUNDS,
    DEFAULT_SENDER_EMAIL_ADDRESS = var.DEFAULT_SENDER_EMAIL_ADDRESS,
    EMAIL_SMTP_URL               = var.EMAIL_SMTP_URL,
    EMAIL_SMTP_USER              = var.EMAIL_SMTP_USER,
    EMAIL_SMTP_PASSWORD          = var.EMAIL_SMTP_PASSWORD,
  })
  key_name = data.aws_key_pair.key_pair.key_name
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
    Name = "epicstory-api-sg"
  }
}
