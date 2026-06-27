# 📱 StudyShala Mobile App File Structure

This document provides a detailed overview of the file structure for the `studyshala-mobile` React Native application. The app is built with Expo and provides a native experience for students and faculty.

---

## 📂 `studyshala-mobile`

The mobile application is built with React Native and Expo, providing a native experience primarily for students to access their study materials on the go. It also includes dashboard functionality for faculty members.

```
studyshala-mobile/
├── src/
│   ├── api/
│   │   ├── client.js     # Axios instance configured for mobile, with Expo SecureStore for JWTs
│   │   ├── authApi.js    # Functions for authentication-related API calls
│   │   └── studentApi.js # Functions for student-specific API calls
│   ├── assets/           # Fonts, icons, and images used within the mobile app
│   ├── components/       # Reusable mobile UI components (e.g., SidebarDrawer, FileListItem)
│   ├── config/
│   │   └── config.js     # Configuration file for API URLs and other settings
│   ├── context/
│   │   └── AuthContext.jsx # Auth context for managing user sessions and authentication state
│   ├── hooks/            # Custom React hooks for shared logic (e.g., entry animations)
│   ├── navigation/
│   │   └── AppNavigator.jsx# Main navigator using React Navigation (Tab and Stack navigators)
│   ├── screens/          # Components for each screen in the mobile app
│   │   ├── LoginScreen.jsx
│   │   ├── DashboardScreen.jsx
│   │   ├── FacultyDashboardScreen.jsx # Dashboard for faculty users on mobile
│   │   ├── MaterialAccessScreen.jsx
│   │   └── FileViewerScreen.jsx # Advanced screen for viewing various file types (PDF, Office, media)
│   └── utils/
│       └── fileActions.js# Helper functions for file previews and downloads
├── .env.example          # Example environment variables for the mobile app
├── app.json              # Expo application configuration file
├── App.js                # The root component of the React Native application
└── package.json          # Project dependencies and scripts for the mobile app
```