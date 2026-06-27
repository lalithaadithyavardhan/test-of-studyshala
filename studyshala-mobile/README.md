# StudyShala Mobile — Student App

A React Native (Expo) mobile app implementing the **complete student
experience** from your `studyshalaFrontend` website, wired to talk to your
**real** `studyshala-backend` (verified directly from your backend source
in Google Drive — exact routes, exact response shapes, exact auth flow).

## What's included

| Website page                  | Mobile screen                          | Backend route(s) used |
|--------------------------------|-----------------------------------------|------------------------|
| `Login.jsx`                   | `LoginScreen.jsx`                       | `GET /api/auth/google` |
| `AuthCallback.jsx`             | (built into `LoginScreen.jsx`)          | redirect from `googleCallback` |
| `StudentDashboard.jsx`        | `DashboardScreen.jsx`                   | `GET /api/student/recent-files` |
| `StudentEnterCode.jsx`        | `EnterCodeScreen.jsx`                   | `POST /api/student/validate-code` |
| `StudentMaterialAccess.jsx`   | `MaterialAccessScreen.jsx`              | `GET /api/student/materials/:id/files`, save/star endpoints |
| `StudentSavedMaterials.jsx`   | `SavedMaterialsScreen.jsx`              | `GET/DELETE /api/student/saved-materials` |
| `StudentStarred.jsx`          | `StarredScreen.jsx`                     | `GET/POST/DELETE /api/student/starred-files` |
| `StudentHistory.jsx`          | `HistoryScreen.jsx`                     | `GET /api/student/access-history` |

Plus: `AuthContext`, an axios client with the **exact same cold-start-safe
401 handling** as your website's `axios.js`, file preview/download via
Google Drive links, star/save/recent tracking, and bottom-tab navigation.

## ⚠️ Before you run this — 1 required edit

Open **`src/config/config.js`** and set:

```js
export const API_BASE_URL = 'https://YOUR_BACKEND.onrender.com';
```

to your actual Render backend URL. Everything else (`API_URL`, the OAuth
URL, etc.) is derived from this automatically.

## ⚠️ Important: Google OAuth flow caveat

Your backend's real `authRoutes.js` / `authController.js` do **browser-redirect
OAuth via Passport sessions** — not a native `id_token` exchange. There is
**no `mobileAuthController.js` wired into routes** in your current live
backend (even though it was in your original folder listing — it may be
unused/in-progress).

This app handles login by opening an **in-app browser** to
`/api/auth/google`, letting the user sign in with Google normally, and then
detecting the backend's redirect to:

```
${FRONTEND_URL}/auth-callback?token=...&user=...
```

This works **today, with zero backend changes**, as long as your backend's
`FRONTEND_URL` environment variable points somewhere reachable. If you want
a more "native app" feel (no browser flash, auto-return to the app), the
cleanest fix is to add a `studyshala://auth-callback` deep link as an
additional allowed redirect in your backend, e.g.:

```js
// in authController.js googleCallback(), conditionally:
const redirectBase = req.query.platform === 'mobile'
  ? 'studyshala://auth-callback'
  : `${process.env.FRONTEND_URL}/auth-callback`;
```

and pass `?platform=mobile` from `GOOGLE_AUTH_URL` in `config.js`. This is
optional — the app works without it.

## Setup

```bash
cd studyshala-mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android), or press `a` / `i` for an
emulator.

## Project structure

```
studyshala-mobile/
├── App.js
├── app.json
├── babel.config.js
├── eas.json
├── package.json
└── src/
    ├── api/
    │   ├── client.js          # axios instance, mirrors website's axios.js
    │   ├── authApi.js
    │   └── studentApi.js      # 1:1 mapping to studentRoutes.js
    ├── components/
    │   ├── FileListItem.jsx
    │   └── MaterialCard.jsx
    ├── config/
    │   └── config.js          # <-- EDIT THIS FILE
    ├── context/
    │   └── AuthContext.jsx
    ├── navigation/
    │   └── AppNavigator.jsx
    ├── screens/
    │   ├── LoginScreen.jsx
    │   ├── SplashScreen.jsx
    │   ├── DashboardScreen.jsx
    │   ├── EnterCodeScreen.jsx
    │   ├── MaterialAccessScreen.jsx
    │   ├── SavedMaterialsScreen.jsx
    │   ├── StarredScreen.jsx
    │   └── HistoryScreen.jsx
    └── utils/
        └── fileActions.js     # preview/download via Drive links
```

## Notes on data accuracy

Every API call, request body, and response field in this app was copied
directly from your **real backend source code** (`studentController.js`,
`authController.js`, `studentRoutes.js`, `authRoutes.js`,
`middleware/auth.js`), read from your Google Drive folder
`test-of-studyshala-version-16.2/studyshala-backend`. Nothing here is
guessed — except the production base URL, which lives in your `.env` and
isn't committed to the repo (correctly), so that one field is the only
thing you need to supply.

## Not yet built (faculty/admin)

Per your request, this build covers **student-only** features. Faculty
(`FacultyDashboard`, `FacultyMaterials`) and Admin (`AdminDashboard`,
`AdminCoursesView`) screens are not included — say the word and I'll build
those next using the same approach (pulling exact routes from
`facultyController.js` / `adminController.js` in your Drive).



npx expo start --dev-client