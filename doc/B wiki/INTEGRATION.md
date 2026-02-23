# Frontend-Backend Integration Guide

## Complete Setup (Both Running Together)

### Prerequisites
- Node.js installed
- MongoDB installed and running
- Google OAuth credentials

---

## Step 1: Backend Setup

### 1.1 Navigate to Backend
```bash
cd csms-backend
```

### 1.2 Install Dependencies
```bash
npm install
```

### 1.3 Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csms
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your-session-secret
```

### 1.4 Start MongoDB
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows - start MongoDB service from Services
```

### 1.5 Seed Database (Optional but Recommended)
```bash
npm run seed
```

This creates:
- 1 Admin user
- 3 Faculty users
- 10 Student users
- 6 Sample folders

### 1.6 Start Backend
```bash
npm run dev
```

✅ Backend running on http://localhost:5000

---

## Step 2: Frontend Setup

### 2.1 Navigate to Frontend (New Terminal)
```bash
cd csms-frontend
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Start Frontend
```bash
npm run dev
```

✅ Frontend running on http://localhost:3000

---

## Step 3: Testing the Integration

### 3.1 Using Development Login (No Backend Required)

1. Open http://localhost:3000
2. You'll see the development login page
3. Click any of the quick login buttons:
   - 👨‍🎓 Login as Student
   - 👨‍🏫 Login as Faculty
   - 👨‍💼 Login as Admin
4. Explore the dashboards!

**Note:** This uses mock data. No backend calls are made.

### 3.2 Using Real Google OAuth (Backend Required)

#### A. Switch to Production Login

Edit `csms-frontend/src/App.jsx`:
```javascript
const USE_DEV_LOGIN = false;  // Change to false
```

#### B. Test OAuth Flow

1. Restart frontend: `npm run dev`
2. Open http://localhost:3000
3. Click "Sign in with Google"
4. You'll be redirected to Google
5. Sign in with your Google account
6. Backend will create your user
7. You'll be redirected back with JWT token
8. Access dashboard based on your role!

#### C. Default Role Assignment

By default (in `config/passport.js`):
- Emails with "admin" → Admin role
- Emails with "faculty" or "prof" → Faculty role
- All others → Student role

**Customize this in:** `csms-backend/config/passport.js`

---

## Step 4: Using Seeded Data

If you ran `npm run seed`, you have test accounts:

### Admin Account
- **Email:** admin@csms.edu
- **Google ID:** admin-test-001

### Faculty Account
- **Email:** john.smith@csms.edu
- **Google ID:** faculty-test-001

### Student Account
- **Email:** student1@csms.edu
- **Google ID:** student-test-001
- **Dept Code:** CSE101

**Note:** These are database entries. To use them, you need to either:
1. Manually create JWT tokens, OR
2. Sign in with Google using these emails (if they exist)

---

## Architecture Overview

```
Frontend (Port 3000)              Backend (Port 5000)
┌─────────────────────┐          ┌──────────────────────┐
│                     │          │                      │
│  React App          │◄────────►│  Express Server      │
│  - Components       │  HTTP    │  - Routes            │
│  - Pages            │  Requests│  - Controllers       │
│  - Context (Auth)   │          │  - Middleware        │
│                     │          │                      │
│  Axios (API calls)  │          │  Passport (OAuth)    │
│  - Interceptors     │          │  JWT (Auth)          │
│  - Token in header  │          │                      │
└─────────────────────┘          └──────────────────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │                  │
                                 │  MongoDB         │
                                 │  - Users         │
                                 │  - Folders       │
                                 │  - Logs          │
                                 │                  │
                                 └──────────────────┘
```

---

## API Request Flow

### Example: Faculty Creates Folder

```
1. User clicks "Create Material" in frontend
   │
   ▼
2. Frontend shows modal form
   │
   ▼
3. User fills form and submits
   │
   ▼
4. Frontend sends POST request:
   POST http://localhost:3000/api/faculty/folders
   (Vite proxy forwards to http://localhost:5000/api/faculty/folders)
   Headers: { Authorization: Bearer <JWT> }
   Body: { department, semester, subjectName, ... }
   │
   ▼
5. Backend receives request
   │
   ▼
6. Auth middleware verifies JWT
   │
   ▼
7. Role middleware checks user is faculty
   │
   ▼
8. Controller creates folder in Google Drive
   │
   ▼
9. Controller saves folder to MongoDB
   │
   ▼
10. Backend responds with folder data
    │
    ▼
11. Frontend updates UI with new folder
```

---

## Testing Each Dashboard

### Testing Student Dashboard

1. **Development Mode:**
   - Click "Login as Student"
   - Enter any dept code: "CSE101"
   - Browse materials

2. **Production Mode:**
   - Sign in with Google
   - If admin, change your role to student via admin dashboard
   - Or create new Google account

### Testing Faculty Dashboard

1. **Development Mode:**
   - Click "Login as Faculty"
   - Click "Create Material"
   - Fill form and submit
   - See it in your materials (won't actually create Drive folder)

2. **Production Mode:**
   - Sign in with email containing "faculty"
   - Create real material (creates real Drive folder!)
   - Delete material (deletes Drive folder)

### Testing Admin Dashboard

1. **Development Mode:**
   - Click "Login as Admin"
   - View statistics
   - Browse users table
   - Try search and pagination

2. **Production Mode:**
   - Sign in with email containing "admin"
   - View real statistics from database
   - Manage real users
   - Deactivate/Remove users

---

## Environment Comparison

### Development Mode (USE_DEV_LOGIN = true)
- ✅ No backend needed
- ✅ Quick testing
- ✅ Mock data
- ❌ No real database
- ❌ No Google Drive
- ❌ No persistence

### Production Mode (USE_DEV_LOGIN = false)
- ✅ Real authentication
- ✅ Real database
- ✅ Google Drive integration
- ✅ Full features
- ❌ Requires backend setup
- ❌ Requires Google OAuth

---

## Common Integration Issues

### Issue: "Network Error" in Frontend

**Cause:** Backend not running or wrong URL

**Solution:**
```bash
# Check backend is running
curl http://localhost:5000/health

# Check proxy in frontend's vite.config.js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

### Issue: "401 Unauthorized"

**Cause:** No token or invalid token

**Solution:**
```javascript
// Check localStorage in browser console
localStorage.getItem('token')
localStorage.getItem('user')

// Clear and login again
localStorage.clear()
location.reload()
```

### Issue: CORS Error

**Cause:** Backend CORS not configured for frontend URL

**Solution:**
Check `server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',  // Must match frontend
  credentials: true
}));
```

### Issue: OAuth Redirect Mismatch

**Cause:** Callback URL in Google Console doesn't match

**Solution:**
1. Google Console → Credentials
2. Edit OAuth Client
3. Authorized redirect URIs must include:
   `http://localhost:5000/api/auth/google/callback`

---

## Production Deployment

### Backend Deployment (e.g., Heroku, Railway, Render)

1. Set environment variables
2. Use production MongoDB (MongoDB Atlas)
3. Update Google OAuth redirect URIs
4. Deploy

### Frontend Deployment (e.g., Vercel, Netlify)

1. Build: `npm run build`
2. Set backend API URL
3. Deploy
4. Update CORS in backend for production URL

---

## Monitoring & Debugging

### Backend Logs
```bash
# Watch logs in real-time
tail -f csms-backend/logs/combined.log

# Check error logs
tail -f csms-backend/logs/error.log
```

### Frontend Console
```javascript
// Open browser DevTools (F12)
// Check Console for errors
// Check Network tab for API calls
```

### MongoDB
```bash
mongosh
use csms
db.users.find()
db.folders.find()
db.logs.find().sort({createdAt: -1}).limit(5)
```

---

## Success Checklist

- [ ] MongoDB running
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Health check returns OK
- [ ] Can login with development mode
- [ ] Can login with Google OAuth (production)
- [ ] Faculty can create folders
- [ ] Students can view materials
- [ ] Admin can see stats and users
- [ ] Dark mode works
- [ ] Responsive on mobile

---

## 🎉 You're All Set!

Both frontend and backend are now integrated and working together!

**Quick Links:**
- Frontend: http://localhost:3000
- Backend Health: http://localhost:5000/health
- MongoDB: mongodb://localhost:27017/csms

**Need Help?**
- Check logs: `csms-backend/logs/combined.log`
- Check console: Browser DevTools (F12)
- Verify environment variables
- Ensure ports are not in use
