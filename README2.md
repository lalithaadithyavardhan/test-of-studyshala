# 📚 StudyShala

### Centralized Engineering Study Material Management Platform

StudyShala is a modern academic resource platform that enables engineering institutions to distribute, manage, and access study materials through a secure, curriculum-driven ecosystem.

Instead of maintaining expensive file storage infrastructure, StudyShala seamlessly integrates with Google Drive, allowing faculty members to publish resources directly from their institutional accounts while students gain instant access through secure access codes.

---

## 🚀 Why StudyShala?

Educational institutions often struggle with:

* Scattered study materials across WhatsApp groups
* Broken or expired file links
* Poor version control
* Unorganized subject resources
* Difficult faculty-to-student distribution workflows

StudyShala solves these challenges by creating a single, structured portal for academic content management.

---

## ✨ Key Features

### 🔐 Secure Authentication

* Google OAuth 2.0 Login
* JWT-Based Authentication
* Role-Based Access Control (RBAC)
* Protected Routes & APIs
* Admin Email Whitelisting

### 📂 Material Management

* Upload materials directly to Google Drive
* Automatic Access Code Generation
* Curriculum-Based Organization
* Secure Download Links
* Material Revocation System

### 👨‍🏫 Faculty Portal

* Bulk Material Upload
* Student Access Analytics
* Material Lifecycle Management
* Instant Resource Publishing

### 👨‍🎓 Student Portal

* Access Materials Using Codes
* Save Materials Permanently
* Download Resources
* Access History Tracking
* Personal Learning Library

### 🛡 Administration

* User Management Dashboard
* Faculty Monitoring
* Student Monitoring
* Audit Logs
* Security Controls

---

# 🏗 Architecture Overview

```text
┌─────────────────┐
│  Web Frontend   │
│   React 18      │
└────────┬────────┘
         │
         │ HTTPS / REST API
         ▼
┌─────────────────┐
│ Node.js Backend │
│    Express.js   │
└───────┬─────────┘
        │
 ┌──────┴──────────┐
 │                 │
 ▼                 ▼

MongoDB Atlas   Google Drive
(Metadata)      (File Storage)
```

### System Design Philosophy

StudyShala separates metadata from actual file storage.

| Layer           | Responsibility    |
| --------------- | ----------------- |
| React Web App   | User Interface    |
| Expo Mobile App | Mobile Experience |
| Express Backend | Business Logic    |
| MongoDB         | Metadata Storage  |
| Google Drive    | File Storage      |

This architecture keeps infrastructure costs extremely low while maintaining scalability.

---

# 🛠 Technology Stack

## Frontend (Web)

* React 18
* React Router v6
* Axios
* Tailwind CSS

## Mobile Application

* React Native
* Expo Go
* JavaScript

## Backend

* Node.js
* Express.js

## Database

* MongoDB Atlas
* Mongoose

## Authentication

* Passport.js
* Google OAuth 2.0
* JWT

## Cloud Storage

* Google Drive API v3
* Multer

---

# 📁 Project Structure

```text
# 📱 StudyShala Mobile

StudyShala Mobile is a React Native application designed for students and faculty to manage, upload, access, and download academic materials.

---

# 📂 Project Structure studyshala-mobile

# 📂 StudyShala Backend
# 📂 StudyShala - Complete Project Structure

```text
StudyShala/
│
├── studyshala-backend/
│   │
│   ├── config/
│   │   ├── database.js
│   │   └── passport.js
│   │
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── facultyController.js
│   │   ├── feedbackController.js
│   │   ├── mobileAuthController.js
│   │   ├── statsController.js
│   │   ├── storageController.js
│   │   └── studentController.js
│   │
│   ├── logs/
│   │   ├── combined.log
│   │   └── error.log
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   └── logging.js
│   │
│   ├── models/
│   │   ├── Announcement.js
│   │   ├── Feedback.js
│   │   ├── Folder.js
│   │   ├── Log.js
│   │   ├── SystemSettings.js
│   │   ├── User.js
│   │   └── Visit.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── announcementRoutes.js
│   │   ├── authRoutes.js
│   │   ├── facultyRoutes.js
│   │   ├── feedbackRoutes.js
│   │   ├── statsRoutes.js
│   │   ├── storageRoutes.js
│   │   └── studentRoutes.js
│   │
│   ├── scripts/
│   │   └── seed.js
│   │
│   ├── services/
│   │   ├── driveService.js
│   │   └── watermarkService.js
│   │
│   ├── utils/
│   │   ├── wt.js
│   │   └── logger.js
│   │
│   ├── node_modules/
│   │
│   ├── .env.example
│   ├── package-lock.json
│   ├── package.json
│   └── server.js
│
├── studyshala-mobile/
│   │
│   ├── .expo/
│   ├── android/
│   ├── assets/
│   ├── dist/
│   ├── node_modules/
│   │
│   ├── src/
│   │   │
│   │   ├── api/
│   │   │   ├── authApi.js
│   │   │   ├── client.js
│   │   │   ├── facultyApi.js
│   │   │   └── studentApi.js
│   │   │
│   │   ├── components/
│   │   │   ├── FileListItem.jsx
│   │   │   ├── MaterialCard.jsx
│   │   │   ├── RoleSwitchButton.jsx
│   │   │   ├── SidebarDrawer.jsx
│   │   │   └── theme.js
│   │   │
│   │   ├── config/
│   │   │   └── config.js
│   │   │
│   │   ├── configs/
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── navigation/
│   │   │   └── AppNavigator.jsx
│   │   │
│   │   ├── screens/
│   │   │   ├── CreateMaterialScreen.jsx
│   │   │   ├── DashboardScreen.jsx
│   │   │   ├── EnterCodeScreen.jsx
│   │   │   ├── FacultyDashboardScreen.jsx
│   │   │   ├── FacultyMaterialDetailsScreen.jsx
│   │   │   ├── FacultyMaterialsScreen.jsx
│   │   │   ├── FILE_STRUCTURE.md
│   │   │   ├── FileViewerScreen.jsx
│   │   │   ├── HistoryScreen.jsx
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── MaterialAccessScreen.jsx
│   │   │   ├── MOBILE_APP_STRUCTURE.md
│   │   │   ├── PROJECT_STRUCTURE.md
│   │   │   ├── SavedMaterialsScreen.jsx
│   │   │   ├── SplashScreen.jsx
│   │   │   ├── StarredScreen.jsx
│   │   │   └── UploadFilesScreen.jsx
│   │   │
│   │   └── utils/
│   │       └── fileActions.js
│   │
│   ├── .gitignore
│   ├── App.js
│   ├── app.json
│   ├── babel.config.js
│   ├── eas.json
│   ├── package-lock.json
│   └── package.json
│
├── studyshalaFrontend/
│   │
│   ├── public/
│   │   ├── _redirects
│   │   └── manifest.json
│   │
│   ├── src/
│   │   │
│   │   ├── api/
│   │   │   └── axios.js
│   │   │
│   │   ├── assets/
│   │   │
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── FileManager.css
│   │   │   ├── FileManager.jsx
│   │   │   ├── FilePreviewModal.css
│   │   │   ├── FilePreviewModal.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── MessageBanner.css
│   │   │   ├── MessageBanner.jsx
│   │   │   ├── Modal.css
│   │   │   ├── Modal.jsx
│   │   │   ├── Navbar.css
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.css
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StorageWidget.css
│   │   │   ├── StorageWidget.jsx
│   │   │   ├── TourTooltip.css
│   │   │   └── TourTooltip.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── AdminCoursesView.css
│   │   │   ├── AdminCoursesView.jsx
│   │   │   ├── AdminDashboard.css
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── AuthCallback.jsx
│   │   │   ├── BrowseMaterials.css
│   │   │   ├── BrowseMaterials.jsx
│   │   │   ├── FacultyDashboard.css
│   │   │   ├── FacultyDashboard.jsx
│   │   │   ├── FacultyMaterials.css
│   │   │   ├── FacultyMaterials.jsx
│   │   │   ├── Login.css
│   │   │   ├── Login.jsx
│   │   │   ├── LoginDev.jsx
│   │   │   ├── StudentDashboard.css
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── StudentEnterCode.css
│   │   │   ├── StudentEnterCode.jsx
│   │   │   ├── StudentHistory.css
│   │   │   ├── StudentHistory.jsx
│   │   │   ├── StudentMaterialAccess.css
│   │   │   ├── StudentMaterialAccess.jsx
│   │   │   ├── StudentSavedMaterials.css
│   │   │   ├── StudentSavedMaterials.jsx
│   │   │   ├── StudentStarred.css
│   │   │   └── StudentStarred.jsx
│   │   │
│   │   ├── styles/
│   │   │   └── global.css
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```


```









---

# 📁 Root Files

| File | Purpose |
|--------|---------|
| App.js | Application entry point |
| app.json | Expo application configuration |
| babel.config.js | Babel transpilation configuration |
| eas.json | Expo Application Services configuration |
| package.json | Project dependencies and scripts |
| package-lock.json | Dependency lock file |
| .gitignore | Git ignored files and folders |

---

# 📁 src/api

Handles API communication between the mobile application and backend services.

| File | Purpose |
|--------|---------|
| authApi.js | Authentication APIs |
| client.js | Axios/API client configuration |
| facultyApi.js | Faculty-related API requests |
| studentApi.js | Student-related API requests |

---

# 📁 src/components

Reusable UI components used across screens.

| File | Purpose |
|--------|---------|
| FileListItem.jsx | Displays individual file items |
| MaterialCard.jsx | Material display card component |
| RoleSwitchButton.jsx | Role switching UI component |
| SidebarDrawer.jsx | Navigation drawer component |

---

# 📁 src/theme

Application-wide theme configuration.

Contains:

- Colors
- Typography
- Spacing
- Component styling constants

---

# 📁 src/config

Stores application configuration values.

Examples:

- API URLs
- Environment variables
- Global constants

---

# 📁 src/configs

Additional configuration files and settings used by the application.

---

# 📁 src/context

Global state management using React Context.

| File | Purpose |
|--------|---------|
| AuthContext.jsx | Authentication state management |

---

# 📁 src/navigation

Navigation configuration for the application.

| File | Purpose |
|--------|---------|
| AppNavigator.jsx | Main navigation stack and routes |

---

# 📁 src/screens

Application screens.

| File | Purpose |
|--------|---------|
| CreateMaterialScreen.jsx | Create new study material |
| DashboardScreen.jsx | Main dashboard |
| EnterCodeScreen.jsx | Material access using code |
| FacultyDashboardScreen.jsx | Faculty dashboard |
| FacultyMaterialDetailsScreen.jsx | Material details view for faculty |
| FacultyMaterialsScreen.jsx | Faculty materials listing |
| FileViewerScreen.jsx | File viewing screen |
| HistoryScreen.jsx | Material access history |
| LoginScreen.jsx | User authentication |
| MaterialAccessScreen.jsx | Material access page |
| SavedMaterialsScreen.jsx | Saved materials |
| SplashScreen.jsx | Initial loading screen |
| StarredScreen.jsx | Starred/favorite materials |
| UploadFilesScreen.jsx | File upload functionality |

### Documentation Files

| File | Purpose |
|--------|---------|
| FILE_STRUCTURE.md | Folder structure documentation |
| MOBILE_APP_STRUCTURE.md | Mobile architecture documentation |
| PROJECT_STRUCTURE.md | Complete project documentation |

---

# 📁 src/utils

Utility functions used throughout the application.

| File | Purpose |
|--------|---------|
| fileActions.js | File operations and helper functions |

---

# 🚀 Features

## Student Features

- Login Authentication
- Material Access via Code
- View Materials
- Download Files
- Save Materials
- Star Materials
- View History
- File Preview

## Faculty Features

- Upload Files
- Create Materials
- Manage Materials
- View Material Details
- Dashboard Analytics
- Share Access Codes

---

# 🏗 Architecture

```text
UI Screens
    │
    ▼
Components
    │
    ▼
Navigation
    │
    ▼
Context (Auth)
    │
    ▼
API Layer
    │
    ▼
Backend Server
```

---

# 🛠 Tech Stack

- React Native
- Expo
- React Navigation
- Axios
- Context API
- JavaScript (ES6+)

---

# 📌 Notes

- Supports Student and Faculty roles.
- Uses reusable component architecture.
- API layer separated from UI.
- Context API used for authentication management.
- Modular folder structure for scalability.
```

---

# 🔄 How It Works

## Faculty Workflow

1. Login using Google OAuth
2. Select academic hierarchy
3. Upload study materials
4. Files are stored in Google Drive
5. Access code is generated automatically
6. Students receive access code

---

## Student Workflow

1. Login to StudyShala
2. Enter access code
3. Access authorized materials
4. Download or save resources
5. View history anytime

---

# 🔐 Security

StudyShala follows a security-first architecture:

* OAuth-Based Authentication
* JWT Session Tokens
* Role-Based Authorization
* Protected API Routes
* Secure File Access
* Audit Logging
* Admin Whitelisting
* CORS Restrictions

---

# 📈 What Makes StudyShala Different?

### 💰 Near-Zero Storage Cost

Unlike traditional LMS platforms, StudyShala does not duplicate files into expensive cloud storage systems.

### ☁ Google Drive Native Integration

Faculty continue using familiar Google Drive workflows while gaining centralized management.

### 📱 Multi-Platform Experience

* Web Application
* Mobile Application
* Shared Backend Infrastructure

### 🎓 Curriculum-Aware Design

Resources are automatically organized using:

```text
Branch
 └── Year
      └── Semester
             └── Subject
```

This mirrors actual engineering academic structures.

---

# ⚙️ Installation

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Mobile

```bash
cd mobile
npm install
npx expo start
```

---

# 🌍 Environment Variables

## Backend

```env
PORT=
MONGO_URI=
JWT_SECRET=
JWT_EXPIRE=
FRONTEND_URL=

ADMIN_EMAILS=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
GOOGLE_DRIVE_REFRESH_TOKEN=
```

## Frontend

```env
REACT_APP_API_URL=
```

## Mobile

```env
EXPO_PUBLIC_API_URL=
```

---

# 🔮 Future Roadmap

* Material Recommendation Engine
* Redis Caching Layer
* Push Notifications
* Offline Material Access
* Advanced Analytics Dashboard
* Multi-Department Support
* AI-Powered Search
* Faculty Collaboration Workspaces

---

# 🎯 Vision

StudyShala aims to become the unified academic resource hub for engineering institutions by combining modern cloud architecture, secure access control, and seamless faculty-student collaboration.

> One Platform. One Repository. Unlimited Learning.
