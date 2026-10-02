# Fretboard Coach

45-minute guitar practice sessions built on *The Connected Guitar* course: 16 stages, each with a lesson, quiz, metronome drill, jam rule and ready test.

- Hosting: Vercel (static `index.html`)
- Sign-in and progress: Supabase (Google login, one `progress` row per user)

Rebuild `index.html` from `src/`: `SB_URL=... SB_KEY=... ./build.sh`

## Keep-alive
Supabase pauses free projects after a week without activity. `vercel.json` runs a daily cron that calls `/api/ping`, which calls the `public.ping()` function in Supabase (updates one row in `public.heartbeat`).
