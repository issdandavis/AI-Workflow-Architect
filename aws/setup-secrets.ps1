# AI Workflow Architect - Setup AWS Secrets
# Run this before first deployment to configure your secrets

$ErrorActionPreference = "Stop"

$APP_NAME = "ai-workflow-architect"
$ENVIRONMENT = if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "production" }
$AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-west-2" }

Write-Host "AI Workflow Architect - AWS Secrets Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Generate a secure session secret
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$SESSION_SECRET = [Convert]::ToBase64String($bytes)

Write-Host "Generated SESSION_SECRET: $SESSION_SECRET" -ForegroundColor Green
Write-Host ""

# Collect API keys
Write-Host "Enter your API keys (press Enter to skip):" -ForegroundColor Yellow
$OPENAI_API_KEY = Read-Host "OpenAI API Key (sk-...)"
$ANTHROPIC_API_KEY = Read-Host "Anthropic API Key (sk-ant-...)"
$XAI_API_KEY = Read-Host "xAI API Key (xai-...)"
$PERPLEXITY_API_KEY = Read-Host "Perplexity API Key (pplx-...)"
$GITHUB_TOKEN = Read-Host "GitHub Token (ghp_...)"

# Create the secrets JSON
$secrets = @{
    SESSION_SECRET = $SESSION_SECRET
    OPENAI_API_KEY = if ($OPENAI_API_KEY) { $OPENAI_API_KEY } else { "" }
    ANTHROPIC_API_KEY = if ($ANTHROPIC_API_KEY) { $ANTHROPIC_API_KEY } else { "" }
    XAI_API_KEY = if ($XAI_API_KEY) { $XAI_API_KEY } else { "" }
    PERPLEXITY_API_KEY = if ($PERPLEXITY_API_KEY) { $PERPLEXITY_API_KEY } else { "" }
    GITHUB_TOKEN = if ($GITHUB_TOKEN) { $GITHUB_TOKEN } else { "" }
}

$secretsJson = $secrets | ConvertTo-Json -Compress

Write-Host ""
Write-Host "Creating/updating secrets in AWS Secrets Manager..." -ForegroundColor Green

$secretName = "$APP_NAME/$ENVIRONMENT/app-secrets"

# Check if secret exists
$secretExists = aws secretsmanager describe-secret --secret-id $secretName --region $AWS_REGION 2>$null
if ($LASTEXITCODE -eq 0) {
    # Update existing secret
    aws secretsmanager put-secret-value `
        --secret-id $secretName `
        --secret-string $secretsJson `
        --region $AWS_REGION
    Write-Host "Updated existing secret: $secretName" -ForegroundColor Green
} else {
    # Create new secret
    aws secretsmanager create-secret `
        --name $secretName `
        --description "AI Workflow Architect application secrets" `
        --secret-string $secretsJson `
        --region $AWS_REGION
    Write-Host "Created new secret: $secretName" -ForegroundColor Green
}

Write-Host ""
Write-Host "Secrets configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: .\aws\deploy.ps1" -ForegroundColor Yellow
