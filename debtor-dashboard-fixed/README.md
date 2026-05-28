# Debtor Dashboard + Supabase + Vercel

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

## Deploy to Vercel

- Push to GitHub
- Import repository in Vercel
- Framework preset: Vite
- Build command: npm run build
- Output directory: dist

## Environment Variables

Create `.env`

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Also add them in Vercel Project Settings → Environment Variables.