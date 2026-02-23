# CSMS Frontend - Certificate Storage Management System

A production-ready React frontend application for managing and accessing study materials in an educational institution.

## Tech Stack

- **React** (Vite)
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Context API** - State management
- **Plain CSS** - Custom styling with CSS variables
- **Responsive Design** - Flexbox & CSS Grid

## Features

### Authentication
- Google OAuth integration
- JWT-based authentication
- Role-based access control (Admin, Faculty, Student)
- Protected routes with role validation
- Automatic redirect based on user role

### Faculty Dashboard
- Profile management
- Create study materials with department, semester, and subject details
- Set permission levels (View, Comment, Edit)
- View and manage created materials
- Direct Google Drive integration

### Student Dashboard
- Department code validation
- Browse available study materials
- Advanced filtering by subject, semester, and faculty
- Pagination for large datasets
- Direct access to Google Drive folders

### Admin Dashboard
- System statistics overview
- User analytics
- User management (activate/deactivate/remove)
- Search and filter users
- Activity tracking

### UI/UX Features
- Dark mode support
- Responsive layout (mobile, tablet, desktop)
- Loading states
- Error handling
- Empty state UI
- Smooth transitions and animations
- Professional card-based design

## Project Structure

```
src/
├── api/
│   └── axios.js              # Axios configuration with interceptors
├── components/
│   ├── Button.jsx            # Reusable button component
│   ├── Card.jsx              # Card component
│   ├── Input.jsx             # Input component
│   ├── Modal.jsx             # Modal component
│   ├── Navbar.jsx            # Top navigation bar
│   ├── ProtectedRoute.jsx    # Route protection with role validation
│   └── Sidebar.jsx           # Sidebar navigation
├── context/
│   └── AuthContext.jsx       # Authentication context
├── pages/
│   ├── AdminDashboard.jsx    # Admin dashboard
│   ├── FacultyDashboard.jsx  # Faculty dashboard
│   ├── Login.jsx             # Login page
│   └── StudentDashboard.jsx  # Student dashboard
├── styles/
│   └── global.css            # Global styles and CSS variables
├── App.jsx                   # Main app component with routing
└── main.jsx                  # Entry point
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd csms-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure the backend API URL in `vite.config.js` if needed:
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000', // Your backend URL
      changeOrigin: true
    }
  }
}
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## API Endpoints

The frontend expects the following backend API endpoints:

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/user` - Get current user

### Faculty
- `GET /api/faculty/folders` - Get faculty's materials
- `POST /api/faculty/folders` - Create new material
- `DELETE /api/faculty/folders/:id` - Delete material

### Student
- `POST /api/student/validate` - Validate department code
- `GET /api/student/materials` - Get available materials

### Admin
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/analytics` - Get analytics data
- `PATCH /api/admin/users/:id/deactivate` - Deactivate user
- `DELETE /api/admin/users/:id` - Remove user

## Environment Variables

Create a `.env` file in the root directory if needed:

```env
VITE_API_URL=http://localhost:5000/api
```

## Dark Mode

Dark mode is toggled via the navbar and persists in localStorage. The theme is applied by adding/removing the `dark-mode` class from the `<body>` element.

## CSS Variables

All colors and spacing are managed through CSS variables in `src/styles/global.css`:

```css
:root {
  --primary-color: #2563eb;
  --background-light: #f5f7fa;
  --background-dark: #1e293b;
  /* ... more variables */
}
```

## Role-Based Access

The application supports three roles:

1. **Admin** - Full system access, user management
2. **Faculty** - Create and manage study materials
3. **Student** - Browse and access materials

Routes are protected using the `ProtectedRoute` component which validates user authentication and role authorization.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue in the repository.
