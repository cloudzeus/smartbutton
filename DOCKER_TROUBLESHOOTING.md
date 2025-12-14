# Docker Build Troubleshooting

## Issue: Build fails with "npm run build" exit code 1

### Symptoms
```
ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

### Root Cause
Next.js requires certain environment variables during the build process (not just runtime). If these aren't available, the build will fail.

### Solution

#### In Coolify:

1. **Before deploying**, go to your application settings
2. Navigate to "Environment Variables" section
3. Add ALL required environment variables (see list below)
4. **Save** the environment variables
5. **Then** click "Deploy"

#### Required Environment Variables for Build:

```env
# Authentication (REQUIRED)
AUTH_SECRET=<your-secret-here>
AUTH_URL=https://your-domain.com

# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/database

# PBX Configuration (REQUIRED)
YEASTAR_BASE_URL=https://your-pbx-server.com
YEASTAR_CLIENT_ID=your_client_id
YEASTAR_CLIENT_SECRET=your_client_secret
YEASTAR_WEBSOCKET_SECRET=your_websocket_secret

# Google Cloud TTS (OPTIONAL - can be empty string if not using)
GOOGLE_APPLICATION_CREDENTIALS_JSON={}
```

### Why This Happens

Next.js performs several operations during build that require environment variables:
1. **Prisma Client Generation** - Needs `DATABASE_URL`
2. **Static Page Generation** - May need auth configuration
3. **API Route Compilation** - Validates environment variable usage

### Docker Warnings About Secrets

You may see warnings like:
```
SecretsUsedInArgOrEnv: Do not use ARG or ENV instructions for sensitive data
```

**These are safe to ignore** because:
- The secrets are only used during build time
- They are NOT stored in the final Docker image
- They are passed as build arguments and discarded after build
- The final image only has runtime environment variables

### Verification

After adding environment variables, you can verify they're being passed to the build by checking the build logs in Coolify. You should see:
```
✓ Compiled successfully
✓ TypeScript check passed
✓ Generating static pages
```

### Alternative: Local Docker Build Test

To test locally before deploying:

```bash
# Build the image with environment variables
docker build \
  --build-arg DATABASE_URL="your-database-url" \
  --build-arg AUTH_SECRET="your-auth-secret" \
  --build-arg AUTH_URL="http://localhost:3000" \
  --build-arg YEASTAR_BASE_URL="your-pbx-url" \
  --build-arg YEASTAR_CLIENT_ID="your-client-id" \
  --build-arg YEASTAR_CLIENT_SECRET="your-client-secret" \
  --build-arg YEASTAR_WEBSOCKET_SECRET="your-websocket-secret" \
  --build-arg GOOGLE_APPLICATION_CREDENTIALS_JSON="{}" \
  -t hotelsmartbutton .
```

If this succeeds locally, it will succeed in Coolify with the same environment variables.

### Still Having Issues?

1. **Check Coolify Logs**: Look for specific error messages in the build logs
2. **Verify Database**: Ensure the database is accessible from the build container
3. **Check Syntax**: Ensure no typos in environment variable names
4. **Prisma Issues**: If Prisma generation fails, check `DATABASE_URL` format

### Common Mistakes

❌ **Setting env vars AFTER deployment starts**
✅ Set env vars BEFORE clicking deploy

❌ **Missing required env vars**
✅ Add ALL required vars, even if some are empty

❌ **Wrong DATABASE_URL format**
✅ Use: `postgresql://user:password@host:5432/database`

❌ **Forgetting to save env vars in Coolify**
✅ Click "Save" after adding each variable

---

**Last Updated**: 2025-12-14
