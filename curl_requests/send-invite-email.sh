#!/bin/bash
# Test the send-invite-email edge function directly.
#
# Usage:
#   ./curl_requests/send-invite-email.sh <JWT>
#
# Get your JWT from the app (console.log the session token) or from
# Supabase dashboard > Authentication > Users > select user > copy access token.
#
# The groupId, inviteeName, and inviteeEmail below are test defaults.
# Override any of them with env vars:
#   GROUP_ID="xxx" INVITEE_EMAIL="test@example.com" ./curl_requests/send-invite-email.sh <JWT>

set -euo pipefail

JWT="${1:?Usage: $0 <jwt_token>}"

SUPABASE_URL="https://ynmzmedihevwfdvlrlfg.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubXptZWRpaGV2d2ZkdmxybGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NDYzMDksImV4cCI6MjA4MzMyMjMwOX0.3p0yd2SsANrDNJA-TLxWezJ4UdEv0zvn_vG1rI0FgkY"

# Defaults — override with env vars
GROUP_ID="3697e8b3-c3cc-4599-ad3a-77994368f789"
INVITEE_NAME="Kumar Calanus"
INVITEE_EMAIL="kkrishnancalanus@gmail.com"

if [ -z "$GROUP_ID" ]; then
  echo "ERROR: GROUP_ID is required."
  echo "Usage: GROUP_ID=\"your-group-id\" $0 <jwt>"
  echo ""
  echo "Find your group ID in the app or Supabase dashboard > Table Editor > groups"
  exit 1
fi

echo ">>> Calling send-invite-email"
echo "    groupId:      $GROUP_ID"
echo "    inviteeName:  $INVITEE_NAME"
echo "    inviteeEmail: $INVITEE_EMAIL"
echo ""

curl -i -X POST \
  "${SUPABASE_URL}/functions/v1/send-invite-email" \
  -H "Authorization: Bearer ${JWT}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"groupId\": \"${GROUP_ID}\",
    \"inviteeName\": \"${INVITEE_NAME}\",
    \"inviteeEmail\": \"${INVITEE_EMAIL}\"
  }"

echo ""
