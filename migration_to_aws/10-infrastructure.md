# Phase 10: Infrastructure as Code

## Recommended Tool: AWS CDK (TypeScript)

Since the app is already TypeScript, CDK is a natural fit. It lets you define all AWS resources in code, version-controlled alongside the app.

Alternative: Terraform or SAM if you prefer.

## Project Structure

```
infrastructure/
├── bin/
│   └── app.ts                    # CDK app entry point
├── lib/
│   ├── hosting-stack.ts          # S3 + CloudFront
│   ├── auth-stack.ts             # Cognito User Pool + Identity Pool
│   ├── database-stack.ts         # DynamoDB tables + GSIs
│   ├── api-stack.ts              # API Gateway + Lambda functions
│   ├── email-stack.ts            # SES domain verification + email Lambdas
│   ├── realtime-stack.ts         # WebSocket API Gateway + connection Lambdas
│   ├── cron-stack.ts             # EventBridge rule + reminder Lambda
│   └── storage-stack.ts          # S3 buckets for resources + avatars
├── lambda/
│   ├── profiles/
│   ├── groups/
│   ├── members/
│   ├── threads/
│   ├── messages/
│   ├── meetings/
│   ├── resources/
│   ├── email/
│   ├── reminders/
│   ├── realtime/
│   └── auth-triggers/            # Cognito post-confirmation, user migration
├── package.json
├── tsconfig.json
└── cdk.json
```

## Stack Overview

### Hosting Stack
```typescript
const bucket = new s3.Bucket(this, "WebBucket", {
  websiteIndexDocument: "index.html",
  websiteErrorDocument: "index.html",
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
});

const distribution = new cloudfront.Distribution(this, "WebDistribution", {
  defaultBehavior: { origin: new origins.S3Origin(bucket) },
  errorResponses: [
    { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" },
    { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
  ],
});
```

### Auth Stack
```typescript
const userPool = new cognito.UserPool(this, "UserPool", {
  selfSignUpEnabled: true,
  signInAliases: { email: true },
  autoVerify: { email: true },
  standardAttributes: { fullname: { required: true, mutable: true } },
  lambdaTriggers: {
    postConfirmation: postConfirmationLambda,
    userMigration: userMigrationLambda, // For seamless Supabase migration
  },
});

const userPoolClient = userPool.addClient("AppClient", {
  authFlows: { userPassword: true, userSrp: true },
  generateSecret: false,
});
```

### Database Stack
```typescript
// Example: one of ~15 tables
const meetingsTable = new dynamodb.Table(this, "Meetings", {
  partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // For realtime broadcasting
});

meetingsTable.addGlobalSecondaryIndex({
  indexName: "group-index",
  partitionKey: { name: "group_id", type: dynamodb.AttributeType.STRING },
  sortKey: { name: "start_time", type: dynamodb.AttributeType.STRING },
});
```

### API Stack
```typescript
const api = new apigatewayv2.HttpApi(this, "Api", {
  corsPreflight: {
    allowOrigins: ["https://your-domain.com"],
    allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
    allowHeaders: ["Authorization", "Content-Type"],
  },
});

const authorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer("CognitoAuth", userPool.userPoolProviderUrl, {
  jwtAudience: [userPoolClient.userPoolClientId],
});

// Add routes
api.addRoutes({
  path: "/groups/{groupId}/meetings",
  methods: [apigatewayv2.HttpMethod.GET],
  integration: new apigatewayv2Integrations.HttpLambdaIntegration("MeetingsGet", meetingsLambda),
  authorizer,
});
```

## Deployment

```bash
# First time setup
cd infrastructure
npm install
npx cdk bootstrap

# Deploy all stacks
npx cdk deploy --all

# Deploy a specific stack
npx cdk deploy AuthStack

# Preview changes
npx cdk diff
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-infra:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: cd infrastructure && npm ci && npx cdk deploy --all --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: us-east-1

  deploy-web:
    needs: deploy-infra
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx expo export --platform web
      - run: aws s3 sync dist/ s3://${{ secrets.WEB_BUCKET }} --delete
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/index.html"
```

## Estimated AWS Costs (Small App)

| Service | Estimated Monthly Cost |
|---|---|
| S3 + CloudFront (hosting) | $1-5 |
| Cognito (first 50k users free) | $0 |
| DynamoDB (on-demand) | $1-5 |
| Lambda (first 1M requests free) | $0-2 |
| API Gateway | $1-3 |
| SES (first 62k emails free from EC2) | $0-1 |
| EventBridge | $0 (negligible) |
| WebSocket API | $0-1 |
| **Total** | **~$3-17/month** |

Compare to current: Supabase Pro ($25/month) + Netlify free/pro + SendGrid.
