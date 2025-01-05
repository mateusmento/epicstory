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
    key    = "dependencies/terraform.tfstate"
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
  filter {
    name   = "tag:Name"
    values = ["epicstory-vpc"]
  }
}

data "aws_subnets" "main" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  filter {
    name   = "availability-zone"
    values = ["sa-east-1a"]
  }

  filter {
    name   = "tag:Name"
    values = ["epicstory-pub"]
  }
}

data "aws_lb" "main" {
  name = "epicstory-main-lb"
}

# data "aws_lb_listener" "http" {
#   load_balancer_arn = data.aws_lb.main.arn
#   port              = 3001
# }

data "aws_acm_certificate" "self_signed" {
  domain = data.aws_lb.main.dns_name
}

resource "aws_lb_listener" "peerjs" {
  load_balancer_arn = data.aws_lb.main.arn
  port              = 3001
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = data.aws_acm_certificate.self_signed.arn

  default_action {
    type = "fixed-response"
    fixed_response {
      status_code  = 200
      content_type = "text/plain"
      message_body = "Hello, world"
    }
  }

  tags = {
    Name = "epicstory-lb-listener"
  }
}

resource "aws_lb_listener_rule" "peerjs" {
  listener_arn = aws_lb_listener.peerjs.arn
  priority = 1

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
  action {
    type             = "forward"
    target_group_arn = module.dependencies.target_group.arn
  }
  tags = {
    Name = "epicstory-dependencies"
  }
}

data "aws_key_pair" "key_pair" {
  key_name = "epicstory"
}

module "dependencies" {
  source            = "../modules/service"
  instance_count    = 1
  ami               = "ami-05dc908211c15c11d"
  vpc_id            = data.aws_vpc.main.id
  subnet_ids        = data.aws_subnets.main.ids
  security_group_id = aws_security_group.dependencies.id
  port = 3001
  health_check_port = 3001
  user_data = templatefile("./deploy.sh", {
    POSTGRES_DB              = var.POSTGRES_DB,
    POSTGRES_USER            = var.POSTGRES_USER,
    POSTGRES_PASSWORD        = var.POSTGRES_PASSWORD,
    PGADMIN_DEFAULT_EMAIL    = var.PGADMIN_DEFAULT_EMAIL,
    PGADMIN_DEFAULT_PASSWORD = var.PGADMIN_DEFAULT_PASSWORD,
    PGADMIN_LISTEN_PORT      = var.PGADMIN_LISTEN_PORT,
  })
  key_name = data.aws_key_pair.key_pair.key_name
  name_tag = "epicstory-dependencies"
}

resource "aws_security_group" "dependencies" {
  name   = "epicstory-dependencies-sg"
  vpc_id = data.aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 5432
    to_port     = 5432
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 3001
    to_port     = 3001
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 6379
    to_port     = 6379
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 3300
    to_port     = 3300
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "epicstory-dependencies-sg"
  }
}
