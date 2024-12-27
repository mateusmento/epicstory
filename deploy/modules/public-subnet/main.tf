variable "vpc_id" {
  type = string
}

variable "availability_zone" {
  type = string
}

variable "cidr_block" {
  type = string
}

variable "internet_gateway_id" {
  type = string
}

variable "name_tag" {
  type = string
}

data "aws_vpc" "main" {
  id = var.vpc_id
}

locals {
  vpc = data.aws_vpc.main
}

resource "aws_subnet" "public" {
  vpc_id                  = local.vpc.id
  cidr_block              = var.cidr_block
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.name_tag}"
  }
}

resource "aws_route" "igw_route" {
  route_table_id         = local.vpc.main_route_table_id
  gateway_id             = var.internet_gateway_id
  destination_cidr_block = "0.0.0.0/0"
}

output "subnet" {
  value = aws_subnet.public
}
