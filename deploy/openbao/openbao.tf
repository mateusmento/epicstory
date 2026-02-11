provider "aws" {
  region = var.aws_region
}

# 1. KMS Key for OpenBao auto-unseal
resource "aws_kms_key" "openbao" {
  description             = "KMS key for OpenBao auto-unseal"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "aws_kms_alias" "openbao" {
  name          = "alias/openbao"
  target_key_id = aws_kms_key.openbao.key_id
}

# 2. IAM Role for OpenBao Deployment (KMS access)
data "aws_iam_policy_document" "openbao_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.eks_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.eks_oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${var.k8s_namespace}:openbao-sa"]
    }
  }
}

resource "aws_iam_role" "openbao" {
  name               = "openbao-kms-role"
  assume_role_policy = data.aws_iam_policy_document.openbao_assume_role.json
}

resource "aws_iam_policy" "openbao_kms" {
  name        = "openbao-kms-policy"
  description = "Allow OpenBao to use KMS for auto-unseal"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*"
        ]
        Resource = aws_kms_key.openbao.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "openbao_kms" {
  role       = aws_iam_role.openbao.name
  policy_arn = aws_iam_policy.openbao_kms.arn
}

# 3. IAM Role for Init Job (KMS + Secrets Manager)
data "aws_iam_policy_document" "init_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [var.eks_oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${replace(var.eks_oidc_provider_url, "https://", "")}:sub"
      values   = ["system:serviceaccount:${var.k8s_namespace}:openbao-init-sa"]
    }
  }
}

resource "aws_iam_role" "openbao_init" {
  name               = "openbao-init-role"
  assume_role_policy = data.aws_iam_policy_document.init_assume_role.json
}

resource "aws_iam_policy" "openbao_init_policy" {
  name        = "openbao-init-policy"
  description = "Allow OpenBao init job to use KMS and Secrets Manager"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey*"
        ]
        Resource = aws_kms_key.openbao.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:CreateSecret",
          "secretsmanager:PutSecretValue",
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "openbao_init" {
  role       = aws_iam_role.openbao_init.name
  policy_arn = aws_iam_policy.openbao_init_policy.arn
}

# 4. AWS Secrets Manager secret for root token and unseal keys
resource "aws_secretsmanager_secret" "openbao" {
  name        = "openbao-init"
  description = "OpenBao root token and unseal keys"
}

# 5. Output values for use in K8s manifests
output "openbao_kms_key_arn" {
  value = aws_kms_key.openbao.arn
}

output "openbao_kms_key_id" {
  value = aws_kms_key.openbao.key_id
}

output "openbao_kms_alias" {
  value = aws_kms_alias.openbao.name
}

output "openbao_iam_role_arn" {
  value = aws_iam_role.openbao.arn
}

output "openbao_init_iam_role_arn" {
  value = aws_iam_role.openbao_init.arn
}

output "openbao_secret_arn" {
  value = aws_secretsmanager_secret.openbao.arn
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "eks_oidc_provider_arn" {
  description = "EKS OIDC provider ARN"
  type        = string
}

variable "eks_oidc_provider_url" {
  description = "EKS OIDC provider URL"
  type        = string
}

variable "k8s_namespace" {
  description = "Kubernetes namespace for OpenBao"
  type        = string
  default     = "default"
}