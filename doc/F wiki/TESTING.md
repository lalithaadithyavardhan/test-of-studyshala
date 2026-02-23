# CSMS Frontend - Testing Guide

## Quick Start Testing

The application now includes a **Development Login Page** that allows you to test all three dashboards without backend authentication!

## How to Test

### 1. Start the Application

```bash
cd csms-frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### 2. Development Login Page

You'll see the development login page with three options:

#### Option 1: Quick Login Buttons (Recommended)
Click any of these buttons for instant login:
- **👨‍🎓 Login as Student** - Takes you to Student Dashboard
- **👨‍🏫 Login as Faculty** - Takes you to Faculty Dashboard  
- **👨‍💼 Login as Admin** - Takes you to Admin Dashboard

#### Option 2: Role Selector + Google Button
1. Select a role (Student/Faculty/Admin)
2. Click "Sign in with Google"
3. It will log you in with that role

### 3. Test Each Dashboard

#### Testing Student Dashboard
1. Click "Login as Student"
2. You'll see the department code validation screen
3. Enter any code (e.g., "CSE101") and click validate
4. Browse materials with filters and search
5. Test pagination if you have many items

#### Testing Faculty Dashboard
1. Click "Login as Faculty"
2. View your profile information
3. Click "Create Material" button
4. Fill out the form:
   - Select Department (CSE, ECE, etc.)
   - Select Semester (1-8)
   - Enter Subject Name
   - Enter Department Code
   - Choose Permission Level
5. Submit to see it in your materials grid
6. Test Open and Delete buttons

#### Testing Admin Dashboard
1. Click "Login as Admin"
2. View statistics cards
3. Check analytics sections
4. Browse user management table
5. Test search functionality
6. Try Deactivate/Remove buttons

### 4. Test Additional Features

#### Dark Mode
- Click the moon/sun icon in the navbar (top right)
- Theme persists when you reload the page

#### Sidebar
- Click the arrow to collapse/expand sidebar
- Works on both desktop and mobile

#### Logout
- Click your profile avatar (top right)
- Click "Logout"
- You'll be redirected to login page

#### Responsive Design
- Resize your browser window
- Test on mobile (F12 > Device toolbar in Chrome)
- Sidebar becomes mobile-friendly
- Cards stack vertically on small screens

## Mock User Data

The development login creates these mock users:

### Admin User
```javascript
{
  name: 'Admin User',
  email: 'admin@college.edu',
  role: 'admin',
  department: 'Administration'
}
```

### Faculty User
```javascript
{
  name: 'Dr. John Smith',
  email: 'john.smith@college.edu',
  role: 'faculty',
  department: 'CSE'
}
```

### Student User
```javascript
{
  name: 'Alice Johnson',
  email: 'alice.johnson@college.edu',
  role: 'student',
  department: 'CSE',
  semester: '5'
}
```

## Switching Between Dev and Production Login

Edit `src/App.jsx`:

```javascript
// Set to true for development/testing
const USE_DEV_LOGIN = true;

// Set to false for production (Google OAuth)
const USE_DEV_LOGIN = false;
```

## Testing Backend Integration

When you're ready to connect to the real backend:

### 1. Set USE_DEV_LOGIN to false
```javascript
const USE_DEV_LOGIN = false;
```

### 2. Start your backend
```bash
cd ../your-backend-folder
npm start
```

### 3. Configure backend URL
The frontend is already configured to proxy `/api` requests to `http://localhost:5000`

Check `vite.config.js`:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

### 4. Test with real OAuth
Click "Sign in with Google" - it will redirect to your backend's OAuth endpoint.

## Common Testing Scenarios

### Test Protected Routes
1. Open browser in incognito mode
2. Try to directly access `/faculty/dashboard`
3. You should be redirected to `/login`
4. After login, you can access it

### Test Role-Based Access
1. Login as Student
2. Try to manually navigate to `/admin/dashboard` in URL bar
3. You should be redirected back (students can't access admin)

### Test Persistence
1. Login with any role
2. Refresh the page (F5)
3. You should stay logged in (JWT in localStorage)
4. Close and reopen the browser tab
5. Still logged in!

### Test Logout
1. Login with any role
2. Click profile → Logout
3. localStorage is cleared
4. Redirected to login page
5. Can't access protected routes anymore

## Debugging Tips

### Check Auth State
Open browser DevTools (F12) → Console, type:
```javascript
localStorage.getItem('user')
localStorage.getItem('token')
```

### Clear Auth Data
If you get stuck:
```javascript
localStorage.clear()
location.reload()
```

### Check Network Requests
DevTools → Network tab
- See API calls (when backend connected)
- Check request/response data

## What to Test

### ✅ Checklist

**Authentication**
- [ ] Login as Student
- [ ] Login as Faculty
- [ ] Login as Admin
- [ ] Logout works
- [ ] Auth persists on refresh

**Student Dashboard**
- [ ] Department code validation
- [ ] View materials
- [ ] Search by subject
- [ ] Filter by semester
- [ ] Filter by faculty
- [ ] Pagination works
- [ ] Open folder button

**Faculty Dashboard**
- [ ] View profile
- [ ] Create material form
- [ ] All form fields work
- [ ] Submit creates material
- [ ] View materials grid
- [ ] Delete material
- [ ] Open folder button

**Admin Dashboard**
- [ ] Statistics cards display
- [ ] Analytics sections show
- [ ] User table displays
- [ ] Search users
- [ ] Pagination works
- [ ] Deactivate button
- [ ] Remove button

**UI/UX**
- [ ] Dark mode toggle works
- [ ] Dark mode persists
- [ ] Sidebar collapse/expand
- [ ] Profile dropdown
- [ ] Mobile responsive
- [ ] Tablet responsive
- [ ] Loading states show
- [ ] Error messages display
- [ ] Empty states show

## Expected Behavior

### When Backend is NOT Connected
- Login works with mock data
- Dashboards display with empty data
- API calls will fail (expected)
- You can still test UI/UX

### When Backend IS Connected
- Real Google OAuth flow
- Real data from database
- All CRUD operations work
- Live updates from server

## Need Help?

If something doesn't work:
1. Check browser console for errors
2. Verify `npm run dev` is running
3. Clear localStorage and try again
4. Make sure you're using a modern browser

Happy Testing! 🚀
