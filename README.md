# BOT-TRIP

A private, invite-only trip memory vault built with React, Express, MongoDB, and Google Drive. Organize your travel memories into collections, upload photos and videos, and share experiences with friends.

## Features

### Core Functionality
- **Invite-only registration** with trip code verification
- **JWT authentication** with secure session management
- **Collection-based organization** - Create trip collections to organize memories
- **Profile photo uploads** - Upload custom profile pictures stored in Google Drive
- **Original-quality uploads** - Photos and videos stored at full resolution
- **Private Google Drive storage** - Automatic folder structure for collections and media
- **Range-aware video streaming** - Optimized video playback with seeking support
- **Automatic video conversion** - Browser-compatible format conversion
- **Video thumbnail generation** - Easy visual identification of videos

### User Experience
- **Timeline view** - Chronological memory display with collection navigation
- **Collection cards** - Visual navigation between trip collections
- **Masonry gallery** - Responsive photo/video grid layout
- **Fullscreen viewer** - Immersive media viewing experience
- **Memory filtering** - Filter by collection, date, type, and more
- **Search functionality** - Find memories by caption, location, uploader, or date
- **Likes and comments** - Social interaction on memories
- **User profiles** - View upload statistics and liked memories
- **Admin controls** - Member and media management

### Technical Features
- **Protected media access** - Short-lived tokens for secure media streaming
- **Mobile support** - Touch-friendly interface with gallery/camera access
- **Responsive design** - Works seamlessly on desktop, tablet, and mobile
- **Error handling** - Comprehensive logging and user-friendly error messages
- **Rate limiting** - API protection against abuse

## Project Structure

```text
bot-trip/
├── backend/
│   ├── config/          Database and Google Drive configuration
│   ├── controllers/     API route handlers
│   ├── middleware/      Authentication and upload middleware
│   ├── models/          MongoDB schemas (User, Memory, Trip)
│   ├── routes/          API route definitions
│   ├── scripts/         Database migration scripts
│   └── server.js        Express application entry point
├── frontend/
│   ├── public/          Static assets
│   ├── src/
│   │   ├── components/  Reusable UI components
│   │   ├── context/     React context providers
│   │   ├── hooks/       Custom React hooks
│   │   ├── pages/       Page components
│   │   ├── services/    API client and utilities
│   │   └── App.jsx      Main application component
│   └── index.html       HTML entry point
└── render.yaml          Render deployment configuration
```

## Installation

### Prerequisites
- Node.js 20 or newer
- MongoDB Atlas account
- Google Cloud project with Drive API enabled

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/KarthikChilumula685/BOT-TRIP.git
cd BOT-TRIP
```

2. **Install dependencies**
```bash
npm install
```

## Configuration

### 1. MongoDB Atlas

1. Create an Atlas cluster and database user
2. Add your development/deployment IPs to Network Access
3. Copy the connection string into `backend/.env` as `MONGO_URI`

### 2. Google Drive OAuth

The app uses OAuth 2.0 to upload files to a Google Drive account.

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Drive API**
3. Configure the OAuth consent screen
4. Create an **OAuth client ID** of type **Web application**
5. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI
6. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
7. In settings, enable **Use your own OAuth credentials** and enter the client ID and secret
8. Authorize `https://www.googleapis.com/auth/drive`
9. Exchange the authorization code and copy the refresh token
10. In Google Drive, create a folder for your trip memories and copy the folder ID from its URL

The authenticated Google account must own or have edit access to that folder. Media files are stored privately and accessed through authenticated API calls.

### 3. Environment Variables

Copy the example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**Backend (.env):**
```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
TRIP_SECRET_CODE=your-trip-code
TRIP_NAME=Your Trip Name
ADMIN_EMAIL=admin@example.com
MAX_FILE_SIZE_MB=250
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_TRIP_NAME=Your Trip Name
```

### Important Notes
- Set `ADMIN_EMAIL` before that person registers - matching accounts become admins
- `TRIP_SECRET_CODE` is required for new user registration
- `MAX_FILE_SIZE_MB` controls upload size limits (default: 250MB)

## Running Locally

Open two terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5000/api/health`

## API Endpoints

### Authentication
```text
POST   /api/auth/verify-code      Verify trip code
POST   /api/auth/register         Register new user
POST   /api/auth/login            User login
GET    /api/auth/profile          Get user profile
PUT    /api/auth/profile          Update user profile
GET    /api/auth/:id/profile-photo-token  Get profile photo access token
GET    /api/auth/profile-photo/:id Stream profile photo
```

### Memories
```text
POST   /api/memories/upload       Upload photos/videos
GET    /api/memories              List memories (with filters)
GET    /api/memories/:id          Get single memory
PUT    /api/memories/:id          Update memory
DELETE /api/memories/:id          Delete memory
GET    /api/memories/:id/media-token  Get media access token
GET    /api/memories/:id/media    Stream media
GET    /api/memories/:id/thumbnail  Get thumbnail
GET    /api/memories/:id/download Download original file
PUT    /api/memories/:id/like     Toggle like
POST   /api/memories/:id/comment  Add comment
POST   /api/memories/:id/reaction Add reaction
DELETE /api/memories/:id/reaction Remove reaction
```

### Collections (Trips)
```text
GET    /api/trips                 List all collections
POST   /api/trips                 Create new collection
GET    /api/trips/:id             Get single collection
PUT    /api/trips/:id             Update collection
DELETE /api/trips/:id             Delete collection
```

### Users
```text
GET    /api/users                 List all users
GET    /api/users/:id             Get single user
DELETE /api/users/:id             Delete user
```

## Deployment

### Backend on Render

1. Push the repository to GitHub
2. Create a Web Service with root directory `backend`
3. Add all environment variables from `.env`
4. Set `CLIENT_URL` to your Vercel URL (comma-separated for multiple)
5. Deploy

**Note:** Render's free tier has file size and timeout limits. For large video uploads, consider a paid instance or reduce `MAX_FILE_SIZE_MB`.

### Frontend on Vercel

1. Import the repository in Vercel
2. Set root directory to `frontend`
3. Set `VITE_API_URL=https://your-render-service.onrender.com/api`
4. Deploy
5. Add the Vercel URL to backend `CLIENT_URL`

## Development

### Code Quality

```bash
npm run check
```

Lints and builds the frontend, syntax-checks the backend.

### Database Migrations

Run migration scripts from the backend directory:

```bash
node scripts/migrateToGokarna.js
```

## Google Drive Folder Structure

The app automatically creates this structure in your Drive:

```
Root Folder/
├── Trip Name/
│   ├── Photos/
│   │   ├── photo1.jpg
│   │   └── photo2.jpg
│   └── Videos/
│       ├── video1.mp4
│       └── video2.mp4
└── Profile Pictures/
    ├── user_123.jpg
    └── user_456.png
```

## Security Features

- **JWT authentication** with configurable expiration
- **Protected routes** requiring valid authentication
- **Rate limiting** on API endpoints
- **Media token system** - Short-lived tokens for media access
- **Password hashing** with bcrypt
- **CORS configuration** for cross-origin requests
- **Input validation** on all endpoints

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Private project. All rights reserved.

## Contributors

- Praneeth Reddy Katkuri - https://github.com/PRANEETH2611
- Karthik Chilumula - https://github.com/KarthikChilumula685
