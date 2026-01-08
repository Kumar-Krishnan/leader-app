# Next Steps & TODO

## Immediate Priorities

### 1. CRUD Operations (High Priority)
The list views are done but users can't create/edit content yet.

**Threads:**
- [ ] Create thread modal/screen
- [ ] Add members to thread
- [ ] Thread detail screen with messages
- [ ] Real-time message updates
- [ ] Send message functionality

**Meetings:**
- [ ] Create meeting form
- [ ] Edit meeting
- [ ] Delete meeting
- [ ] Add passages to meeting
- [ ] Meeting detail view

**Resources:**
- [ ] Add resource form (title, type, URL/content, tags, visibility)
- [ ] Edit resource
- [ ] Delete resource
- [ ] Resource detail/preview

### 2. Real-time Messaging (High Priority)
- [ ] Subscribe to new messages in thread
- [ ] Typing indicators (optional)
- [ ] Read receipts (optional)
- [ ] Message notifications

### 3. Push Notifications (Medium Priority)
- [ ] Register for push tokens (expo-notifications already installed)
- [ ] Store push tokens in profiles table
- [ ] Send notifications on new message
- [ ] Notification preferences (already in profile)
- [ ] Supabase Edge Function or webhook for sending

### 4. Leader Features (Medium Priority)
- [ ] Share resource with specific leaders
- [ ] Leader-to-leader messaging
- [ ] Member management (add/remove from threads)

### 5. HubSpot Integration (Lower Priority)
- [ ] HubSpot API connection
- [ ] Sync contacts
- [ ] Store hubspot_contact_id in profiles
- [ ] Activity tracking

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

1. **Node version warnings**: React Native wants Node 20.19.4+, currently using 20.18.3. Works but shows warnings.

2. **Package version mismatches**: Some Expo packages have version warnings. Run `npx expo install --fix` to resolve.

3. **Web SecureStore**: Using localStorage fallback for web since SecureStore is native-only.

4. **No offline support**: App requires network connection. Could add offline caching later.

## Feature Ideas (Future)

- [ ] Dark/light theme toggle
- [ ] Profile photo upload
- [ ] File attachments in messages
- [ ] Meeting reminders (local notifications)
- [ ] Calendar integration
- [ ] Search functionality
- [ ] Message reactions
- [ ] Polls in threads

