# Atrium

Four personal apps, one login, hosted on Vercel: CRM, Space, Rolodex, Groove.

Clone of the jobs in [ed-donner/bench](https://github.com/ed-donner/bench), not a fork. Next.js + Postgres. Owner account plus a resettable demo account.

Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](docs/superpowers/specs/2026-09-06-atrium-design.md)

Phase/feature board: [features/INDEX.md](features/INDEX.md)

Current feature: [CURRENT_FEATURE.md](CURRENT_FEATURE.md)

## Setup

```bash
npm ci
cp .env.example .env
```

Fill in `.env` when auth and the database land. Names only live in `.env.example`.

## Commands

```bash
npm test        # Vitest
npm run dev     # Next.js dev server
npm run build   # production build
```
