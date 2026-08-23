# SkyVault Attendance

Standalone sky-blue attendance app. It does not replace Skill-Exchange.

## Flow

1. Welcome screen
2. Create up to 10 named classes (saved in this browser)
3. Add students with unique register numbers
4. Everyone is **present** until you tap to mark **absent**
5. Compact charts: pie, doughnut, bar, line, polar, radar
6. CSV / JSON backup (needed to copy data to Vercel)

Records older than **186 days** (~6 months) are pruned automatically. Storage is IndexedDB plus localStorage in **this browser, this origin**.

## Run on Windows (port 5500)

From the repo root:

```bat
run-attendance.bat
```

Or from `attendance\`:

```bat
start-attendance.bat
```

Open http://127.0.0.1:5500

## Deploy

See `DEPLOY-VERCEL.txt`. Use a **new** Vercel project named `attendance-dashboard` with Root Directory `attendance`.
