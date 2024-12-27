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
    key    = "load-balancer/terraform.tfstate"
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

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }

  tags = {
    Name = "epicstory-pub"
  }
}

resource "aws_lb" "main" {
  name                       = "epicstory-main-lb"
  internal                   = false
  load_balancer_type         = "application"
  enable_deletion_protection = false
  subnets                    = data.aws_subnets.public.ids
  security_groups            = [aws_security_group.lb-sg.id]
  tags = {
    Name = "epicstory-main-lb"
  }
}

resource "aws_security_group" "lb-sg" {
  name   = "epicstory-lb-sg"
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

  egress {
    protocol    = -1
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "epicstory-public-sg"
  }
}

resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

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
