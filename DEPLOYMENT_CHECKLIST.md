# Deployment Checklist

Use this checklist to ensure a successful deployment of your Next.js + Prisma application.

---

## Pre-Deployment

### Code Preparation
- [ ] All code committed to Git
- [ ] No sensitive data in codebase
- [ ] `.env` files in `.gitignore`
- [ ] Build succeeds locally (`npm run build`)
- [ ] Tests pass (if applicable)
- [ ] Linting passes (`npm run lint`)

### Configuration Files
- [ ] `Dockerfile` exists and is configured
- [ ] `.dockerignore` exists
- [ ] `next.config.ts` has `output: 'standalone'`
- [ ] `package.json` scripts are correct
- [ ] `prisma/schema.prisma` is up to date

### Environment Variables
- [ ] `AUTH_SECRET` generated (`openssl rand -base64 32`)
- [ ] `AUTH_URL` set to production domain
- [ ] `DATABASE_URL` configured
- [ ] All custom API keys added
- [ ] Environment variables documented

### Database
- [ ] Database created (PostgreSQL/MySQL)
- [ ] Database accessible from deployment platform
- [ ] Connection string tested
- [ ] Backup strategy planned

---

## Deployment Platform Setup

### Coolify
- [ ] Account created
- [ ] Project created
- [ ] Git repository connected
- [ ] Branch selected (e.g., `main`)
- [ ] Build pack set to "Docker"
- [ ] Dockerfile location set to `./Dockerfile`
- [ ] Port set to `3000`

### Environment Variables in Platform
- [ ] `DATABASE_URL` added
- [ ] `AUTH_SECRET` added
- [ ] `AUTH_URL` added
- [ ] `NODE_ENV=production` added
- [ ] All custom variables added
- [ ] **⚠️ Variables set BEFORE first deployment**

### Domain Configuration
- [ ] Custom domain added
- [ ] DNS records configured
- [ ] HTTPS/SSL enabled
- [ ] SSL certificate provisioned

---

## Deployment

### Build Process
- [ ] Deployment initiated
- [ ] Build logs monitored
- [ ] No build errors
- [ ] Native binaries installed successfully
- [ ] Prisma client generated
- [ ] Next.js build completed
- [ ] Docker image created

### Expected Build Warnings (Safe to Ignore)
- [ ] `SecretsUsedInArgOrEnv` warnings (expected)
- [ ] Optional native binary warnings (if fallback works)

### Build Time
- [ ] Build completed in reasonable time (5-15 minutes)
- [ ] No timeout errors

---

## Post-Deployment

### Database Migrations
- [ ] Container accessed successfully
- [ ] `npx prisma migrate deploy` executed
- [ ] Migrations applied successfully
- [ ] No migration errors

### Database Seeding (Optional)
- [ ] `npx prisma db seed` executed
- [ ] Initial data created
- [ ] Seed script completed successfully

### Application Health
- [ ] Application started successfully
- [ ] No runtime errors in logs
- [ ] Health endpoint responding (`/api/health`)
- [ ] Homepage loads correctly
- [ ] Authentication works

### Database Connection
- [ ] Database connection established
- [ ] Queries executing successfully
- [ ] No connection pool errors

### Functionality Testing
- [ ] User registration works
- [ ] User login works
- [ ] Protected routes work
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] File uploads work (if applicable)
- [ ] External API integrations work

---

## Monitoring & Verification

### Logs
- [ ] Application logs accessible
- [ ] No error messages
- [ ] No warning messages (or expected warnings only)
- [ ] Request logs showing activity

### Performance
- [ ] Page load times acceptable (< 3 seconds)
- [ ] API response times acceptable (< 500ms)
- [ ] No memory leaks
- [ ] CPU usage normal

### Security
- [ ] HTTPS working correctly
- [ ] SSL certificate valid
- [ ] No mixed content warnings
- [ ] Security headers present
- [ ] CORS configured correctly

---

## Backup & Recovery

### Backups
- [ ] Database backup configured
- [ ] Backup schedule set (daily recommended)
- [ ] Backup restoration tested
- [ ] Environment variables backed up securely

### Disaster Recovery
- [ ] Recovery procedure documented
- [ ] Rollback strategy defined
- [ ] Previous deployment version accessible

---

## Documentation

### Internal Documentation
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Database schema documented
- [ ] API endpoints documented

### Team Communication
- [ ] Team notified of deployment
- [ ] Deployment notes shared
- [ ] Known issues communicated
- [ ] Support contacts updated

---

## Post-Launch Monitoring (First 24 Hours)

### Hour 1
- [ ] Monitor error logs
- [ ] Check application health
- [ ] Verify database connections
- [ ] Test critical user flows

### Hour 6
- [ ] Review performance metrics
- [ ] Check for memory leaks
- [ ] Verify backup completion
- [ ] Review user feedback (if applicable)

### Hour 24
- [ ] Analyze usage patterns
- [ ] Review error rates
- [ ] Check database performance
- [ ] Verify all integrations working

---

## Troubleshooting Quick Reference

### Build Fails
1. Check build logs in deployment platform
2. Verify all environment variables are set
3. Ensure Dockerfile is correct
4. Try building locally with Docker
5. Clear build cache and retry

### Database Connection Fails
1. Verify `DATABASE_URL` is correct
2. Check database is running
3. Test connection from container
4. Check firewall rules
5. Verify database credentials

### Application Crashes
1. Check container logs
2. Verify all environment variables
3. Check database migrations ran
4. Verify Prisma client generated
5. Check for missing dependencies

### Performance Issues
1. Check database query performance
2. Review connection pool settings
3. Monitor memory usage
4. Check for N+1 queries
5. Review caching strategy

---

## Rollback Procedure

If deployment fails or critical issues arise:

1. **Immediate Actions**
   - [ ] Stop new deployment
   - [ ] Document the issue
   - [ ] Notify team

2. **Rollback Steps**
   - [ ] Revert to previous deployment
   - [ ] Verify previous version works
   - [ ] Check database state
   - [ ] Restore from backup if needed

3. **Post-Rollback**
   - [ ] Analyze failure cause
   - [ ] Fix issues in development
   - [ ] Test thoroughly
   - [ ] Plan re-deployment

---

## Success Criteria

Deployment is considered successful when:

- [ ] ✅ Application is accessible at production URL
- [ ] ✅ HTTPS is working correctly
- [ ] ✅ All core features are functional
- [ ] ✅ No critical errors in logs
- [ ] ✅ Database is connected and operational
- [ ] ✅ Authentication is working
- [ ] ✅ Performance is acceptable
- [ ] ✅ Monitoring is active
- [ ] ✅ Backups are configured
- [ ] ✅ Team is notified

---

## Next Steps After Successful Deployment

1. **Monitoring Setup**
   - Configure uptime monitoring
   - Set up error tracking (Sentry, etc.)
   - Enable performance monitoring
   - Configure alerts

2. **Optimization**
   - Review and optimize database queries
   - Implement caching where appropriate
   - Optimize images and assets
   - Review and improve performance

3. **Security Hardening**
   - Review security headers
   - Implement rate limiting
   - Configure WAF (if applicable)
   - Regular security audits

4. **Documentation**
   - Update API documentation
   - Document deployment process
   - Create runbooks for common issues
   - Document architecture decisions

---

## Contact & Support

**Deployment Issues**: Check logs and troubleshooting guide  
**Database Issues**: Verify connection and migrations  
**Performance Issues**: Review monitoring and optimize  

---

**Checklist Version**: 1.0.0  
**Last Updated**: 2025-12-15  
**Status**: Ready for Production Use
