# AI Workflow Architect - Deployment Guide

## Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- At least one AI provider API key (OpenAI, Anthropic, xAI, or Perplexity)

### 1. Configure Environment

```bash
# Copy the production environment template
cp .env.production.example .env

# Generate a session secret
openssl rand -base64 32

# Edit .env with your values
```

Required variables:
- `SESSION_SECRET` - Min 32 characters (use the generated value above)
- `POSTGRES_PASSWORD` - Secure database password
- `APP_ORIGIN` - Your production URL (e.g., `https://your-domain.com`)
- At least one AI provider key (`OPENAI_API_KEY`, etc.)

### 2. Deploy

```bash
# Build and start containers
docker-compose up -d

# Check logs
docker-compose logs -f app

# Verify health
curl http://localhost:5000/api/health
```

### 3. Database Migrations

After first deployment, run migrations:

```bash
docker-compose exec app npm run db:push
```

## Cloud Deployment

### AWS (ECS/Fargate)

1. Push image to ECR:
```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t ai-workflow-architect .
docker tag ai-workflow-architect:latest <account>.dkr.ecr.<region>.amazonaws.com/ai-workflow-architect:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/ai-workflow-architect:latest
```

2. Create ECS task definition with:
   - Container port: 5000
   - Environment variables from AWS Secrets Manager
   - Health check: `/api/health`

3. Use RDS PostgreSQL for database

### Google Cloud (Cloud Run)

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-workflow-architect

# Deploy
gcloud run deploy ai-workflow-architect \
  --image gcr.io/PROJECT_ID/ai-workflow-architect \
  --platform managed \
  --port 5000 \
  --set-env-vars "DATABASE_URL=..." \
  --set-secrets "SESSION_SECRET=session-secret:latest"
```

### Azure (Container Apps)

```bash
# Create container app
az containerapp create \
  --name ai-workflow-architect \
  --resource-group myResourceGroup \
  --image your-registry.azurecr.io/ai-workflow-architect \
  --target-port 5000 \
  --env-vars "DATABASE_URL=..." \
  --secrets "session-secret=..."
```

## Ports

| Service | Port | Description |
|---------|------|-------------|
| App     | 5000 | Main application (API + UI) |
| PostgreSQL | 5432 | Database (internal only) |

## Health Checks

- Endpoint: `GET /api/health`
- Expected response: `{"status":"ok"}`

## Monitoring

- Check container logs: `docker-compose logs -f`
- Health status: `docker-compose ps`
- Database connection: Check app logs for "Database: Connected"

## Backup

PostgreSQL data is stored in a Docker volume. To backup:

```bash
docker-compose exec db pg_dump -U postgres ai_workflow > backup.sql
```

To restore:

```bash
docker-compose exec -T db psql -U postgres ai_workflow < backup.sql
```

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs app`
- Verify `.env` has all required variables
- Ensure PostgreSQL is healthy: `docker-compose ps db`

### Database connection errors
- Wait for PostgreSQL health check to pass
- Verify `DATABASE_URL` format matches docker-compose service name

### Build failures
- Clear Docker cache: `docker-compose build --no-cache`
- Check Node.js version compatibility (requires Node 20+)
