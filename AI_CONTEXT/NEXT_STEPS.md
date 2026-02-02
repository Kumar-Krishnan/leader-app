# Next Steps & TODO

## Current State (February 2026)

**Target: Demo Org** - Building toward organizational pilot.

The app is deployed on Netlify with core features working:
- Authentication
- Group system with join codes
- Real-time messaging
- Resources with folders/uploads
- Resource sharing across groups
- Role-based access
- HubSpot file sync (every 8 hours)
- Meetings with full CRUD, series, RSVP, skip
- Leader Hub with separated leader-only resources

## Immediate Priorities

### 1. Push Notifications (High Priority)
- [ ] Register for push tokens (expo-notifications installed)
- [ ] Store push tokens in profiles table
- [ ] Supabase Edge Function to send on new message
- [ ] Notification preferences UI (already in profile type)

### 2. Email Reminders (Medium Priority)
- [ ] Supabase Edge Function for meeting reminders
- [ ] Send 2-3 days before meetings
- [ ] Integration with Resend or similar

### 3. Polish & UX
- [ ] Loading skeletons instead of spinners
- [ ] Empty state illustrations
- [ ] Pull-to-refresh everywhere

## Completed Features

- [x] Meetings CRUD (full functionality)
- [x] Meeting series with editor
- [x] Meeting RSVP (single and series)
- [x] Skip meeting functionality
- [x] Resource sharing between groups
- [x] Leader Hub with leader-only resources
- [x] LeaderImpact branding/theme
- [x] Error handling improvements (logger, showAlert, ErrorBoundary)
- [x] Comprehensive test coverage (321 tests)

## iOS Deployment

### Prerequisites
1. Apple Developer Account ($99/year)
2. Xcode with iOS simulator runtime
3. EAS CLI: `npm install -g eas-cli`

### Steps
```bash
# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to TestFlight
eas submit --platform ios
```

## Known Issues / Tech Debt

1. **RLS Disabled**: Row Level Security is currently disabled for development. Need to re-enable with proper policies before production.

2. **Email Restriction**: Signup limited to 3 emails. Remove before public launch.

3. **No Offline Support**: App requires network connection.

4. **Web-only Deployment**: iOS/Android builds not yet configured.

## Feature Ideas (Future)

- [ ] Dark/light theme toggle
- [ ] Profile photo upload
- [ ] File attachments in messages
- [ ] Meeting reminders (local notifications)
- [ ] Calendar integration (Google/Apple)
- [ ] Search functionality
- [ ] Message reactions
- [ ] Polls in threads
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Export group data
- [ ] Archive old threads/meetings

## Deployment Checklist

Before going public:
1. [ ] Enable RLS with proper policies
2. [ ] Remove email restriction trigger
3. [ ] Set up proper Supabase backups
4. [ ] Configure custom domain on Netlify
5. [ ] Set up error monitoring (Sentry)
6. [ ] Add analytics (optional)
7. [ ] Test on multiple devices/browsers
8. [ ] Write user documentation
