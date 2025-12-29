# 🚀 Production Deployment Guide

## **Quick Deploy Options**

### Option 1: Vercel + Neon (Recommended)
**Best for**: Fast deployment, automatic scaling, great developer experience

1. **Database Setup**:
   - Sign up at [neon.tech](https://neon.tech)
   - Create project: "AI Workflow Architect"
   - Copy connection string

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Environment Variables** (in Vercel dashboard):
   ```
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   SESSION_SECRET=your-32-char-secret-here
   APP_ORIGIN=https://your-app.vercel.app
   ```

### Option 2: Railway (Full-Stack)
**Best for**: Simple setup, includes database

1. **Deploy**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway new
   railway add postgresql
   railway deploy
   ```

2. **Environment Variables** (auto-configured):
   - `DATABASE_URL` - Automatically set by Railway
   - `SESSION_SECRET` - Add manually
   - `APP_ORIGIN` - Set to your Railway domain

### Option 3: Render + Supabase
**Best for**: Free tier, reliable hosting

1. **Database**: Create Supabase project
2. **Deploy**: Connect GitHub repo to Render
3. **Configure**: Add environment variables

## **Pre-Deployment Checklist**

### ✅ **Required Steps**

1. **Build Test**:
   ```bash
   npm run build
   npm start
   ```

2. **Database Schema**:
   ```bash
   npm run db:push
   ```

3. **Environment Variables**:
   - [ ] `DATABASE_URL` - PostgreSQL connection string
   - [ ] `SESSION_SECRET` - 32+ character random string
   - [ ] `APP_ORIGIN` - Your production domain

4. **Optional AI Provider Keys**:
   - [ ] `OPENAI_API_KEY` - For OpenAI integration
   - [ ] `ANTHROPIC_API_KEY` - For Claude integration
   - [ ] `XAI_API_KEY` - For Grok integration
   - [ ] `PERPLEXITY_API_KEY` - For Perplexity integration

### ✅ **Security Checklist**

- [ ] Strong session secret (32+ chars)
- [ ] Database uses SSL (included in cloud providers)
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] No sensitive data in environment variables
- [ ] API keys stored in encrypted vault (not env vars)

## **Production Configuration**

### Environment Variables Template
```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
SESSION_SECRET=your-very-long-random-secret-here-32-chars-minimum
APP_ORIGIN=https://your-production-domain.com

# Optional - AI Providers (can be added via UI later)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
XAI_API_KEY=xai-your-xai-key
PERPLEXITY_API_KEY=pplx-your-perplexity-key

# Optional - Integrations (can be configured via UI)
GITHUB_TOKEN=ghp_your-github-token
GOOGLE_DRIVE_CLIENT_ID=your-google-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-client-secret
NOTION_TOKEN=secret_your-notion-token
```

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Production start
npm start

# Database operations
npm run db:push
```

## **Deployment Scripts**

### Vercel Configuration (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**/*",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ]
}
```

### Railway Configuration (`railway.toml`)
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"

[env]
NODE_ENV = "production"
```

## **Post-Deployment Testing**

### 1. **Health Check**
```bash
curl https://your-app.com/api/health
# Expected: {"status":"ok","time":"...","version":"1.0.0"}
```

### 2. **User Registration**
```bash
curl -X POST https://your-app.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

### 3. **Database Connection**
- Check that tables are created
- Verify user registration works
- Test login functionality

### 4. **UI Testing**
- [ ] Landing page loads
- [ ] Registration form works
- [ ] Login redirects to dashboard
- [ ] Navigation works
- [ ] No console errors

## **Monitoring & Maintenance**

### **Application Monitoring**
- **Uptime**: Use UptimeRobot or similar
- **Errors**: Check hosting platform logs
- **Performance**: Monitor response times
- **Database**: Check connection pool usage

### **Security Monitoring**
- **Failed logins**: Monitor auth endpoints
- **Rate limiting**: Check for abuse
- **Database**: Monitor for unusual queries
- **API usage**: Track AI provider costs

### **Backup Strategy**
- **Database**: Automatic backups (included in cloud providers)
- **Code**: GitHub repository
- **Environment**: Document all environment variables
- **Credentials**: Secure backup of encryption keys

## **Scaling Considerations**

### **Traffic Growth**
- **Database**: Upgrade plan as needed
- **Hosting**: Most platforms auto-scale
- **CDN**: Consider Cloudflare for static assets
- **Caching**: Add Redis for session storage

### **Feature Additions**
- **AI Providers**: Easy to add via environment variables
- **Integrations**: Modular architecture supports expansion
- **UI**: Component-based design scales well
- **API**: RESTful design supports mobile apps

## **Cost Optimization**

### **Infrastructure Costs**
- **Hosting**: $0-20/month (free tiers available)
- **Database**: $0-25/month (free tiers available)
- **Domain**: $10-15/year
- **SSL**: Free (included in hosting)

### **AI Provider Costs**
- **Budget controls**: Built-in cost governance
- **Usage tracking**: Monitor and optimize
- **Provider selection**: Choose cost-effective models
- **Caching**: Reduce redundant API calls

## **Support & Documentation**

### **User Documentation**
- **Getting Started**: Clear onboarding flow
- **Feature Guides**: Step-by-step tutorials
- **API Reference**: Complete endpoint documentation
- **Troubleshooting**: Common issues and solutions

### **Developer Documentation**
- **Architecture**: System design overview
- **API**: Complete endpoint reference
- **Database**: Schema documentation
- **Deployment**: This guide

---

**Ready to deploy? Choose your platform and follow the steps above!**