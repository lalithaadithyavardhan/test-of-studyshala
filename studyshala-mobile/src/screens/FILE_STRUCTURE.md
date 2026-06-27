# StudyShala Project File Structure

This document provides a high-level overview of the file structure for the StudyShala project, which is composed of three main parts: a Node.js backend, a React frontend for web, and a React Native mobile application.

## 📂 Top-Level Directory

The project root contains the three main packages:

```
studyshala/
├── 📁 studyshala-backend/   # Node.js + Express API
├── 📁 studyshala-frontend/  # React Web App
└── 📁 studyshala-mobile/    # React Native Mobile App
```

---

## ⚙️ `studyshala-backend`

The backend is a standard Node.js and Express application responsible for handling API requests, user authentication, database interactions, and file storage integration with Google Drive.

```
studyshala-backend/
├── config/
│   ├── database.js       # MongoDB connection logic
│   └── passport.js       # Passport.js configuration for Google OAuth 2.0
├── controllers/
│   ├── authController.js   # Handles user login, logout, and session management
│   ├── studentController.js# Logic for student-specific actions (accessing materials, etc.)
│   ├── facultyController.js# Logic for faculty actions (creating materials, uploading files)
│   └── adminController.js  # Logic for administrative tasks
├── middleware/
│   ├── auth.js           # JWT authentication and role-based access control
│   └── logging.js        # Middleware for logging requests and actions
├── models/
│   ├── User.js           # Mongoose schema for Users (students, faculty, admins)
│   ├── Folder.js         # Mongoose schema for Materials (Folders) and Files
│   └── Log.js            # Mongoose schema for audit logs
├── routes/
│   ├── authRoutes.js     # Defines authentication endpoints (e.g., /api/auth/google)
│   ├── studentRoutes.js  # Defines student-facing API endpoints
│   ├── facultyRoutes.js  # Defines faculty-facing API endpoints
│   └── adminRoutes.js    # Defines admin-facing API endpoints
├── services/
│   └── driveService.js   # Service for interacting with the Google Drive API (uploads, deletes)
├── utils/
│   ├── jwt.js            # Utility functions for creating and verifying JSON Web Tokens
│   └── logger.js         # Winston logger configuration for application-wide logging
├── .env.example          # Example environment variables
├── package.json          # Project dependencies and scripts
└── server.js             # Main application entry point, sets up Express server
```

---

## 🖥️ `studyshala-frontend`

The frontend is a React single-page application that provides the web interface for students, faculty, and administrators.

```
studyshala-frontend/
├── public/
│   └── index.html        # The HTML template for the SPA
├── src/
│   ├── api/
│   │   └── axios.js      # Axios instance with pre-configured base URL and interceptors
│   ├── assets/           # Static assets like images, logos, and icons
│   ├── components/       # Reusable UI components (e.g., Sidebar, Navbar, Modal)
│   ├── context/
│   │   └── AuthContext.jsx # React Context for managing global authentication state
│   ├── pages/            # Top-level components for each route/page of the application
│   │   ├── Login.jsx
│   │   ├── StudentDashboard.jsx
│   │   ├── FacultyDashboard.jsx
│   │   └── ...
│   ├── styles/           # Global CSS files and stylesheets
│   ├── App.jsx           # Root component, sets up React Router
│   └── index.js          # Application entry point, renders the App component
└── package.json          # Project dependencies and scripts
```

---

## 📱 `studyshala-mobile`

The mobile application is built with React Native (using Expo) and provides a native experience for students to access their materials.

```
studyshala-mobile/
├── src/
│   ├── api/
│   │   ├── client.js     # Axios instance mirroring the web app's configuration
│   │   ├── authApi.js    # Functions for authentication-related API calls
│   │   └── studentApi.js # Functions for student-specific API calls
│   ├── assets/           # Fonts, icons, and images used in the mobile app
│   ├── components/       # Reusable mobile components (e.g., FileListItem, MaterialCard)
│   ├── config/
│   │   └── config.js     # Configuration file for API URLs and other settings
│   ├── context/
│   │   └── AuthContext.jsx # Auth context for managing user sessions
│   ├── hooks/            # Custom React hooks for shared logic
│   ├── navigation/
│   │   └── AppNavigator.jsx# Main navigator using React Navigation (Tab and Stack)
│   ├── screens/          # Components for each screen in the mobile app
│   │   ├── LoginScreen.jsx
│   │   ├── DashboardScreen.jsx
│   │   ├── MaterialAccessScreen.jsx
│   │   └── FileViewerScreen.jsx # Screen for viewing different file types
│   └── utils/
│       └── fileActions.js# Helper functions for file previews and downloads
├── .env.example          # Example environment variables
├── app.json              # Expo application configuration
├── App.js                # Root component of the React Native application
└── package.json          # Project dependencies and scripts
```