# AI Workflow Architect - AWS Deployment Script (PowerShell)
# Deploys to ECS Fargate with RDS PostgreSQL

$ErrorActionPreference = "Stop"

# Configuration
$APP_NAME = "ai-workflow-architect"
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-west-2" }
$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "production" }

Write-Host "[DEPLOY] Starting deployment of $APP_NAME to AWS ($AWS_REGION)" -ForegroundColor Green

# Get AWS account ID
$AWS_ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to get AWS account ID. Check your AWS credentials." -ForegroundColor Red
    exit 1
}

$ECR_REPO = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$APP_NAME"
Write-Host "[DEPLOY] Account: $AWS_ACCOUNT_ID" -ForegroundColor Green

# Step 1: Create ECR repository if it doesn't exist
Write-Host "[DEPLOY] Step 1: Setting up ECR repository..." -ForegroundColor Green
$repoExists = aws ecr describe-repositories --repository-names $APP_NAME --region $AWS_REGION 2>$null
if ($LASTEXITCODE -ne 0) {
    aws ecr create-repository --repository-name $APP_NAME --region $AWS_REGION --image-scanning-configuration scanOnPush=true
}

# Step 2: Authenticate Docker to ECR
Write-Host "[DEPLOY] Step 2: Authenticating Docker to ECR..." -ForegroundColor Green
$loginPassword = aws ecr get-login-password --region $AWS_REGION
$loginPassword | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Step 3: Build Docker image
Write-Host "[DEPLOY] Step 3: Building Docker image..." -ForegroundColor Green
docker build -t "${APP_NAME}:latest" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Tag and push to ECR
Write-Host "[DEPLOY] Step 4: Tagging and pushing to ECR..." -ForegroundColor Green
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
docker tag "${APP_NAME}:latest" "${ECR_REPO}:latest"
docker tag "${APP_NAME}:latest" "${ECR_REPO}:${timestamp}"
docker push "${ECR_REPO}:latest"
docker push "${ECR_REPO}:${timestamp}"

# Step 5: Deploy CloudFormation stack
Write-Host "[DEPLOY] Step 5: Deploying CloudFormation stack..." -ForegroundColor Green
aws cloudformation deploy `
    --template-file aws/cloudformation.yaml `
    --stack-name "$APP_NAME-$ENVIRONMENT" `
    --parameter-overrides `
        "Environment=$ENVIRONMENT" `
        "AppName=$APP_NAME" `
        "ImageUri=${ECR_REPO}:latest" `
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
    --region $AWS_REGION `
    --no-fail-on-empty-changeset

# Step 6: Get outputs
Write-Host "[DEPLOY] Step 6: Getting deployment info..." -ForegroundColor Green
$ALB_DNS = aws cloudformation describe-stacks `
    --stack-name "$APP_NAME-$ENVIRONMENT" `
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' `
    --output text `
    --region $AWS_REGION

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Application URL: http://$ALB_DNS" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Update secrets in AWS Secrets Manager" -ForegroundColor White
Write-Host "2. Configure custom domain with Route 53" -ForegroundColor White
Write-Host "3. Add SSL certificate via ACM" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
