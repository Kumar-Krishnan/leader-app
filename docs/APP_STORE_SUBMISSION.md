# App Store Submission Guide

## App Information

### App Name
**LeaderApp** (or your chosen name)

### Subtitle
*Connect and lead your community groups*

### Category
- Primary: Social Networking
- Secondary: Productivity

### Age Rating
4+ (No objectionable content)

---

## App Description

### Short Description (170 chars)
Connect with your community group. Share resources, schedule meetings, and communicate with members in one simple app.

### Full Description
LeaderApp helps community group leaders and members stay connected. Whether you're organizing study groups, community meetings, or team gatherings, LeaderApp provides the tools you need:

**For Leaders:**
• Create and manage groups with easy join codes
• Schedule events and track RSVPs
• Share resources and documents
• Manage member roles and permissions
• Communicate with your group through dedicated threads

**For Members:**
• Join groups using simple invite codes
• View upcoming events and RSVP
• Access shared resources
• Participate in group discussions
• Receive notifications for important updates

**Features:**
• Real-time messaging in group threads
• Calendar events with recurring meeting support
• File and link sharing with folder organization
• Role-based permissions (Admin, Leader, Helper, Member)
• Cross-platform support (iOS, Android, Web)

Perfect for:
- Study groups
- Community organizations
- Team meetings
- Volunteer coordination
- Any group that needs simple, effective communication

---

## Privacy Information

### App Privacy (Nutrition Label)

#### Data Collected

| Data Type | Collected | Linked to User | Used for Tracking |
|-----------|-----------|----------------|-------------------|
| Email Address | Yes | Yes | No |
| Name | Yes | Yes | No |
| Coarse Location | Yes | **No** | No |

#### Privacy Practices

**Email Address & Name**
- Collected: At registration
- Purpose: Account creation, user identification within groups
- Linked to User: Yes (required for account)

**Coarse Location**
- Collected: When app is opened (if permission granted)
- Purpose: Analytics - understanding geographic distribution of users
- **Linked to User: NO** - Location events are stored anonymously
- Precision: ~1 kilometer (rounded coordinates)
- Tracking: Not used for tracking

### Location Usage Explanation

This app collects approximate location data for analytics purposes only:

1. **What we collect**: Approximate location (~1km accuracy) when you open the app
2. **Why**: To understand which geographic regions use our app, helping us focus development and support efforts
3. **Privacy protection**: 
   - Location is NOT linked to your account
   - Coordinates are rounded to ~1km grid
   - We cannot identify individual users from this data
4. **Your choice**: Location permission is optional. The app works fully without it.

---

## Required Info.plist Keys

Add these to your `app.json` or `ios/Info.plist`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "LeaderApp collects your approximate location (within 1km) for anonymous analytics to help us understand where our users are located. This data is not linked to your account."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### Purpose String Best Practices

The location purpose string should:
- ✅ Explain what data is collected (approximate location)
- ✅ Explain why it's collected (analytics)
- ✅ Clarify privacy (not linked to account)
- ✅ Be honest and clear

---

## Privacy Policy Requirements

Your privacy policy must include:

### Section: Location Data

> **Location Information**
> 
> LeaderApp may collect approximate location data when you use the app. This data is collected for analytics purposes to help us understand the geographic distribution of our users.
> 
> **What we collect:**
> - Approximate location (accurate to approximately 1 kilometer)
> - Timestamp of when the app was opened
> - Device platform (iOS, Android, or web)
> 
> **What we DO NOT collect:**
> - Your precise location
> - Continuous location tracking
> - Location history linked to your account
> 
> **How it's stored:**
> Location events are stored anonymously. We do not link location data to your user account, email, name, or any other identifying information. This means we cannot determine where any specific user has been.
> 
> **Your choice:**
> Location collection is optional. If you deny location permission, the app will function normally. You can change your location permission at any time in your device settings.
> 
> **How we use this data:**
> - Understanding which regions have active users
> - Prioritizing features and support for high-usage areas
> - General business analytics
> 
> We do not sell, share, or transfer location data to third parties.

---

## App Store Review Notes

Include in "Notes for Review":

```
LOCATION PERMISSION:

This app requests location permission for anonymous analytics only.

Key points for review:
1. Location data is NOT linked to user accounts
2. We use Location.Accuracy.Low (~3km from device)
3. Coordinates are further rounded to 2 decimal places (~1km grid)
4. We store only: lat, lng, timestamp, platform, event_type
5. NO user_id is stored with location events
6. App functions fully without location permission
7. Purpose string clearly explains anonymous analytics use

The location_events database table intentionally has no user_id column to ensure location cannot be linked to specific users.

Test account:
Email: [provide test account]
Password: [provide password]
```

---

## Checklist Before Submission

### Technical
- [ ] App builds without errors
- [ ] App tested on physical device
- [ ] All features functional
- [ ] Crash-free for 24+ hours of testing
- [ ] Location permission works correctly
- [ ] App works without location permission

### App Store Connect
- [ ] App name finalized
- [ ] App icon uploaded (1024x1024)
- [ ] Screenshots for all required sizes
- [ ] App description written
- [ ] Keywords set
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] App Privacy questionnaire completed
- [ ] Age rating questionnaire completed

### Privacy
- [ ] Privacy policy includes location section
- [ ] Info.plist has location usage description
- [ ] Location permission optional (not blocking)
- [ ] Location data is actually anonymous (verified)

### Testing
- [ ] Test with location permission granted
- [ ] Test with location permission denied
- [ ] Verify location events appear in database
- [ ] Verify no user_id in location_events table

---

## App Privacy Questionnaire Answers

When filling out the App Privacy section in App Store Connect:

### "Does your app collect data?"
**Yes**

### Data Types Collected:

**Contact Info:**
- Email Address: Yes
  - Used for: App Functionality
  - Linked to User: Yes

**Identifiers:**
- User ID: Yes
  - Used for: App Functionality
  - Linked to User: Yes

**Location:**
- Coarse Location: Yes
  - Used for: Analytics
  - **Linked to User: No** ← Important!
  - Tracking: No

### "Do you use data for tracking?"
**No**

### "Is data linked to user identity?"
- Email, Name, User ID: **Yes**
- Coarse Location: **No**

---

## Screenshots Needed

### iPhone 6.7" (iPhone 15 Pro Max, 14 Pro Max)
1. Login/Welcome screen
2. Thread list
3. Thread conversation
4. Events/Meetings screen
5. Resources screen
6. Profile screen

### iPhone 6.5" (iPhone 14 Plus, 13 Pro Max)
Same 6 screenshots

### iPhone 5.5" (iPhone 8 Plus) - Optional but recommended
Same 6 screenshots

### iPad Pro 12.9"
Same 6 screenshots (if supporting iPad)

---

## Version History

### Version 1.0.0 (Initial Release)
- Group creation and management
- Thread-based messaging
- Event scheduling with RSVP
- Resource sharing with folders
- Member role management
- Anonymous location analytics

---

## Contact Information

**Developer Name:** [Your name or company]
**Email:** [support email]
**Website:** [your website]
**Privacy Policy URL:** [URL to privacy policy]
**Support URL:** [URL to support page]

