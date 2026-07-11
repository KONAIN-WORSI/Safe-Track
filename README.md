# SafeTrack — Child Safety Location Tracking System

A full-stack real-time child safety tracking system with guardian dashboard, live map, alerts, and location history.

---

## Architecture

```
safetrack/
├── backend/               # Node.js + Express + Socket.io API
│   ├── models/            # Mongoose schemas (Guardian, TrackedUser, Location, Alert)
│   ├── routes/            # REST API routes (auth, users, locations, alerts)
│   ├── socket/            # Socket.io real-time location handler
│   ├── middleware/        # JWT auth middleware
│   ├── services/          # Email (Nodemailer) + SMS (Twilio) notifications
│   └── server.js          # Entry point
├── frontend/              # React + Vite SPA
│   └── src/
│       ├── pages/         # Dashboard, Map, Users, Alerts, History, Settings
│       ├── components/    # Layout, Sidebar
│       ├── hooks/         # useSocket, useGeolocation
│       ├── utils/         # Haversine, formatters
│       └── store.js       # Zustand global state + Axios API client
└── docker-compose.yml     # One-command full-stack launch
```

---

## Quick Start (Docker — recommended)

```bash
# 1. Clone / place project files
cd safetrack

# 2. Copy and fill in environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your email/SMS credentials

# 3. Run everything
docker-compose up --build

# App runs at:
#   Frontend → http://localhost:5173
#   Backend  → http://localhost:3001
#   MongoDB  → localhost:27017
```

---

## Manual Setup (without Docker)

### Prerequisites
- Node.js 18+
- MongoDB running locally

### Backend
```bash
cd backend
npm install
cp .env.example .env      # fill in values
npm run dev               # starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # starts on port 5173
```

---

## Environment Variables (backend/.env)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for JWT signing — use a long random string |
| `EMAIL_USER` | Optional | Gmail address for alert emails |
| `EMAIL_PASS` | Optional | Gmail App Password (not your normal password) |
| `TWILIO_ACCOUNT_SID` | Optional | Twilio SID for SMS alerts |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth token |
| `TWILIO_PHONE` | Optional | Twilio sending phone number |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create guardian account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Tracked Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List all tracked users |
| POST | `/api/users` | Create tracked user |
| PATCH | `/api/users/:id` | Update tracked user |
| DELETE | `/api/users/:id` | Delete tracked user |
| POST | `/api/users/:id/consent` | Record consent approval |

### Locations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/locations/:userId` | Get location history (supports `?from=&to=&limit=`) |
| POST | `/api/locations/:userId` | Submit a location ping |
| GET | `/api/locations/:userId/export/csv` | Export history as CSV |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | List alerts (supports `?unread=true&userId=`) |
| PATCH | `/api/alerts/:id/acknowledge` | Dismiss single alert |
| PATCH | `/api/alerts/acknowledge-all` | Dismiss all alerts |

---

## Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `location:ping` | `{ trackedUserId, lat, lng, accuracy, speed, heading, altitude }` | Send live location update |
| `sos:trigger` | `{ trackedUserId, lat, lng }` | Trigger SOS emergency alert |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `location:update` | `{ trackedUserId, location, inSafeZone, safeZoneName }` | Live location broadcast |
| `alert:new` | Alert object | Zone exit or other alert |
| `alert:sos` | Alert object | SOS emergency broadcast |

---

## Key Features

- **Guardian authentication** — JWT-based login/register
- **Tracked user profiles** — name, age, multiple safe zones with radius
- **Explicit consent gate** — tracking blocked without recorded consent
- **Real-time updates** — Socket.io broadcasts location every ping
- **Safe zone detection** — Haversine formula for accurate geodistance
- **Alert system** — zone exit, SOS, signal lost events
- **Email notifications** — HTML alert emails with Google Maps links
- **SMS notifications** — Twilio integration for critical alerts
- **Browser push** — Web Notification API for real-time alerts
- **Location history** — 30-day rolling storage, filterable by date range
- **CSV/JSON export** — Download full history for external analysis
- **Live map** — OpenStreetMap via Leaflet with real markers and safe zone overlays
- **Docker ready** — Single `docker-compose up` deployment

---

## Security & Privacy

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire in 7 days
- Rate limiting: 100 requests / 15 minutes per IP
- Consent must be explicitly recorded before any location is accepted
- Location data auto-deleted after 30 days (MongoDB TTL index)
- Guardians can only see their own tracked users' data
- All API routes protected by JWT middleware

---

## Integration Points (for your larger project)

The location ping endpoint (`POST /api/locations/:userId`) and socket event (`location:ping`) are the main integration surfaces. A mobile app (React Native, Flutter, etc.) would:

1. Store the `trackedUserId` and guardian JWT after setup
2. Call `navigator.geolocation.watchPosition` (web) or the native GPS API
3. Emit `location:ping` via Socket.io every 5–10 seconds
4. Listen for `alert:sos` to show an SOS button in the UI

The exported JSON schema is compatible with common analytics pipelines and can be fed directly into pandas/GeoPandas for datathon analysis.
