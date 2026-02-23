# CSMS Backend — Quick Start

## Step 1: Install packages
```bash
cd csms-backend-final2
npm install
```

## Step 2: Create your .env file
```bash
copy .env.example .env
```
Then open `.env` and fill in at minimum:
- `MONGODB_URI` (use `mongodb://localhost:27017/csms` for local)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- `JWT_SECRET` (any long random string)
- `SESSION_SECRET` (any other long random string)

## Step 3: Make sure MongoDB is running
- **Windows**: Open "Services" → start "MongoDB" service
  OR run: `net start MongoDB`
- **macOS**: `brew services start mongodb-community`

## Step 4: Start the backend
```bash
npm run dev
```

You should see:
```
🚀  Server running at http://localhost:5000
❤️   Health check:  http://localhost:5000/health
```

## Common Errors

### MODULE_NOT_FOUND
You forgot to run `npm install`. Run it and try again.

### MongoServerError / ECONNREFUSED
MongoDB is not running. Start it first (see Step 3).

### Invalid redirect_uri / redirect_uri_mismatch
In Google Cloud Console, make sure your OAuth Client has this exact redirect URI:
`http://localhost:5000/api/auth/google/callback`
