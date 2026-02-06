# Security Audit: LeaderImpact App

**Date:** 2024  
**Scope:** Comprehensive security review of application codebase  
**Note:** SQL/RLS restrictions intentionally disabled during testing (excluded from audit)

---

## Executive Summary

This security audit identified **3 critical issues**, **4 high-priority issues**, and **11 medium-to-low priority issues** across authentication, authorization, API security, data handling, and long-term security posture.

**Immediate Action Required:**
1. Fix wildcard CORS policy
2. Add authentication to Edge Functions
3. Remove debug logging with sensitive data

---

## 🔴 Critical Issues

### 1. Wildcard CORS Policy

**Location:** `supabase/functions/_shared/cors.ts`

**Issue:**
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Risk:** Any website can make requests to your Edge Functions. This enables:
- CSRF attacks on authenticated endpoints
- Data exfiltration via malicious sites
- API abuse and quota exhaustion

**Impact:** High - All Edge Functions are vulnerable

**Recommendation:**
```typescript
const allowedOrigins = [
  'https://yourapp.netlify.app',
  'https://your-production-domain.com',
  // Add localhost only for development
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
];

export const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
});
```

**Effort:** Low

---

### 2. No Authentication on Edge Functions

**Locations:**
- `supabase/functions/hubspot-sync/index.ts`
- `supabase/functions/send-meeting-email/index.ts`
- `supabase/functions/generate-meeting-reminders/index.ts`

**Issue:** Edge Functions only check HTTP method, not caller identity:

```typescript
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
    });
  }
  // No authentication check!
```

**Risk:** Anyone who discovers the function URLs can:
- Trigger HubSpot syncs arbitrarily (rate limiting, billing issues)
- Send emails to arbitrary attendees (email bombing)
- Abuse SendGrid quota
- Generate meeting reminders for any meeting

**Impact:** High - All Edge Functions are publicly accessible

**Recommendation:**
```typescript
// Option 1: JWT verification (recommended)
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Option 2: Shared secret (for scheduled/cron jobs)
const secret = req.headers.get('X-API-Secret');
if (secret !== Deno.env.get('EDGE_FUNCTION_SECRET')) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
  });
}
```

**Effort:** Medium

---

### 3. Service Role Key Exposure Risk

**Location:** All Edge Functions using `SUPABASE_SERVICE_ROLE_KEY`

**Issue:** Edge Functions use service role key which bypasses all RLS:

```typescript
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
```

**Risk:** If any Edge Function has a vulnerability (SQL injection, SSRF, etc.), attackers could:
- Access all database data
- Modify any records
- Bypass all security controls

**Impact:** Critical - Full database access if compromised

**Recommendation:**
1. **Principle of Least Privilege:** Only use service role for operations that truly need it
2. **Separate Service Accounts:** Create dedicated service accounts with minimal required permissions
3. **Input Validation:** Strictly validate all inputs before database operations
4. **Audit Logging:** Log all service role operations for monitoring

**Example:**
```typescript
// Instead of service role everywhere, use RLS-aware client where possible
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${userJwt}`,
    },
  },
});
```

**Effort:** High (requires architectural changes)

---

## 🟠 High-Priority Issues

### 4. Client-Side Only Role Checks

**Location:** `src/contexts/AuthContext.tsx`, `src/contexts/GroupContext.tsx`

**Issue:** Role checks are only enforced client-side:

```typescript
const isLeader = profile?.role === 'leader' || profile?.role === 'admin';
const isAdmin = profile?.role === 'admin';
const isGroupLeader = currentGroup?.role === 'leader' || currentGroup?.role === 'admin';
```

**Risk:** A malicious user can:
- Modify JavaScript to bypass UI restrictions
- Make direct API calls ignoring role checks
- Access leader-only resources
- Perform admin operations

**Impact:** Critical (without RLS) - Full data access for any authenticated user

**Note:** You mentioned RLS is intentionally disabled during testing. This is acceptable for development but **must be enabled in production**.

**Long-term Recommendation:**
1. Implement comprehensive RLS policies that mirror role checks
2. Add server-side validation in Edge Functions
3. Use Supabase RLS to enforce:
   - Group membership requirements
   - Role-based access to resources
   - Leader-only visibility restrictions

**Example RLS Policy:**
```sql
-- Example: Only leaders can create groups
CREATE POLICY "Only leaders can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('leader', 'admin')
    )
  );
```

**Effort:** High (requires RLS implementation)

---

### 5. Predictable Group Code Generation

**Location:** `src/contexts/GroupContext.tsx:269`

**Issue:**
```typescript
const code = Math.random().toString(36).substring(2, 8).toUpperCase();
```

**Risk:** 
- `Math.random()` is not cryptographically secure
- With ~2.1 billion possibilities (36^6), brute-forcing is feasible
- Predictable codes enable unauthorized group access

**Impact:** Medium - Unauthorized group access

**Recommendation:**
```typescript
// Use Web Crypto API for secure random generation
function generateSecureGroupCode(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  const code = Array.from(array, b => b.toString(36))
    .join('')
    .substring(0, 6)
    .toUpperCase();
  return code;
}

const code = generateSecureGroupCode();
```

**Alternative:** Use a library like `nanoid` or generate on the server side.

**Effort:** Low

---

### 6. No Rate Limiting

**Locations:**
- Authentication endpoints (`signIn`, `signUp`)
- Group join requests (`requestToJoin`)
- Email sending (`sendMeetingEmail`)
- Edge Functions

**Issue:** No rate limiting on sensitive operations

**Risk:**
- Brute-force password attacks
- Group code enumeration
- Email bombing via meeting emails
- API quota exhaustion
- DoS attacks

**Impact:** High - Service availability and user security

**Recommendation:**
1. **Supabase Rate Limiting:** Configure in Supabase dashboard
2. **Edge Function Rate Limiting:** Implement in-function rate limiting:
```typescript
// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Usage
const clientId = req.headers.get('x-forwarded-for') || 'unknown';
if (!checkRateLimit(`signin:${clientId}`, 5, 15 * 60 * 1000)) {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
  });
}
```

3. **Cloudflare/WAF:** Use external rate limiting service

**Effort:** Medium

---

### 7. Meeting Confirmation Token in URL

**Location:** `supabase/functions/generate-meeting-reminders/index.ts:363`

**Issue:**
```typescript
const confirmationUrl = `${supabaseUrl}/functions/v1/meeting-confirmation-page?token=${token}`;
```

**Risk:** Tokens in URLs can leak via:
- Browser history
- Server access logs
- Referrer headers (when users click external links)
- Shared screenshots
- Browser extensions

**Impact:** Medium - Unauthorized meeting reminder access

**Recommendation:**
1. **POST-based token validation:** Use form submission instead of GET
2. **Single-use tokens:** Invalidate token after use
3. **Short expiration:** Already implemented (7 days), consider reducing to 24-48 hours
4. **Token in request body:** For POST requests, include token in body instead of URL

**Example:**
```typescript
// Generate token with shorter expiration
const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

// Use POST endpoint with token in body
const confirmationUrl = `${supabaseUrl}/functions/v1/meeting-confirmation-page`;
// Token sent in POST body, not URL
```

**Effort:** Medium

---

## 🟡 Medium-Priority Issues

### 8. Verbose Error Messages

**Location:** `src/screens/auth/SignInScreen.tsx:39-41`, `src/screens/auth/SignUpScreen.tsx:52-54`

**Issue:**
```typescript
if (error) {
  setError(error.message); // Shows detailed Supabase error
}
```

**Risk:** Detailed error messages can reveal:
- Valid vs. invalid email addresses (account enumeration)
- Database structure information
- Internal system details
- Attack surface information

**Impact:** Medium - Information disclosure

**Recommendation:**
```typescript
// Generic error messages for authentication
if (error) {
  // Don't reveal if email exists or not
  setError('Invalid email or password');
}

// Log detailed errors server-side only
logger.error('Sign in failed', { 
  email: email, // Only in server logs
  error: error.message 
});
```

**Effort:** Low

---

### 9. Weak Password Policy

**Location:** `src/screens/auth/SignUpScreen.tsx:42-45`

**Issue:**
```typescript
if (password.length < 6) {
  setError('Password must be at least 6 characters');
  return;
}
```

**Risk:** 6-character minimum is weak by modern standards

**Impact:** Medium - Account compromise risk

**Recommendation:**
```typescript
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }
  
  return { valid: true };
}
```

**Alternative:** Use a password strength library like `zxcvbn`.

**Effort:** Low

---

### 10. Debug Logging in Production

**Locations:** Throughout codebase (AuthContext, GroupContext, etc.)

**Issue:**
```typescript
console.log('[AuthContext] Got session:', !!session, session?.user?.email);
console.log('[GroupContext] User changed from', loadedUserId, 'to', user.id);
```

**Risk:** Sensitive data logged to browser console:
- User emails
- Session information
- Group codes
- User IDs
- Accessible to any JavaScript on the page
- May be captured by browser extensions
- Persists in browser history

**Impact:** Medium - Information disclosure

**Recommendation:**
```typescript
// Conditional logging
if (__DEV__ || process.env.NODE_ENV === 'development') {
  console.log('[AuthContext] Got session:', !!session);
  // Never log emails or sensitive data
}

// Use proper logging service with PII filtering
import { logger } from '../lib/logger';

logger.debug('AuthContext', 'Session updated', {
  hasSession: !!session,
  userId: session?.user?.id, // Hash or truncate in production
});
```

**Effort:** Low

---

### 11. No Input Validation on URL Resources

**Location:** `src/hooks/useResources.ts:499-526`

**Issue:**
```typescript
const createLinkResource = useCallback(async (
  title: string,
  url: string
): Promise<boolean> => {
  // No URL validation
  const { error: insertError } = await supabase
    .from('resources')
    .insert({
      url: url.trim(), // Direct insertion without validation
```

**Risk:** No URL validation allows:
- `javascript:` URLs (XSS when clicked)
- `file://` URLs (local file access attempts)
- `data:` URLs (potential XSS)
- Malformed URLs causing application errors

**Impact:** Medium - XSS and application errors

**Recommendation:**
```typescript
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Block localhost and private IPs if needed
    if (parsed.hostname === 'localhost' || parsed.hostname.startsWith('127.')) {
      return false; // Or allow based on requirements
    }
    return true;
  } catch {
    return false;
  }
}

// Usage
if (!isValidUrl(url.trim())) {
  setError('Please enter a valid HTTP or HTTPS URL');
  return false;
}
```

**Effort:** Low

---

### 12. XSS Risk in Email HTML Generation

**Location:** `supabase/functions/send-meeting-email/index.ts:146`

**Issue:**
```typescript
${meeting.description.replace(/\n/g, '<br>')}
```

**Risk:** If `meeting.description` isn't escaped before newline replacement, HTML could be injected.

**Note:** You do use `escapeHtml()` correctly in `html-utils.ts` with `nl2br()`, but it's used inconsistently.

**Impact:** Medium - Email XSS (less critical than web XSS, but still a concern)

**Recommendation:**
```typescript
// Always escape before any string manipulation
${escapeHtml(meeting.description).replace(/\n/g, '<br>')}

// Or use the utility function consistently
${nl2br(meeting.description)}
```

**Effort:** Low

---

### 13. Avatar Upload Path Traversal Risk

**Location:** `src/screens/main/ProfileScreen.tsx:77`

**Issue:**
```typescript
const fileName = `${profile?.id}/avatar.${ext}`;
```

**Risk:** If `profile.id` isn't validated as a UUID, a malicious value could potentially write to unintended paths.

**Impact:** Low - Profile IDs come from authenticated session, but defense in depth is important

**Recommendation:**
```typescript
// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

if (!profile?.id || !isValidUUID(profile.id)) {
  throw new Error('Invalid profile ID');
}

const fileName = `${profile.id}/avatar.${ext}`;
```

**Effort:** Low

---

## 🟢 Long-Term Security Considerations

### 14. Location Data Privacy

**Location:** `src/services/locationAnalytics.ts`

**Issue:** While coordinates are rounded to ~1km, location data is still collected.

**Considerations:**
- ~1km accuracy can still identify small towns
- Requires user consent notices (GDPR, CCPA compliance)
- Consider opt-in only with clear privacy disclosure
- Add data retention policies (auto-delete after X days)
- Consider additional privacy measures (differential privacy, k-anonymity)

**Recommendation:**
1. Add explicit consent flow before collecting location
2. Display privacy policy explaining data usage
3. Implement data retention (e.g., auto-delete after 90 days)
4. Consider increasing rounding to 2-3 decimal places for more privacy

**Effort:** Medium

---

### 15. No Session Management Controls

**Missing Features:**
- "Sign out everywhere" functionality
- Session timeout warnings
- Concurrent session limits
- Session activity audit log

**Recommendation:**
1. Track active sessions in database
2. Implement session revocation endpoint
3. Add session timeout (e.g., 30 days inactivity)
4. Show active sessions in user profile
5. Log session events for audit

**Effort:** Medium

---

### 16. Third-Party API Key Security

**Locations:** HubSpot and SendGrid API keys

**Current State:** Keys stored as environment variables (correct)

**Considerations:**
- Key rotation procedures
- Scoped API keys with minimal permissions
- Monitoring for anomalous usage
- Separate keys for dev/staging/production

**Recommendation:**
1. Document key rotation procedures
2. Use scoped API keys (SendGrid API keys can be scoped)
3. Set up alerts for unusual API usage
4. Rotate keys quarterly or after any security incident

**Effort:** Low (documentation and process)

---

### 17. Missing Security Headers

**Issue:** Web version lacks security headers

**Recommendation:** Add to `netlify.toml` or server configuration:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co;"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
```

**Effort:** Low

---

### 18. No Audit Logging

**Missing:** Audit trails for critical operations

**Operations to Log:**
- Member role changes
- Group creation/deletion
- Resource sharing decisions
- Email sending
- Authentication events (login, logout, failed attempts)
- Permission changes

**Recommendation:**
1. Create `audit_logs` table:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. Log critical operations:
```typescript
await supabase.from('audit_logs').insert({
  user_id: user.id,
  action: 'update_member_role',
  resource_type: 'group_member',
  resource_id: memberId,
  details: { oldRole, newRole },
  ip_address: req.headers.get('x-forwarded-for'),
});
```

**Effort:** Medium

---

## Summary Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 Critical | Wildcard CORS | Low | High |
| 🔴 Critical | No Edge Function Auth | Medium | High |
| 🔴 Critical | Service Role Key Usage | High | Critical |
| 🟠 High | Client-Side Only Role Checks | High | Critical* |
| 🟠 High | Predictable Group Codes | Low | Medium |
| 🟠 High | No Rate Limiting | Medium | High |
| 🟠 High | Token in URL | Medium | Medium |
| 🟡 Medium | Verbose Error Messages | Low | Medium |
| 🟡 Medium | Weak Password Policy | Low | Medium |
| 🟡 Medium | Debug Logging | Low | Medium |
| 🟡 Medium | URL Validation | Low | Medium |
| 🟡 Medium | XSS in Email HTML | Low | Medium |
| 🟡 Medium | Path Traversal Risk | Low | Low |

*Critical when RLS is disabled

---

## Immediate Action Plan

### Week 1 (Critical Fixes)
1. ✅ Fix CORS to whitelist specific domains
2. ✅ Add authentication to Edge Functions
3. ✅ Remove debug console.log statements with sensitive data

### Week 2 (High Priority)
4. ✅ Implement secure group code generation
5. ✅ Add rate limiting to authentication endpoints
6. ✅ Implement generic error messages for auth

### Week 3 (Medium Priority)
7. ✅ Strengthen password requirements
8. ✅ Add URL validation for link resources
9. ✅ Fix XSS in email HTML generation

### Ongoing (Long-term)
10. Implement comprehensive RLS policies
11. Add audit logging
12. Implement session management
13. Add security headers
14. Review and improve location data privacy

---

## Testing Recommendations

1. **Penetration Testing:** Engage security professionals for comprehensive testing
2. **Automated Security Scanning:** Use tools like:
   - Snyk for dependency vulnerabilities
   - OWASP ZAP for web app scanning
   - npm audit for package vulnerabilities
3. **Code Review:** Regular security-focused code reviews
4. **Security Monitoring:** Set up alerts for:
   - Failed authentication attempts
   - Unusual API usage patterns
   - Edge Function invocation patterns

---

## Compliance Considerations

- **GDPR:** Location data collection requires explicit consent
- **CCPA:** User data access and deletion rights
- **SOC 2:** Audit logging and access controls
- **HIPAA:** If handling health information, additional controls needed

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [CORS Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Next Review:** Quarterly or after major changes
