# Quick Start Guide - Deployment Templates

This guide will help you quickly deploy a new Next.js + Prisma application using the deployment templates.

---

## 📁 Template Files Overview

Your deployment template includes the following files:

1. **DEPLOYMENT_TEMPLATE.md** - Comprehensive deployment guide
2. **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment checklist
3. **docker-compose.template.yml** - Docker Compose configuration
4. **env.template** - Environment variables template
5. **Dockerfile** - Multi-stage Docker build (already in your project)
6. **.dockerignore** - Docker ignore file (already in your project)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Copy Template Files to New Project

```bash
# Create new project directory
mkdir my-new-project
cd my-new-project

# Copy template files
cp /path/to/hotelsmartbutton/DEPLOYMENT_TEMPLATE.md ./
cp /path/to/hotelsmartbutton/DEPLOYMENT_CHECKLIST.md ./
cp /path/to/hotelsmartbutton/Dockerfile ./
cp /path/to/hotelsmartbutton/.dockerignore ./
cp /path/to/hotelsmartbutton/docker-compose.template.yml ./docker-compose.yml
cp /path/to/hotelsmartbutton/env.template ./.env
```

### Step 2: Configure Environment Variables

```bash
# Edit .env file
nano .env

# Generate AUTH_SECRET
openssl rand -base64 32

# Add to .env:
# AUTH_SECRET=<generated-secret>
# DATABASE_URL=postgresql://user:password@localhost:5432/mydb
# AUTH_URL=https://your-domain.com
```

### Step 3: Update next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
```

### Step 4: Deploy

**Option A: Docker Compose (Local/Development)**
```bash
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npx prisma db seed
```

**Option B: Coolify (Production)**
1. Create new application in Coolify
2. Connect Git repository
3. Set build pack to "Docker"
4. Add environment variables
5. Click "Deploy"

---

## 📋 Deployment Checklist

Use `DEPLOYMENT_CHECKLIST.md` for a complete step-by-step guide.

### Essential Pre-Deployment Steps

- [ ] Generate `AUTH_SECRET`: `openssl rand -base64 32`
- [ ] Configure `DATABASE_URL`
- [ ] Set `AUTH_URL` to production domain
- [ ] Add all custom environment variables
- [ ] Ensure `next.config.ts` has `output: 'standalone'`
- [ ] Test build locally: `npm run build`

### Essential Post-Deployment Steps

- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed database: `npx prisma db seed`
- [ ] Test health endpoint: `curl https://your-domain.com/api/health`
- [ ] Verify authentication works
- [ ] Check application logs

---

## 🐳 Docker Commands Reference

### Build Image
```bash
docker build -t my-app:latest .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e AUTH_SECRET="your_auth_secret" \
  -e AUTH_URL="https://your-domain.com" \
  --name my-app \
  my-app:latest
```

### Docker Compose
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Execute commands in container
docker-compose exec app sh
docker-compose exec app npx prisma migrate deploy
```

### Useful Docker Commands
```bash
# View running containers
docker ps

# View logs
docker logs -f <container-name>

# Execute command in container
docker exec -it <container-name> sh

# Stop container
docker stop <container-name>

# Remove container
docker rm <container-name>

# Remove image
docker rmi <image-name>

# Clean up
docker system prune -a
```

---

## 🗄️ Database Setup

### PostgreSQL (Recommended)

**Using Docker Compose:**
```yaml
# Already configured in docker-compose.template.yml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: myapp
```

**Manual Setup:**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb myapp

# Connection string
DATABASE_URL=postgresql://user:password@localhost:5432/myapp?schema=public
```

### MySQL

**Using Docker Compose:**
```yaml
# Uncomment MySQL section in docker-compose.yml
db:
  image: mysql:8
  environment:
    MYSQL_DATABASE: myapp
    MYSQL_USER: user
    MYSQL_PASSWORD: password
```

**Connection string:**
```
DATABASE_URL=mysql://user:password@localhost:3306/myapp
```

---

## 🔧 Prisma Commands

### Migrations
```bash
# Create migration
npx prisma migrate dev --name init

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Database Operations
```bash
# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio

# Pull schema from database
npx prisma db pull

# Push schema to database (development)
npx prisma db push
```

---

## 🌐 Coolify Deployment

### 1. Create Application
- Go to Coolify dashboard
- Click "New Resource" → "Application"
- Select "Docker" build pack

### 2. Connect Repository
- Connect Git repository (GitHub, GitLab, etc.)
- Select branch (e.g., `main`)

### 3. Configure Build
- **Build Pack**: Docker
- **Dockerfile**: ./Dockerfile
- **Port**: 3000

### 4. Environment Variables
Add in Coolify before deployment:
```
DATABASE_URL=postgresql://...
AUTH_SECRET=<generated-secret>
AUTH_URL=https://your-domain.com
NODE_ENV=production
```

### 5. Deploy
- Click "Deploy"
- Monitor build logs
- Wait for completion (5-10 minutes)

### 6. Post-Deployment
```bash
# Access container in Coolify
coolify exec <container-id> sh

# Run migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```

---

## 🔍 Troubleshooting

### Build Fails

**Error: Native binaries not found**
```dockerfile
# Already handled in Dockerfile
RUN npm install lightningcss-linux-x64-musl@1.30.2 @tailwindcss/oxide-linux-x64-musl@4.1.18 --save-optional --legacy-peer-deps
```

**Error: Prisma client not generated**
```bash
# In Dockerfile, already has retry logic
RUN npx prisma generate || (sleep 10 && npx prisma generate)
```

### Database Connection Fails

**Check connection string:**
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# MySQL
DATABASE_URL=mysql://user:password@host:3306/database

# Docker Compose (use service name as host)
DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
```

**Test connection:**
```bash
docker-compose exec app npx prisma db pull
```

### Application Crashes

**Check logs:**
```bash
# Docker Compose
docker-compose logs -f app

# Docker
docker logs -f <container-name>

# Coolify
# View in dashboard
```

**Common issues:**
- Missing environment variables
- Database not accessible
- Migrations not run
- Prisma client not generated

---

## 📊 Health Checks

### Create Health Endpoint

`/app/api/health/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    }, { status: 503 });
  }
}
```

### Test Health Endpoint
```bash
curl https://your-domain.com/api/health
```

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ Never commit `.env` to Git
- ✅ Use strong `AUTH_SECRET` (32+ characters)
- ✅ Different secrets for dev/staging/prod
- ✅ Keep secure backup of production variables

### Database
- ✅ Use strong passwords
- ✅ Enable SSL/TLS connections
- ✅ Regular backups
- ✅ Restrict network access

### Application
- ✅ Enable HTTPS
- ✅ Set security headers
- ✅ Implement rate limiting
- ✅ Regular dependency updates

---

## 📈 Monitoring

### Application Metrics
- Response times
- Error rates
- Memory usage
- CPU usage

### Database Metrics
- Connection pool usage
- Query performance
- Database size

### Recommended Tools
- **APM**: Sentry, Datadog, New Relic
- **Logging**: Logtail, Papertrail
- **Uptime**: UptimeRobot, Pingdom

---

## 🆘 Getting Help

### Documentation
- [DEPLOYMENT_TEMPLATE.md](./DEPLOYMENT_TEMPLATE.md) - Full deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Docker Docs](https://docs.docker.com/)

### Common Issues
1. Check logs first
2. Verify environment variables
3. Test database connection
4. Review deployment checklist
5. Check troubleshooting guide

---

## ✅ Success Checklist

Deployment is successful when:

- [ ] Application accessible at production URL
- [ ] HTTPS working correctly
- [ ] Database connected
- [ ] Authentication working
- [ ] No errors in logs
- [ ] Health endpoint responding
- [ ] All features functional

---

## 🎯 Next Steps

After successful deployment:

1. **Set up monitoring** - Configure uptime and error tracking
2. **Enable backups** - Automated database backups
3. **Configure CI/CD** - Automated deployments
4. **Performance optimization** - Review and optimize
5. **Security hardening** - Regular security audits

---

**Template Version**: 1.0.0  
**Last Updated**: 2025-12-15  
**Status**: Production Ready

For detailed information, see [DEPLOYMENT_TEMPLATE.md](./DEPLOYMENT_TEMPLATE.md)
