# Attendance Maintenance System

Standalone sky-blue attendance app. It is **not** part of Skill-Exchange and should be hosted as its **own** static site.

## What it does

1. Welcome screen
2. Create or open a class (up to **10** named classes — no Class 1–10 presets)
3. Add students with a **unique register number** per class
4. Everyone starts **present**; you only mark **absent**
5. Present / absent lists, compact kid charts, CSV backup
6. Records stay in this browser for about **6 months** (localStorage + IndexedDB)

Data lives in the browser on this device. Localhost and a Vercel URL are different origins, so export CSV if you move hosts.

## Run locally (port 5500)

From this folder:

```bash
./start.sh
```

Windows: double-click `start.bat`.

Then open http://localhost:5500/

## Deploy without touching Skill-Exchange

- **Zip:** use `attendance-dashboard.zip` at the repo root (`index.html` is at the zip root). Drop it on Vercel, Netlify, or GitHub Pages as a **new** project.
- **Vercel CLI:** create a **new** project named `attendance-dashboard` with this `attendance/` folder as the root directory. Do not set the Skill-Exchange repo root as the Vercel root.
