# StudyShala Mobile — Setup Guide

This folder is a new Expo app: `studyshala-mobile`. Place it as a **sibling**
folder next to `studyshala-backend` and `studyshalaFrontend` in your existing
project root — do not create a separate project.

```
studyshala/
├── studyshala-backend/      (existing — needs 3 small additions below)
├── studyshalaFrontend/      (existing — untouched)
└── studyshala-mobile/       (this folder)
```

## 1. Install dependencies

```bash
cd studyshala-mobile
npm install
```

## 2. Backend changes required (3 small additions, nothing existing is touched)

Your backend already issues a never-expiring JWT after Google OAuth and
verifies it via `Authorization: Bearer <token>` on every protected route —
that part needs ZERO changes. The only gap is that your current `/api/auth/google`
flow is a **browser redirect** (`passport-google-oauth20`), which doesn't work
for native sign-in. We add ONE new endpoint that accepts a Google ID token
from the Expo app directly and reuses your existing user-creation/role logic.

### 2a. Install `google-auth-library` in the backend

```bash
cd studyshala-backend
npm install google-auth-library
```

### 2b. Add `GOOGLE_ANDROID_CLIENT_ID` to your backend `.env`

You need a **second** OAuth client in Google Cloud Console (your existing
`GOOGLE_CLIENT_ID` is a Web client; Android needs its own client ID tied to
your app's package name + SHA-1 fingerprint). Steps:

1. Google Cloud Console → APIs & Services → Credentials
2. Create Credentials → OAuth client ID → Android
3. Package name: `com.studyshala.app` (matches `app.json`)
4. SHA-1: get it via `eas credentials` (after EAS setup) or
   `keytool -list -v -keystore ~/.android/debug.keystore` for local dev builds
5. Add to `studyshala-backend/.env`:

```
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

Note: the **Web client ID** (`GOOGLE_CLIENT_ID`, already in your `.env`) is
what goes into the mobile app's `app.json` as `googleWebClientId` — this is
correct and required by `@react-native-google-signin/google-signin` even on
Android (it's how the ID token gets issued in a verifiable way).

### 2c. New file: `studyshala-backend/controllers/mobileAuthController.js`

```js
const { OAuth2Client } = require('google-auth-library');
const { generateToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

const client = new OAuth2Client();

const googleMobileLogin = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'idToken is required' });
    }

    const chosenRole = ['student', 'faculty', 'admin'].includes(role) ? role : 'student';

    const ticket = await client.verifyIdToken({
      idToken,
      audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID],
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();

    // Admin access guard — identical logic to config/passport.js
    if (chosenRole === 'admin') {
      const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      if (!adminEmails.includes(email)) {
        logger.warn(`Blocked admin mobile login attempt: ${email}`);
        return res.status(403).json({ message: 'not_admin' });
      }
    }

    let user = await User.findOne({ googleId: payload.sub });

    if (user) {
      // Never downgrade an existing admin — same rule as config/passport.js
      if (user.role !== 'admin') {
        user.role = chosenRole;
      }
      user.lastLogin = new Date();
      await user.save();
      logger.info(`Mobile login: ${email} as ${user.role}`);
    } else {
      user = new User({
        googleId: payload.sub,
        name: payload.name,
        email: payload.email,
        role: chosenRole,
        profilePicture: payload.picture,
        lastLogin: new Date(),
      });
      await user.save();
      logger.info(`New mobile user: ${email} as ${chosenRole}`);
    }

    const token = generateToken(user);
    await User.findByIdAndUpdate(user._id, { token });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        profilePicture: user.profilePicture,
        tourCompleted: user.tourCompleted || false,
        phase2TourCompleted: user.phase2TourCompleted || false,
      },
    });
  } catch (error) {
    logger.error(`Mobile Google auth error: ${error.message}`);
    res.status(401).json({ message: 'Google authentication failed' });
  }
};

module.exports = { googleMobileLogin };
```

### 2d. Edit `studyshala-backend/routes/authRoutes.js`

Add this import near the top, alongside the existing `authController` import:

```js
const mobileAuthController = require('../controllers/mobileAuthController');
```

Add this route anywhere among the other `router.*` lines (no `authenticate`
middleware — the user isn't logged in yet, that's the point of this route):

```js
router.post('/google/mobile', mobileAuthController.googleMobileLogin);
```

That's it. Nothing else in your backend changes. All your existing routes
(`facultyRoutes`, `studentRoutes`, `adminRoutes`, etc.) already accept the
`Authorization: Bearer <token>` header via the existing `authenticate`
middleware — the mobile app's token works on every existing endpoint with
zero further changes.

## 3. Google Cloud Console checklist

- [ ] Existing Web OAuth client (already have this) → copy its Client ID into
      `app.json` as `googleWebClientId`
- [ ] New Android OAuth client → package `com.studyshala.app` + SHA-1 from EAS
      or your debug keystore (this client ID is NOT used directly in the app —
      Google Sign-In on Android finds it automatically via package name + SHA-1)
- [ ] Add `GOOGLE_ANDROID_CLIENT_ID` to backend `.env` (used only for the
      `audience` check when verifying tokens)

## 4. Update `app.json`

Replace the placeholder values:

```json
"extra": {
  "apiUrl": "https://your-actual-backend.onrender.com/api",
  "googleWebClientId": "your-actual-web-client-id.apps.googleusercontent.com"
}
```

## 5. Run it

```bash
npx expo start
```

Scan the QR code with Expo Go on your Android device, or press `a` to open
an Android emulator (Google Sign-In requires a real device or an emulator
with Google Play Services — not all emulator images have this).

## 6. What's included vs. what's a starting point

**Fully wired to your real backend routes:**
- Login (native Google Sign-In, role picker)
- Student: enter code, view material files (with download + star), saved
  materials, access history, starred files
- Faculty: dashboard (list/create materials), material detail (upload files
  via document picker, delete files)
- Admin: stats overview + user list (activate/deactivate)
- Shared: browse materials

**Verify before relying on it:**
- `src/api/shared.js` — the browse-materials endpoint is a best guess based
  on the folder structure (`/admin/browse`). Check
  `studyshalaFrontend/src/pages/BrowseMaterials.jsx` to confirm the real
  endpoint non-admin roles use, and update if different.
- Admin screen only covers stats + user activation — `adminRoutes.js` has many
  more endpoints (courses, feedback, announcements, settings, reports) you
  can wire up the same way as you extend the app.
- `app.json` icon/splash paths point to `./assets/...` — add actual image
  files there before building, or remove those keys to use Expo defaults.

## 7. Why login will now persist

Your backend's JWT never expires (by design, per `utils/jwt.js`). This app
stores it in `expo-secure-store` (Android Keystore-backed) instead of a
browser's localStorage. Once a user signs in once, the token stays on the
device indefinitely — through app restarts, phone reboots, everything —
until they explicitly tap "Sign out". No more repeat logins.
