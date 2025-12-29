# 🧪 Local Testing Setup Guide

## 🎯 **Goal: Test Everything Before GitHub/Deployment**

### **Step 1: Set Up Neon Database**

1. **Get your Neon connection string**:
   - Go to your Neon dashboard
   - Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

2. **Update environment file**:
   ```bash
   # Edit .env file
   DATABASE_URL=your-neon-connection-string-here
   SESSION_SECRET=your-32-character-secret-here-make-it-random-and-long
   APP_ORIGIN=http://localhost:5000
   ```

### **Step 2: Initialize Database**

```bash
# Navigate to project directory
cd projects_review/AI-Workflow-Architect

# Push database schema to Neon
npm run db:push

# Expected output: "✓ Your database is now in sync with your schema"
```

### **Step 3: Start Local Testing**

```bash
# Start development server
npm run dev

# Server should start on http://localhost:5000
# Check console for any errors
```

### **Step 4: Manual Testing Checklist**

#### 4.1 Basic Functionality Test
- [ ] Navigate to http://localhost:5000
- [ ] Page loads without errors
- [ ] No console errors in browser
- [ ] Navigation menu works

#### 4.2 User Registration Test
- [ ] Click "Sign Up" or navigate to registration
- [ ] Fill form: email + password
- [ ] Submit registration
- [ ] Should redirect to dashboard or login

#### 4.3 Login Test
- [ ] Use credentials from registration
- [ ] Should successfully log in
- [ ] Should see dashboard/main interface

#### 4.4 Core Features Test
- [ ] Can navigate between pages
- [ ] Can access settings/profile
- [ ] Can create projects (if available)
- [ ] Basic UI interactions work

### **Step 5: API Testing**

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Expected response:
# {"status":"ok","time":"2025-01-XX...","version":"1.0.0"}

# Test registration endpoint
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"apitest@example.com","password":"testpass123"}'

# Should return success or user created response
```

### **Step 6: Error Testing**

#### 6.1 Test Invalid Inputs
- [ ] Try registration with invalid email
- [ ] Try weak password
- [ ] Try duplicate email registration
- [ ] Verify proper error messages

#### 6.2 Test Database Errors
- [ ] Temporarily break DATABASE_URL
- [ ] Restart server
- [ ] Should show clear error message
- [ ] Fix DATABASE_URL and restart

### **Step 7: Performance Check**

- [ ] Server starts quickly (< 10 seconds)
- [ ] Pages load quickly (< 3 seconds)
- [ ] No memory leaks during use
- [ ] Database queries are fast

## 🚨 **TESTING RESULTS**

### **Pass Criteria**
✅ **READY FOR GITHUB** if:
- Server starts without errors
- Database connects successfully
- User registration works
- Login flow works
- Basic navigation works
- No critical console errors

❌ **NOT READY** if:
- Server crashes on startup
- Database connection fails
- Authentication is broken
- UI doesn't load properly
- Critical functionality missing

### **Testing Log Template**

```
Date: [Today's Date]
Tester: [Your Name]
Environment: Local Development

✅ Database Connection: PASS/FAIL
✅ Server Startup: PASS/FAIL  
✅ UI Loading: PASS/FAIL
✅ User Registration: PASS/FAIL
✅ User Login: PASS/FAIL
✅ Basic Navigation: PASS/FAIL
✅ API Health Check: PASS/FAIL

Issues Found:
1. [Issue description] - Severity: Critical/Major/Minor
2. [Issue description] - Severity: Critical/Major/Minor

Overall Status: READY/NOT READY for GitHub
```

## 🔧 **Common Issues & Fixes**

### **Database Connection Issues**
```bash
# Error: "DATABASE_URL environment variable is not set"
# Fix: Check .env file exists and has correct DATABASE_URL

# Error: "Connection refused"
# Fix: Verify Neon connection string is correct
```

### **Server Startup Issues**
```bash
# Error: "Port 5000 already in use"
# Fix: Kill existing process or use different port

# Error: TypeScript compilation errors
# Fix: Run npm run check to see specific errors
```

### **UI Loading Issues**
```bash
# Error: "Cannot GET /"
# Fix: Ensure both server and client are running

# Error: Console errors about missing modules
# Fix: Run npm install to ensure all dependencies
```

## 🎯 **Next Steps After Local Testing**

### **If Tests Pass**
1. Commit changes to git
2. Push to GitHub repository
3. Set up GitHub Actions for CI/CD
4. Prepare for deployment testing

### **If Tests Fail**
1. Document all issues found
2. Fix critical issues first
3. Re-test after fixes
4. Don't proceed until tests pass

---

**Remember: Quality first, speed second. Better to ship late than ship broken.**