# AI Workflow Architect - Full AWS Deployment (No Local Docker Required)
# This script deploys everything to AWS using CodeBuild

$ErrorActionPreference = "Stop"

# Configuration
$APP_NAME = "ai-workflow-architect"
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-west-2" }
$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "production" }
$GITHUB_OWNER = "issdandavis"
$GITHUB_REPO = "AI-Workflow-Architect"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "AI Workflow Architect - AWS Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verify AWS credentials
Write-Host "[1/6] Verifying AWS credentials..." -ForegroundColor Green
$identity = aws sts get-caller-identity --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] AWS credentials not configured" -ForegroundColor Red
    exit 1
}
$AWS_ACCOUNT_ID = $identity.Account
Write-Host "       Account: $AWS_ACCOUNT_ID" -ForegroundColor Gray
Write-Host "       Region: $AWS_REGION" -ForegroundColor Gray

# Deploy CI/CD infrastructure
Write-Host ""
Write-Host "[2/6] Deploying CI/CD infrastructure (ECR + CodeBuild)..." -ForegroundColor Green
aws cloudformation deploy `
    --template-file aws/cloudformation-cicd.yaml `
    --stack-name "$APP_NAME-cicd" `
    --parameter-overrides `
        "AppName=$APP_NAME" `
        "GitHubOwner=$GITHUB_OWNER" `
        "GitHubRepo=$GITHUB_REPO" `
    --capabilities CAPABILITY_NAMED_IAM `
    --region $AWS_REGION `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] CI/CD deployment failed" -ForegroundColor Red
    exit 1
}

# Get ECR URI
$ECR_URI = aws cloudformation describe-stacks `
    --stack-name "$APP_NAME-cicd" `
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryUri`].OutputValue' `
    --output text `
    --region $AWS_REGION

Write-Host "       ECR Repository: $ECR_URI" -ForegroundColor Gray

# Check GitHub connection status
Write-Host ""
Write-Host "[3/6] Checking GitHub connection..." -ForegroundColor Green
$CONNECTION_ARN = aws cloudformation describe-stacks `
    --stack-name "$APP_NAME-cicd" `
    --query 'Stacks[0].Outputs[?OutputKey==`GitHubConnectionArn`].OutputValue' `
    --output text `
    --region $AWS_REGION

$CONNECTION_STATUS = aws codestar-connections describe-connection `
    --connection-arn $CONNECTION_ARN `
    --query 'Connection.ConnectionStatus' `
    --output text `
    --region $AWS_REGION 2>$null

if ($CONNECTION_STATUS -ne "AVAILABLE") {
    Write-Host ""
    Write-Host "[ACTION REQUIRED] GitHub connection needs authorization" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please complete these steps:" -ForegroundColor White
    Write-Host "1. Open: https://$AWS_REGION.console.aws.amazon.com/codesuite/settings/connections" -ForegroundColor Cyan
    Write-Host "2. Find '$APP_NAME-github' and click 'Update pending connection'" -ForegroundColor Cyan
    Write-Host "3. Authorize AWS to access your GitHub account" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter after completing GitHub authorization..."
}

# Start CodeBuild
Write-Host ""
Write-Host "[4/6] Starting Docker build in AWS CodeBuild..." -ForegroundColor Green
$BUILD_RESULT = aws codebuild start-build `
    --project-name "$APP_NAME-build" `
    --region $AWS_REGION `
    --output json | ConvertFrom-Json

$BUILD_ID = $BUILD_RESULT.build.id
Write-Host "       Build ID: $BUILD_ID" -ForegroundColor Gray

# Wait for build to complete
Write-Host ""
Write-Host "[5/6] Waiting for build to complete (this may take 5-10 minutes)..." -ForegroundColor Green
$BUILD_STATUS = "IN_PROGRESS"
$dots = ""
while ($BUILD_STATUS -eq "IN_PROGRESS") {
    Start-Sleep -Seconds 15
    $dots += "."
    Write-Host "`r       Building$dots" -NoNewline -ForegroundColor Gray

    $BUILD_INFO = aws codebuild batch-get-builds `
        --ids $BUILD_ID `
        --region $AWS_REGION `
        --output json | ConvertFrom-Json

    $BUILD_STATUS = $BUILD_INFO.builds[0].buildStatus
}

Write-Host ""
if ($BUILD_STATUS -ne "SUCCEEDED") {
    Write-Host "[ERROR] Build failed with status: $BUILD_STATUS" -ForegroundColor Red
    Write-Host "       Check logs: https://$AWS_REGION.console.aws.amazon.com/codesuite/codebuild/projects/$APP_NAME-build" -ForegroundColor Yellow
    exit 1
}
Write-Host "       Build completed successfully!" -ForegroundColor Green

# Deploy main infrastructure
Write-Host ""
Write-Host "[6/6] Deploying application infrastructure (ECS + RDS + ALB)..." -ForegroundColor Green
aws cloudformation deploy `
    --template-file aws/cloudformation.yaml `
    --stack-name "$APP_NAME-$ENVIRONMENT" `
    --parameter-overrides `
        "Environment=$ENVIRONMENT" `
        "AppName=$APP_NAME" `
        "ImageUri=${ECR_URI}:latest" `
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
    --region $AWS_REGION `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Infrastructure deployment failed" -ForegroundColor Red
    exit 1
}

# Get outputs
$ALB_DNS = aws cloudformation describe-stacks `
    --stack-name "$APP_NAME-$ENVIRONMENT" `
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' `
    --output text `
    --region $AWS_REGION

$APP_SECRET_ARN = aws cloudformation describe-stacks `
    --stack-name "$APP_NAME-$ENVIRONMENT" `
    --query 'Stacks[0].Outputs[?OutputKey==`AppSecretArn`].OutputValue' `
    --output text `
    --region $AWS_REGION

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URL: http://$ALB_DNS" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT - Configure your secrets:" -ForegroundColor White
Write-Host "1. Open AWS Secrets Manager:" -ForegroundColor Gray
Write-Host "   https://$AWS_REGION.console.aws.amazon.com/secretsmanager/secret?name=$APP_NAME/$ENVIRONMENT/app-secrets" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Click 'Retrieve secret value' then 'Edit'" -ForegroundColor Gray
Write-Host "3. Update these values:" -ForegroundColor Gray
Write-Host "   - SESSION_SECRET: (generate with: openssl rand -base64 32)" -ForegroundColor Gray
Write-Host "   - OPENAI_API_KEY: your OpenAI key" -ForegroundColor Gray
Write-Host "   - ANTHROPIC_API_KEY: your Anthropic key" -ForegroundColor Gray
Write-Host ""
Write-Host "4. After updating secrets, restart the ECS service:" -ForegroundColor Gray
Write-Host "   aws ecs update-service --cluster $APP_NAME-$ENVIRONMENT --service $APP_NAME-$ENVIRONMENT --force-new-deployment --region $AWS_REGION" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
