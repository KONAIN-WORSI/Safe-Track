# SafeTrack — Child Safety Location Tracking System

A full-stack real-time child safety tracking system with guardian dashboard, live map, alerts, and location history.

**Live:** [safe-track-fawn.vercel.app](https://safe-track-fawn.vercel.app)

---

## Architecture

```
safetrack/
├── backend/                 # Node.js + Express + Socket.io API
│   ├── models/              # Mongoose schemas (Guardian, TrackedUser, Location, Alert)
│   ├── routes/              # REST API routes (auth, users, locations, alerts)
│   ├── socket/              # Socket.io real-time location handler
│   ├── middleware/           # JWT auth middleware
│   ├── services/            # Email (Nodemailer) + SMS (Twilio) notifications
│   └── server.js            # Entry point
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── pages/           # Dashboard, Map, Users, Alerts, History, Settings, Device
│       ├── components/      # Layout
│       ├── hooks/           # useSocket, useGeolocation, useLiveLocationTracker
│       ├── utils/           # Haversine, formatters
│       └── store.js         # Zustand global state + Axios API client
├── render.yaml              # Render deployment config
└── docker-compose.yml       # Local Docker deployment
```

---

## Deployment

The app is deployed with **Vercel** (frontend) and **Render** (backend) with **MongoDB Atlas** (database).

### Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://safe-track-fawn.vercel.app |
| Backend API | https://safe-track-jaf5.onrender.com |

---

## How It Works

### Guardian Flow
1. Register/Login to the guardian dashboard
2. Add tracked users (children) with safe zone coordinates
3. Grant consent for tracking
4. Click **"Share device link"** — a unique tracking link is copied to clipboard
5. Share the link via WhatsApp, SMS, or any messaging app
6. View live location on the map, receive alerts when a child leaves a safe zone

### Device (Child) Flow
1. Open the shared link on the child's phone
2. Grant location permission when prompted
3. Tap **"Start sharing location"**
4. The phone's GPS sends real-time coordinates to the guardian dashboard
5. Location continues sharing in the background with automatic reconnection

### Key Behaviors
- **Consent gate** — Tracking is impossible without guardian consent at two levels: token generation and every location ping
- **Automatic reconnection** — If the device loses connection (network issue, cold start), the socket reconnects automatically and resumes tracking
- **Offline awareness** — When the device disconnects, `isTracking` resets to `false` so the dashboard correctly shows "Offline"

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

### Backend
```bash
cd backend
npm install
cp .env.example .env      # fill in your values
npm run dev               # starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # starts on port 5173
```

### Docker (alternative)
```bash
cp backend/.env.example backend/.env
docker-compose up --build
# Frontend → http://localhost:5173
# Backend  → http://localhost:3001
# MongoDB  → localhost:27017
```

---

## Environment Variables

### Backend (set in Render dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Random secret for JWT signing |
| `JWT_EXPIRES_IN` | No | Token expiry (default: 7d) |
| `FRONTEND_URL` | Yes | Your Vercel frontend URL for CORS |
| `EMAIL_HOST` | No | SMTP host for alert emails (default: smtp.gmail.com) |
| `EMAIL_PORT` | No | SMTP port (default: 587) |
| `EMAIL_USER` | No | Gmail address for sending alerts |
| `EMAIL_PASS` | No | Gmail App Password |
| `EMAIL_FROM` | No | Sender display name |
| `TWILIO_ACCOUNT_SID` | No | Twilio SID for SMS alerts |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth token |
| `TWILIO_PHONE` | No | Twilio sending phone number |

### Frontend (set in Vercel dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (e.g., `https://safe-track-jaf5.onrender.com`) |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create guardian account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/me` | Update profile or notification preferences |
| POST | `/api/auth/tracking-token/:trackedUserId` | Generate tracking link (requires consent) |

### Tracked Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all tracked users |
| POST | `/api/users` | Create tracked user |
| PATCH | `/api/users/:id` | Update tracked user |
| DELETE | `/api/users/:id` | Delete tracked user |
| POST | `/api/users/:id/consent` | Record consent approval |

### Locations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/locations/:userId` | Get location history (supports `?from=&to=&limit=`) |
| POST | `/api/locations/:userId` | Submit a location ping |
| POST | `/api/locations/trace-live/:userId` | SIM-based telecom trace |
| GET | `/api/locations/:userId/export/csv` | Export history as CSV |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | List alerts (supports `?unread=true&userId=`) |
| PATCH | `/api/alerts/:id/acknowledge` | Dismiss single alert |
| PATCH | `/api/alerts/acknowledge-all` | Dismiss all alerts |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check (used by Render) |
| GET | `/api/health` | Detailed health check |

---

## Socket.io Events

### Client (Device) to Server
| Event | Payload | Description |
|-------|---------|-------------|
| `location:ping` | `{ trackedUserId, lat, lng, accuracy, speed, heading, altitude }` | Send live location update |
| `sos:trigger` | `{ trackedUserId, lat, lng }` | Trigger SOS emergency alert |

### Server to Client (Guardian)
| Event | Payload | Description |
|-------|---------|-------------|
| `location:update` | `{ trackedUserId, location, inSafeZone, safeZoneName }` | Live location broadcast |
| `alert:new` | Alert object | Zone exit or other alert |
| `alert:sos` | Alert object | SOS emergency broadcast |

---

## Key Features

- **Guardian authentication** — JWT-based login/register with secure token handling
- **Tracked user profiles** — Name, age, multiple safe zones with configurable radius
- **Explicit consent gate** — Tracking blocked without recorded consent at both token and ping level
- **Shareable device link** — Copy-to-clipboard link that opens on the child's phone
- **Real-time updates** — Socket.io broadcasts location every ping
- **Automatic reconnection** — Device and guardian sockets reconnect automatically with exponential backoff
- **Disconnect detection** — `isTracking` resets when device goes offline
- **Safe zone detection** — Haversine formula for accurate geodistance
- **Alert system** — Zone exit, SOS, signal lost events
- **Email notifications** — HTML alert emails with Google Maps links
- **SMS notifications** — Twilio integration for critical alerts
- **Browser push** — Web Notification API for real-time alerts
- **Location history** — 30-day rolling storage, filterable by date range
- **CSV/JSON export** — Download full history for external analysis
- **Live map** — OpenStreetMap via Leaflet with real markers and safe zone overlays
- **SIM trace** — Telecom-based location approximation via country routing

---

## Security & Privacy

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days (guardian) / 30 days (tracking device)
- Rate limiting: 100 requests / 15 minutes per IP (with proxy trust for Render)
- CORS restricted to specific allowed origins (no wildcard)
- Consent must be explicitly recorded before any location is accepted
- Location data auto-deleted after 30 days (MongoDB TTL index)
- Guardians can only see their own tracked users' data
- All API routes protected by JWT middleware
- Tracking tokens are scoped to a single tracked user

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Zustand, Leaflet, Socket.io Client |
| Backend | Node.js, Express, Socket.io, Mongoose |
| Database | MongoDB Atlas (M0 Free tier) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| Notifications | Nodemailer (email), Twilio (SMS) |
