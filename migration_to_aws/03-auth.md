# Phase 3: Auth — Supabase Auth → Cognito

## What We Have Now
- Email/password only (no OAuth providers)
- Supabase Auth manages JWTs with auto-refresh
- Session stored in SecureStore (native) / localStorage (web)
- DB trigger creates a `profiles` row on signup
- DB trigger `migrate_placeholder_to_user` links placeholder members to real accounts on signup
- Safari workaround for `navigator.locks` stale-lock bug
- Auth service abstracted behind `AuthService` interface in `src/services/auth/`

## AWS Setup

### Cognito User Pool
1. Create a User Pool with:
   - Email as the sign-in attribute
   - Password policy matching current requirements
   - Email verification enabled (Cognito sends verification email automatically)
   - `full_name` as a custom attribute (or use the built-in `name` attribute)

2. Create an App Client:
   - Enable `ALLOW_USER_PASSWORD_AUTH` flow
   - No client secret (public client for mobile/web)
   - Token expiration settings to match current behavior

3. Create an Identity Pool (for S3 direct access if needed):
   - Federated with the User Pool
   - Authenticated role with S3 access policy

### Post-Confirmation Lambda Trigger
Replaces the Supabase DB trigger that creates a `profiles` row and migrates placeholders:

```typescript
// Lambda: cognito-post-confirmation
export const handler = async (event) => {
  if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
    const { sub, email, "custom:full_name": fullName } = event.request.userAttributes;

    // 1. Create profile in DynamoDB
    await dynamodb.put({
      TableName: "profiles",
      Item: {
        id: sub,
        email,
        full_name: fullName,
        role: "standard",
        created_at: new Date().toISOString(),
      },
    });

    // 2. Migrate placeholder profiles (same logic as migrate_placeholder_to_user RPC)
    // Find placeholder_profiles with matching email
    // Update group_members: set user_id, clear placeholder_id
    // Update meeting_attendees: set user_id, clear placeholder_id
  }

  return event; // Must return the event object
};
```

### Cognito Authorizer for API Gateway
- Attach a Cognito User Pool Authorizer to your API Gateway
- This replaces Supabase's JWT verification in edge functions
- The authorizer automatically validates the JWT and injects `claims` into Lambda context

## Client-Side Changes

### New Cognito Auth Service
Create `src/services/auth/cognitoAuthService.ts`:

```typescript
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// Or use aws-amplify Auth module for simpler API:
// import { signIn, signUp, signOut, fetchAuthSession } from 'aws-amplify/auth';

export class CognitoAuthService implements AuthService {
  async getSession(): Promise<Session | null> {
    // Retrieve stored tokens, check expiration, refresh if needed
  }

  onAuthStateChange(callback): Unsubscribe {
    // Cognito doesn't have a built-in listener like Supabase
    // Options:
    //   a) Use Amplify Hub: Hub.listen('auth', callback)
    //   b) Wrap token refresh logic to emit events manually
  }

  async signUp(email, password, metadata): Promise<AuthResult> {
    // CognitoIdentityProviderClient.send(new SignUpCommand({...}))
    // User will need to verify email before sign-in
  }

  async signIn(email, password): Promise<AuthResult> {
    // InitiateAuthCommand with USER_PASSWORD_AUTH flow
    // Store tokens in SecureStore / localStorage
  }

  async signOut(): Promise<void> {
    // Clear local tokens + call GlobalSignOut
  }
}
```

### Token Storage
- Keep using SecureStore (native) and localStorage (web) — same as now
- Store: `idToken`, `accessToken`, `refreshToken`
- The Safari `navigator.locks` workaround can likely be removed (it was Supabase-specific)

### Swap in AuthContext
In `src/contexts/AuthContext.tsx`:
- Replace `import { supabaseAuthService }` with `import { cognitoAuthService }`
- The rest of the context logic stays the same since it uses the `AuthService` interface

## User Migration

### Option A: Force Password Reset (Simplest)
- Export user emails from Supabase
- Bulk-create users in Cognito with `FORCE_CHANGE_PASSWORD` status
- Users reset their password on first login
- Notify users via email before cutover

### Option B: Cognito User Migration Lambda (Seamless)
- Configure a "Migrate User" trigger on the Cognito User Pool
- On first login attempt, the Lambda:
  1. Calls Supabase Auth to verify the email/password
  2. If valid, creates the user in Cognito and returns success
  3. Subsequent logins go directly through Cognito
- This allows gradual, invisible migration

```typescript
// Lambda: cognito-user-migration
export const handler = async (event) => {
  if (event.triggerSource === "UserMigration_Authentication") {
    const { userName, password } = event.request;

    // Verify against Supabase Auth
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: userName, password }),
    });

    if (res.ok) {
      const data = await res.json();
      event.response.userAttributes = {
        email: userName,
        email_verified: "true",
        "custom:full_name": data.user.user_metadata.full_name,
        "custom:supabase_id": data.user.id, // Keep for data migration mapping
      };
      event.response.finalUserStatus = "CONFIRMED";
      event.response.messageAction = "SUPPRESS";
    }
  }
  return event;
};
```

**Recommendation: Option B** — seamless for users, no password reset needed, and allows running both systems in parallel during transition.

## Environment Variables
- Remove: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Add: `EXPO_PUBLIC_COGNITO_USER_POOL_ID`, `EXPO_PUBLIC_COGNITO_CLIENT_ID`, `EXPO_PUBLIC_COGNITO_REGION`
- Add (if using Identity Pools): `EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID`
