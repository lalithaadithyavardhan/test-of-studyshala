# StudyShala Project File Structure

This document provides a comprehensive overview of the file structure for the StudyShala project. It covers the Node.js backend, the React frontend, and the React Native mobile application, incorporating details from the actual source files.

## 📂 Top-Level Directory

The project is organized into three main packages at the root:

```
studyshala/
├── 📁 studyshala-backend/   # Node.js + Express REST API
├── 📁 studyshala-frontend/  # React Web Application (for all roles)
└── 📁 studyshala-mobile/    # React Native Mobile App (student-focused)
```

---

## ⚙️ `studyshala-backend`

The backend is a Node.js and Express application that serves as the project's backbone. It manages API requests, user authentication via Google OAuth, interactions with the MongoDB database, and file storage integration with Google Drive.

```
studyshala-backend/
├── config/
│   ├── database.js       # MongoDB connection logic using Mongoose
│   └── passport.js       # Passport.js strategy for Google OAuth 2.0
├── controllers/
│   ├── authController.js   # Handles Google OAuth callback and user session management
│   ├── studentController.js# Logic for student actions (e.g., validating codes, fetching materials)
│   ├── facultyController.js# Logic for faculty actions (e.g., creating materials, uploading files)
│   └── adminController.js  # Logic for administrative tasks and dashboards
├── middleware/
│   ├── auth.js           # JWT verification and role-based access control (RBAC)
│   └── logging.js        # Middleware for logging actions to the database
├── models/
│   ├── User.js           # Mongoose schema for Users (students, faculty, admins)
│   ├── Folder.js         # Mongoose schema for Materials (folders) and their contained files
│   └── Log.js            # Mongoose schema for creating audit logs
├── routes/
│   ├── authRoutes.js     # Defines authentication endpoints (e.g., /api/auth/google)
│   ├── studentRoutes.js  # Defines API endpoints for student-specific features
│   ├── facultyRoutes.js  # Defines API endpoints for faculty-specific features
│   └── adminRoutes.js    # Defines API endpoints for admin-specific features
├── services/
│   └── driveService.js   # Handles all interactions with the Google Drive API (uploads, deletes)
├── utils/
│   ├── jwt.js            # Utility functions for creating and verifying JSON Web Tokens
│   └── logger.js         # Winston logger configuration for application-wide logging
├── .env.example          # Example environment variables required for the backend
├── package.json          # Lists all backend dependencies and scripts
└── server.js             # The main entry point for the application, sets up the Express server
```

---

## 🖥️ `studyshala-frontend`

The frontend is a React single-page application (SPA) providing a rich web interface for students, faculty, and administrators. It handles user interaction, data visualization, and communication with the backend API.

```
studyshala-frontend/
├── public/
│   └── index.html        # The base HTML file for the React application
├── src/
│   ├── api/
│   │   └── axios.js      # Pre-configured Axios instance for API calls with interceptors
│   ├── assets/           # Static assets like logos, images (e.g., logo.svg), and videos
│   ├── components/       # Reusable UI components used across various pages
│   │   └── FilePreviewModal.jsx # Modal for previewing files using Google Drive's viewer
│   ├── context/
│   │   └── AuthContext.jsx # React Context for managing global authentication state and user data
│   ├── pages/            # Components representing the different pages/routes of the application
│   │   ├── Login.jsx     # The main landing and login page for all user roles
│   │   ├── StudentDashboard.jsx
│   │   ├── FacultyDashboard.jsx
│   │   └── ...
│   ├── styles/           # Global and component-specific CSS files
│   │   └── BrowseMaterials.css # Styles for the file browsing interface
│   ├── App.jsx           # The root component that sets up React Router for navigation
│   └── index.js          # The entry point that renders the App component into the DOM
└── package.json          # Project dependencies and scripts for the frontend
```

---

## 📱 `studyshala-mobile`

The mobile application is built with React Native and Expo, providing a native experience primarily for students to access their study materials on the go.

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

---

## 📄 Other Key Files

These files are located at the project root and provide important information for developers and contributors.

```
studyshala/
├── README.md             # The main project README with an overview, features, and setup instructions
├── FILE_STRUCTURE.md     # (This file) A high-level overview of the project structure
└── ...
```