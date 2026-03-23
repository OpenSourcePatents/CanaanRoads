# CANAAN ROAD WATCH

### Citizen Road Accountability — Live at [canaanroads.com](https://canaanroads.com)

A real-time community reporting and public safety platform for road conditions in Canaan, NH. Citizens can anonymously report potholes, frost heaves, drainage issues, and other road problems. Police can post safety alerts and close roads. Road agents can post construction notices. Reports are public, persistent, and visible to all residents. Road status is computed automatically from open reports.

An [OpenSourcePatents](https://github.com/OpenSourcePatents) project — part of the [O.S.P. Civic Intelligence Network](https://opensourceforall.com).

-----

## Features

**For Everyone (no account required)**

- Anonymous road issue reporting with photo upload and GPS tagging
- Upvote/confirm existing reports
- Dispute repairs that weren’t done properly
- Real-time updates — reports, closures, and alerts appear live as they’re submitted
- Automatic road status scoring: Good → Fair → Poor → Critical
- View active road closures, safety alerts, and construction notices on the dashboard
- Interactive map at `/map` with color-coded road dots

**For Logged-In Residents**

- Submit road-clear photos for admin review
- Edit your own reports (locked once GPS-tagged)
- Magic link or email/password sign-in — no friction

**For Road Agents**

- Mark reports In Progress or Resolved
- Close and reopen roads (accident, weather, flooding, etc.)
- File safety alerts (hazards, downed lines, flooding) with visibility controls
- Post construction notices with start/end dates and detour info

**For Police**

- Everything road agents can do, plus:
- File safety alerts for drunk drivers, pursuits, accidents, and other dangers
- Control alert visibility: Public, Officials Only, or Police Only
- Post construction notices for roadwork and traffic management
- Police-only alerts are invisible to road agents and the public

**For Admin**

- Full admin panel with six tabs: Road Clears, Open Reports, Closures, Alerts, Construction, Roles
- Approve or reject road-clear submissions
- Manage all report statuses
- Reopen closed roads and resolve alerts
- Update construction notice status (scheduled → active → delayed → completed)
- Assign and manage user roles

-----

## Role System

Five permission tiers, from least to most access:

|Role          |Description                                                                     |
|--------------|--------------------------------------------------------------------------------|
|**Anonymous** |Anyone visiting the site — can report, upvote, dispute                          |
|**Resident**  |Logged-in user — can submit road-clear photos                                   |
|**Road Agent**|Town road crew — can update reports, close roads, file alerts, post construction|
|**Police**    |Law enforcement — same as road agent plus police-only alert visibility          |
|**Admin**     |Full control — role management, all approvals, all features                     |

-----

## Permission Matrix

|Action                     |Anonymous|Resident|Road Agent|Police|Admin|
|---------------------------|---------|--------|----------|------|-----|
|View reports & roads       |✓        |✓       |✓         |✓     |✓    |
|Submit reports             |✓        |✓       |✓         |✓     |✓    |
|Upvote reports             |✓        |✓       |✓         |✓     |✓    |
|Dispute resolved reports   |✓        |✓       |✓         |✓     |✓    |
|View public safety alerts  |✓        |✓       |✓         |✓     |✓    |
|Submit road-clear photos   |—        |✓       |✓         |✓     |✓    |
|Mark in-progress / resolved|—        |—       |✓         |✓     |✓    |
|Close / reopen roads       |—        |—       |✓         |✓     |✓    |
|File safety alerts         |—        |—       |✓         |✓     |✓    |
|Post construction notices  |—        |—       |✓         |✓     |✓    |
|View officials-only alerts |—        |—       |✓         |✓     |✓    |
|View police-only alerts    |—        |—       |—         |✓     |✓    |
|Approve road clears        |—        |—       |—         |—     |✓    |
|Manage roles               |—        |—       |—         |—     |✓    |

-----

## Tech Stack

|Layer    |Tech                                                                      |
|---------|--------------------------------------------------------------------------|
|Framework|Next.js 14 + React 18                                                     |
|Database |Supabase (Postgres + Realtime + Storage + RLS)                            |
|Auth     |Supabase Auth (magic link + password)                                     |
|Map      |Mapbox GL JS                                                              |
|Hosting  |Vercel                                                                    |
|Data     |OpenStreetMap via Overpass Turbo (1,295 road segments → ~708 unique roads)|

-----

## Database Schema

```
roads                  — OSM road segments (id, name, segment, miles, lat, lng, surface...)
reports                — Citizen reports (type, severity, description, photo, GPS, upvotes...)
road_status            — View: aggregates reports → computes road status per road
upvotes                — Fingerprint-based upvote deduplication
road_clear_submissions — Logged-in users submit clear photos for admin approval
road_closures          — Temporary road closures (reason, duration, GPS bounds)
safety_alerts          — Safety alerts with visibility tiers (public/officials/police)
construction_notices   — Planned construction with status lifecycle and detour info
user_roles             — Role assignments (user / road_agent / police / admin)
profiles               — Username and display info tied to auth.users
```

-----

## Road Closures

Officials (road agents, police, admin) can temporarily close roads with:

- **Reason**: Accident, police activity, weather, flooding, construction, emergency, other
- **Duration**: 1 hour, 4 hours, overnight, multi-day, or unknown
- **Optional details** and GPS start/end points for partial closures
- Closed roads display with a 🚧 icon and red CLOSED badge across the dashboard, roads grid, and map
- Any official can reopen a closed road

## Safety Alerts

Officials can file real-time safety alerts with three visibility levels:

- **Public** — visible to everyone including anonymous visitors
- **Officials Only** — visible to road agents, police, and admin
- **Police Only** — visible to police and admin only

Alert types: Drunk Driver, Accident, Hazard, Pursuit, Downed Lines, Fire, Flooding, Other

Each alert has a severity level (Low / Medium / High / Critical) and an optional auto-expiry timer. Active alerts display as a banner on the dashboard with the ability to resolve them.

## Construction Notices

Officials can post construction and maintenance notices with:

- **Title and description** of the work being done
- **Start and estimated end dates**
- **Detour info** for alternate routes
- **Status lifecycle**: Scheduled → Active → Delayed → Completed / Cancelled

Active and upcoming construction shows on the dashboard with status badges.

-----

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

-----

## Assigning Roles

After a user signs up, assign their role in Supabase SQL Editor:

```sql
-- Get their UUID
SELECT id FROM auth.users WHERE email = 'their@email.com';

-- Assign role (choose one)
INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'road_agent')
ON CONFLICT (user_id) DO UPDATE SET role = 'road_agent';

INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'police')
ON CONFLICT (user_id) DO UPDATE SET role = 'police';

INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

-----

## Realtime

All data updates in real time via Supabase Realtime subscriptions. When a report is filed, a road is closed, an alert is posted, or a construction notice changes status — every open browser sees it instantly. No refresh needed.

Tables with realtime enabled: `reports`, `roads`, `road_closures`, `safety_alerts`, `construction_notices`.

-----

## Roadmap

- [ ] Email/SMS notification pipeline (new severe reports, road closures, critical alerts)
- [ ] Notification subscriptions (per-road or town-wide)
- [ ] Road agent and select board account onboarding
- [ ] Multi-town architecture (separate repos with aggregator site)
- [ ] Filter OSM data to exclude neighboring town roads
- [ ] Map overlay for closures, alerts, and construction zones

-----

## Project Philosophy

All data is citizen-submitted. Road status is computed from open reports:

- **Good** — No open reports
- **Fair** — Minor open reports
- **Poor** — Multiple moderate open reports
- **Critical** — Any severe open report

This platform exists to create a transparent, public record of road conditions so residents can hold local government accountable. No ads. No paywalls. No data sold.

-----

## License

**Apache 2.0** — [OpenSourcePatents](https://github.com/OpenSourcePatents)

Not affiliated with the Town of Canaan, NH.

> *“Just a regular guy releasing open source patents on whatever I can think of to help the world. No royalty or charge. Ever.”*