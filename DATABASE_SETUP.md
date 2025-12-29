# Database Setup Guide

## 🚀 **Quick Cloud Database Setup**

### Option 1: Neon.tech (Recommended - Free Tier)

1. **Sign up at [neon.tech](https://neon.tech)**
2. **Create new project**: "AI Workflow Architect"
3. **Copy connection string** (looks like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`)
4. **Update .env file**:
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Option 2: Supabase (Alternative)

1. **Sign up at [supabase.com](https://supabase.com)**
2. **Create new project**
3. **Go to Settings > Database**
4. **Copy connection string**
5. **Update .env file**

### Option 3: Railway (Alternative)

1. **Sign up at [railway.app](https://railway.app)**
2. **Create new project**
3. **Add PostgreSQL service**
4. **Copy connection string from variables**
5. **Update .env file**

## 🔧 **After Database Setup**

1. **Push database schema**:
   ```bash
   npm run db:push
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Test the application**:
   - Navigate to http://localhost:5000
   - Try user registration
   - Test basic functionality

## 🎯 **Production Database Recommendations**

### For Production Deployment:
- **Neon.tech**: Great for MVP, scales well
- **Supabase**: Includes auth and real-time features
- **PlanetScale**: Excellent for high-scale applications
- **AWS RDS**: Enterprise-grade, more expensive

### Database Configuration:
- **Connection pooling**: Enabled by default in most cloud providers
- **SSL**: Required (already configured in connection strings)
- **Backups**: Automatic in all recommended providers
- **Monitoring**: Built-in dashboards available

## 🔒 **Security Notes**

- Never commit database credentials to git
- Use environment variables for all sensitive data
- Rotate database passwords regularly
- Enable connection limits if available
- Monitor for unusual activity

## 📊 **Expected Database Size**

### Initial Setup:
- **Tables**: 18 tables created
- **Storage**: <1MB initially
- **Connections**: 1-5 concurrent for testing

### Production Estimates:
- **Small team (10 users)**: 10-50MB
- **Medium team (100 users)**: 100MB-1GB
- **Large organization**: 1GB+

All recommended providers handle these sizes easily on free tiers.