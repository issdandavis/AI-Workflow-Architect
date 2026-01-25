#!/bin/bash
# AI Workflow Architect - AWS Deployment Script
# Deploys to ECS Fargate with RDS PostgreSQL

set -e

# Configuration
APP_NAME="ai-workflow-architect"
AWS_REGION="${AWS_REGION:-us-west-2}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${APP_NAME}"

log "Deploying ${APP_NAME} to AWS (${AWS_REGION})"
log "Account: ${AWS_ACCOUNT_ID}"

# Step 1: Create ECR repository if it doesn't exist
log "Step 1: Setting up ECR repository..."
aws ecr describe-repositories --repository-names ${APP_NAME} --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${APP_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true

# Step 2: Authenticate Docker to ECR
log "Step 2: Authenticating Docker to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 3: Build and push Docker image
log "Step 3: Building Docker image..."
docker build -t ${APP_NAME}:latest .

log "Step 4: Tagging and pushing to ECR..."
docker tag ${APP_NAME}:latest ${ECR_REPO}:latest
docker tag ${APP_NAME}:latest ${ECR_REPO}:$(date +%Y%m%d-%H%M%S)
docker push ${ECR_REPO}:latest
docker push ${ECR_REPO}:$(date +%Y%m%d-%H%M%S)

# Step 5: Deploy CloudFormation stack
log "Step 5: Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file aws/cloudformation.yaml \
    --stack-name ${APP_NAME}-${ENVIRONMENT} \
    --parameter-overrides \
        Environment=${ENVIRONMENT} \
        AppName=${APP_NAME} \
        ImageUri=${ECR_REPO}:latest \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region ${AWS_REGION} \
    --no-fail-on-empty-changeset

# Step 6: Get outputs
log "Step 6: Getting deployment info..."
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name ${APP_NAME}-${ENVIRONMENT} \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region ${AWS_REGION})

log "============================================"
log "Deployment Complete!"
log "============================================"
log "Application URL: http://${ALB_DNS}"
log ""
log "Next steps:"
log "1. Set up secrets in AWS Secrets Manager"
log "2. Configure a custom domain with Route 53"
log "3. Add SSL certificate via ACM"
log "============================================"
