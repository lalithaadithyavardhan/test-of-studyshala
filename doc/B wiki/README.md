# CSMS Backend - Certificate Storage Management System

A production-ready Node.js/Express backend API for managing study materials with Google OAuth authentication and Google Drive integration.

## Features

- **Google OAuth 2.0 Authentication**
- **JWT-based Authorization**
- **Role-based Access Control** (Admin, Faculty, Student)
- **Google Drive Integration** for file storage
- **MongoDB Database** with Mongoose ODM
- **Activity Logging** and Analytics
- **RESTful API** design
- **Error Handling** and Logging
- **CORS Support** for frontend integration

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Passport.js** - Authentication
- **JWT** - Token-based auth
- **Google APIs** - OAuth & Drive
- **Winston** - Logging

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Google Cloud Project with OAuth credentials
- Google Drive API enabled

## Installation

### 1. Clone and Install

```bash
cd csms-backend
npm install
```

### 2. Environment Setup

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csms
JWT_SECRET=your-jwt-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:3000
```

### 3. Google Cloud Setup

#### Enable Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

#### Enable Google Drive API:

1. In the same project, enable **Google Drive API**
2. Create credentials for Drive API
3. Set up OAuth consent screen
4. Add required scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`

### 4. Database Setup

Make sure MongoDB is running:

```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu
sudo systemctl start mongod

# On Windows
net start MongoDB
```

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:5000`

## Project Structure

```
csms-backend/
├── config/
│   ├── database.js          # MongoDB connection
│   └── passport.js          # Passport Google OAuth config
├── controllers/
│   ├── adminController.js   # Admin operations
│   ├── authController.js    # Authentication
│   ├── facultyController.js # Faculty operations
│   └── studentController.js # Student operations
├── middleware/
│   ├── auth.js              # JWT verification & role checks
│   └── logging.js           # Activity logging
├── models/
│   ├── Folder.js            # Study material folders
│   ├── Log.js               # Activity logs
│   └── User.js              # User accounts
├── routes/
│   ├── adminRoutes.js       # Admin endpoints
│   ├── authRoutes.js        # Auth endpoints
│   ├── facultyRoutes.js     # Faculty endpoints
│   └── studentRoutes.js     # Student endpoints
├── services/
│   └── driveService.js      # Google Drive API wrapper
├── utils/
│   ├── jwt.js               # JWT helpers
│   └── logger.js            # Winston logger
├── .env.example             # Environment template
├── .gitignore
├── package.json
├── README.md
└── server.js                # Entry point
```

## API Endpoints

### Authentication

```
GET  /api/auth/google              - Initiate Google OAuth
GET  /api/auth/google/callback     - OAuth callback
GET  /api/auth/user                - Get current user (Protected)
POST /api/auth/logout              - Logout (Protected)
```

### Faculty (Protected - Faculty Role)

```
GET    /api/faculty/folders        - Get all folders
POST   /api/faculty/folders        - Create folder
GET    /api/faculty/folders/:id    - Get folder details
DELETE /api/faculty/folders/:id    - Delete folder
```

### Student (Protected - Student Role)

```
POST /api/student/validate         - Validate department code
GET  /api/student/materials        - Get accessible materials
POST /api/student/materials/:id/access - Track material access
```

### Admin (Protected - Admin Role)

```
GET    /api/admin/stats            - System statistics
GET    /api/admin/users            - Get all users (with pagination)
GET    /api/admin/analytics        - Analytics data
PATCH  /api/admin/users/:id/deactivate - Deactivate user
PATCH  /api/admin/users/:id/activate   - Activate user
DELETE /api/admin/users/:id        - Remove user
PATCH  /api/admin/users/:id/role   - Update user role
```

## Request/Response Examples

### Create Folder (Faculty)

**Request:**
```http
POST /api/faculty/folders
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "department": "CSE",
  "semester": "5",
  "subjectName": "Data Structures",
  "departmentCode": "CS501",
  "permission": "view"
}
```

**Response:**
```json
{
  "folder": {
    "_id": "507f1f77bcf86cd799439011",
    "facultyId": "507f191e810c19729de860ea",
    "subjectName": "Data Structures",
    "department": "CSE",
    "semester": "5",
    "departmentCode": "CS501",
    "permission": "view",
    "driveUrl": "https://drive.google.com/...",
    "driveFolderId": "1abc...",
    "createdAt": "2024-02-15T10:30:00.000Z"
  }
}
```

### Get Statistics (Admin)

**Request:**
```http
GET /api/admin/stats
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "totalUsers": 150,
  "totalFaculty": 25,
  "totalStudents": 120,
  "totalDepartments": 6,
  "totalMaterials": 85
}
```

## Authentication Flow

1. **User clicks "Sign in with Google"** on frontend
2. **Frontend redirects** to `/api/auth/google`
3. **Backend redirects** to Google OAuth consent
4. **User approves** and Google redirects to callback
5. **Backend processes** OAuth response:
   - Creates/updates user in database
   - Generates JWT token
   - Redirects to frontend with token
6. **Frontend stores** JWT in localStorage
7. **Future requests** include JWT in Authorization header

## Role Assignment

When users first authenticate via Google OAuth, their role is automatically assigned based on email patterns (can be customized in `config/passport.js`):

```javascript
// Default logic (customize as needed)
if (email.includes('admin')) {
  role = 'admin';
} else if (email.includes('faculty')) {
  role = 'faculty';
} else {
  role = 'student';  // Default
}
```

**Admin can change roles** via:
```http
PATCH /api/admin/users/:id/role
{ "role": "faculty" }
```

## Google Drive Integration

The system automatically:
- Creates folders in Google Drive when faculty creates materials
- Sets appropriate permissions (view/comment/edit)
- Provides direct links to students
- Deletes folders when materials are removed

**Note:** Ensure your Google service account has Drive API access.

## Logging

All activities are logged to:
- **Database** (Log model) - User actions
- **Files** (Winston) - System logs
  - `logs/error.log` - Error logs
  - `logs/combined.log` - All logs

## Security Features

- ✅ JWT authentication with expiration
- ✅ Role-based access control
- ✅ Password-less Google OAuth
- ✅ CORS configuration
- ✅ Request logging
- ✅ Error handling
- ✅ Input validation

## Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### Test with cURL

```bash
# Get stats (requires admin token)
curl http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create folder (requires faculty token)
curl -X POST http://localhost:5000/api/faculty/folders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "department": "CSE",
    "semester": "3",
    "subjectName": "Algorithms",
    "departmentCode": "CS301",
    "permission": "view"
  }'
```

## Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/csms
JWT_SECRET=secure-random-string-here
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
FRONTEND_URL=https://yourdomain.com
SESSION_SECRET=another-secure-random-string
```

### Production Checklist

- [ ] Set strong JWT_SECRET and SESSION_SECRET
- [ ] Use MongoDB Atlas or production database
- [ ] Update Google OAuth redirect URIs
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up proper logging
- [ ] Enable rate limiting (optional)

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh

# If not running, start it
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Google OAuth Errors
- Verify redirect URI matches exactly in Google Console
- Check Client ID and Secret are correct
- Ensure Google+ API is enabled
- Make sure OAuth consent screen is configured

### CORS Issues
- Verify FRONTEND_URL in .env matches your frontend URL
- Check CORS configuration in server.js

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

## Development Tips

### Auto-reload on Changes
```bash
npm run dev  # Uses nodemon
```

### Check Logs
```bash
tail -f logs/combined.log
```

### MongoDB Shell
```bash
mongosh
use csms
db.users.find()
db.folders.find()
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

MIT

## Support

For issues or questions:
- Check the logs: `logs/combined.log`
- Verify environment variables
- Check MongoDB connection
- Review Google Cloud Console settings

## Next Steps

After setup:
1. ✅ Start the backend server
2. ✅ Test health endpoint
3. ✅ Configure frontend to use this backend
4. ✅ Test Google OAuth flow
5. ✅ Create test users with different roles
6. ✅ Test all API endpoints

Ready to connect with the CSMS Frontend! 🚀
