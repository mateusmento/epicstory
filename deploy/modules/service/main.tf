variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "ami" {
  type = string
}

variable "security_group_id" {
  type    = string
  default = ""
}

variable "key_name" {
  type    = string
  default = ""
}

variable "user_data" {
  type    = string
  default = ""
}

variable "name_tag" {
  type = string
}

locals {
  final_instance_count = var.instance_count * length(var.subnet_ids)
}

resource "aws_instance" "service" {
  count                  = local.final_instance_count
  ami                    = var.ami
  instance_type          = "t2.micro"
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  vpc_security_group_ids = [var.security_group_id]
  key_name               = var.key_name
  user_data              = var.user_data
  tags = {
    Name = var.name_tag
  }
}

resource "aws_lb_target_group" "service" {
  vpc_id   = var.vpc_id
  protocol = "HTTP"
  port     = 80
  health_check {
    enabled             = true
    protocol            = "HTTP"
    port                = 80
    path                = "/"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 3
    unhealthy_threshold = 5
  }
  tags = {
    Name = "${var.name_tag}-tg"
  }
}

resource "aws_lb_target_group_attachment" "service" {
  count            = local.final_instance_count
  target_group_arn = aws_lb_target_group.service.arn
  target_id        = aws_instance.service[count.index].id
}

output "target_group" {
  value = aws_lb_target_group.service
}
