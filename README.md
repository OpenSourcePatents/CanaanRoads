# CANAAN ROAD WATCH — Citizen Road Accountability

Live, real-time community reporting platform for road conditions in Canaan, NH.

Citizens can anonymously report potholes, frost heaves, drainage issues, and other road problems. Reports are public, persistent, and visible to all residents. Road status is computed automatically based on open reports.

## Features
- Anonymous road issue reporting (no account required)
- GPS location tagging
- Upvote/confirm existing reports
- Dispute repairs that weren't done properly
- Real-time updates — see new reports as they're submitted
- Automatic road status scoring (good → fair → poor → critical)

## Tech
- Next.js 14 + React 18
- Supabase (Postgres + Realtime)
- Deployed on Vercel

## Data
All data is citizen-submitted. Road status is computed from open reports:
- **Good** — No open reports
- **Fair** — Minor open reports
- **Poor** — Multiple moderate open reports
- **Critical** — Any severe open report

Part of the [O.S.P. Portal](https://github.com/OpenSourcePatents/osp-portal) — OpenSourcePatents Civic Intelligence Network.

## License
CC0 Public Domain — OpenSourcePatents
