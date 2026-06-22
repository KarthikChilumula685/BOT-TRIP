# BOT-TRIP

A private, invite-only trip memory vault built with React, Express, MongoDB, and Google Drive. Photos and videos are stored in Google Drive; MongoDB contains metadata only.

## Features

- Invite-code registration, JWT sessions, bcrypt password hashing, and protected routes
- Original-quality photo/video uploads with previews and progress
- Private Google Drive storage with automatic `Trip / Photos / Videos` folders
- Authenticated previews, range-aware video streaming, and original downloads
- Automatic video format conversion for browser compatibility
- Video thumbnail generation for easy identification
- Responsive masonry gallery, fullscreen viewer, timeline, likes, and comments
- Search by caption, location, file name, trip, uploader, or date
- Friends and profile pages with upload/like statistics
- Admin member and media management
- Vercel frontend and Render backend configuration

## Project layout

```text
bot-trip/
├── backend/      Express API, MongoDB models, Drive integration
├── frontend/     React + Vite + Tailwind application
└── render.yaml   Render Blueprint
```

## 1. Install

Use Node.js 20 or newer.

```bash
npm install
```

## 2. MongoDB Atlas

1. Create an Atlas cluster and database user.
2. Add your development/deployment IPs to Network Access.
3. Copy the connection string into `backend/.env` as `MONGO_URI`.

## 3. Google Drive OAuth

This app uploads into a normal Google Drive account using an OAuth refresh token.

1. Create or select a project in Google Cloud Console.
2. Enable **Google Drive API**.
3. Configure the OAuth consent screen.
4. Create an **OAuth client ID** of type **Web application**.
5. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
6. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
7. In its settings, enable **Use your own OAuth credentials** and enter the client ID and secret.
8. Authorize `https://www.googleapis.com/auth/drive`.
9. Exchange the authorization code and copy the refresh token.
10. In Drive, create a folder named `TripVault` and copy the folder ID from its URL.

The authenticated Google account must own or have edit access to that folder. Media files do not need public sharing; BOT-TRIP proxies private access with short-lived media tokens.

## 4. Environment files

Copy the templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Required backend values:

```env
MONGO_URI=
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
TRIP_SECRET_CODE=
```

Set `ADMIN_EMAIL` before that person registers. A matching new account is created as an admin. Existing roles can also be changed directly in MongoDB Atlas.

For the frontend:

```env
VITE_API_URL=http://localhost:5000/api
VITE_TRIP_NAME=Gokarna 2026
```

## 5. Run locally

Open two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

Frontend: `http://localhost:5173`  
API health check: `http://localhost:5000/api/health`

## API

```text
POST   /api/auth/verify-code
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/profile
PUT    /api/auth/profile

POST   /api/memories/upload
GET    /api/memories
GET    /api/memories/:id
GET    /api/memories/:id/media-token
GET    /api/memories/:id/media
GET    /api/memories/:id/download
PUT    /api/memories/:id/like
POST   /api/memories/:id/comment
DELETE /api/memories/:id

GET    /api/users
DELETE /api/users/:id
```

## Deploy

### Backend on Render

1. Push the repository to GitHub.
2. Create a Blueprint from `render.yaml`, or create a Web Service with root directory `backend`.
3. Add all secret environment values.
4. Set `CLIENT_URL` to the exact Vercel URL. Multiple origins can be comma-separated.

Render's free services may have request-size and timeout constraints. For large original videos, use a paid instance or reduce `MAX_FILE_SIZE_MB`.

### Frontend on Vercel

1. Import the same repository.
2. Set the root directory to `frontend`.
3. Set `VITE_API_URL=https://your-render-service.onrender.com/api`.
4. Deploy, then add the resulting URL to the backend `CLIENT_URL`.

## Validation

```bash
npm run check
```

This lints and builds the frontend and syntax-checks the backend entry point.


Contributors Praneeth Reddy Katkuri https://github.com/PRANEETH2611
