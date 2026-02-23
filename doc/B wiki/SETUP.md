# CSMS Backend - Quick Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
cd csms-backend
npm install
```

### Step 2: Setup MongoDB

**Option A: Local MongoDB**
```bash
# macOS (with Homebrew)
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongod

# Windows
# Download from https://www.mongodb.com/try/download/community
# Install and start MongoDB service
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string
5. Use it in `.env` as MONGODB_URI

### Step 3: Create .env File

```bash
cp .env.example .env
```

Edit `.env` with minimum required values:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csms
JWT_SECRET=my-super-secret-jwt-key-change-this
SESSION_SECRET=my-session-secret-change-this
FRONTEND_URL=http://localhost:3000
```

### Step 4: Setup Google OAuth (Required)

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/

2. **Create/Select Project**
   - Click "Select a project" → "New Project"
   - Name: "CSMS" → Create

3. **Enable APIs**
   - Go to "APIs & Services" → "Library"
   - Search "Google+ API" → Enable
   - Search "Google Drive API" → Enable

4. **Create OAuth Credentials**
   - "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Configure consent screen if prompted:
     - User Type: External
     - App name: CSMS
     - Support email: your email
     - Save
   - Application type: Web application
   - Name: CSMS Web Client
   - Authorized redirect URIs:
     - `http://localhost:5000/api/auth/google/callback`
   - Create
   - Copy Client ID and Client Secret

5. **Update .env**
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   ```

### Step 5: Start Server

```bash
# Development mode (auto-reload)
npm run dev

# OR Production mode
npm start
```

You should see:
```
🚀 Server running on http://localhost:5000
📊 Health check: http://localhost:5000/health
MongoDB Connected: localhost
```

### Step 6: Verify Installation

Open browser: http://localhost:5000/health

Should return:
```json
{
  "status": "OK",
  "timestamp": "2024-02-15T...",
  "environment": "development"
}
```

## ✅ You're Done!

Backend is now running and ready to connect with frontend.

---

## 🔧 Optional: Google Drive Integration

For faculty to create folders in Google Drive, follow these additional steps:

### 1. Create Service Account

1. Google Cloud Console → "IAM & Admin" → "Service Accounts"
2. Create Service Account
3. Name: "CSMS Drive Service"
4. Create and continue
5. Grant role: "Editor"
6. Done

### 2. Create Key

1. Click on created service account
2. "Keys" tab → "Add Key" → "Create new key"
3. Type: JSON
4. Download the JSON file

### 3. Get Refresh Token

Run this Node.js script to get refresh token:

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'http://localhost:5000/oauth2callback'
);

const scopes = [
  'https://www.googleapis.com/auth/drive.file'
];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
});

console.log('Visit this URL:', url);
// Then use the code to get tokens
```

### 4. Update .env

```env
GOOGLE_DRIVE_CLIENT_ID=your-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-drive-secret
GOOGLE_DRIVE_REFRESH_TOKEN=your-refresh-token
```

---

## 🧪 Testing the Backend

### Test Health Endpoint
```bash
curl http://localhost:5000/health
```

### Test Google OAuth Flow

1. Open browser: `http://localhost:5000/api/auth/google`
2. Sign in with Google
3. Should redirect to frontend with token

### Manual Testing Without Frontend

Use Postman or cURL:

```bash
# After OAuth, copy your JWT token
TOKEN="your-jwt-token-here"

# Test Get Current User
curl http://localhost:5000/api/auth/user \
  -H "Authorization: Bearer $TOKEN"

# Test Admin Stats (if you're admin)
curl http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Creating Test Users

### Automatic (First Login via OAuth)
- Users are created automatically on first Google sign-in
- Role assigned based on email pattern (customizable)

### Manual (MongoDB Shell)
```bash
mongosh
use csms

db.users.insertOne({
  googleId: "test-admin-123",
  name: "Test Admin",
  email: "admin@test.com",
  role: "admin",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})

db.users.insertOne({
  googleId: "test-faculty-456",
  name: "Test Faculty",
  email: "faculty@test.com",
  role: "faculty",
  department: "CSE",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## 🐛 Common Issues

### "MongoServerError: connect ECONNREFUSED"
- MongoDB is not running
- Solution: `brew services start mongodb-community` (macOS)

### "Google OAuth Error: redirect_uri_mismatch"
- Callback URL doesn't match Google Console
- Solution: Verify exact URL in Google Console matches .env

### "Port 5000 already in use"
```bash
# Find process
lsof -i :5000
# Kill it
kill -9 <PID>
# Or change PORT in .env
```

### "JWT Secret Error"
- JWT_SECRET not set in .env
- Solution: Add a strong random string to .env

---

## 📁 Project Ready!

Your backend is now:
- ✅ Running on http://localhost:5000
- ✅ Connected to MongoDB
- ✅ Google OAuth configured
- ✅ Ready for frontend connection

## Next: Connect Frontend

1. Start your frontend (from csms-frontend folder)
   ```bash
   npm run dev
   ```

2. Frontend will proxy API requests to backend

3. Test the full flow!

---

## 🆘 Need Help?

Check logs:
```bash
tail -f logs/combined.log
```

MongoDB shell:
```bash
mongosh
use csms
db.users.find()
```

Server status:
```bash
curl http://localhost:5000/health
```
