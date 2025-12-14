# Deployment Guide for Coolify

## Pre-Deployment Checklist

✅ **Build successful** - Application compiles without errors
✅ **Dockerfile created** - Multi-stage build optimized for production
✅ **Docker ignore configured** - Excludes unnecessary files
✅ **Standalone output enabled** - Minimal production bundle
✅ **Prisma configured** - Database migrations ready
✅ **Environment variables documented** - See below

## Required Environment Variables

### Authentication
```env
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=https://your-domain.com
```

### Database
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### PBX Configuration
```env
YEASTAR_BASE_URL=https://your-pbx-server.com
YEASTAR_CLIENT_ID=your_client_id
YEASTAR_CLIENT_SECRET=your_client_secret
YEASTAR_WEBSOCKET_SECRET=your_websocket_secret
```

### Google Cloud (for TTS)
```env
GOOGLE_APPLICATION_CREDENTIALS_JSON=<your-service-account-json>
```

### Optional
```env
NODE_ENV=production
PORT=3000
```

## Coolify Deployment Steps

### 1. Create New Project in Coolify
- Go to your Coolify dashboard
- Click "New Resource" → "Application"
- Select "Docker" as the build pack

### 2. Connect Git Repository
- Connect your Git repository (GitHub, GitLab, etc.)
- Select the branch to deploy (e.g., `main`)

### 3. Configure Build Settings
- **Build Pack**: Docker
- **Dockerfile Location**: `./Dockerfile`
- **Port**: 3000

### 4. Add Environment Variables
Add all the environment variables listed above in the Coolify environment section.

**⚠️ IMPORTANT**: These environment variables are required **during the Docker build process**, not just at runtime. Make sure they are set in Coolify BEFORE clicking deploy.

**Important**: Generate a secure `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

**Note on Secrets in Docker**: The warnings about "SecretsUsedInArgOrEnv" are expected and safe to ignore. The secrets are only used during build time and are not stored in the final Docker image.

### 5. Database Setup
- Create a PostgreSQL database in Coolify
- Copy the connection string to `DATABASE_URL`
- Run migrations after first deployment:
  ```bash
  npx prisma migrate deploy
  npx prisma db seed
  ```

### 6. Deploy
- Click "Deploy" in Coolify
- Monitor the build logs
- Wait for the deployment to complete

### 7. Post-Deployment Tasks

#### Run Database Migrations
Access the container and run:
```bash
npx prisma migrate deploy
```

#### Seed Initial Data (Optional)
```bash
npx prisma db seed
```

#### Start PBX WebSocket Listener
The WebSocket listener starts automatically with the application.
Monitor logs to ensure it connects successfully.

## Health Checks

### Application Health
```bash
curl https://your-domain.com/api/health
```

### Database Connection
Check the application logs for Prisma connection messages.

### PBX Connection
- Navigate to `/dashboard/pbx`
- Check "System Info" card for connection status
- Monitor "Live Events" for real-time PBX activity

## Troubleshooting

### Build Fails
- Check Coolify build logs
- Ensure all native binaries are installed (lightningcss, @tailwindcss/oxide)
- Verify Node.js version is 22

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible from the container
- Run `npx prisma generate` if Prisma client is missing

### PBX Not Connecting
- Verify PBX credentials in environment variables
- Check PBX server is accessible from the container
- Review WebSocket connection logs
- Ensure IP is not blocked by PBX firewall

### Application Crashes
- Check container logs in Coolify
- Verify all required environment variables are set
- Ensure database migrations have been run

## Monitoring

### Logs
Monitor application logs in Coolify dashboard for:
- PBX WebSocket connection status
- Database queries
- API errors
- Authentication issues

### Metrics
- Response times
- Memory usage
- CPU usage
- Active connections

## Backup & Recovery

### Database Backups
Set up automated PostgreSQL backups in Coolify.

### Environment Variables
Keep a secure backup of all environment variables.

### Prisma Schema
The schema is version-controlled in Git.

## Scaling

### Horizontal Scaling
- The application is stateless and can be scaled horizontally
- Use a load balancer for multiple instances
- Ensure database connection pooling is configured

### Vertical Scaling
- Increase container resources in Coolify
- Monitor memory usage for optimal sizing

## Security Checklist

- ✅ Strong `AUTH_SECRET` generated
- ✅ Database credentials secured
- ✅ PBX credentials secured
- ✅ HTTPS enabled (handled by Coolify)
- ✅ Environment variables not in code
- ✅ `.env` files in `.gitignore`

## Support

For issues or questions:
1. Check application logs in Coolify
2. Review this deployment guide
3. Check Next.js and Prisma documentation
4. Review PBX API documentation

## Version Information

- **Next.js**: 16.0.8
- **Node.js**: 22 (Alpine)
- **Prisma**: 6.19.1
- **Tailwind CSS**: 4.x
- **Database**: PostgreSQL

---

**Last Updated**: 2025-12-14
**Deployment Status**: ✅ Ready for Production
