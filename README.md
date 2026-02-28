# 📚 StudyShala

**StudyShala** is a modern, cloud-based study material management platform that connects faculty and students seamlessly. Faculty can upload and share educational resources, while students can access, save, and download materials using unique access codes — all without ever seeing Google Drive.

![StudyShala Logo](./csme6.svg)

---

## 🌟 Features

### For Students 👨‍🎓

- **🔑 Code-Based Access** — Enter a code provided by faculty to unlock study materials
- **💾 Save Materials** — Bookmark materials for permanent access without re-entering codes
- **⬇️ Direct Downloads** — Download files directly to your device for offline study
- **📚 My Materials** — Personal library of all saved materials with instant access
- **📜 Access History** — Complete log of all materials accessed with dates and codes
- **🔍 Smart Filters** — Filter by subject, semester, or faculty name
- **📱 Responsive Design** — Works perfectly on desktop, tablet, and mobile

### For Faculty 👨‍🏫

- **➕ Easy Material Creation** — Create materials with auto-generated unique access codes
- **📤 Bulk File Upload** — Upload multiple files at once via drag-and-drop interface
- **🗂️ Material Management** — View, preview, and manage all uploaded materials
- **📊 Access Analytics** — Track how many students have accessed each material
- **🔒 Secure Sharing** — Share materials with students using unique, time-limited codes
- **🗑️ Complete Control** — Delete materials and automatically revoke all student access
- **📋 Copy Codes** — One-click copy of access codes for easy sharing

### For Administrators ⚙️

- **👥 User Management** — Manage student and faculty accounts
- **📈 System Analytics** — Monitor platform usage and activity
- **🛡️ Role-Based Access** — Secure admin panel with email whitelist authentication
- **📝 Audit Logs** — Track all system actions and user activities

---

## 🎯 How It Works

### Student Workflow

```
1️⃣ Login with Google
   ↓
2️⃣ Enter Access Code (provided by faculty)
   ↓
3️⃣ Choose Action:
   • Save Material → Added to "My Materials" (permanent access)
   • Download Files → Download immediately (one-time access)
   ↓
4️⃣ Access saved materials anytime from "My Materials"
   (No code required after saving)
```

### Faculty Workflow

```
1️⃣ Login with Google
   ↓
2️⃣ Create Material
   • Enter faculty name, department, semester, subject
   • Auto-generated unique code (e.g., A3F9K2BX)
   ↓
3️⃣ Upload Files
   • Drag & drop multiple files
   • Files stored securely in Google Drive
   ↓
4️⃣ Share Code with Students
   • Copy code with one click
   • Students use code to access material
   ↓
5️⃣ Manage Materials
   • Preview files
   • Download files
   • View access statistics
   • Delete materials (removes access for all students)
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework for building interactive interfaces |
| **React Router v6** | Client-side routing and navigation |
| **Axios** | HTTP client for API communication |
| **CSS3** | Modern styling with CSS variables and animations |
| **Context API** | Global state management for authentication |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime for server-side logic |
| **Express.js** | Web framework for REST API |
| **MongoDB** | NoSQL database for storing user and material data |
| **Mongoose** | MongoDB ODM for schema validation |
| **Passport.js** | Authentication middleware with Google OAuth 2.0 |
| **JWT** | JSON Web Tokens for secure session management |
| **Multer** | Middleware for handling file uploads |
| **Google Drive API** | Cloud storage for uploaded files |
| **Winston** | Logging library for error tracking and audit logs |

### Infrastructure

- **Google OAuth 2.0** — Secure user authentication
- **Google Drive API** — Cloud file storage and management
- **JWT Sessions** — Stateless authentication with refresh tokens
- **MongoDB Atlas** — Cloud database hosting (recommended)

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js** v16+ and npm
- **MongoDB** (local or Atlas cloud)
- **Google Cloud Console** account (for OAuth and Drive API)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/studyshala.git
cd studyshala
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/studyshala
# or for Atlas: mongodb+srv://username:password@cluster.mongodb.net/studyshala

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Google Drive API
GOOGLE_DRIVE_CLIENT_ID=your-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-drive-client-secret
GOOGLE_DRIVE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Admin Emails (comma-separated)
ADMIN_EMAILS=admin@university.edu,admin2@university.edu

# Server
PORT=5000
NODE_ENV=development
```

**Start the backend:**

```bash
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Start the frontend:**

```bash
npm start
```

Frontend will run on `http://localhost:3000`

---

## 🔐 Google Cloud Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: **StudyShala**
3. Enable **Google+ API** and **Google Drive API**

### Step 2: OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Create **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback` (production)
5. Copy **Client ID** and **Client Secret** to `.env`

### Step 3: Google Drive API Setup

1. Create another **OAuth 2.0 Client ID** for Drive
2. Application type: **Desktop app** or **Web application**
3. Download credentials JSON
4. Run the following to get refresh token:

```bash
node scripts/get-drive-token.js
```

5. Copy the refresh token to `GOOGLE_DRIVE_REFRESH_TOKEN` in `.env`

---

## 📖 Usage Guide

### For Students

1. **Login**
   - Go to StudyShala homepage
   - Click "Sign in as Student with Google"
   - Select your Google account

2. **Access Material**
   - Click "🔑 Enter Code" from sidebar
   - Enter the 8-character code from your faculty
   - Click "🔓 Access Material"

3. **Save or Download**
   - **Save Material:** Click "💾 Save Material" to add to your library
   - **Download Files:** Click "⬇️ Download" on individual files

4. **Access Saved Materials**
   - Go to "📚 My Materials" from sidebar
   - Browse and download files anytime
   - No code required after saving

5. **View History**
   - Go to "📜 History" to see all accessed materials
   - Save materials from history if needed

### For Faculty

1. **Login**
   - Click "Sign in as Faculty with Google"
   - Enter your institution email

2. **Create Material**
   - Go to Dashboard
   - Click "➕ Create Material"
   - Fill in details:
     - **Faculty Name** (manual entry)
     - Department, Semester, Subject
     - Permission level
   - Click "Create"
   - **Access code is auto-generated**

3. **Upload Files**
   - Click "📤 Upload" on the material card
   - **Drag & drop files** into the blue zone
   - OR click to browse (supports multiple files)
   - Click "Upload N file(s)"
   - Files are uploaded to Google Drive automatically

4. **Share Code with Students**
   - Copy the access code from the material card
   - Share via email, WhatsApp, or LMS
   - Students use this code to access materials

5. **Manage Materials**
   - Go to "📚 My Materials" from sidebar
   - Preview files, download, or delete
   - View student access statistics

### For Admins

1. **Login**
   - Go to `/admin/login` (hidden link on main login)
   - Your email must be in `ADMIN_EMAILS` whitelist
   - Sign in with Google

2. **Manage Users**
   - View all students and faculty
   - Monitor activity logs
   - Manage roles and permissions

---

## 🗂️ Project Structure

```
studyshala/
├── backend/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── passport.js       # Google OAuth strategy
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── facultyController.js
│   │   └── adminController.js
│   ├── models/
│   │   ├── User.js           # User schema with savedMaterials & history
│   │   ├── Folder.js         # Material schema with files array
│   │   └── Log.js            # Audit log schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── facultyRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   └── driveService.js   # Google Drive integration
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── logging.js        # Audit logging
│   ├── utils/
│   │   ├── jwt.js
│   │   └── logger.js         # Winston logger
│   └── server.js             # Express app entry point
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── assets/
    │   │   └── logo.svg      # StudyShala logo
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── Card.jsx
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Modal.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── AdminLogin.jsx
    │   │   ├── AuthCallback.jsx
    │   │   ├── StudentEnterCode.jsx
    │   │   ├── StudentMaterialAccess.jsx
    │   │   ├── StudentSavedMaterials.jsx
    │   │   ├── StudentHistory.jsx
    │   │   ├── FacultyDashboard.jsx
    │   │   ├── FacultyMaterials.jsx
    │   │   └── AdminDashboard.jsx
    │   ├── api/
    │   │   └── axios.js
    │   ├── styles/
    │   │   └── global.css
    │   └── App.jsx
    └── package.json
```

---

## 🔒 Security Features

- **Google OAuth 2.0** — Secure institutional email authentication
- **JWT Tokens** — Stateless session management with 7-day expiry
- **Role-Based Access** — Student, Faculty, and Admin roles with strict route protection
- **Admin Whitelist** — Only pre-approved emails can access admin panel
- **Session Logout** — Full session destruction on logout (forces account picker on next login)
- **CORS Protection** — Cross-origin requests restricted to frontend domain
- **Input Validation** — All user inputs sanitized and validated
- **Audit Logs** — All critical actions logged with timestamps and user info
- **File Type Validation** — Only approved file types allowed for upload
- **Access Code Validation** — 8-character unique codes prevent unauthorized access

---

## 📊 Database Schema

### User Collection
```javascript
{
  googleId: String,
  name: String,
  email: String,
  role: 'student' | 'faculty' | 'admin',
  savedMaterials: [
    { materialId: ObjectId, savedAt: Date }
  ],
  accessHistory: [
    { materialId: ObjectId, accessCode: String, accessedAt: Date }
  ],
  profilePicture: String,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Folder Collection
```javascript
{
  facultyId: ObjectId,
  facultyName: String,
  subjectName: String,
  department: String,
  semester: String,
  accessCode: String,  // e.g., "A3F9K2BX"
  permission: 'view' | 'comment' | 'edit',
  files: [
    {
      name: String,
      mimeType: String,
      size: Number,
      driveFileId: String,
      uploadedAt: Date,
      uploadedBy: ObjectId
    }
  ],
  accessCount: Number,
  active: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Create production MongoDB database (MongoDB Atlas)
2. Set environment variables on hosting platform
3. Deploy backend:

```bash
git push heroku main
# or
railway up
```

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:

```bash
npm run build
```

2. Deploy to Vercel:

```bash
vercel --prod
```

3. Set environment variables:
   - `REACT_APP_API_URL=https://your-backend.herokuapp.com/api`

---

## 🐛 Troubleshooting

### Common Issues

**1. "MongoDB connection failed"**
- Check if MongoDB is running: `mongod`
- Verify `MONGO_URI` in `.env`

**2. "Google OAuth callback error"**
- Ensure redirect URI in Google Console matches `.env`
- Check that Google+ API is enabled

**3. "File upload failed"**
- Verify Google Drive API credentials
- Check `GOOGLE_DRIVE_REFRESH_TOKEN` is valid
- Ensure Drive API is enabled in Google Console

**4. "Invalid code" error for students**
- Ensure faculty created material and got access code
- Check if material is marked as `active: true` in database
- Verify code is exactly 8 characters and uppercase

**5. "Access denied" for admin**
- Verify your email is in `ADMIN_EMAILS` whitelist
- Check email is exact match (case-sensitive)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👥 Authors

- **Your Name** — Initial work and architecture
- **Contributors** — See [Contributors](https://github.com/yourusername/studyshala/contributors)

---

## 🙏 Acknowledgments

- Built with ❤️ for students and educators
- Powered by Google Drive for secure cloud storage
- Inspired by the need for simple, accessible study material sharing

---

## 📞 Support

For issues, questions, or feature requests:
- 📧 Email: support@studyshala.edu
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/studyshala/issues)
- 📖 Documentation: [Wiki](https://github.com/yourusername/studyshala/wiki)

---

## 🎓 Made with StudyShala

**StudyShala** — Empowering education through seamless material sharing.

*"Learn Together, Grow Together"*

---

**Version:** 6.0.0  
**Last Updated:** February 2026  
**Status:** Production Ready ✅
