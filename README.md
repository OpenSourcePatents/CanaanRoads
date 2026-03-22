# CANAAN ROAD WATCH
### Citizen Road Accountability — Live at [canaanroads.com](https://canaanroads.com)

A real-time community reporting platform for road conditions in Canaan, NH. Citizens can anonymously report potholes, frost heaves, drainage issues, and other road problems. Reports are public, persistent, and visible to all residents. Road status is computed automatically from open reports.

---

## Features

**For Everyone (no account required)**
- Anonymous road issue reporting with photo upload and GPS tagging
- Upvote/confirm existing reports
- Dispute repairs that weren't done properly
- Real-time updates — reports appear live as they're submitted
- Automatic road status scoring: Good → Fair → Poor → Critical
- Interactive map at `/map` with color-coded road dots

**For Logged-In Users**
- Submit road-clear photos for admin review
- Edit your own reports (locked once GPS-tagged)
- Magic link or email/password sign-in — no friction

**For Road Workers**
- Mark reports In Progress or Resolved directly

**For Admin (Charlie)**
- Approve or reject road-clear submissions
- Manage all report statuses
- Full admin panel with pending clears queue and open reports list

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 + React 18 |
| Database | Supabase (Postgres + Realtime + Storage) |
| Auth | Supabase Auth (magic link + password) |
| Map | Mapbox GL JS |
| Hosting | Vercel |
| Data | OpenStreetMap (1,295 road segments seeded) |

---

## Database Schema

```
roads                 — OSM road segments (id, name, segment, miles, lat, lng, surface...)
reports               — Citizen reports (type, severity, description, photo, GPS, upvotes...)
road_status           — View: aggregates reports → computes road status per road
upvotes               — Fingerprint-based upvote deduplication
road_clear_submissions — Logged-in users submit clear photos for admin approval
user_roles            — Role assignments (user / road_worker / admin)
profiles              — Username and display info tied to auth.users
```

---

## Permission Model

| Action | Anonymous | Logged In | Road Worker | Admin |
|---|---|---|---|---|
| View reports & roads | ✓ | ✓ | ✓ | ✓ |
| Submit reports | ✓ | ✓ | ✓ | ✓ |
| Upvote reports | ✓ | ✓ | ✓ | ✓ |
| Dispute resolved reports | ✓ | ✓ | ✓ | ✓ |
| Edit own non-GPS reports | — | ✓ | ✓ | ✓ |
| Submit road-clear photos | — | ✓ | ✓ | ✓ |
| Mark in-progress / resolved | — | — | ✓ | ✓ |
| Approve road clears | — | — | — | ✓ |
| Manage all reports | — | — | — | ✓ |

---

## Running Locally

```bash
git clone https://github.com/OpenSourcePatents/CanaanRoads.git
cd CanaanRoads
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

```bash
npm run dev
```

---

## Assigning Roles

To make someone a road worker or admin, run in Supabase SQL Editor:

```sql
-- Get their UUID after they sign up
SELECT id FROM auth.users WHERE email = 'their@email.com';

-- Assign role
INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin');
-- or
INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'road_worker');
```

---

## Project Philosophy

All data is citizen-submitted. Road status is computed from open reports:
- **Good** — No open reports
- **Fair** — Minor open reports
- **Poor** — Multiple moderate open reports
- **Critical** — Any severe open report

This platform exists to create a transparent, public record of road conditions so residents can hold local government accountable. No ads. No paywalls. No data sold.

---

## License

**CC0 Public Domain** — [OpenSourcePatents](https://github.com/OpenSourcePatents)

Not affiliated with the Town of Canaan, NH.

> *"Just a regular guy releasing open source patents on whatever I can think of to help the world. No royalty or charge. Ever."*
