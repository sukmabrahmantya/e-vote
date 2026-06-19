# E-Vote CSV

Aplikasi e-vote sederhana dengan 2 page utama:

- `/vote`: voter memasukkan unique code lalu memilih kandidat atau isi sendiri.
- `/dashboard`: admin generate code, kelola kandidat, melihat hasil dan log vote.

Stack:

- React + Vite + TypeScript
- Hono + Node.js
- Tailwind CSS
- CSV local file storage

## Setup

```bash
nvm use 24
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Buka:

```txt
Vote page     : http://localhost:5173/vote
Dashboard     : http://localhost:5173/dashboard
API backend   : http://localhost:8787
```

Default admin password ada di `.env.example`.

## Production build

```bash
pnpm build
pnpm start
```

Untuk production, API dan static frontend akan dilayani oleh server Hono di port `8787`.

## CSV files

Data tersimpan di:

```txt
server/data/codes.csv
server/data/candidates.csv
server/data/votes.csv
```

## Catatan penting

CSV local cocok untuk aplikasi kecil/internal. Untuk voting ramai dan banyak request bersamaan, gunakan SQLite agar lebih aman.
