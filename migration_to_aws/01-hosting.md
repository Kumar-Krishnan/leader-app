# Phase 1: Static Hosting — Netlify → S3 + CloudFront

## What We Have Now
- Netlify serves the Expo web build (`npx expo export --platform web`)
- SPA redirect: all routes → `/index.html` (status 200)
- Build output in `dist/`
- Config in `netlify.toml`

## AWS Setup

### S3 Bucket
1. Create an S3 bucket (e.g. `leader-app-web`)
2. Enable static website hosting
3. Set index document to `index.html`
4. Set error document to `index.html` (SPA fallback)
5. Block all public access (CloudFront will serve it via OAC)

### CloudFront Distribution
1. Create a CloudFront distribution with the S3 bucket as origin
2. Use Origin Access Control (OAC) so only CloudFront can read the bucket
3. Configure custom error responses:
   - 403 → `/index.html` with 200 status (SPA routing)
   - 404 → `/index.html` with 200 status
4. Add custom domain + ACM certificate (if applicable)
5. Enable gzip/brotli compression
6. Set cache behaviors:
   - `index.html` → `Cache-Control: no-cache` (always fresh)
   - `static/*`, `assets/*` → long-lived cache (hashed filenames)

### Deploy Script
```bash
#!/bin/bash
# build.sh
npx expo export --platform web

# Sync to S3
aws s3 sync dist/ s3://leader-app-web --delete

# Invalidate CloudFront cache for index.html
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DIST_ID \
  --paths "/index.html"
```

### CI/CD Option
- Use GitHub Actions to run the build + deploy on push to `main`
- Store `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_DIST_ID` as GitHub secrets
- Or use CodePipeline + CodeBuild if staying fully in AWS

## Environment Variables
- Update `APP_URL` from `https://leader-app.netlify.app` to your new CloudFront domain
- This URL is referenced in all email functions

## Rollback
- Keep Netlify configured until AWS hosting is verified
- DNS switch is the final cutover step
