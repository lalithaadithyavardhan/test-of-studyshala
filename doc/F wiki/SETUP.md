# CSMS Frontend Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 16+ and npm installed
- Backend API running on `http://localhost:5000`

### 2. Installation Steps

```bash
# Navigate to the project directory
cd csms-frontend

# Install dependencies
npm install

# Create environment file (optional)
cp .env.example .env

# Start development server
npm run dev
```

The application will open at `http://localhost:3000`

### 3. Default Login Flow

Since Google OAuth requires backend setup, you have two options:

**Option A: Backend Integration**
1. Ensure your backend is running with Google OAuth configured
2. Click "Sign in with Google" - it will redirect to `/api/auth/google`
3. After OAuth, backend should redirect back with JWT token

**Option B: Development Testing**
You can modify `Login.jsx` to bypass OAuth for testing:

```javascript
// In handleGoogleLogin function, replace the window.location.href line with:
const mockToken = 'test-jwt-token';
const mockUser = {
  name: 'Test User',
  email: 'test@example.com',
  role: 'faculty' // or 'student' or 'admin'
};
await login(mockToken, mockUser);
```

### 4. Testing Different Roles

To test different dashboards, change the `role` in the mock user:
- `role: 'admin'` - Access admin dashboard
- `role: 'faculty'` - Access faculty dashboard
- `role: 'student'` - Access student dashboard

### 5. Building for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## Directory Structure

```
csms-frontend/
├── public/                 # Static files
├── src/
│   ├── api/               # API configuration
│   ├── components/        # Reusable components
│   ├── context/           # React context providers
│   ├── pages/             # Page components
│   ├── styles/            # Global styles
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Key Features Implemented

### Authentication
✅ Google OAuth UI
✅ JWT token storage
✅ Auth context with login/logout
✅ Role-based route protection
✅ Auto-redirect based on role
✅ Axios interceptor for JWT attachment

### Faculty Dashboard
✅ Profile section
✅ Create material form with all fields
✅ Permission selector (View/Comment/Edit)
✅ Created materials grid
✅ Open and Delete actions
✅ Loading and error states

### Student Dashboard
✅ Department code validation
✅ Search and filter functionality
✅ Material cards with details
✅ Pagination
✅ Empty states
✅ Responsive layout

### Admin Dashboard
✅ Statistics cards (5 metrics)
✅ Analytics section (3 cards)
✅ User management table
✅ Search functionality
✅ Deactivate/Remove actions
✅ Pagination

### UI/UX
✅ Dark mode toggle
✅ Collapsible sidebar
✅ Profile dropdown
✅ Responsive design
✅ Loading spinners
✅ Error messages
✅ Empty states
✅ Smooth transitions

## Customization

### Change Theme Colors

Edit `src/styles/global.css`:

```css
:root {
  --primary-color: #your-color;
  --background-light: #your-color;
  /* etc. */
}
```

### Modify Backend URL

Edit `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://your-backend-url',
    changeOrigin: true
  }
}
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors:
1. Ensure backend has CORS enabled
2. Check the proxy configuration in `vite.config.js`
3. Verify the backend URL is correct

### Dark Mode Not Persisting
1. Check browser's localStorage is enabled
2. Verify no extensions are blocking localStorage

### Routes Not Working
1. Ensure React Router is properly installed
2. Check the role in localStorage matches the route's allowed roles
3. Clear localStorage and try logging in again

## Next Steps

1. Connect to your actual backend API
2. Implement Google OAuth on backend
3. Add real data from your database
4. Deploy frontend and backend
5. Configure production environment variables

## Support

For questions or issues:
1. Check the README.md
2. Review the code comments
3. Open an issue in the repository
