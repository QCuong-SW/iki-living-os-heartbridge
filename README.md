# HeartBridge — Nhịp nhà mình

Mobile-first family rhythm prototype. Vietnamese UI with six connected hero views, warm illustrations bundled locally, and a deterministic Nguyễn family scenario on 25 September 2026.

## Run locally

Requires Node.js 22 and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The default `mock` mode saves progress to browser localStorage. Different browsers have independent demo states. Settings → Bắt đầu lại câu chuyện mẫu resets only the current demo. All names and activities are fictional demonstration data.

## Connected flows

1. Home → Family: busy/free intervals intersect to find 19:30–20:15.
2. Family → Ritual suggestion: a real intersection is required before planning; the new moment captures its participants and time.
3. Care: Minh accepts → picks up → delivers. Transitions cannot skip steps.
4. Ritual detail: complete the planned meal. Care is a related optional act, not a prerequisite for a family meal.
5. Memory: only completed moments can produce a memory. A note and bundled illustration are saved with a source moment ID; retries cannot duplicate it.
6. Family editing: Minh edits start/end and sharing in a modal. Save validates start < end, persists immediately and recomputes the shared window without reloading. An intersection shorter than 30 minutes or disabled sharing blocks new suggestions/planning, including direct suggestion links. Existing planned moments retain their original schedule and show a note after availability changes.
7. Repeat a good moment: after completing dinner (also after saving its memory), choose “Tạo Nhịp nhà”. Set a name, weekly/biweekly/monthly recurrence and first future date/time. The completed dinner counts as 1/1. The new ritual appears in Home and Nhịp nhà; each explicit demo completion advances the next date and both counters, and offers a separately linked Living Memory. Duplicate creation/completion requests are idempotent. Monthly dates clamp to month end, restoring the original day in longer months. There is no scheduler, notification, calendar sync or automatic completion; weekly “weeks together” is a demo milestone, not a verified streak. Other recurrences show “times together”.

Family Window uses fixed demo schedules: Bà Lan 18:00–20:30, Bố Hùng 19:00–22:00, Mẹ Hà 19:30–22:00, and editable Minh initially 19:30–20:15. Minh 20:00–21:00 yields 20:00–20:30; 21:00–22:00 yields no window. Short positive availability is allowed, but a valid family window requires at least 30 minutes. Earlier stored demo schedules are normalized on read without clearing care, appointments or memories.

The separate Care story retains its fixed afternoon context (17:00–18:30); it is not inferred from Minh's editable Family Window availability. The demo does not claim that Minh is tracked near a pharmacy. Calendar, location, authentication, notifications, photo upload and AI are not integrated. Memories use selectable illustrations rather than an upload control.

## MongoDB and Docker

```sh
docker compose up --build -d
```

Compose runs the app and MongoDB with a named data volume and database healthcheck. It does not publish the MongoDB port. Each browser gets an HttpOnly session cookie. In `mongo` mode mutations are server-validated and compare a revision number to reject concurrent stale writes; data is never silently switched to mock on database errors.

For a separately running database, copy `.env.example` to `.env.local`, set `DATA_MODE=mongo` and `MONGODB_URI`, then restart Next.js. To create the optional reusable template and expiry index:

```sh
node --env-file=.env.local --import tsx scripts/seed.ts
```

`npm run seed` also works with environment variables set by the shell. Seeding is idempotent and does not overwrite existing sessions. Sessions initialize automatically if the template has not been seeded.

Implementation decision: this exhibition prototype stores a family session as one MongoDB document (`demoSessions`), plus an optional `demoTemplates` seed. That keeps moment, care and memory updates atomic and browser demos independent. It deliberately does not claim the proposed seven-collection multi-family production schema is implemented. Family members are not authenticated users.

## Verify

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run test:mongo
npm run build
```

`test:mongo` starts a temporary **real MongoDB process** using mongodb-memory-server, checks persistence/session isolation/concurrent updates, then runs the browser flows against the actual Mongo API at port 3101. The first run downloads a MongoDB binary. It does not need Docker or modify an existing database. Do not run it simultaneously with another Next.js dev server in this checkout.

Playwright covers mobile 390px and desktop 1440px, linked flows, reload persistence, reset, privacy opt-out, horizontal overflow, browser errors and automated accessibility checks. Screenshots are generated under ignored `test-results/`.

## Scope and operating notes

- Stack: Next.js App Router, React, TypeScript, Zod, MongoDB official driver. Plain responsive CSS is used for the custom design rather than adding Tailwind utilities.
- Bundled fonts and hand-authored SVG illustrations require no image or font services at runtime.
- PWA manifest and 192/512 icons are provided. HTTPS hosting is required for installation outside localhost; installation on a physical iOS/Android device has not been verified. Full offline sync and push notifications are out of scope.
- No authentication: use only the seeded fictional demo data. The shared/family wording describes the intended product; this is not a production privacy boundary.
- The fixed demo clock lets visitors advance to dinner completion immediately.
- On the development machine Docker Desktop currently fails to start with a `dockerInference` listener error. Compose runtime is therefore not yet verified there; use mock mode or a separate MongoDB instance.

## Demo script

Find time together → view the suggestion → plan dinner → accept and finish helping Grandma → return to the family moment → complete dinner → write a memory → reload to see that it remains. Use Settings to reset before the next visitor.
