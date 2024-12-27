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
    key    = "network/terraform.tfstate"
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

data "aws_availability_zones" "zones" {
  exclude_names = ["sa-east-1b"]
}

locals {
  availability_zones = data.aws_availability_zones.zones.names
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "epicstory-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "epicstory-igw"
  }
}

module "public_subnet" {
  source              = "../modules/public-subnet"
  count               = length(local.availability_zones)
  vpc_id              = aws_vpc.main.id
  availability_zone   = local.availability_zones[count.index]
  cidr_block          = "10.0.${count.index * 2 + 1}.0/24"
  internet_gateway_id = aws_internet_gateway.igw.id
  name_tag            = "epicstory-pub"
}

module "private_subnet" {
  source            = "../modules/private-subnet"
  count             = length(local.availability_zones)
  vpc_id            = aws_vpc.main.id
  availability_zone = local.availability_zones[count.index]
  cidr_block        = "10.0.${count.index * 2 + 2}.0/24"
  nat_subnet_id     = module.public_subnet[count.index].subnet.id
  name_tag          = "epicstory-priv"
}
